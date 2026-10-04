import { createHash, randomBytes } from 'crypto';
import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/services/audit';
import { CARD_BY_CODE, capFor } from '@/lib/cardDrop/cards';
import { assignCards, shuffleOrder } from '@/lib/cardDrop/draw';
import type { CardAssignment, CardDropDoc, CardPref, Registration, RiskCard } from '@/lib/types';

/**
 * Card Drop: teams rank the PS cards, then a sealed random draw gives each
 * team a card. See src/lib/cardDrop/draw.ts for how the draw works.
 */

type Fail = { ok: false; code: string; message: string };
type Ok<T> = { ok: true; data: T };
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

export const sha256Hex = (s: string) => createHash('sha256').update(s).digest('hex');

async function collections() {
  const db = await getDb();
  return {
    drops: db.collection<CardDropDoc>('cardDrop'),
    prefs: db.collection<CardPref>('cardPrefs'),
    regs: db.collection<Registration>('registrations'),
  };
}

export async function getCardDrop(eventId: ObjectId): Promise<CardDropDoc | null> {
  const { drops } = await collections();
  return drops.findOne({ eventId });
}

export interface EligibleTeam {
  teamId: string;
  teamName: string;
  players: number;
  presentDay1: boolean;
}

/** Confirmed, not-deleted teams of the event. */
export async function getEligibleTeams(eventId: ObjectId): Promise<EligibleTeam[]> {
  const { regs } = await collections();
  const rows = await regs
    .find(
      { eventId, status: 'CONFIRMED', deletedAt: { $exists: false } },
      { projection: { teamId: 1, teamName: 1, players: 1, attendance: 1 } }
    )
    .sort({ teamId: 1 })
    .toArray();
  return rows.map((r) => ({
    teamId: r.teamId,
    teamName: r.teamName,
    players: r.players?.length ?? 0,
    presentDay1: (r.attendance || []).some((a) => a.day === 1),
  }));
}

export async function listPrefs(eventId: ObjectId): Promise<CardPref[]> {
  const { prefs } = await collections();
  return prefs.find({ eventId }).toArray();
}

// ── Admin actions ───────────────────────────────────────────────────────────

export async function openCardDrop(eventId: ObjectId, actor: string, ipHash: string): Promise<Ok<CardDropDoc> | Fail> {
  const { drops } = await collections();
  if (await drops.findOne({ eventId })) return fail('ALREADY_OPEN', 'The Card Drop is already open.');

  const seed = randomBytes(32).toString('hex');
  const now = new Date();
  const doc: Omit<CardDropDoc, '_id'> = {
    eventId,
    phase: 'PREFS_OPEN',
    seed,
    seedHash: sha256Hex(seed),
    openedAt: now,
    openedBy: actor,
    updatedAt: now,
  };
  try {
    const res = await drops.insertOne(doc as CardDropDoc);
    await logAction(actor, 'admin', 'CARD_DROP_OPEN', 'card-drop', ipHash, undefined, { seedHash: doc.seedHash });
    return { ok: true, data: { ...(doc as CardDropDoc), _id: res.insertedId } };
  } catch {
    return fail('ALREADY_OPEN', 'The Card Drop is already open.');
  }
}

function validChoices(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const choices = raw.filter((c): c is string => typeof c === 'string');
  if (choices.length < 1 || choices.length > 3 || choices.length !== raw.length) return null;
  if (new Set(choices).size !== choices.length) return null;
  if (!choices.every((c) => CARD_BY_CODE[c])) return null;
  return choices;
}

export async function setPrefs(
  eventId: ObjectId,
  teamId: string,
  rawChoices: unknown,
  by: { actor: string; scope: 'team' | 'admin'; ipHash: string }
): Promise<Ok<CardPref> | Fail> {
  const { drops, prefs, regs } = await collections();
  const drop = await drops.findOne({ eventId });
  if (!drop || drop.phase !== 'PREFS_OPEN') return fail('NOT_OPEN', 'Card choices are not open right now.');

  const choices = validChoices(rawChoices);
  if (!choices) return fail('VALIDATION', 'Pick 1 to 3 different cards.');

  const team = await regs.findOne({ eventId, teamId, status: 'CONFIRMED', deletedAt: { $exists: false } });
  if (!team) return fail('NOT_ELIGIBLE', 'Only confirmed teams can take part in the Card Drop.');

  const now = new Date();
  const submittedBy = by.scope === 'team' ? 'team' : by.actor;
  await prefs.updateOne(
    { eventId, teamId },
    { $set: { choices, submittedAt: now, submittedBy }, $setOnInsert: { eventId, teamId } },
    { upsert: true }
  );
  if (by.scope === 'admin') {
    await logAction(by.actor, 'admin', 'CARD_PREFS_SET', teamId, by.ipHash, undefined, { choices });
  }
  const saved = await prefs.findOne({ eventId, teamId });
  return { ok: true, data: saved as CardPref };
}

export async function runDraw(
  eventId: ObjectId,
  actor: string,
  presentOnly: boolean,
  ipHash: string
): Promise<Ok<CardDropDoc> | Fail> {
  const { drops } = await collections();
  const drop = await drops.findOne({ eventId });
  if (!drop) return fail('NOT_OPEN', 'Open the Card Drop first.');
  if (drop.phase !== 'PREFS_OPEN') return fail('ALREADY_DRAWN', 'The draw has already happened.');

  const all = await getEligibleTeams(eventId);
  const teams = presentOnly ? all.filter((t) => t.presentDay1) : all;
  if (teams.length === 0) {
    return fail('NO_TEAMS', presentOnly ? 'No confirmed team is checked in for Day 1 yet.' : 'There are no confirmed teams.');
  }

  const prefRows = await listPrefs(eventId);
  const prefMap: Record<string, string[]> = Object.fromEntries(prefRows.map((p) => [p.teamId, p.choices]));
  const names: Record<string, string> = Object.fromEntries(teams.map((t) => [t.teamId, t.teamName]));

  const cap = capFor(teams.length);
  const order = shuffleOrder(drop.seed, teams.map((t) => t.teamId));
  const assignments: CardAssignment[] = assignCards(order, prefMap, cap).map((r) => ({
    ...r,
    teamName: names[r.teamId],
  }));

  const now = new Date();
  const res = await drops.findOneAndUpdate(
    { eventId, phase: 'PREFS_OPEN' },
    { $set: { phase: 'DRAWN', cap, presentOnly, order, assignments, drawnAt: now, drawnBy: actor, updatedAt: now } },
    { returnDocument: 'after' }
  );
  if (!res) return fail('ALREADY_DRAWN', 'The draw has already happened.');

  await logAction(actor, 'admin', 'CARD_DROP_DRAW', 'card-drop', ipHash, undefined, {
    teams: teams.length,
    cap,
    presentOnly,
    seed: drop.seed,
  });
  return { ok: true, data: res };
}

async function requireDrawn(eventId: ObjectId): Promise<CardDropDoc | Fail> {
  const { drops } = await collections();
  const drop = await drops.findOne({ eventId });
  if (!drop || !drop.assignments) return fail('NOT_DRAWN', 'The draw has not happened yet.');
  if (drop.phase === 'LOCKED') return fail('LOCKED', 'The Card Drop is locked.');
  return drop;
}

export async function moveTeam(
  eventId: ObjectId,
  teamId: string,
  card: string,
  actor: string,
  ipHash: string
): Promise<Ok<CardDropDoc> | Fail> {
  const drop = await requireDrawn(eventId);
  if ('ok' in drop) return drop;
  if (!CARD_BY_CODE[card]) return fail('VALIDATION', 'Unknown card.');

  const current = drop.assignments!.find((a) => a.teamId === teamId);
  if (!current) return fail('NOT_FOUND', `${teamId} is not in the draw.`);
  if (current.card === card) return fail('VALIDATION', `${teamId} already has this card.`);
  const taken = drop.assignments!.filter((a) => a.card === card).length;
  if (taken >= (drop.cap ?? 3)) return fail('CARD_FULL', 'That card is full. Swap two teams instead.');

  const { drops } = await collections();
  const res = await drops.findOneAndUpdate(
    { eventId, phase: 'DRAWN', 'assignments.teamId': teamId },
    { $set: { 'assignments.$.card': card, 'assignments.$.movedBy': actor, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!res) return fail('LOCKED', 'The Card Drop is locked.');
  await logAction(actor, 'admin', 'CARD_MOVE', teamId, ipHash, { card: current.card }, { card });
  return { ok: true, data: res };
}

export async function swapTeams(
  eventId: ObjectId,
  teamA: string,
  teamB: string,
  actor: string,
  ipHash: string
): Promise<Ok<CardDropDoc> | Fail> {
  const drop = await requireDrawn(eventId);
  if ('ok' in drop) return drop;
  const a = drop.assignments!.find((x) => x.teamId === teamA);
  const b = drop.assignments!.find((x) => x.teamId === teamB);
  if (!a || !b) return fail('NOT_FOUND', 'Both teams must be in the draw.');
  if (a.card === b.card) return fail('VALIDATION', 'Both teams already hold the same card.');

  const assignments = drop.assignments!.map((x) =>
    x.teamId === teamA ? { ...x, card: b.card, movedBy: actor } : x.teamId === teamB ? { ...x, card: a.card, movedBy: actor } : x
  );
  const { drops } = await collections();
  const res = await drops.findOneAndUpdate(
    { eventId, phase: 'DRAWN' },
    { $set: { assignments, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!res) return fail('LOCKED', 'The Card Drop is locked.');
  await logAction(actor, 'admin', 'CARD_SWAP', `${teamA}<>${teamB}`, ipHash, { [teamA]: a.card, [teamB]: b.card }, {
    [teamA]: b.card,
    [teamB]: a.card,
  });
  return { ok: true, data: res };
}

export async function lockCardDrop(eventId: ObjectId, actor: string, ipHash: string): Promise<Ok<CardDropDoc> | Fail> {
  const { drops } = await collections();
  const now = new Date();
  const res = await drops.findOneAndUpdate(
    { eventId, phase: 'DRAWN' },
    { $set: { phase: 'LOCKED', lockedAt: now, lockedBy: actor, updatedAt: now } },
    { returnDocument: 'after' }
  );
  if (!res) return fail('NOT_DRAWN', 'Only a drawn Card Drop can be locked.');
  await logAction(actor, 'admin', 'CARD_DROP_LOCK', 'card-drop', ipHash);
  return { ok: true, data: res };
}

/** Wipes the draw and every team's choices. For rehearsals only. */
export async function resetCardDrop(eventId: ObjectId, actor: string, ipHash: string): Promise<Ok<null>> {
  const { drops, prefs } = await collections();
  const before = await drops.findOne({ eventId });
  await drops.deleteOne({ eventId });
  const removed = await prefs.deleteMany({ eventId });
  await logAction(actor, 'admin', 'CARD_DROP_RESET', 'card-drop', ipHash, {
    phase: before?.phase,
    prefs: removed.deletedCount,
  });
  return { ok: true, data: null };
}

// ── Team actions ────────────────────────────────────────────────────────────

const TITLE_MAX = 60;

export async function lockTeamChoice(
  eventId: ObjectId,
  teamId: string,
  rawTitle: unknown,
  rawRisk: unknown
): Promise<Ok<CardAssignment> | Fail> {
  const title = typeof rawTitle === 'string' ? rawTitle.trim().replace(/\s+/g, ' ') : '';
  if (title.length < 3 || title.length > TITLE_MAX) return fail('VALIDATION', `Give a title of 3 to ${TITLE_MAX} characters.`);
  if (rawRisk !== 'STANDARD' && rawRisk !== 'HIGH') return fail('VALIDATION', 'Choose Standard or High Risk.');
  const risk = rawRisk as RiskCard;

  const { drops } = await collections();
  const res = await drops.findOneAndUpdate(
    { eventId, phase: 'DRAWN', 'assignments.teamId': teamId },
    {
      $set: {
        'assignments.$.title': title,
        'assignments.$.risk': risk,
        'assignments.$.lockedAt': new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  if (!res) {
    const drop = await getCardDrop(eventId);
    if (drop?.phase === 'LOCKED') return fail('LOCKED', 'The Card Drop is locked. Ask a Game Master to change it.');
    return fail('NOT_DRAWN', 'Your team is not in the draw.');
  }
  return { ok: true, data: res.assignments!.find((a) => a.teamId === teamId)! };
}

// ── Views ───────────────────────────────────────────────────────────────────

export interface AdminCardDropView {
  phase: 'CLOSED' | CardDropDoc['phase'];
  seedHash?: string;
  seed?: string; // only after the draw
  cap: number;
  presentOnly?: boolean;
  openedAt?: Date;
  drawnAt?: Date;
  drawnBy?: string;
  lockedAt?: Date;
  order: string[];
  assignments: CardAssignment[];
  teams: Array<EligibleTeam & { choices: string[]; prefsBy?: string; prefsAt?: Date }>;
}

export async function getAdminView(eventId: ObjectId): Promise<AdminCardDropView> {
  const [drop, teams, prefRows] = await Promise.all([getCardDrop(eventId), getEligibleTeams(eventId), listPrefs(eventId)]);
  const prefMap = Object.fromEntries(prefRows.map((p) => [p.teamId, p]));
  return {
    phase: drop?.phase ?? 'CLOSED',
    seedHash: drop?.seedHash,
    seed: drop && drop.phase !== 'PREFS_OPEN' ? drop.seed : undefined,
    cap: drop?.cap ?? capFor(teams.length),
    presentOnly: drop?.presentOnly,
    openedAt: drop?.openedAt,
    drawnAt: drop?.drawnAt,
    drawnBy: drop?.drawnBy,
    lockedAt: drop?.lockedAt,
    order: drop?.order ?? [],
    assignments: drop?.assignments ?? [],
    teams: teams.map((t) => ({
      ...t,
      choices: prefMap[t.teamId]?.choices ?? [],
      prefsBy: prefMap[t.teamId]?.submittedBy,
      prefsAt: prefMap[t.teamId]?.submittedAt,
    })),
  };
}

export interface TeamCardDropView {
  phase: 'CLOSED' | CardDropDoc['phase'];
  seedHash?: string;
  choices: string[];
  assignment?: CardAssignment;
  rivals: Array<{ teamId: string; teamName: string }>;
}

export async function getTeamView(eventId: ObjectId, teamId: string): Promise<TeamCardDropView> {
  const { prefs } = await collections();
  const [drop, pref] = await Promise.all([getCardDrop(eventId), prefs.findOne({ eventId, teamId })]);
  const assignment = drop?.assignments?.find((a) => a.teamId === teamId);
  const rivals = assignment
    ? drop!.assignments!.filter((a) => a.card === assignment.card && a.teamId !== teamId).map((a) => ({ teamId: a.teamId, teamName: a.teamName }))
    : [];
  return {
    phase: drop?.phase ?? 'CLOSED',
    seedHash: drop?.seedHash,
    choices: pref?.choices ?? [],
    assignment,
    rivals,
  };
}
