import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import type { SessionScope, SessionPayload } from '@/lib/types';

/**
 * Session management for admin and attendance areas.
 *
 * - Two separate cookies: `bnd_admin` and `bnd_attendance`
 * - JWT signed with SESSION_SECRET, contains scope + actor name + password version
 * - Password version (`pwv`) = first 8 hex chars of sha256(password)
 *   → changing the env password immediately invalidates all sessions
 */

const ADMIN_COOKIE = 'bnd_admin';
const ATTEND_COOKIE = 'bnd_attendance';
const ADMIN_EXP = '8h';
const ATTEND_EXP = '14h';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

/**
 * Compute the password version: first 8 hex chars of sha256(password).
 * Used in the JWT so that changing the env password logs everyone out.
 */
export function computePwv(password: string): string {
  return createHash('sha256').update(password).digest('hex').slice(0, 8);
}

/**
 * Compare a plaintext password against an env password using constant-time comparison.
 * Both are sha256-hashed before comparison to normalise length.
 */
export function verifyPassword(input: string, envPassword: string): boolean {
  const inputHash = createHash('sha256').update(input).digest();
  const envHash = createHash('sha256').update(envPassword).digest();

  if (inputHash.length !== envHash.length) return false;
  return timingSafeEqual(inputHash, envHash);
}

/**
 * Sign a new session JWT for the given scope and actor name.
 */
export async function signSession(scope: SessionScope, name: string): Promise<string> {
  const env = getEnv();
  const password = scope === 'admin' ? env.ADMIN_PASSWORD : env.ATTENDANCE_PASSWORD;
  const exp = scope === 'admin' ? ADMIN_EXP : ATTEND_EXP;

  return new SignJWT({ scope, name, pwv: computePwv(password) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(getSecret());
}

/**
 * Verify a session JWT and check scope + password version.
 * Returns the actor name or null if invalid.
 */
export async function verifySession(
  token: string,
  expectedScope: SessionScope
): Promise<{ name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as SessionPayload;

    // Wrong scope → reject
    if (p.scope !== expectedScope) return null;

    // Password version check — if the env password was rotated, this fails
    const env = getEnv();
    const currentPwv = computePwv(
      expectedScope === 'admin' ? env.ADMIN_PASSWORD : env.ATTENDANCE_PASSWORD
    );
    if (p.pwv !== currentPwv) return null;

    return { name: p.name };
  } catch {
    return null;
  }
}

/**
 * Route-handler-level scope check.
 * Call this at the top of EVERY admin or attendance route handler.
 *
 * Returns the session info `{ name }` on success,
 * or a 401 NextResponse if the session is invalid.
 */
export async function requireScope(
  req: NextRequest,
  scope: SessionScope
): Promise<{ name: string } | NextResponse> {
  const cookieName = scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
  const token = req.cookies.get(cookieName)?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Authentication required' },
      { status: 401 }
    );
  }

  const session = await verifySession(token, scope);
  if (!session) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Session expired or invalid' },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Set the session cookie on a response.
 */
export function setSessionCookie(
  res: NextResponse,
  scope: SessionScope,
  token: string
): void {
  const cookieName = scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
  const maxAge = scope === 'admin' ? 8 * 60 * 60 : 14 * 60 * 60;

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

/**
 * Clear the session cookie on a response.
 */
export function clearSessionCookie(res: NextResponse, scope: SessionScope): void {
  const cookieName = scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
  res.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Get the cookie name for a scope.
 */
export function getCookieName(scope: SessionScope): string {
  return scope === 'admin' ? ADMIN_COOKIE : ATTEND_COOKIE;
}
