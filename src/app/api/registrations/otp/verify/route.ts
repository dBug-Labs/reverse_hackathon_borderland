import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { checkOtp, signLeaderEmailToken } from '@/lib/security/emailOtp';

/**
 * POST /api/registrations/otp/verify — { otpToken, code } → leaderEmailToken
 *
 * Limits: 10 tries / 10 min per IP, so a 6-digit code can't be brute-forced.
 */

export async function POST(req: NextRequest) {
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    if (await checkRateLimit(`otpverify:${ipHashed}`, 10, 10 * 60)) {
      await logAbuse(ipHashed, 'POST /api/registrations/otp/verify', 'rate_limit');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const code = String(body.code || '').trim();
    const email = /^\d{6}$/.test(code) && typeof body.otpToken === 'string' ? await checkOtp(body.otpToken, code) : null;

    if (!email) {
      return NextResponse.json(
        { ok: false, code: 'OTP_INVALID', message: 'Wrong or expired code.', fields: { otp: 'Wrong or expired code' } },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: { email, leaderEmailToken: await signLeaderEmailToken(email) } });
  } catch (error) {
    console.error('POST /api/registrations/otp/verify error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Please try again.' },
      { status: 500 }
    );
  }
}
