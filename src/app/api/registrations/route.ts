import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { registrationSubmitSchema } from '@/lib/validation/team';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { signMagicLink } from '@/lib/security/magicLink';
import {
  createTeamWithPayment,
  getActiveEvent,
  getCapacityUsed,
  findByIdempotencyKey,
  mapDuplicateKeyError,
} from '@/lib/services/registration';
import { enqueueEmail, processQueue } from '@/lib/services/email';

/**
 * POST /api/registrations — final submit (team details + payment proof)
 *
 * The one place a team is saved. The flow is: details (checked by
 * /api/registrations/check, nothing stored) → pay by UPI → submit UTR here.
 * Team + payment are written together as UNDER_REVIEW, then the
 * "submission received — payment being verified" email goes out.
 *
 * Check order:
 * 1. Rate limit (5/10min + 20/day per IP)
 * 2. Honeypot (filled = fake success, save nothing)
 * 3. Time-trap (< 3s = reject)
 * 4. Zod validation (team + UTR)
 * 5. Turnstile
 * 6. Event open + capacity, amount = fee
 * 7. Idempotency key (double-click returns the first result)
 * 8. Save team + payment in one transaction
 * 9. Enqueue PROOF_RECEIVED email
 */

export async function POST(req: NextRequest) {
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    // 1. Rate limit
    if (await checkRateLimit(`reg:${ipHashed}`, 5, 10 * 60)) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'rate_limit_10m');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }
    if (await checkRateLimit(`reg_day:${ipHashed}`, 20, 24 * 60 * 60)) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'rate_limit_day');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts today. Try again tomorrow.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Honeypot
    if (body.website && body.website.length > 0) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'honeypot');
      return NextResponse.json({ ok: true, data: { teamId: 'DBG-000', status: 'UNDER_REVIEW', fake: true } }, { status: 201 });
    }

    // 3. Time-trap
    if (body._formOpenedAt && Date.now() - body._formOpenedAt < 3000) {
      await logAbuse(ipHashed, 'POST /api/registrations', 'timetrap');
      return NextResponse.json(
        { ok: false, code: 'BOT_SUSPECTED', message: 'Please slow down and try again.' },
        { status: 400 }
      );
    }

    // 4. Zod
    const parsed = registrationSubmitSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fields[path]) fields[path] = issue.message;
      }
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Please fix the errors below.', fields },
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

    // 6. Event rules
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'No event configured' }, { status: 500 });
    }
    const now = new Date();
    if (event.forceClosed || now > event.registrationClosesAt || now < event.registrationOpensAt) {
      return NextResponse.json(
        { ok: false, code: 'REGISTRATION_CLOSED', message: 'Registrations are closed.' },
        { status: 409 }
      );
    }
    if ((await getCapacityUsed(event._id)) >= event.capacity) {
      return NextResponse.json({ ok: false, code: 'EVENT_FULL', message: 'All seats are taken.' }, { status: 409 });
    }
    if (input.amount !== event.fee) {
      return NextResponse.json(
        { ok: false, code: 'AMOUNT_MISMATCH', message: `Amount must be ₹${event.fee}.` },
        { status: 400 }
      );
    }

    // 7. Idempotency — a retried submit returns the team it already created
    const existing = await findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return NextResponse.json({ ok: true, data: { teamId: existing.teamId, status: existing.status } }, { status: 201 });
    }

    // 8. Save team + payment together
    let teamId: string;
    try {
      ({ teamId } = await createTeamWithPayment(input, event, ipHashed, req.headers.get('user-agent') || ''));
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.utr) {
        return NextResponse.json(
          {
            ok: false,
            code: 'UTR_ALREADY_USED',
            message: 'This UTR is already linked to a registration.',
            fields: { utr: 'This UTR has already been used' },
          },
          { status: 409 }
        );
      }
      const dup = mapDuplicateKeyError(error, input.players as any);
      if (dup) return NextResponse.json({ ok: false, ...dup }, { status: 409 });
      throw error;
    }

    // 9. "We've received your submission" email
    const leader = input.players.find((p) => p.isLeader)!;
    const statusLink = await signMagicLink(teamId, 'status', event.day2Date);
    await enqueueEmail({
      to: leader.email,
      template: 'PROOF_RECEIVED',
      templateData: {
        teamId,
        teamName: input.teamName,
        utr: input.utr,
        amount: event.fee,
        players: input.players.map((p) => ({ fullName: p.fullName, regNo: p.regNo, isLeader: p.isLeader })),
        statusLink,
      },
      dedupeKey: `PROOF_RECEIVED:${teamId}:${input.utr}`,
    });
    after(async () => {
      try {
        await processQueue(5);
      } catch (e) {
        console.error('Email queue processing error:', e);
      }
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          teamId,
          status: 'UNDER_REVIEW',
          whatsappCommunityUrl:
            process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
            process.env.WHATSAPP_COMMUNITY_URL ||
            '',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/registrations error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Your data is safe — try again.' },
      { status: 500 }
    );
  }
}
