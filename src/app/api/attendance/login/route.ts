import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/security/session';
import { getEnv } from '@/lib/env';

/**
 * POST /api/attendance/login
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipHashed = hashIp(ip);

  try {
    const limited = await checkRateLimit(`attend_login:${ipHashed}`, 5, 15 * 60);
    if (limited) {
      await logAbuse(ipHashed, 'POST /api/attendance/login', 'rate_limit');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many login attempts.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password, name, turnstileToken } = body;

    if (!password || !name) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Name and password are required' },
        { status: 400 }
      );
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, 'attendance_login');
    if (!turnstile.ok) {
      return NextResponse.json(
        { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human." },
        { status: 403 }
      );
    }

    const env = getEnv();
    if (!verifyPassword(password, env.ATTENDANCE_PASSWORD)) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_PASSWORD', message: 'Incorrect password' },
        { status: 401 }
      );
    }

    const token = await signSession('attendance', name.trim());
    const res = NextResponse.json({ ok: true, data: { name: name.trim() } });
    setSessionCookie(res, 'attendance', token);

    return res;
  } catch (error) {
    console.error('POST /api/attendance/login error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
