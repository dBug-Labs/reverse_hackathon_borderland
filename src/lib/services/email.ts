import { getDb } from '@/lib/db';
import type { EmailJob, EmailTemplate, EmailJobStatus } from '@/lib/types';
import { ObjectId } from 'mongodb';

/**
 * Email outbox service.
 *
 * Emails are never sent directly — they are enqueued as `emailJobs`
 * documents and processed asynchronously (via after() or cron).
 * This guarantees registration never fails because Gmail failed,
 * and nothing is silently lost.
 */

// ── Enqueue an email ────────────────────────────────────────────────────────

export async function enqueueEmail(opts: {
  to: string | string[];
  cc?: string[];
  template: EmailTemplate;
  templateData: Record<string, unknown>;
  registrationId?: ObjectId;
  dedupeKey: string;
}): Promise<void> {
  const db = await getDb();

  const job: Omit<EmailJob, '_id'> = {
    to: opts.to,
    cc: opts.cc,
    template: opts.template,
    templateData: opts.templateData,
    registrationId: opts.registrationId,
    dedupeKey: opts.dedupeKey,
    status: 'QUEUED',
    attempts: 0,
    nextAttemptAt: new Date(), // try immediately
    createdAt: new Date(),
  };

  try {
    await db.collection('emailJobs').insertOne(job as any);
  } catch (error: any) {
    // Dedupe key already exists — same email already queued, ignore
    if (error?.code === 11000 && error?.keyPattern?.dedupeKey) {
      return;
    }
    throw error;
  }
}

// ── Process the queue (called by after() or cron) ───────────────────────────

const BACKOFF_MINUTES = [1, 5, 30, 120, 360]; // 1m, 5m, 30m, 2h, 6h
const MAX_ATTEMPTS = 5;

export async function processQueue(maxJobs: number = 10): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const db = await getDb();
  const now = new Date();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Check daily cap
  const dailyCap = parseInt(process.env.EMAIL_DAILY_CAP || '450', 10);
  const todayCount = await getDailyRecipientCount();
  let remaining = dailyCap - todayCount;

  if (remaining <= 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  // Find and claim queued jobs
  for (let i = 0; i < maxJobs && remaining > 0; i++) {
    // Claim one job atomically (QUEUED → SENDING)
    const job = await db.collection<EmailJob>('emailJobs').findOneAndUpdate(
      {
        status: 'QUEUED',
        nextAttemptAt: { $lte: now },
      },
      {
        $set: { status: 'SENDING' as EmailJobStatus },
      },
      {
        sort: { nextAttemptAt: 1 },
        returnDocument: 'after',
      }
    );

    if (!job) break; // no more jobs

    try {
      // Dynamic import to avoid circular dependency
      const { sendTemplateEmail } = await import('@/lib/email/sender');
      const messageId = await sendTemplateEmail(job);

      // Count recipients
      const recipientCount = Array.isArray(job.to) ? job.to.length : 1;
      const ccCount = job.cc?.length ?? 0;
      remaining -= recipientCount + ccCount;

      // Mark as sent
      await db.collection('emailJobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'SENT' as EmailJobStatus,
            messageId,
            sentAt: new Date(),
          },
        }
      );
      sent++;
    } catch (error: any) {
      const attempts = (job.attempts ?? 0) + 1;

      if (attempts >= MAX_ATTEMPTS) {
        // Permanently failed
        await db.collection('emailJobs').updateOne(
          { _id: job._id },
          {
            $set: {
              status: 'FAILED' as EmailJobStatus,
              lastError: error.message || 'Unknown error',
              attempts,
            },
          }
        );
        failed++;
      } else {
        // Schedule retry with exponential backoff
        const backoffMs = (BACKOFF_MINUTES[attempts - 1] ?? 360) * 60 * 1000;
        const nextAttemptAt = new Date(now.getTime() + backoffMs);

        await db.collection('emailJobs').updateOne(
          { _id: job._id },
          {
            $set: {
              status: 'QUEUED' as EmailJobStatus,
              lastError: error.message || 'Unknown error',
              nextAttemptAt,
              attempts,
            },
          }
        );
        skipped++;
      }
    }
  }

  return { sent, failed, skipped };
}

// ── Retry a specific failed job (admin) ─────────────────────────────────────

export async function retryJob(jobId: string): Promise<boolean> {
  if (!ObjectId.isValid(jobId)) return false;
  const db = await getDb();
  const result = await db.collection('emailJobs').updateOne(
    { _id: new ObjectId(jobId), status: 'FAILED' },
    {
      $set: {
        status: 'QUEUED' as EmailJobStatus,
        nextAttemptAt: new Date(),
        lastError: undefined,
      },
      $inc: { attempts: 0 }, // don't reset attempts, just re-queue
    }
  );
  return result.modifiedCount === 1;
}

// ── Daily recipient count ───────────────────────────────────────────────────

export async function getDailyRecipientCount(): Promise<number> {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await db.collection('emailJobs').aggregate([
    {
      $match: {
        status: 'SENT',
        sentAt: { $gte: startOfDay },
      },
    },
    {
      $project: {
        recipientCount: {
          $add: [
            { $cond: [{ $isArray: '$to' }, { $size: '$to' }, 1] },
            { $cond: [{ $isArray: '$cc' }, { $size: '$cc' }, 0] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$recipientCount' },
      },
    },
  ]).toArray();

  return result[0]?.total ?? 0;
}

// ── List email jobs (admin) ─────────────────────────────────────────────────

export async function listEmailJobs(opts: {
  status?: EmailJobStatus;
  page?: number;
  limit?: number;
}): Promise<{ jobs: EmailJob[]; total: number }> {
  const db = await getDb();
  const filter: any = {};
  if (opts.status) filter.status = opts.status;

  const limit = opts.limit || 50;
  const skip = ((opts.page || 1) - 1) * limit;

  const [jobs, total] = await Promise.all([
    db.collection<EmailJob>('emailJobs')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection('emailJobs').countDocuments(filter),
  ]);

  return { jobs, total };
}
