import { createHash } from 'crypto';
import { getDb } from '@/lib/db';

/**
 * MongoDB-based rate limiting with TTL index.
 *
 * Each rate limit is stored as a document in the `rateLimits` collection.
 * The TTL index on `expiresAt` auto-deletes expired entries.
 * No Redis needed — the small scale of this project doesn't justify it.
 */

/**
 * Hash an IP address for storage (no PII in the database).
 */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Extract the client IP from request headers.
 * Vercel sets x-forwarded-for; fallback to x-real-ip or 'unknown'.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}

/**
 * Check and increment a rate limit counter.
 *
 * @returns `true` if the limit is **exceeded** (caller should return 429).
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number
): Promise<boolean> {
  const db = await getDb();
  const col = db.collection('rateLimits');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSec * 1000);

  const result = await col.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  const count = result?.count ?? 0;
  return count > max;
}

/**
 * Log a blocked request to abuseLogs (no PII — only ipHash).
 */
export async function logAbuse(
  ipHash: string,
  endpoint: string,
  reason: string
): Promise<void> {
  const db = await getDb();
  await db.collection('abuseLogs').insertOne({
    ipHash,
    endpoint,
    reason,
    createdAt: new Date(),
  });
}
