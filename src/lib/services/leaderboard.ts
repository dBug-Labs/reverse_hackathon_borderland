import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { CARD_BY_CODE, TRACKS, rankMultiplier } from '@/lib/cardDrop/cards';
import { liveScores } from '@/lib/services/live';
import { getDocScores } from '@/lib/services/docScores';
import { getScores } from '@/lib/services/judgeScores';
import { getCodeReview } from '@/lib/services/codeReview';
import { results as judgeResults } from '@/lib/judging/scoring';
import { DEFAULT_CONFIG, rankRows, totalFor, type LeaderConfig, type LeaderRow, type LeaderView, type PartKey, type TeamScorecard } from '@/lib/leaderboard/types';

/**
 * The live leaderboard. Reads every score where it already lives (live games, docs scores,
 * judge scoring, code review) and adds the parts the app does not track on its own:
 * Visas left, the Doc Test and a manual adjustment, kept per team in `leaderboardTeams`.
 */

interface ConfigDoc extends LeaderConfig {
  eventId: ObjectId;
  updatedAt: Date;
}

interface TeamDoc {
  eventId: ObjectId;
  teamId: string;
  visas?: number;
  docTest?: number;
  adjust?: number;
  adjustNote?: string;
  updatedBy?: string;
  updatedAt: Date;
}

async function cols() {
  const db = await getDb();
  return { config: db.collection<ConfigDoc>('leaderboardConfig'), teams: db.collection<TeamDoc>('leaderboardTeams') };
}

let cache: { id: string; at: number; view: LeaderView } | null = null;

export async function getLeaderboard(eventId: ObjectId, fresh = false): Promise<LeaderView> {
  const key = eventId.toHexString();
  if (!fresh && cache && cache.id === key && Date.now() - cache.at < 2000) return { ...cache.view, now: Date.now() };

  const c = await cols();
  const [cfgDoc, extras, live, docs, judge, code] = await Promise.all([
    c.config.findOne({ eventId }),
    c.teams.find({ eventId }).toArray(),
    liveScores(eventId),
    getDocScores(eventId),
    getScores(eventId),
    getCodeReview(eventId),
  ]);
  const config: LeaderConfig = cfgDoc
    ? { include: { ...DEFAULT_CONFIG.include, ...cfgDoc.include }, multiplier: cfgDoc.multiplier, visas: cfgDoc.visas, scoredOnly: cfgDoc.scoredOnly, published: !!cfgDoc.published }
    : DEFAULT_CONFIG;

  const extraOf = new Map(extras.map((e) => [e.teamId, e]));
  const whoOf = await yearsAndDepts(eventId);
  const docOf = new Map(docs.map((d) => [d.teamId, d.total]));
  const judgeOf = new Map(judgeResults(judge.teams, judge.scores).filter((r) => r.judges).map((r) => [r.teamId, r.avg]));
  const codeOf = new Map(code.scores.map((s) => [s.teamId, s.total]));

  let rows: LeaderRow[] = live.rows.map((t) => {
    const card = t.card ? CARD_BY_CODE[t.card] : undefined;
    const x = extraOf.get(t.teamId);
    const parts: Partial<Record<PartKey, number>> = {};
    if (t.detective !== undefined) parts.detective = t.detective;
    if (t.trading !== undefined) parts.trading = t.trading;
    if (docOf.has(t.teamId)) parts.docs = docOf.get(t.teamId);
    if (x?.docTest !== undefined) parts.docTest = x.docTest;
    if (judgeOf.has(t.teamId)) parts.judging = judgeOf.get(t.teamId);
    if (codeOf.has(t.teamId)) parts.code = codeOf.get(t.teamId);
    const row: LeaderRow = {
      teamId: t.teamId,
      teamName: t.teamName,
      card: card?.code,
      cardTitle: card?.title,
      track: card?.track,
      suit: card ? TRACKS[card.track].suit : undefined,
      year: whoOf.get(t.teamId)?.year,
      dept: whoOf.get(t.teamId)?.dept,
      mult: card ? rankMultiplier(card.rank) : 1,
      parts,
      visas: x?.visas ?? 3,
      adjust: x?.adjust ?? 0,
      adjustNote: x?.adjustNote,
      subtotal: 0,
      total: 0,
      rank: 0,
    };
    return { ...row, ...totalFor(row, config) };
  });
  if (config.scoredOnly) rows = rows.filter((r) => Object.keys(r.parts).length > 0);
  const view = { config, rows: rankRows(rows), now: Date.now() };
  cache = { id: key, at: Date.now(), view };
  return view;
}

const ordinal = (y: string) => (/^\d+$/.test(y) ? `${y}${y === '1' ? 'st' : y === '2' ? 'nd' : y === '3' ? 'rd' : 'th'}` : y);

/** Each team's years and departments, summed up from its players. */
async function yearsAndDepts(eventId: ObjectId): Promise<Map<string, { year?: string; dept?: string }>> {
  const regs = await (await getDb())
    .collection('registrations')
    .find({ eventId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, 'players.year': 1, 'players.department': 1 } })
    .toArray();
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.map((x) => String(x ?? '').trim()).filter(Boolean))];
  return new Map(
    regs.map((r) => {
      const players = (r.players ?? []) as { year?: string; department?: string }[];
      const years = uniq(players.map((p) => p.year)).sort();
      // Department names are typed by hand: group them case-insensitively, most common first.
      const count = new Map<string, { name: string; n: number }>();
      for (const d of players.map((p) => String(p.department ?? '').trim()).filter(Boolean)) {
        const k = d.toUpperCase();
        count.set(k, { name: count.get(k)?.name ?? d, n: (count.get(k)?.n ?? 0) + 1 });
      }
      const depts = [...count.values()].sort((a, b) => b.n - a.n).map((x) => x.name);
      return [
        r.teamId as string,
        {
          year: years.length ? `${years.map(ordinal).join('/')} yr` : undefined,
          dept: depts.length ? depts.slice(0, 2).join('/') + (depts.length > 2 ? ` +${depts.length - 2}` : '') : undefined,
        },
      ];
    })
  );
}

/** One team's own scorecard, only once the organisers publish them. */
export async function teamScorecard(eventId: ObjectId, teamId: string): Promise<TeamScorecard> {
  const v = await getLeaderboard(eventId);
  if (!v.config.published) return { published: false };
  return { published: true, row: v.rows.find((r) => r.teamId === teamId), of: v.rows.length, config: v.config };
}

export interface LeaderInput {
  action: 'config' | 'team';
  config?: Partial<LeaderConfig>;
  teamId?: string;
  visas?: number;
  docTest?: number | null;
  adjust?: number;
  adjustNote?: string;
}

export async function leaderboardAction(eventId: ObjectId, input: LeaderInput, actor: string) {
  const c = await cols();
  if (input.action === 'config') {
    const cur = (await c.config.findOne({ eventId })) ?? { ...DEFAULT_CONFIG };
    const next: LeaderConfig = {
      include: { ...DEFAULT_CONFIG.include, ...cur.include, ...(input.config?.include ?? {}) },
      multiplier: input.config?.multiplier ?? cur.multiplier,
      visas: input.config?.visas ?? cur.visas,
      scoredOnly: input.config?.scoredOnly ?? cur.scoredOnly,
      published: input.config?.published ?? !!cur.published,
    };
    await c.config.updateOne({ eventId }, { $set: { ...next, updatedAt: new Date() } }, { upsert: true });
  } else if (input.action === 'team') {
    const teamId = String(input.teamId || '').trim();
    if (!teamId) return { ok: false as const, code: 'VALIDATION', message: 'Pick a team.' };
    const set: Record<string, unknown> = { updatedBy: actor, updatedAt: new Date() };
    const unset: Record<string, ''> = {};
    if (input.visas !== undefined) set.visas = Math.max(0, Math.min(3, Math.round(Number(input.visas) || 0)));
    if (input.docTest === null) unset.docTest = '';
    else if (input.docTest !== undefined) set.docTest = Math.max(0, Math.min(50, Math.round(Number(input.docTest) * 2) / 2 || 0));
    if (input.adjust !== undefined) set.adjust = Math.max(-200, Math.min(200, Math.round(Number(input.adjust) * 2) / 2 || 0));
    if (input.adjustNote !== undefined) set.adjustNote = String(input.adjustNote).slice(0, 200);
    await c.teams.updateOne({ eventId, teamId }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { upsert: true });
  } else return { ok: false as const, code: 'VALIDATION', message: 'Unknown action.' };
  return { ok: true as const, view: await getLeaderboard(eventId, true) };
}
