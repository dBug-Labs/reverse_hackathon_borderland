import { getDb } from '@/lib/db';
import type { AuditLog, SessionScope } from '@/lib/types';

/**
 * Write an audit log entry.
 *
 * Every admin or attendance action that changes data must be logged
 * with the actor's name (from the JWT session).
 */
export async function logAction(
  actorName: string,
  scope: SessionScope,
  action: string,
  targetId: string,
  ipHash: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> {
  const db = await getDb();

  const entry: Omit<AuditLog, '_id'> = {
    actorName,
    scope,
    action,
    targetId,
    before,
    after,
    ipHash,
    createdAt: new Date(),
  };

  await db.collection('auditLogs').insertOne(entry as any);
}
