import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, hashIp, logAbuse } from '@/lib/security/rateLimit';
import { verifyPassword } from '@/lib/security/session';
import { codeReviewPassword, setCodeReviewCookie, signCodeReview } from '@/lib/security/codeReview';

/**
 * POST /api/code-review/login { name, password } — rate limited: 10 attempts per 15 min per IP
 * (judges share the venue Wi-Fi). DELETE logs out.
 */

export async function POST(req: NextRequest) {
  const ipHashed = hashIp(getClientIp(req.headers));
  try {
    if (await checkRateLimit(`code_review_login:${ipHashed}`, 10, 15 * 60)) {
      await logAbuse(ipHashed, 'POST /api/code-review/login', 'rate_limit');
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { name?: string; password?: string };
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name || !body.password) return NextResponse.json({ ok: false, code: 'VALIDATION_ERROR', message: 'Name and password are required' }, { status: 400 });
    const pw = codeReviewPassword();
    if (!pw) return NextResponse.json({ ok: false, code: 'NOT_CONFIGURED', message: 'Code review is not set up yet.' }, { status: 503 });
    if (!verifyPassword(String(body.password), pw)) return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD', message: 'Incorrect password' }, { status: 401 });
    const res = NextResponse.json({ ok: true, data: { name } });
    setCodeReviewCookie(res, await signCodeReview(name));
    return res;
  } catch (error) {
    console.error('POST /api/code-review/login error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, data: null });
  setCodeReviewCookie(res, '');
  return res;
}
