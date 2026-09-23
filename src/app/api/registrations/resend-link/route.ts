import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit, hashIp, getClientIp } from '@/lib/security/rateLimit';
import { getDb } from '@/lib/db';
import { signMagicLink } from '@/lib/security/magicLink';
import { getActiveEvent } from '@/lib/services/registration';
import { enqueueEmail } from '@/lib/services/email';
import type { Registration } from '@/lib/types';

/**
 * POST /api/registrations/resend-link
 *
 * Rate limited: 3/hour per email.
 * Always returns the same generic message — never reveals whether the email exists.
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipHashed = hashIp(ip);

  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Enter your email' },
        { status: 400 }
      );
    }

    // Turnstile
    const turnstile = await verifyTurnstileToken(body.turnstileToken, 'resend');
    if (!turnstile.ok) {
      return NextResponse.json(
        { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human. Please try again." },
        { status: 403 }
      );
    }

    // Rate limit — 3/hour per email
    const limited = await checkRateLimit(`resend:${email}`, 3, 60 * 60);
    if (limited) {
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again in an hour.' },
        { status: 429 }
      );
    }

    // Always return the same response — no enumeration
    const genericResponse = NextResponse.json({
      ok: true,
      data: { message: 'If registered, we\'ve sent the link to your email.' },
    });

    // Look up the registration (in background-ish, but still in the handler)
    const db = await getDb();
    const reg = await db.collection<Registration>('registrations').findOne({
      leaderEmail: email,
      deletedAt: { $exists: false },
    });

    if (reg) {
      const event = await getActiveEvent();
      if (event) {
        const expiresAt = event.day2Date;
        const statusLink = await signMagicLink(reg.teamId, 'status', expiresAt);
        const payExpiry = new Date(event.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);
        const payLink = ['PAYMENT_PENDING', 'REJECTED'].includes(reg.status)
          ? await signMagicLink(reg.teamId, 'pay', payExpiry)
          : undefined;

        await enqueueEmail({
          to: email,
          template: 'YOUR_LINK',
          templateData: {
            teamId: reg.teamId,
            teamName: reg.teamName,
            statusLink,
            payLink,
          },
          dedupeKey: `YOUR_LINK:${reg.teamId}:${Date.now()}`,
        });
      }
    }

    return genericResponse;
  } catch (error) {
    console.error('POST /api/registrations/resend-link error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
