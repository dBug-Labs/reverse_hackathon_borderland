import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';

/**
 * Leader email verification (OTP) before payment — stateless.
 *
 * 1. sendOtp:   6-digit code emailed; the client gets an `otpToken` (JWT)
 *               carrying the email + an HMAC of the code (never the code).
 * 2. verifyOtp: client sends otpToken + code → gets a `leaderEmailToken`.
 * 3. Final submit requires a leaderEmailToken for the leader's email.
 *
 * Signed with LINK_SECRET; `purpose` stops tokens being swapped between steps.
 */

const OTP_TTL_SEC = 10 * 60;
const VERIFIED_TTL_SEC = 3 * 60 * 60;

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().LINK_SECRET);
}

function codeHash(email: string, code: string): string {
  return createHmac('sha256', getEnv().LINK_SECRET).update(`otp:${email}:${code}`).digest('hex');
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function signOtpToken(email: string, code: string): Promise<string> {
  return new SignJWT({ purpose: 'email_otp', email, h: codeHash(email, code) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SEC}s`)
    .sign(secret());
}

/** Returns the verified email, or null if the token/code is wrong or expired. */
export async function checkOtp(otpToken: string, code: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(otpToken, secret());
    if (payload.purpose !== 'email_otp' || typeof payload.email !== 'string' || typeof payload.h !== 'string') {
      return null;
    }
    const expected = Buffer.from(codeHash(payload.email, code));
    const actual = Buffer.from(payload.h);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? payload.email : null;
  } catch {
    return null;
  }
}

export async function signLeaderEmailToken(email: string): Promise<string> {
  return new SignJWT({ purpose: 'leader_email', email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${VERIFIED_TTL_SEC}s`)
    .sign(secret());
}

export async function verifyLeaderEmailToken(token: unknown, email: string): Promise<boolean> {
  if (typeof token !== 'string' || !token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.purpose === 'leader_email' && payload.email === email;
  } catch {
    return false;
  }
}
