import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { computePwv } from '@/lib/security/session';

/**
 * Login for /code-review, the post-freeze code review kit. It has its own password
 * (CODE_REVIEW_PASSWORD) and cookie, so it can be handed to reviewers without the admin login.
 * Changing the password logs everyone out (same password-version trick as the admin session).
 */

const COOKIE = 'bnd_codereview';
const EXP_S = 10 * 60 * 60;

export const codeReviewPassword = () => process.env.CODE_REVIEW_PASSWORD || '';

const secret = () => new TextEncoder().encode(getEnv().SESSION_SECRET);

export async function signCodeReview(name: string): Promise<string> {
  return new SignJWT({ scope: 'codereview', name, pwv: computePwv(codeReviewPassword()) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXP_S}s`)
    .sign(secret());
}

export async function requireCodeReview(req: NextRequest): Promise<{ name: string } | NextResponse> {
  const deny = (message: string) => NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message }, { status: 401 });
  const pw = codeReviewPassword();
  if (!pw) return deny('Code review is not set up yet (CODE_REVIEW_PASSWORD).');
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return deny('Authentication required');
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.scope !== 'codereview' || payload.pwv !== computePwv(pw)) return deny('Session expired or invalid');
    return { name: String(payload.name || 'reviewer') };
  } catch {
    return deny('Session expired or invalid');
  }
}

export function setCodeReviewCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: token ? EXP_S : 0 });
}
