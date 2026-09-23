import { NextRequest, NextResponse } from 'next/server';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/security/session';
import { getEnv } from '@/lib/env';

/**
 * POST /api/admin/login
 *
 * Rate limited: 5 attempts per 15 min per IP.
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipHashed = hashIp(ip);

  try {
    // Rate limit
    const limited = await checkRateLimit(`admin_login:${ipHashed}`, 5, 15 * 60);
    if (limited) {
      await logAbuse(ipHashed, 'POST /api/admin/login', 'rate_limit');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
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

    // Turnstile
    const turnstile = await verifyTurnstileToken(turnstileToken, 'admin_login');
    if (!turnstile.ok) {
      return NextResponse.json(
        { ok: false, code: 'CAPTCHA_FAILED', message: "Couldn't verify you're human." },
        { status: 403 }
      );
    }

    // Password check
    const env = getEnv();
    if (!verifyPassword(password, env.ADMIN_PASSWORD)) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_PASSWORD', message: 'Incorrect password' },
        { status: 401 }
      );
    }

    const token = await signSession('admin', name.trim());
    const res = NextResponse.json({ ok: true, data: { name: name.trim() } });
    setSessionCookie(res, 'admin', token);

    return res;
  } catch (error) {
    console.error('POST /api/admin/login error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
