import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { paymentSchema } from '@/lib/validation/payment';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { signMagicLink } from '@/lib/security/magicLink';
import { checkRateLimit, hashIp, getClientIp } from '@/lib/security/rateLimit';
import { getTeam, getActiveEvent } from '@/lib/services/registration';
import { submitUTR } from '@/lib/services/payment';
import { enqueueEmail, processQueue } from '@/lib/services/email';

/**
 * POST /api/registrations/[teamId]/payment — Step 2 (Submit UTR)
 *
 * Check order:
 * 1. Magic token verification
 * 2. Rate limit (5/10min per team)
 * 3. Turnstile (action: "payment")
 * 4. Zod validation
 * 5. Amount equals event fee
 * 6. Submit UTR (transactional: insert payment + update registration)
 * 7. Enqueue PROOF_RECEIVED email
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const ip = getClientIp(req.headers);
  const ipHashed = hashIp(ip);

  try {
    // 1. Magic token
    const url = new URL(req.url);
    const token = url.searchParams.get('t');
    if (!token || !(await verifyMagicToken(token, teamId, 'pay'))) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_LINK', message: 'This link is invalid or expired. Request a new one.' },
        { status: 401 }
      );
    }

    // 2. Rate limit — 5/10min per team
    const limited = await checkRateLimit(`pay:${teamId}:${ipHashed}`, 5, 10 * 60);
    if (limited) {
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 3. Turnstile
    const turnstile = await verifyTurnstileToken(body.turnstileToken, 'payment');
    if (!turnstile.ok) {
      return NextResponse.json(
        { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human. Please try again." },
        { status: 403 }
      );
    }

    // 4. Zod validation
    const parsed = paymentSchema.safeParse(body);
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

    // 5. Amount check
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, code: 'INTERNAL', message: 'No event configured' },
        { status: 500 }
      );
    }

    if (input.amount !== event.fee) {
      return NextResponse.json(
        {
          ok: false,
          code: 'AMOUNT_MISMATCH',
          message: `Amount must be ₹${event.fee}.`,
          fields: { amount: `Amount must be ₹${event.fee}` },
        },
        { status: 400 }
      );
    }

    // 6. Submit UTR (transactional)
    const result = await submitUTR(teamId, {
      utr: input.utr,
      amount: input.amount,
      payerUpi: input.payerUpi,
      paidAt: input.paidAt,
    });

    if (!result.success) {
      const err = result as { success: false; code: string; message: string };
      const statusCode = err.code === 'UTR_ALREADY_USED' ? 409 :
                          err.code === 'STALE_STATE' ? 409 :
                          err.code === 'MAX_REJECTIONS' ? 409 : 500;
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: statusCode }
      );
    }

    // 7. Enqueue PROOF_RECEIVED email
    const team = await getTeam(teamId);
    if (team) {
      const statusLink = await signMagicLink(teamId, 'status', event.day2Date);

      await enqueueEmail({
        to: team.leaderEmail,
        template: 'PROOF_RECEIVED',
        templateData: {
          teamId,
          teamName: team.teamName,
          utr: input.utr,
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
    }

    return NextResponse.json({
      ok: true,
      data: { status: 'UNDER_REVIEW' },
    });
  } catch (error) {
    console.error(`POST /api/registrations/${teamId}/payment error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Your data is safe — try again.' },
      { status: 500 }
    );
  }
}
