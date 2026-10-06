import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { CARD_BY_CODE, TRACKS, type TrackId } from '@/lib/cardDrop/cards';
import { getCardDrop } from '@/lib/services/cardDrop';
import { etaFor, panelTracks, queueOf, type JudgingState, type PanelInfo, type Slot, type TeamJudging } from '@/lib/judging/types';

/**
 * Final judging panels.
 *
 * The draw takes every confirmed team marked present after lunch on Day 2 (attendance
 * session 4) and puts it in front of the panel for its own track. A panel that would get
 * more than its share hands its extra teams (picked at random) to the emptiest panels,
 * so all four finish around the same time. The calling order inside a panel is random.
 *
 * One document per event. The projector, the control room and the phones poll it.
 */

type Fail = { ok: false; code: string; message: string };
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

interface JudgingDoc extends Omit<JudgingState, 'now'> {
  _id?: ObjectId;
  eventId: ObjectId;
  /** The one-time move of the start from 1:15 to 2:00 PM has been applied. */
  startMoved?: boolean;
  /** The one-time move from four panels to two has been applied. */
  twoPanels?: boolean;
  updatedAt: Date;
}

const DEFAULT_SLOT_MIN = 8;

/** 2:00 PM IST on Day 2 (falls back to today). Moved from 1:15 when the code freeze moved to 1:30. */
async function defaultStart(eventId: ObjectId): Promise<number> {
  const db = await getDb();
  const ev = await db.collection('events').findOne({ _id: eventId }, { projection: { day2Date: 1 } });
  const day = ev?.day2Date ? new Date(ev.day2Date as string | Date) : new Date();
  const ymd = new Date(day.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
  return new Date(`${ymd}T14:00:00+05:30`).getTime();
}

/** Two panels, two tracks each (balanced by team count). */
const PANEL_GROUPS: { tracks: TrackId[]; suit: PanelInfo['suit']; judges: string }[] = [
  { tracks: ['vault', 'cyber'], suit: '♦', judges: 'N Prasath' },
  { tracks: ['institution', 'grid'], suit: '♠', judges: 'Dr Joseph Raymond' },
];

const defaultPanels = (): PanelInfo[] =>
  PANEL_GROUPS.map((g, i) => ({ suit: g.suit, track: g.tracks[0], tracks: g.tracks, name: `Panel ${i + 1} · ${g.tracks.map((t) => TRACKS[t].label).join(' + ')}`, place: '', judges: g.judges }));


async function col() {
  return (await getDb()).collection<JudgingDoc>('judging');
}

let cache: { id: string; at: number; doc: JudgingDoc | null } | null = null;

async function load(eventId: ObjectId, fresh = false): Promise<JudgingDoc> {
  const key = eventId.toHexString();
  if (!fresh && cache && cache.id === key && Date.now() - cache.at < 800 && cache.doc) return cache.doc;
  const c = await col();
  let doc: JudgingDoc | null = await c.findOne({ eventId });
  if (!doc) {
    doc = { eventId, status: 'SETUP', v: 1, startAt: await defaultStart(eventId), slotMin: DEFAULT_SLOT_MIN, mode: 'track', panels: defaultPanels(), slots: [], updatedAt: new Date() };
  } else if (!doc.startMoved) {
    // One time: judging moved from 1:15 to 2:00 PM. A start still on the old 1:15 moves with it;
    // anything set by hand stays. After this, the admin's setting always wins.
    const ymd = new Date(doc.startAt + 5.5 * 3600_000).toISOString().slice(0, 10);
    const set: Partial<JudgingDoc> = { startMoved: true };
    if (doc.startAt === new Date(`${ymd}T13:15:00+05:30`).getTime()) set.startAt = new Date(`${ymd}T14:00:00+05:30`).getTime();
    await c.updateOne({ _id: doc._id }, { $set: set });
    doc = { ...doc, ...set };
  }
  if (doc._id && !doc.twoPanels) {
    // One time: four panels became two. Each old panel's teams join the new panel that covers
    // its track, keeping who is done or called; waiting teams interleave so neither track waits.
    const panels = defaultPanels();
    const to = (i: number) => {
      const tr = doc!.panels[i]?.track;
      const p = panels.findIndex((x) => tr && panelTracks(x).includes(tr));
      return p >= 0 ? p : i % panels.length;
    };
    const slots = doc.slots.map((s) => ({ ...s, panel: to(s.panel), order: s.order * 10 + (s.panel % 10) }));
    panels.forEach((_, p) => {
      const rank = (s: Slot) => (s.state === 'done' ? 0 : s.state === 'called' ? 1 : 2);
      slots
        .filter((s) => s.panel === p)
        .sort((a, b) => rank(a) - rank(b) || a.order - b.order)
        .forEach((s, i) => (s.order = i));
    });
    slots.forEach((s) => (s.moved = (!!s.track && !panelTracks(panels[s.panel]).includes(s.track)) || undefined));
    const set: Partial<JudgingDoc> = { twoPanels: true, panels: doc.panels.length === panels.length ? doc.panels : panels, slots };
    await c.updateOne({ _id: doc._id }, { $set: set, $inc: { v: 1 } });
    doc = { ...doc, ...set, v: doc.v + 1 };
  }
  cache = { id: key, at: Date.now(), doc };
  return doc;
}

const toState = (d: JudgingDoc): JudgingState => {
  const { _id, eventId, updatedAt, startMoved, twoPanels, ...rest } = d;
  void startMoved;
  void twoPanels;
  void _id;
  void eventId;
  void updatedAt;
  return { ...rest, now: Date.now() };
};

export async function getJudging(eventId: ObjectId): Promise<JudgingState> {
  return toState(await load(eventId));
}

/** Present after lunch (or in another session), with each team's card and track. */
async function presentTeams(eventId: ObjectId, session: number) {
  const db = await getDb();
  const [regs, drop] = await Promise.all([
    db
      .collection('registrations')
      .find(
        { eventId, status: 'CONFIRMED', deletedAt: { $exists: false }, attendance: { $elemMatch: { day: session, 'playersPresent.0': { $exists: true } } } },
        { projection: { teamId: 1, teamName: 1 } }
      )
      .sort({ teamId: 1 })
      .toArray(),
    getCardDrop(eventId),
  ]);
  const cardOf = new Map((drop?.assignments ?? []).map((a) => [a.teamId, a.card]));
  return regs.map((r) => {
    const card = cardOf.get(r.teamId as string);
    return { teamId: r.teamId as string, teamName: r.teamName as string, card, track: card ? CARD_BY_CODE[card]?.track : undefined };
  });
}

/** How many teams each session has marked present (for the control room). */
export async function presentCounts(eventId: ObjectId): Promise<Record<number, number>> {
  const db = await getDb();
  const rows = await db
    .collection('registrations')
    .aggregate<{ _id: number; n: number }>([
      { $match: { eventId, status: 'CONFIRMED', deletedAt: { $exists: false } } },
      { $unwind: '$attendance' },
      { $match: { 'attendance.playersPresent.0': { $exists: true } } },
      { $group: { _id: '$attendance.day', n: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

type Team = Awaited<ReturnType<typeof presentTeams>>[number];

/** The draw. Returns slots with panel and order set. */
export function drawPanels(teams: Team[], panels: PanelInfo[], mode: 'track' | 'random'): Slot[] {
  const P = panels.length;
  const groups: Team[][] = panels.map(() => []);
  const pool: Team[] = [];
  if (mode === 'random') {
    const start = Math.floor(Math.random() * P);
    shuffle(teams).forEach((t, i) => groups[(start + i) % P].push(t));
  } else {
    for (const t of shuffle(teams)) {
      const p = panels.findIndex((x) => !!t.track && panelTracks(x).includes(t.track));
      if (p >= 0) groups[p].push(t);
      else pool.push(t);
    }
    const cap = Math.ceil(teams.length / P);
    groups.forEach((g) => {
      while (g.length > cap) {
        pool.push(g.splice(Math.floor(Math.random() * g.length), 1)[0]);
      }
    });
    for (const t of shuffle(pool)) {
      const min = Math.min(...groups.map((g) => g.length));
      const options = groups.map((g, i) => (g.length === min ? i : -1)).filter((i) => i >= 0);
      groups[options[Math.floor(Math.random() * options.length)]].push(t);
    }
  }
  return groups.flatMap((g, p) =>
    shuffle(g).map((t, order) => ({ teamId: t.teamId, teamName: t.teamName, track: t.track, card: t.card, panel: p, order, state: 'waiting' as const, moved: (!!t.track && !panelTracks(panels[p]).includes(t.track)) || undefined }))
  );
}

/* ── Actions ─────────────────────────────────────────────────────────── */

export interface JudgingInput {
  action: string;
  v?: number;
  panels?: Array<Partial<PanelInfo>>;
  startAt?: number;
  slotMin?: number;
  mode?: 'track' | 'random';
  session?: number;
  force?: boolean;
  teamId?: string;
  panel?: number;
  dir?: number;
}

const renumber = (slots: Slot[], panel: number) => {
  // Done and called teams first, as they happened; the queue after them.
  const q = queueOf(slots, panel);
  const rank = (s: Slot) => (s.state === 'done' ? 0 : s.state === 'called' ? 1 : 2);
  q.sort((a, b) => rank(a) - rank(b) || a.order - b.order).forEach((s, i) => (s.order = i));
};

export async function judgingAction(eventId: ObjectId, input: JudgingInput): Promise<{ ok: true; state: JudgingState; log?: Record<string, unknown> } | Fail> {
  const base = await load(eventId, true);
  // A deep copy to edit (ObjectIds stay out of it: the filter below carries the eventId).
  const d: JudgingDoc = { ...JSON.parse(JSON.stringify({ ...base, _id: undefined, eventId: undefined })), eventId };
  const now = Date.now();
  let log: Record<string, unknown> | undefined;
  const slots = d.slots;
  const find = (id?: string) => slots.find((s) => s.teamId === (id || '').toUpperCase());

  switch (input.action) {
    case 'setup': {
      if (input.panels?.length === d.panels.length) {
        d.panels = d.panels.map((p, i) => ({
          ...p,
          name: String(input.panels![i].name ?? p.name).slice(0, 60),
          place: String(input.panels![i].place ?? p.place).slice(0, 60),
          judges: String(input.panels![i].judges ?? p.judges).slice(0, 120),
        }));
      }
      if (input.startAt && Number.isFinite(input.startAt)) d.startAt = input.startAt;
      if (input.slotMin) d.slotMin = Math.max(3, Math.min(20, Math.round(input.slotMin)));
      break;
    }
    case 'draw': {
      if ((d.status === 'ANNOUNCED' || d.status === 'DONE') && !input.force) return fail('ANNOUNCED', 'The panels are already announced. Redraw anyway?');
      if (slots.some((s) => s.state !== 'waiting') && !input.force) return fail('RUNNING', 'Panels have started calling teams.');
      const session = input.session === 2 ? 2 : 4;
      const teams = await presentTeams(eventId, session);
      if (!teams.length) return fail('NO_TEAMS', session === 4 ? 'Nobody is marked present for Day 2 · post-lunch yet. Mark attendance on the D2 PM tab first.' : 'Nobody is marked present.');
      d.mode = input.mode === 'random' ? 'random' : 'track';
      d.slots = drawPanels(teams, d.panels, d.mode);
      d.status = 'DRAWN';
      d.source = { session, present: teams.length, at: now };
      d.drawnAt = now;
      d.announcedAt = undefined;
      log = { session, present: teams.length, mode: d.mode };
      break;
    }
    case 'announce':
      if (!slots.length) return fail('EMPTY', 'Draw the panels first.');
      d.status = 'ANNOUNCED';
      d.announcedAt = d.announcedAt ?? now;
      break;
    case 'move': {
      const s = find(input.teamId);
      const p = Number(input.panel);
      if (!s || !(p >= 0 && p < d.panels.length)) return fail('VALIDATION', 'Pick a team and a panel.');
      if (s.state !== 'waiting') return fail('VALIDATION', 'Only waiting teams can move.');
      const from = s.panel;
      s.panel = p;
      s.order = 1e6;
      s.moved = (!!s.track && !panelTracks(d.panels[p]).includes(s.track)) || undefined;
      renumber(slots, from);
      renumber(slots, p);
      break;
    }
    case 'shift': {
      const s = find(input.teamId);
      if (!s || s.state !== 'waiting') return fail('VALIDATION', 'Only waiting teams can move.');
      const q = queueOf(slots, s.panel).filter((x) => x.state === 'waiting');
      const i = q.indexOf(s);
      const j = i + (Number(input.dir) < 0 ? -1 : 1);
      if (j < 0 || j >= q.length) break;
      [q[i].order, q[j].order] = [q[j].order, q[i].order];
      break;
    }
    case 'add': {
      const id = (input.teamId || '').trim().toUpperCase();
      if (find(id)) return fail('VALIDATION', 'That team is already on a panel.');
      const db = await getDb();
      const reg = await db.collection('registrations').findOne({ eventId, teamId: id, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, teamName: 1 } });
      if (!reg) return fail('NOT_FOUND', 'No confirmed team with that ID.');
      const drop = await getCardDrop(eventId);
      const card = drop?.assignments.find((a) => a.teamId === id)?.card;
      const track = card ? CARD_BY_CODE[card]?.track : undefined;
      let p = Number.isInteger(input.panel) ? Number(input.panel) : d.panels.findIndex((x) => !!track && panelTracks(x).includes(track));
      if (p < 0 || p >= d.panels.length) {
        const sizes = d.panels.map((_, i) => slots.filter((s) => s.panel === i).length);
        p = sizes.indexOf(Math.min(...sizes));
      }
      slots.push({ teamId: id, teamName: reg.teamName as string, card, track, panel: p, order: 1e6, state: 'waiting', late: true, moved: (!!track && !panelTracks(d.panels[p]).includes(track)) || undefined });
      renumber(slots, p);
      if (d.status === 'SETUP') d.status = 'DRAWN';
      log = { teamId: id, panel: p };
      break;
    }
    case 'remove': {
      const s = find(input.teamId);
      if (!s) return fail('NOT_FOUND', 'Team not on a panel.');
      d.slots = slots.filter((x) => x !== s);
      renumber(d.slots, s.panel);
      log = { teamId: s.teamId };
      break;
    }
    case 'call': {
      // The team in front of the panel is done; the next one in the queue is called.
      const p = Number(input.panel);
      const q = queueOf(slots, p);
      if (!q.length) return fail('EMPTY', 'This panel has no teams.');
      if (d.status !== 'ANNOUNCED') d.status = 'ANNOUNCED';
      d.announcedAt = d.announcedAt ?? now;
      const cur = q.find((s) => s.state === 'called');
      if (cur) {
        cur.state = 'done';
        cur.doneAt = now;
      }
      const next = q.find((s) => s.state === 'waiting');
      if (next) {
        next.state = 'called';
        next.calledAt = now;
      }
      renumber(slots, p);
      log = { panel: p, done: cur?.teamId, called: next?.teamId };
      break;
    }
    case 'skip': {
      // The called team is not at the panel: back to the end of the queue, call the next one.
      const p = Number(input.panel);
      const q = queueOf(slots, p);
      const cur = q.find((s) => s.state === 'called');
      if (!cur) return fail('VALIDATION', 'Nobody is called at this panel.');
      cur.state = 'waiting';
      cur.calledAt = undefined;
      cur.order = 1e6;
      const next = q.find((s) => s.state === 'waiting' && s !== cur);
      if (next) {
        next.state = 'called';
        next.calledAt = now;
      }
      renumber(slots, p);
      log = { panel: p, skipped: cur.teamId, called: next?.teamId };
      break;
    }
    case 'undo': {
      // Put the last called team back in the queue and give the panel its previous team back.
      const p = Number(input.panel);
      const q = queueOf(slots, p);
      const cur = q.find((s) => s.state === 'called');
      const prev = q.filter((s) => s.state === 'done').sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))[0];
      if (cur) {
        cur.state = 'waiting';
        cur.calledAt = undefined;
        cur.order = -1;
      }
      if (prev) {
        prev.state = 'called';
        prev.doneAt = undefined;
      }
      renumber(slots, p);
      break;
    }
    case 'finish':
      slots.forEach((s) => {
        if (s.state === 'called') {
          s.state = 'done';
          s.doneAt = now;
        }
      });
      d.status = 'DONE';
      log = {};
      break;
    case 'reset': {
      const c = await col();
      await c.deleteOne({ eventId });
      cache = null;
      return { ok: true, state: await getJudging(eventId), log: {} };
    }
    default:
      return fail('VALIDATION', 'Unknown action.');
  }

  d.v = (d.v ?? 0) + 1;
  d.updatedAt = new Date();
  const c = await col();
  const { _id, eventId: _ev, ...rest } = d;
  void _id;
  void _ev;
  await c.updateOne({ eventId }, { $set: rest }, { upsert: true });
  cache = null;
  return { ok: true, state: toState(d), log };
}

/* ── A team's own slot ───────────────────────────────────────────────── */

export async function teamJudging(eventId: ObjectId, teamId: string): Promise<TeamJudging | undefined> {
  const d = await load(eventId);
  if (d.status !== 'ANNOUNCED' && d.status !== 'DONE') return undefined;
  const s = d.slots.find((x) => x.teamId === teamId);
  if (!s) return undefined;
  const q = queueOf(d.slots, s.panel);
  const waiting = q.filter((x) => x.state === 'waiting');
  const ahead = s.state === 'waiting' ? waiting.indexOf(s) + (q.some((x) => x.state === 'called') ? 1 : 0) : 0;
  return {
    status: d.status,
    teamName: s.teamName,
    panel: { ...d.panels[s.panel], index: s.panel },
    order: s.order,
    total: q.length,
    state: s.state,
    calledAt: s.calledAt,
    ahead,
    eta: etaFor(d, s, Date.now()),
    slotMin: d.slotMin,
  };
}
