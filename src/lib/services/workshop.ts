import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { sendEmail } from '@/lib/email/sender';
import { renderWorkshop } from '@/lib/email/templates/workshop';

const BASE = 'https://dbuglabshackback.vercel.app';

/**
 * Mails the workshop link to every team marked present on Day 1 (morning or post-lunch)
 * that has not been mailed yet. Leader in To, the rest in CC. Logged in `workshopMails`.
 */
export async function mailPresentTeams(eventId: ObjectId) {
  const db = await getDb();
  const teams = await db
    .collection('registrations')
    .find(
      { eventId, status: 'CONFIRMED', deletedAt: { $exists: false }, 'attendance.day': { $in: [1, 3] } },
      { projection: { teamId: 1, teamName: 1, players: 1 } }
    )
    .sort({ teamId: 1 })
    .toArray();
  const log = db.collection('workshopMails');
  const already = new Set((await log.find({ eventId }).toArray()).map((d) => d.teamId));

  const sent: string[] = [];
  const failed: Array<{ teamId: string; error: string }> = [];
  for (const t of teams) {
    if (already.has(t.teamId)) continue;
    const players = (t.players || []) as Array<{ email: string; isLeader?: boolean }>;
    const emails = players.map((p) => p.email).filter(Boolean);
    if (!emails.length) continue;
    const leader = players.find((p) => p.isLeader)?.email || emails[0];
    const mail = renderWorkshop({ teamId: t.teamId, teamName: t.teamName }, BASE);
    try {
      const messageId = await sendEmail({ to: leader, cc: emails.filter((e) => e !== leader), ...mail });
      await log.insertOne({ eventId, teamId: t.teamId, to: emails, messageId, sentAt: new Date() });
      sent.push(t.teamId);
    } catch (err) {
      failed.push({ teamId: t.teamId, error: (err as Error).message });
    }
  }
  return { present: teams.length, alreadyMailed: already.size, sent, failed };
}
