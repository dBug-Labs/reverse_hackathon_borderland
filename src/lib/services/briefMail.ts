import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { sendEmail } from '@/lib/email/sender';
import { renderBrief } from '@/lib/email/templates/brief';
import { signMagicToken } from '@/lib/security/magicLink';
import { getCardDrop } from '@/lib/services/cardDrop';
import type { CardAssignment } from '@/lib/types';

/**
 * After the draw: mails every team its own card, its submission link and the deadlines,
 * with the submission guide PDF attached. Leader in To, the rest in CC.
 * Logged in `briefMails`, so a re-run only mails teams not yet mailed.
 * dryRun renders the first team's mail without sending anything.
 */
export async function mailBriefs(eventId: ObjectId, opts: { dryRun?: boolean } = {}) {
  const env = getEnv();
  const base = env.APP_URL.replace(/\/$/, '');
  const drop = await getCardDrop(eventId);
  if (!drop?.assignments?.length) return { error: 'The Card Drop has not been drawn yet.' } as const;

  const db = await getDb();
  const [event, regs, logged] = await Promise.all([
    db.collection('events').findOne({ _id: eventId }),
    db
      .collection('registrations')
      .find({ eventId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, teamName: 1, players: 1 } })
      .toArray(),
    db.collection('briefMails').find({ eventId }).toArray(),
  ]);
  const regBy = new Map(regs.map((r) => [r.teamId as string, r]));
  const already = new Set(logged.map((d) => d.teamId));
  const exp = new Date(new Date(event?.day2Date ?? Date.now() + 2 * 864e5).getTime() + 2 * 864e5);

  const guideUrl = `${base}/docs/HACKBACK-Submission-Guide.pdf`;
  let attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
  try {
    const res = await fetch(guideUrl);
    if (res.ok) attachments = [{ filename: 'HACKBACK-Submission-Guide.pdf', content: Buffer.from(await res.arrayBuffer()), contentType: 'application/pdf' }];
  } catch {
    /* the mail still links to the guide */
  }

  const build = async (a: CardAssignment) => {
    const reg = regBy.get(a.teamId);
    const card = CARD_BY_CODE[a.card];
    if (!reg || !card) return null;
    const token = await signMagicToken(a.teamId, 'status', exp);
    const q = `?t=${token}`;
    const mail = renderBrief({
      teamId: a.teamId,
      teamName: reg.teamName,
      card,
      track: TRACKS[card.track],
      solutionTitle: a.title,
      risk: a.risk,
      submitLink: `${base}/r/${a.teamId}/submit${q}`,
      teamLink: `${base}/r/${a.teamId}${q}`,
      guideUrl,
      playbookUrl: `${base}/playbook`,
    });
    const players = (reg.players || []) as Array<{ email: string; isLeader?: boolean }>;
    const emails = players.map((p) => p.email).filter(Boolean);
    const leader = players.find((p) => p.isLeader)?.email || emails[0];
    return { mail, emails, leader };
  };

  const todo = drop.assignments.filter((a) => !already.has(a.teamId));
  if (opts.dryRun) {
    const first = todo[0] ? await build(todo[0]) : null;
    return { dryRun: true, toSend: todo.map((a) => a.teamId), alreadyMailed: already.size, attached: attachments.length > 0, sample: first && { to: first.leader, cc: first.emails.filter((e) => e !== first.leader), subject: first.mail.subject, html: first.mail.html } };
  }

  const sent: string[] = [];
  const failed: Array<{ teamId: string; error: string }> = [];
  for (const a of todo) {
    const b = await build(a);
    if (!b || !b.emails.length) {
      failed.push({ teamId: a.teamId, error: 'no team or no emails' });
      continue;
    }
    try {
      const messageId = await sendEmail({ to: b.leader, cc: b.emails.filter((e) => e !== b.leader), ...b.mail, attachments });
      await db.collection('briefMails').insertOne({ eventId, teamId: a.teamId, card: a.card, to: b.emails, messageId, sentAt: new Date() });
      sent.push(a.teamId);
    } catch (err) {
      failed.push({ teamId: a.teamId, error: (err as Error).message });
    }
  }
  return { sent, failed, alreadyMailed: already.size, attached: attachments.length > 0 };
}
