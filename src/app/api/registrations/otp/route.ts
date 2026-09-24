import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { generateOtpCode, signOtpToken } from '@/lib/security/emailOtp';
import { isSrmEmail, srmEmailMessage } from '@/lib/validation/email';
import { getEnv } from '@/lib/env';
import { getDb } from '@/lib/db';
import { sendTemplateEmail } from '@/lib/email/sender';
import type { EmailJob } from '@/lib/types';

/**
 * POST /api/registrations/otp — email a 6-digit code to the team leader.
 *
 * Sent right away (not via the queue) so the leader isn't left waiting;
 * the job is still recorded in emailJobs so it counts toward the daily cap
 * and shows up in the admin email log.
 *
 * Limits: 3 codes / 10 min per email, 10 / hour per IP.
 */

export async function POST(req: NextRequest) {
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    const body = await req.json();

    // Honeypot — pretend a code was sent
    if (body.website && body.website.length > 0) {
      await logAbuse(ipHashed, 'POST /api/registrations/otp', 'honeypot');
      return NextResponse.json({ ok: true, data: { otpToken: 'x' } });
    }

    const domain = getEnv().ALLOWED_EMAIL_DOMAIN;
    const email = String(body.email || '').trim().toLowerCase();
    if (!isSrmEmail(email, domain)) {
      await logAbuse(ipHashed, 'POST /api/registrations/otp', 'bad_email');
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: srmEmailMessage(domain), fields: { 'players.0.email': srmEmailMessage(domain) } },
        { status: 400 }
      );
    }

    if (
      (await checkRateLimit(`otp_ip:${ipHashed}`, 10, 60 * 60)) ||
      (await checkRateLimit(`otp:${email}`, 3, 10 * 60))
    ) {
      await logAbuse(ipHashed, 'POST /api/registrations/otp', 'rate_limit');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many codes requested. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const code = generateOtpCode();
    const now = new Date();
    const job: Omit<EmailJob, '_id'> = {
      to: email,
      template: 'EMAIL_OTP',
      templateData: { code: '······' }, // never store the code
      dedupeKey: `EMAIL_OTP:${email}:${now.getTime()}`,
      status: 'SENDING',
      attempts: 1,
      nextAttemptAt: now,
      createdAt: now,
    };
    const db = await getDb();
    const { insertedId } = await db.collection('emailJobs').insertOne(job as any);

    try {
      const messageId = await sendTemplateEmail({ ...job, _id: insertedId, templateData: { code } } as EmailJob);
      await db.collection('emailJobs').updateOne({ _id: insertedId }, { $set: { status: 'SENT', messageId, sentAt: new Date() } });
    } catch (e: any) {
      await db.collection('emailJobs').updateOne({ _id: insertedId }, { $set: { status: 'FAILED', lastError: e?.message || 'Unknown error' } });
      console.error('OTP email failed:', e);
      return NextResponse.json(
        { ok: false, code: 'EMAIL_FAILED', message: "Couldn't send the code. Please try again in a minute." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data: { otpToken: await signOtpToken(email, code) } });
  } catch (error) {
    console.error('POST /api/registrations/otp error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Please try again.' },
      { status: 500 }
    );
  }
}
