import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { teamSchema } from '@/lib/validation/team';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { signMagicLink, signMagicToken } from '@/lib/security/magicLink';
import { buildUpiIntent } from '@/lib/upi';
import {
  createTeam,
  getActiveEvent,
  getCapacityUsed,
  findByIdempotencyKey,
  mapDuplicateKeyError,
} from '@/lib/services/registration';
import { enqueueEmail } from '@/lib/services/email';
import { processQueue } from '@/lib/services/email';

/**
 * POST /api/registrations — Step 1 (Create team registration)
 *
 * Check order:
 * 1. Rate limit (5/10min + 20/day per IP)
 * 2. Honeypot (filled = fake 200, save nothing)
 * 3. Time-trap (< 3s = reject)
 * 4. Zod validation
 * 5. Turnstile verification
 * 6. Event open + capacity check
 * 7. Idempotency key check
 * 8. Create team (Team ID generation + DB insert)
 * 9. Enqueue REGISTERED email
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipHashed = hashIp(ip);

  try {
    // 1. Rate limit — 5 attempts per 10 min
    const limited10m = await checkRateLimit(`reg:${ipHashed}`, 5, 10 * 60);
    if (limited10m) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'rate_limit_10m');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    // 1b. Rate limit — 20 per day
    const limitedDay = await checkRateLimit(`reg_day:${ipHashed}`, 20, 24 * 60 * 60);
    if (limitedDay) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'rate_limit_day');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts today. Try again tomorrow.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Honeypot — if filled, return fake success silently
    if (body.website && body.website.length > 0) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'honeypot');
      return NextResponse.json({ ok: true, data: { teamId: 'DBG-000', fake: true } }, { status: 201 });
    }

    // 3. Time-trap — reject if submitted < 3 seconds after form opened
    if (body._formOpenedAt) {
      const elapsed = Date.now() - body._formOpenedAt;
      if (elapsed < 3000) {
        await logAbuse(ipHashed, 'POST /api/registrations', 'timetrap');
        return NextResponse.json(
          { ok: false, code: 'BOT_SUSPECTED', message: 'Please slow down and try again.' },
          { status: 400 }
        );
      }
    }

    // 4. Zod validation
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      }
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Please fix the errors below.', fields: fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // 5. Turnstile
    const turnstile = await verifyTurnstileToken(input.turnstileToken, 'register');
    if (!turnstile.ok) {
      return NextResponse.json(
        { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human. Please try again." },
        { status: 403 }
      );
    }

    // 6. Event open + capacity
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, code: 'INTERNAL', message: 'No event configured' },
        { status: 500 }
      );
    }

    const now = new Date();
    if (event.forceClosed || now > event.registrationClosesAt) {
      return NextResponse.json(
        { ok: false, code: 'REGISTRATION_CLOSED', message: 'Registrations are closed.' },
        { status: 409 }
      );
    }
    if (now < event.registrationOpensAt) {
      return NextResponse.json(
        { ok: false, code: 'REGISTRATION_CLOSED', message: 'Registrations have not opened yet.' },
        { status: 409 }
      );
    }

    const used = await getCapacityUsed(event._id);
    if (used >= event.capacity) {
      return NextResponse.json(
        { ok: false, code: 'EVENT_FULL', message: 'All seats are taken.' },
        { status: 409 }
      );
    }

    // 7. Idempotency key — return first result if duplicate
    const existing = await findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      // Re-sign the pay token: only the original client knows the idempotency key,
      // and without a token the retried form can't submit Step 2.
      const replayExpiresAt = new Date(event.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      const replayToken = await signMagicToken(existing.teamId, 'pay', replayExpiresAt);
      return NextResponse.json(
        {
          ok: true,
          data: {
            teamId: existing.teamId,
            resumeToken: replayToken,
            upi: {
              id: event.upiId,
              payeeName: event.payeeName,
              amount: event.fee,
              note: existing.teamId,
              qrString: buildUpiIntent({
                upiId: event.upiId,
                payeeName: event.payeeName,
                amount: event.fee,
                note: existing.teamId,
              }),
            },
          },
        },
        { status: 201 }
      );
    }

    // 8. Create team
    const userAgent = req.headers.get('user-agent') || '';
    let result;

    try {
      result = await createTeam(input, event, ipHashed, userAgent);
    } catch (error: any) {
      // Map MongoDB duplicate key errors to field-level messages
      const dupError = mapDuplicateKeyError(error, input.players as any);
      if (dupError) {
        return NextResponse.json(
          { ok: false, ...dupError },
          { status: 409 }
        );
      }
      throw error;
    }

    // 9. Enqueue REGISTERED email
    const leader = input.players.find((p) => p.isLeader)!;
    const expiresAt = new Date(event.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);
    const resumeLink = await signMagicLink(result.teamId, 'pay', expiresAt);

    await enqueueEmail({
      to: leader.email,
      template: 'REGISTERED',
      templateData: {
        teamId: result.teamId,
        teamName: input.teamName,
        players: input.players.map((p) => ({
          fullName: p.fullName,
          email: p.email,
          regNo: p.regNo,
          isLeader: p.isLeader,
        })),
        amount: event.fee,
        upiId: event.upiId,
        payeeName: event.payeeName,
        resumeLink,
      },
      dedupeKey: `REGISTERED:${result.teamId}`,
    });

    // Process email queue in the background after responding
    after(async () => {
      try {
        await processQueue(5);
      } catch (e) {
        console.error('Email queue processing error:', e);
      }
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    console.error('POST /api/registrations error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Your data is safe — try again.' },
      { status: 500 }
    );
  }
}
