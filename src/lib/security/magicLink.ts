import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from '@/lib/env';
import type { LinkType } from '@/lib/types';

/**
 * Magic links for participants (no accounts needed).
 *
 * Signed with LINK_SECRET (separate from SESSION_SECRET).
 * Each link carries the teamId and type, preventing cross-use.
 *
 * The attendance QR is NOT a magic link — it's plain text.
 */

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().LINK_SECRET);
}

/**
 * Generate a full magic link URL.
 *
 * @param teamId - e.g. "DBG-472"
 * @param type - "pay" | "status" | "visa"
 * @param expiresAt - when the link stops working
 */
export async function signMagicLink(
  teamId: string,
  type: LinkType,
  expiresAt: Date
): Promise<string> {
  const env = getEnv();

  const token = await new SignJWT({ teamId, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());

  const pathMap: Record<LinkType, string> = {
    pay: `register/pay/${teamId}`,
    status: `r/${teamId}`,
    visa: `visa/${teamId}`,
  };

  return `${env.APP_URL}/${pathMap[type]}?t=${token}`;
}

/**
 * Generate just the token (without the full URL).
 * Useful when you need to include the token in API responses.
 */
export async function signMagicToken(
  teamId: string,
  type: LinkType,
  expiresAt: Date
): Promise<string> {
  return new SignJWT({ teamId, type })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecret());
}

/**
 * Verify a magic link token.
 *
 * @returns `true` if valid, `false` if expired, tampered, or wrong team/type.
 */
export async function verifyMagicToken(
  token: string,
  expectedTeamId: string,
  expectedType: LinkType
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (
      payload.teamId === expectedTeamId &&
      payload.type === expectedType
    );
  } catch {
    return false;
  }
}
