import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enqueueEmail, processQueue } from '@/lib/services/email';
import { signMagicLink } from '@/lib/security/magicLink';
import { getActiveEvent } from '@/lib/services/registration';
import type { Registration } from '@/lib/types';

/**
 * GET /api/cron/remind — Send 24h payment reminder to PAYMENT_PENDING teams
 *
 * Targets teams created 24–25 hours ago that haven't paid yet.
 * Each team gets at most one reminder (tracked by reminderSentAt).
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json({ ok: true, data: { reminded: 0 } });
    }

    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find teams created 24-25h ago, still PAYMENT_PENDING, no reminder sent
    const teams = await db
      .collection<Registration>('registrations')
      .find({
        status: 'PAYMENT_PENDING',
        createdAt: { $gte: twentyFiveHoursAgo, $lte: twentyFourHoursAgo },
        reminderSentAt: { $exists: false },
        deletedAt: { $exists: false },
      })
      .limit(50)
      .toArray();

    let reminded = 0;

    for (const team of teams) {
      const payExpiry = new Date(event.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      const resumeLink = await signMagicLink(team.teamId, 'pay', payExpiry);

      await enqueueEmail({
        to: team.leaderEmail,
        template: 'REMINDER',
        templateData: {
          teamId: team.teamId,
          teamName: team.teamName,
          resumeLink,
          deadline: team.expiresAt.toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          }),
          amount: event.fee,
        },
        dedupeKey: `REMINDER:${team.teamId}`,
      });

      // Mark reminder as sent
      await db.collection('registrations').updateOne(
        { _id: team._id },
        { $set: { reminderSentAt: now } }
      );

      reminded++;
    }

    // Process any queued emails
    if (reminded > 0) {
      await processQueue(20);
    }

    return NextResponse.json({
      ok: true,
      data: { reminded },
    });
  } catch (error) {
    console.error('GET /api/cron/remind error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Reminder failed' },
      { status: 500 }
    );
  }
}
