import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { CARD_BY_CODE, CARDS, TRACKS, type TrackId } from '@/lib/cardDrop/cards';
import { ROUNDS, buildQuestions, type GameQ } from '@/lib/live/bank';
import {
  MAX_ORDER,
  ORDER_COOLDOWN_MS,
  SPREAD,
  START_CASH,
  TICK_MS,
  newMarket,
  rumour,
  step,
  targets,
  worthOf,
  type MarketDoc,
} from '@/lib/live/market';
import {
  Q_BASE,
  Q_SPEED,
  STREAK_BONUS,
  WRONG_PENALTY,
  detectiveToFinal,
  exchangeBonuses,
  type DetBoardRow,
  type DetPhase,
  type ExBoardRow,
  type GameKind,
  type GameResult,
  type GameState,
  type GameStatus,
  type GameSummary,
  type LiveScoreRow,
  type MyDetective,
  type MyExchange,
  type NewsItem,
  type PublicQuestion,
  type RevealInfo,
  type RosterTeam,
  type TeamGameView,
} from '@/lib/live/types';
import { getCardDrop } from '@/lib/services/cardDrop';

/**
 * Live games on Day 2 (Code Detective and the Trading Floor).
 *
 * No sockets: the projector and the phones poll. To keep the database calm,
 * a game document is cached per server instance for a moment, every team
 * reads the same cached document, and all timing runs off server timestamps
 * that the clients line their clocks up with.
 */

type Fail = { ok: false; code: string; message: string };
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

interface LiveGameDoc {
  _id: ObjectId;
  eventId: ObjectId;
  kind: GameKind;
  name: string;
  group: string;
  status: GameStatus;
  v: number;
  createdAt: Date;
  createdBy: string;
  startedAt?: Date;
  endedAt?: Date;
  roster: RosterTeam[];
  joined: string[];
  // detective
  set?: 'A' | 'B';
  qs?: GameQ[];
  qi?: number;
  phase?: DetPhase;
  openAt?: number;
  closeAt?: number;
  reveal?: RevealInfo;
  detBoard?: DetBoardRow[];
  // exchange
  market?: MarketDoc & { volTotal?: Record<string, number> };
  exBoard?: ExBoardRow[];
  results?: GameResult[];
}

interface AnswerDoc {
  gameId: string;
  key: string;
  teamId: string;
  qi: number;
  choice: number;
  correct: boolean;
  ms: number;
  at: Date;
}

interface PortfolioDoc {
  gameId: string;
  teamId: string;
  cash: number;
  h: Record<string, number>;
  seq: number;
  lastAt: number;
}

const WAGERS = [0, 25, 50, 100];
const COUNTDOWN_MS = 3500;
const WAGER_MS = 20_000;
const GRACE_MS = 1000;

/* ── Collections and caches ──────────────────────────────────────────── */

let indexed = false;
async function cols() {
  const db = await getDb();
  const c = {
    games: db.collection<LiveGameDoc>('liveGames'),
    answers: db.collection<AnswerDoc>('liveAnswers'),
    folios: db.collection<PortfolioDoc>('livePortfolios'),
  };
  if (!indexed) {
    indexed = true;
    await Promise.all([
      c.answers.createIndex({ gameId: 1, key: 1, teamId: 1 }, { unique: true }),
      c.folios.createIndex({ gameId: 1, teamId: 1 }, { unique: true }),
      c.games.createIndex({ eventId: 1, createdAt: -1 }),
    ]).catch(() => {
      indexed = false;
    });
  }
  return c;
}

const CACHE_MS = 700;
const cache = new Map<string, { doc: LiveGameDoc; at: number }>();
const remember = (doc: LiveGameDoc | null) => {
  if (doc) cache.set(doc._id.toHexString(), { doc, at: Date.now() });
  return doc;
};

let listCache: { eventId: string; at: number; games: LiveGameDoc[] } | null = null;

async function loadGame(id: string, fresh = false): Promise<LiveGameDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const hit = cache.get(id);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.doc;
  const { games } = await cols();
  const doc = remember(await games.findOne({ _id: new ObjectId(id) }));
  return doc && doc.kind === 'exchange' ? maybeTick(doc) : doc;
}

/**
 * Applies an update. With `checkV`, only if nobody moved the game on since we read it
 * (two screens or a double tap pressing Next must not skip a question).
 */
async function commit(doc: LiveGameDoc, set: Record<string, unknown>, checkV: boolean): Promise<LiveGameDoc | null> {
  const { games } = await cols();
  const filter = checkV ? { _id: doc._id, v: doc.v } : { _id: doc._id };
  const next = await games.findOneAndUpdate(filter, { $set: set, $inc: { v: 1 } }, { returnDocument: 'after' });
  listCache = null;
  return remember(next);
}

/* ── Creating and listing games ──────────────────────────────────────── */

const summary = (g: LiveGameDoc): GameSummary => ({
  id: g._id.toHexString(),
  kind: g.kind,
  name: g.name,
  group: g.group,
  status: g.status,
  teams: g.roster.length,
  createdAt: g.createdAt.getTime(),
});

async function gamesOf(eventId: ObjectId): Promise<LiveGameDoc[]> {
  const key = eventId.toHexString();
  if (listCache && listCache.eventId === key && Date.now() - listCache.at < 2000) return listCache.games;
  const { games } = await cols();
  const list = await games
    .find({ eventId }, { projection: { qs: 0, market: 0, detBoard: 0, exBoard: 0, reveal: 0 } })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();
  listCache = { eventId: key, at: Date.now(), games: list };
  return list;
}

export async function listGames(eventId: ObjectId): Promise<GameSummary[]> {
  listCache = null;
  return (await gamesOf(eventId)).map(summary);
}

export interface CreateInput {
  kind: GameKind;
  name?: string;
  /** 'all', 'track:<id>' or 'custom'. */
  group?: string;
  teamIds?: string[];
  presentOnly?: boolean;
  set?: 'A' | 'B';
  durationMin?: number;
}

export async function createGame(eventId: ObjectId, input: CreateInput, actor: string) {
  if (input.kind !== 'detective' && input.kind !== 'exchange') return fail('VALIDATION', 'Pick a game.');
  const db = await getDb();
  const [regs, drop] = await Promise.all([
    db
      .collection('registrations')
      .find({ eventId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, teamName: 1, attendance: 1 } })
      .sort({ teamId: 1 })
      .toArray(),
    getCardDrop(eventId),
  ]);
  const cardOf = new Map((drop?.assignments ?? []).map((a) => [a.teamId, a.card]));
  let roster: RosterTeam[] = regs.map((r) => {
    const card = cardOf.get(r.teamId as string);
    return { teamId: r.teamId as string, teamName: r.teamName as string, card, track: card ? CARD_BY_CODE[card]?.track : undefined };
  });
  if (input.presentOnly) {
    const present = new Set(regs.filter((r) => (r.attendance || []).some((a: { day: number }) => a.day === 2)).map((r) => r.teamId as string));
    if (present.size) roster = roster.filter((t) => present.has(t.teamId));
  }

  const group = input.group || 'all';
  let groupLabel = 'All teams';
  if (group.startsWith('track:')) {
    const tr = group.slice(6) as TrackId;
    if (!TRACKS[tr]) return fail('VALIDATION', 'Unknown track.');
    roster = roster.filter((t) => t.track === tr);
    groupLabel = `${TRACKS[tr].suit} ${TRACKS[tr].label}`;
  } else if (group === 'custom') {
    const want = new Set((input.teamIds || []).map((s) => s.trim().toUpperCase()).filter(Boolean));
    roster = roster.filter((t) => want.has(t.teamId.toUpperCase()));
    groupLabel = `Group of ${roster.length}`;
  }
  if (!roster.length) return fail('VALIDATION', 'No teams match that group.');

  const now = new Date();
  const base = {
    eventId,
    kind: input.kind,
    group: groupLabel,
    status: 'LOBBY' as GameStatus,
    v: 1,
    createdAt: now,
    createdBy: actor,
    roster,
    joined: [] as string[],
  };
  let doc: Omit<LiveGameDoc, '_id'>;
  if (input.kind === 'detective') {
    const set = input.set === 'B' ? 'B' : 'A';
    doc = {
      ...base,
      name: input.name?.trim() || `Code Detective · ${groupLabel}`,
      set,
      qs: buildQuestions(set, now.getTime() % 100000),
      qi: -1,
      phase: 'lobby',
      detBoard: rankDet(roster.map((t) => blankRow(t)), []),
    };
  } else {
    const inPlay = [...new Set(roster.map((t) => t.card).filter(Boolean))] as string[];
    const cards = inPlay.length ? CARDS.filter((c) => inPlay.includes(c.code)).map((c) => c.code) : CARDS.map((c) => c.code);
    const mins = Math.max(3, Math.min(60, Math.round(input.durationMin || 15)));
    doc = {
      ...base,
      name: input.name?.trim() || `Trading Floor · ${groupLabel}`,
      market: { ...newMarket(cards, mins), volTotal: {} },
      exBoard: roster.map((t, i) => ({ teamId: t.teamId, teamName: t.teamName, track: t.track, card: t.card, cash: START_CASH, worth: START_CASH, rank: i + 1, prevRank: i + 1, bonus: 0 })),
    };
  }
  const { games } = await cols();
  const res = await games.insertOne(doc as LiveGameDoc);
  listCache = null;
  return { ok: true as const, id: res.insertedId.toHexString() };
}

export async function deleteGame(id: string) {
  if (!ObjectId.isValid(id)) return;
  const { games, answers, folios } = await cols();
  await Promise.all([games.deleteOne({ _id: new ObjectId(id) }), answers.deleteMany({ gameId: id }), folios.deleteMany({ gameId: id })]);
  cache.delete(id);
  listCache = null;
}

/* ── What clients see ────────────────────────────────────────────────── */

function publicQ(q: GameQ, qi: number, card?: string): PublicQuestion {
  if (q.kind === 'card') {
    const cq = q.perCard?.[card && q.perCard[card] ? card : '_'];
    return { qi, round: q.round, kind: 'card', prompt: cq?.prompt ?? '', options: cq?.options, secs: q.secs, card: card && q.perCard?.[card] ? card : undefined };
  }
  return { qi, round: q.round, kind: q.kind, prompt: q.prompt, code: q.code, lang: q.lang, options: q.options, secs: q.secs, allIn: q.allIn, card: q.card };
}

function toState(g: LiveGameDoc, opts: { admin?: boolean; card?: string; teamId?: string } = {}): GameState {
  const s: GameState = {
    id: g._id.toHexString(),
    kind: g.kind,
    name: g.name,
    group: g.group,
    status: g.status,
    v: g.v,
    now: Date.now(),
    roster: g.roster,
    joined: g.joined,
    results: g.results,
  };
  if (g.kind === 'detective') {
    const q = g.qs?.[g.qi ?? -1];
    Object.assign(s, {
      rounds: ROUNDS,
      total: g.qs?.length ?? 0,
      qi: g.qi,
      phase: g.phase,
      openAt: g.openAt,
      closeAt: g.closeAt,
      detBoard: g.detBoard,
    });
    // The question text is shown from the countdown on; intro and wager only reveal the round.
    if (q && (g.phase === 'question' || g.phase === 'reveal' || g.phase === 'board')) {
      s.question = publicQ(q, g.qi!, opts.card);
      if (q.kind === 'card' && opts.admin) {
        s.cardQs = Object.fromEntries(Object.keys(q.perCard || {}).map((c) => [c, publicQ(q, g.qi!, c)]));
      }
    }
    if (q && (g.phase === 'intro' || g.phase === 'wager')) {
      s.question = { qi: g.qi!, round: q.round, kind: q.kind, prompt: '', secs: q.secs, allIn: q.allIn };
    }
    if ((g.phase === 'reveal' || g.phase === 'board') && g.reveal?.qi === g.qi) s.reveal = g.reveal;
    if (opts.admin && q) {
      s.key = {
        correct: q.answer,
        explain: q.explain,
        perCard: q.perCard ? Object.fromEntries(Object.entries(q.perCard).map(([c, cq]) => [c, cq.options[cq.answer]])) : undefined,
      };
    }
  } else if (g.market) {
    const m = g.market;
    s.market = {
      tickers: m.tickers,
      tick: m.tick,
      tickMs: TICK_MS,
      openAt: m.openAt,
      closeAt: m.closeAt,
      haltUntil: m.haltUntil,
      news: m.news.slice(-12),
      autoNews: m.autoNews,
      startCash: START_CASH,
      spread: SPREAD,
      maxOrder: MAX_ORDER,
    };
    s.exBoard = (g.exBoard || []).map((r) => (opts.admin || r.teamId === opts.teamId ? r : { ...r, h: undefined }));
  }
  return s;
}

export async function getAdminState(id: string): Promise<GameState | null> {
  const g = await loadGame(id);
  if (!g) return null;
  const s = toState(g, { admin: true });
  if (g.kind === 'detective' && (g.phase === 'question' || g.phase === 'wager')) {
    const { answers } = await cols();
    const key = g.phase === 'wager' ? `w${g.qi}` : `q${g.qi}`;
    const rows = await answers.find({ gameId: id, key }, { projection: { teamId: 1, choice: 1 } }).toArray();
    s.locked = rows.map((r) => r.teamId);
    if (g.phase === 'wager') s.wagers = Object.fromEntries(rows.map((r) => [r.teamId, r.choice]));
  }
  return s;
}

/* ── Code Detective: the show ────────────────────────────────────────── */

function blankRow(t: RosterTeam): DetBoardRow {
  return { teamId: t.teamId, teamName: t.teamName, track: t.track, card: t.card, pts: 0, delta: 0, rank: 1, prevRank: 1, streak: 0, right: 0, cd: 0 };
}

function rankDet(rows: DetBoardRow[], prev: DetBoardRow[]): DetBoardRow[] {
  // Before any points, everyone is tied: no arrows on the first leaderboard.
  const fresh = prev.every((r) => r.pts === 0);
  const prevRank = new Map(fresh ? [] : prev.map((r) => [r.teamId, r.rank]));
  const sorted = [...rows].sort((a, b) => b.pts - a.pts || b.right - a.right || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  let last: number | null = null;
  return sorted.map((r, i) => {
    if (last === null || r.pts !== last) rank = i + 1;
    last = r.pts;
    return { ...r, rank, prevRank: prevRank.get(r.teamId) ?? rank };
  });
}

/** Recomputes every team's points from all answers up to the current question. */
async function scoreDetective(g: LiveGameDoc): Promise<{ board: DetBoardRow[]; reveal: RevealInfo }> {
  const { answers } = await cols();
  const id = g._id.toHexString();
  const all = await answers.find({ gameId: id }).toArray();
  const by = new Map(all.map((a) => [`${a.key}|${a.teamId}`, a]));
  const qs = g.qs!;
  const qi = g.qi!;
  const q = qs[qi];

  const rows = g.roster.map((t) => {
    const row = blankRow(t);
    for (let i = 0; i <= qi; i++) {
      const a = by.get(`q${i}|${t.teamId}`);
      const before = row.pts;
      let gain = 0;
      if (a?.correct) {
        row.streak += 1;
        row.right += 1;
        gain = Q_BASE + Math.round(Q_SPEED * Math.max(0, 1 - a.ms / (qs[i].secs * 1000)));
        if (row.streak >= 3) gain += STREAK_BONUS;
      } else {
        row.streak = 0;
        if (a) gain = -WRONG_PENALTY;
      }
      if (qs[i].allIn) {
        const pct = by.get(`w${i}|${t.teamId}`)?.choice ?? 0;
        const stake = Math.round((Math.max(0, before) * pct) / 100);
        gain += a?.correct ? stake : -stake;
        if (i === qi) row.stake = stake;
      }
      row.pts = before + gain;
      if (i === qi) {
        row.delta = gain;
        row.last = a ? (a.correct ? 'right' : 'wrong') : 'none';
      }
    }
    return row;
  });
  const best = Math.max(0, ...rows.map((r) => r.pts));
  rows.forEach((r) => (r.cd = detectiveToFinal(r.pts, best)));

  const now = all.filter((a) => a.key === `q${qi}`);
  const width = q.kind === 'line' ? q.code!.length : 4;
  const counts = Array.from({ length: width }, () => 0);
  now.forEach((a) => {
    if (a.choice >= 0 && a.choice < width) counts[a.choice] += 1;
  });
  const fastestA = now.filter((a) => a.correct).sort((a, b) => a.ms - b.ms)[0];
  const nameOf = new Map(g.roster.map((t) => [t.teamId, t.teamName]));
  const reveal: RevealInfo = {
    qi,
    correct: q.answer,
    explain: q.explain,
    counts,
    answered: now.length,
    right: now.filter((a) => a.correct).length,
    wrong: now.filter((a) => !a.correct).length,
    fastest: fastestA ? { teamId: fastestA.teamId, teamName: nameOf.get(fastestA.teamId) ?? fastestA.teamId, ms: fastestA.ms } : undefined,
  };
  if (q.kind === 'card') {
    const cardOf = new Map(g.roster.map((t) => [t.teamId, t.card && q.perCard?.[t.card] ? t.card : '_']));
    const per: NonNullable<RevealInfo['perCard']> = {};
    for (const t of g.roster) {
      const c = cardOf.get(t.teamId)!;
      const cq = q.perCard![c];
      per[c] ??= { right: 0, total: 0, prompt: cq.prompt, answer: cq.options[cq.answer] };
      const a = by.get(`q${qi}|${t.teamId}`);
      per[c].total += 1;
      if (a?.correct) per[c].right += 1;
    }
    reveal.perCard = per;
  }
  return { board: rankDet(rows, g.detBoard || []), reveal };
}

function openQuestion(g: LiveGameDoc, qi: number, now: number): Partial<LiveGameDoc> {
  const q = g.qs![qi];
  if (q.allIn) return { qi, phase: 'wager', openAt: now, closeAt: now + WAGER_MS };
  const openAt = now + COUNTDOWN_MS;
  return { qi, phase: 'question', openAt, closeAt: openAt + q.secs * 1000 };
}

function finalResults(board: DetBoardRow[]): GameResult[] {
  const best = Math.max(0, ...board.map((r) => r.pts));
  return board.map((r) => ({ teamId: r.teamId, teamName: r.teamName, raw: r.pts, final: detectiveToFinal(r.pts, best) }));
}

async function detectiveNext(g: LiveGameDoc): Promise<Partial<LiveGameDoc> | Fail> {
  const now = Date.now();
  const qs = g.qs!;
  const qi = g.qi ?? -1;
  switch (g.phase) {
    case 'lobby':
      return { status: 'LIVE', startedAt: new Date(), qi: 0, phase: 'intro', openAt: undefined, closeAt: undefined };
    case 'intro':
      return openQuestion(g, qi, now);
    case 'wager': {
      const openAt = now + COUNTDOWN_MS;
      return { phase: 'question', openAt, closeAt: openAt + qs[qi].secs * 1000 };
    }
    case 'question': {
      const { board, reveal } = await scoreDetective(g);
      return { phase: 'reveal', reveal, detBoard: board, closeAt: Math.min(g.closeAt ?? now, now) };
    }
    case 'reveal':
      return { phase: 'board' };
    case 'board': {
      if (qi + 1 >= qs.length) {
        return { phase: 'final', status: 'ENDED', endedAt: new Date(), results: finalResults(g.detBoard || []) };
      }
      if (qs[qi + 1].round !== qs[qi].round) return { qi: qi + 1, phase: 'intro', openAt: undefined, closeAt: undefined };
      return openQuestion(g, qi + 1, now);
    }
    default:
      return fail('ENDED', 'The game is over.');
  }
}

/* ── Admin actions ───────────────────────────────────────────────────── */

export interface ActionInput {
  action: string;
  /** The version the caller saw; stale presses (two screens, double taps) are ignored. */
  v?: number;
  target?: string;
  pct?: number;
  headline?: string;
  secs?: number;
  minutes?: number;
  on?: boolean;
}

export async function adminAction(id: string, input: ActionInput): Promise<{ ok: true; state: GameState } | Fail> {
  const g = await loadGame(id, true);
  if (!g) return fail('NOT_FOUND', 'Game not found.');
  const stale = g.kind === 'detective' && input.v !== undefined && input.v !== g.v;
  if (!stale) {
    if (g.kind === 'detective') {
      const set = await detectiveAction(g, input);
      if ('ok' in set) return set as Fail;
      await commit(g, set as Record<string, unknown>, true);
    } else {
      const res = await exchangeAction(g, input);
      if ('ok' in res) return res as Fail;
      if ('set' in res) await commit(g, res.set, false);
    }
  }
  // A stale press just hands back where the game is now.
  cache.delete(id);
  return { ok: true, state: (await getAdminState(id))! };
}

async function detectiveAction(g: LiveGameDoc, input: ActionInput): Promise<Partial<LiveGameDoc> | Fail> {
  switch (input.action) {
    case 'next':
      return detectiveNext(g);
    case 'extend':
      if (g.phase !== 'question' && g.phase !== 'wager') return fail('PHASE', 'Nothing is running.');
      return { closeAt: (g.closeAt ?? Date.now()) + Math.max(5, Math.min(60, input.secs ?? 10)) * 1000 };
    case 'restart-question':
      if (g.phase !== 'question') return fail('PHASE', 'Only during a question.');
      {
        const { answers } = await cols();
        await answers.deleteMany({ gameId: g._id.toHexString(), key: `q${g.qi}` });
        const openAt = Date.now() + COUNTDOWN_MS;
        return { openAt, closeAt: openAt + g.qs![g.qi!].secs * 1000 };
      }
    case 'end': {
      if (g.status === 'ENDED') return fail('ENDED', 'Already ended.');
      const board = g.detBoard || [];
      return { phase: 'final', status: 'ENDED', endedAt: new Date(), results: finalResults(board) };
    }
    default:
      return fail('VALIDATION', 'Unknown action.');
  }
}

/* ── Code Detective: teams ───────────────────────────────────────────── */

export async function submitAnswer(id: string, teamId: string, qi: number, choice: number) {
  const g = await loadGame(id);
  if (!g || g.kind !== 'detective') return fail('NOT_FOUND', 'Game not found.');
  const team = g.roster.find((t) => t.teamId === teamId);
  if (!team) return fail('NOT_IN_GAME', 'Your team is not in this game.');
  const now = Date.now();
  if (g.phase !== 'question' || g.qi !== qi) return fail('CLOSED', 'This question is closed.');
  if (now < (g.openAt ?? 0) - 500) return fail('EARLY', 'Wait for the question.');
  if (now > (g.closeAt ?? 0) + GRACE_MS) return fail('CLOSED', 'Time is up.');
  const q = g.qs![qi];
  const width = q.kind === 'line' ? q.code!.length : 4;
  if (!Number.isInteger(choice) || choice < 0 || choice >= width) return fail('VALIDATION', 'Pick an answer.');
  if (q.kind === 'line' && !q.code![choice].trim()) return fail('VALIDATION', 'That line is empty.');

  let correct: boolean;
  if (q.kind === 'card') {
    const cq = q.perCard![team.card && q.perCard![team.card] ? team.card : '_'];
    correct = cq.answer === choice;
  } else correct = q.answer.includes(choice);
  const ms = Math.max(0, Math.min(q.secs * 1000, now - (g.openAt ?? now)));

  const { answers } = await cols();
  const doc: AnswerDoc = { gameId: id, key: `q${qi}`, teamId, qi, choice, correct, ms, at: new Date() };
  try {
    await answers.insertOne(doc);
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    const first = await answers.findOne({ gameId: id, key: `q${qi}`, teamId });
    return { ok: true as const, answer: { qi, choice: first?.choice ?? choice, ms: first?.ms ?? ms }, already: true };
  }
  return { ok: true as const, answer: { qi, choice, ms }, already: false };
}

export async function submitWager(id: string, teamId: string, pct: number) {
  const g = await loadGame(id);
  if (!g || g.kind !== 'detective') return fail('NOT_FOUND', 'Game not found.');
  if (!g.roster.some((t) => t.teamId === teamId)) return fail('NOT_IN_GAME', 'Your team is not in this game.');
  if (g.phase !== 'wager' || Date.now() > (g.closeAt ?? 0) + GRACE_MS) return fail('CLOSED', 'Betting is closed.');
  if (!WAGERS.includes(pct)) return fail('VALIDATION', 'Pick a bet.');
  const { answers } = await cols();
  await answers.updateOne(
    { gameId: id, key: `w${g.qi}`, teamId },
    { $set: { choice: pct, at: new Date() }, $setOnInsert: { qi: g.qi!, correct: false, ms: 0 } },
    { upsert: true }
  );
  return { ok: true as const, wager: pct };
}

/* ── Trading Floor ───────────────────────────────────────────────────── */

/** Runs any market ticks that are due. Whoever reads first does the work; the version check stops doubles. */
async function maybeTick(g: LiveGameDoc): Promise<LiveGameDoc> {
  const m = g.market;
  if (!m || g.status !== 'LIVE' || !m.openAt) return g;
  const now = Date.now();
  if (m.haltUntil && now < m.haltUntil) return g;
  const closeAt = m.closeAt ?? Infinity;
  if (m.lastTickAt >= closeAt) return g;
  if (now - m.lastTickAt < TICK_MS) return g;

  const { games } = await cols();
  const fresh = await games.findOne({ _id: g._id });
  if (!fresh?.market || fresh.market.tick !== m.tick) return remember(fresh) ?? g;
  return (await tick(fresh, Math.min(now, closeAt))) ?? g;
}

async function tick(g: LiveGameDoc, now: number, extra: { shock?: Record<string, number>; news?: NewsItem } = {}) {
  const m = g.market!;
  const shock = { ...(extra.shock || {}) };
  const news = [...m.news];
  let nextAutoAt = m.nextAutoAt;
  if (extra.news) news.push(extra.news);
  else if (m.autoNews && (nextAutoAt ?? 0) <= now && now < (m.closeAt ?? Infinity) - 20_000) {
    const r = rumour(m, now);
    if (r) {
      news.push(r.item);
      for (const [c, p] of Object.entries(r.shock)) shock[c] = (shock[c] || 0) + p;
    }
    nextAutoAt = now + 35_000 + Math.random() * 40_000;
  }
  let next = step(m, now, shock);
  const vol = m.volTotal || {};
  next = { ...next, tickers: next.tickers.map((t) => ({ ...t, vol: vol[t.code] || 0 })) };


  const { folios } = await cols();
  const books = await folios.find({ gameId: g._id.toHexString() }).toArray();
  const board = rankEx(g, books, next.tickers);

  const { games } = await cols();
  const updated = await games.findOneAndUpdate(
    { _id: g._id, 'market.tick': m.tick },
    {
      $set: {
        'market.tickers': next.tickers,
        'market.anchor': next.anchor,
        'market.flowApplied': next.flowApplied,
        'market.tick': next.tick,
        'market.lastTickAt': now,
        'market.news': news.slice(-30),
        'market.nextAutoAt': nextAutoAt,
        exBoard: board,
      },
      $inc: { v: 1 },
    },
    { returnDocument: 'after' }
  );
  return remember(updated);
}

function rankEx(g: LiveGameDoc, books: PortfolioDoc[], tickers: MarketDoc['tickers']): ExBoardRow[] {
  const byTeam = new Map(books.map((b) => [b.teamId, b]));
  const prev = new Map((g.exBoard || []).map((r) => [r.teamId, r.rank]));
  const rows = g.roster.map((t) => {
    const b = byTeam.get(t.teamId);
    const cash = b?.cash ?? START_CASH;
    return { teamId: t.teamId, teamName: t.teamName, track: t.track, card: t.card, cash, h: b?.h ?? {}, worth: worthOf(cash, b?.h, tickers), traded: (b?.seq ?? 0) > 0, rank: 0, prevRank: 0, bonus: 0 };
  });
  const bonus = exchangeBonuses(rows);
  rows.sort((a, b) => b.worth - a.worth || a.teamName.localeCompare(b.teamName));
  return rows.map((r, i) => ({ ...r, rank: i + 1, prevRank: prev.get(r.teamId) ?? i + 1, bonus: bonus[r.teamId] }));
}

type ExPatch = { set: Record<string, unknown> } | { applied: true } | Fail;

async function exchangeAction(g: LiveGameDoc, input: ActionInput): Promise<ExPatch> {
  const m = g.market!;
  const now = Date.now();
  const id = g._id.toHexString();
  const { folios, games } = await cols();
  switch (input.action) {
    case 'start': {
      if (g.status !== 'LOBBY') return fail('PHASE', 'Already started.');
      await folios.deleteMany({ gameId: id });
      await folios.insertMany(g.roster.map((t) => ({ gameId: id, teamId: t.teamId, cash: START_CASH, h: {}, seq: 0, lastAt: 0 })));
      return {
        set: {
          status: 'LIVE',
          startedAt: new Date(),
          'market.openAt': now,
          'market.closeAt': now + m.durationMin * 60_000,
          'market.lastTickAt': now,
          'market.nextAutoAt': now + 30_000,
        },
      };
    }
    case 'news': {
      if (g.status !== 'LIVE') return fail('PHASE', 'The market is not open.');
      const pct = Math.max(-0.6, Math.min(1, Number(input.pct) || 0));
      const target = input.target || 'all';
      const hit = targets(m, target);
      if (!hit.length) return fail('VALIDATION', 'Pick a stock.');
      const headline = (input.headline || '').trim().slice(0, 140) || (pct >= 0 ? 'Big news moves the market' : 'Panic on the floor');
      const item: NewsItem = { id: `n${now}`, at: now, headline, target, pct: Math.round(pct * 100) / 100 };
      // Applied as an immediate tick so the price jumps with the headline. Retry if a tick races us.
      for (let i = 0; i < 3; i++) {
        const fresh = await games.findOne({ _id: g._id });
        if (!fresh) return fail('NOT_FOUND', 'Game not found.');
        if (await tick(fresh, now, { shock: Object.fromEntries(hit.map((c) => [c, pct])), news: item })) return { applied: true };
      }
      return fail('BUSY', 'The market is busy. Try again.');
    }
    case 'halt': {
      const secs = Math.max(10, Math.min(120, input.secs ?? 30));
      return { set: { 'market.haltUntil': now + secs * 1000, 'market.closeAt': (m.closeAt ?? now) + secs * 1000 } };
    }
    case 'resume':
      return { set: { 'market.haltUntil': null, 'market.lastTickAt': now } };
    case 'auto':
      return { set: { 'market.autoNews': !!input.on, 'market.nextAutoAt': now + 15_000 } };
    case 'extend': {
      const mins = Math.max(1, Math.min(30, input.minutes ?? 2));
      return { set: { 'market.closeAt': Math.max(m.closeAt ?? now, now) + mins * 60_000 } };
    }
    case 'close':
      return { set: { 'market.closeAt': now } };
    case 'end': {
      if (g.status === 'ENDED') return fail('ENDED', 'Already ended.');
      const books = await folios.find({ gameId: id }).toArray();
      const board = rankEx(g, books, m.tickers);
      return {
        set: {
          status: 'ENDED',
          endedAt: new Date(),
          'market.closeAt': Math.min(m.closeAt ?? now, now),
          exBoard: board,
          results: board.map((r) => ({ teamId: r.teamId, teamName: r.teamName, raw: r.worth, final: r.bonus })),
        },
      };
    }
    default:
      return fail('VALIDATION', 'Unknown action.');
  }
}

export async function trade(id: string, teamId: string, code: string, side: 'buy' | 'sell', qty: number) {
  const g = await loadGame(id);
  if (!g || g.kind !== 'exchange' || !g.market) return fail('NOT_FOUND', 'Game not found.');
  const team = g.roster.find((t) => t.teamId === teamId);
  if (!team) return fail('NOT_IN_GAME', 'Your team is not on this floor.');
  const m = g.market;
  const now = Date.now();
  if (g.status !== 'LIVE' || !m.openAt || now >= (m.closeAt ?? 0)) return fail('CLOSED', 'The market is closed.');
  if (m.haltUntil && now < m.haltUntil) return fail('HALTED', 'Trading is halted.');
  if (team.card === code) return fail('INSIDER', 'Insider trading! You cannot trade your own card.');
  const t = m.tickers.find((x) => x.code === code);
  if (!t) return fail('VALIDATION', 'Unknown stock.');
  qty = Math.floor(qty);
  if (!(qty >= 1 && qty <= MAX_ORDER)) return fail('VALIDATION', `Trade 1 to ${MAX_ORDER} shares.`);
  if (side !== 'buy' && side !== 'sell') return fail('VALIDATION', 'Buy or sell?');

  const { folios, games } = await cols();
  const px = side === 'buy' ? t.price * (1 + SPREAD) : t.price * (1 - SPREAD);
  const amount = Math.round(px * qty * 100) / 100;
  const filter: Record<string, unknown> = { gameId: id, teamId, lastAt: { $lte: now - ORDER_COOLDOWN_MS } };
  if (side === 'buy') filter.cash = { $gte: amount };
  else filter[`h.${code}`] = { $gte: qty };
  const updated = await folios.findOneAndUpdate(
    filter,
    { $inc: { cash: side === 'buy' ? -amount : amount, [`h.${code}`]: side === 'buy' ? qty : -qty, seq: 1 }, $set: { lastAt: now } },
    { returnDocument: 'after' }
  );
  if (!updated) {
    const f = await folios.findOne({ gameId: id, teamId });
    if (!f) return fail('NOT_IN_GAME', 'No wallet for your team.');
    if (f.lastAt > now - ORDER_COOLDOWN_MS) return fail('COOLDOWN', 'Easy, trader. One order a second.');
    return fail('FUNDS', side === 'buy' ? 'Not enough chips.' : 'You do not hold that many shares.');
  }
  await games.updateOne({ _id: g._id }, { $inc: { [`market.flowTotal.${code}`]: side === 'buy' ? qty : -qty, [`market.volTotal.${code}`]: qty } });
  return { ok: true as const, fill: { code, side, qty, price: Math.round(px * 100) / 100, amount }, me: myExchange(g, updated) };
}

function myExchange(g: LiveGameDoc, f: PortfolioDoc): MyExchange {
  const row = g.exBoard?.find((r) => r.teamId === f.teamId);
  const h = Object.fromEntries(Object.entries(f.h || {}).filter(([, q]) => q > 0));
  return { cash: Math.round(f.cash * 100) / 100, h, worth: worthOf(f.cash, h, g.market!.tickers), rank: row?.rank, bonus: row?.bonus, seq: f.seq };
}

/* ── Team view ───────────────────────────────────────────────────────── */

export async function teamView(eventId: ObjectId, teamId: string, opts: { gameId?: string; full?: boolean }): Promise<TeamGameView> {
  const list = (await gamesOf(eventId)).filter((g) => g.roster.some((t) => t.teamId === teamId));
  const mine = list.find((g) => g.roster.some((t) => t.teamId === teamId));
  const r = mine?.roster.find((t) => t.teamId === teamId);
  const view: TeamGameView = {
    team: { teamId, teamName: r?.teamName ?? teamId, card: r?.card, track: r?.track },
    games: list.map(summary),
    now: Date.now(),
  };
  const pick =
    (opts.gameId && list.find((g) => g._id.toHexString() === opts.gameId)) ||
    list.find((g) => g.status === 'LIVE') ||
    list.find((g) => g.status === 'LOBBY') ||
    list[0];
  if (!pick) return view;
  const id = pick._id.toHexString();
  let g = await loadGame(id);
  if (!g) return view;

  if (opts.full && g.status !== 'ENDED' && !g.joined.includes(teamId)) {
    const { games } = await cols();
    await games.updateOne({ _id: g._id }, { $addToSet: { joined: teamId } });
    cache.delete(id);
    g = (await loadGame(id)) ?? g;
  }

  view.game = toState(g, { card: r?.card, teamId });
  if (g.kind === 'detective') {
    const det: MyDetective = { row: g.detBoard?.find((x) => x.teamId === teamId) };
    if (opts.full) {
      const { answers } = await cols();
      const [a, w] = await Promise.all([
        answers.findOne({ gameId: id, key: `q${g.qi}`, teamId }),
        answers.findOne({ gameId: id, key: `w${g.qi}`, teamId }),
      ]);
      if (a) det.answer = { qi: a.qi, choice: a.choice, ms: a.ms };
      if (w) det.wager = w.choice;
    }
    view.det = det;
  } else {
    const row = g.exBoard?.find((x) => x.teamId === teamId);
    if (opts.full) {
      const { folios } = await cols();
      const f = await folios.findOne({ gameId: id, teamId });
      if (f) view.ex = myExchange(g, f);
    }
    if (!view.ex && row) {
      view.ex = { cash: row.cash, h: row.h ?? {}, worth: row.worth, rank: row.rank, bonus: row.bonus, seq: -1 };
    }
  }
  return view;
}

/* ── Scores for the final leaderboard ────────────────────────────────── */

export async function liveScores(eventId: ObjectId): Promise<{ rows: LiveScoreRow[]; games: GameSummary[] }> {
  const { games } = await cols();
  const ended = await games
    .find({ eventId, status: 'ENDED' }, { projection: { kind: 1, name: 1, group: 1, status: 1, roster: 1, createdAt: 1, results: 1 } })
    .toArray();
  const db = await getDb();
  const [regs, drop] = await Promise.all([
    db
      .collection('registrations')
      .find({ eventId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, teamName: 1 } })
      .sort({ teamId: 1 })
      .toArray(),
    getCardDrop(eventId),
  ]);
  const cardOf = new Map((drop?.assignments ?? []).map((a) => [a.teamId, a.card]));
  const rows = new Map<string, LiveScoreRow>(
    regs.map((r) => [r.teamId as string, { teamId: r.teamId as string, teamName: r.teamName as string, card: cardOf.get(r.teamId as string) }])
  );
  for (const g of ended) {
    for (const res of g.results || []) {
      const row = rows.get(res.teamId);
      if (!row) continue;
      if (g.kind === 'detective' && (row.detective === undefined || res.final > row.detective)) {
        row.detective = res.final;
        row.detectiveGame = g.name;
      }
      if (g.kind === 'exchange' && (row.trading === undefined || res.final > row.trading)) {
        row.trading = res.final;
        row.tradingGame = g.name;
      }
    }
  }
  return { rows: [...rows.values()], games: ended.map(summary) };
}
