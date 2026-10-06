/**
 * Final judging score sheet: 150 points per judge. Each judge scores on their own;
 * a team's final judging score is the average of its judges' totals.
 * Shared by the server and the client, so no server-only imports here.
 */

import type { TrackId } from '@/lib/cardDrop/cards';

export type KtResult = 'pass' | 'partial' | 'fail';

export const KT_POINTS: Record<KtResult, number> = { pass: 15, partial: 7, fail: 0 };
export const KT_MAX = 45;

export type CriterionKey = 'improvements' | 'brief' | 'defence' | 'twist' | 'demo';

export const CRITERIA: { key: CriterionKey; label: string; max: number; hint: string }[] = [
  { key: 'improvements', label: 'Two improvements', max: 40, hint: 'Both are real, working and justified against the original product' },
  { key: 'brief', label: 'Fits the brief', max: 25, hint: 'The rebuild does what the card’s brief and their spec say it should' },
  { key: 'defence', label: 'Defence', max: 25, hint: 'Any member can explain the build and answer follow-ups' },
  { key: 'twist', label: 'Twist answer', max: 10, hint: 'A clear, workable answer to the Twist Card in the pitch' },
  { key: 'demo', label: 'Demo', max: 5, hint: 'A clean live demo (or the submission video if live failed)' },
];

export const TOTAL_MAX = KT_MAX + CRITERIA.reduce((n, c) => n + c.max, 0);

export interface ScoreInput {
  /** The three Killer Tests, in the card's order. null = not run yet. */
  kt: (KtResult | null)[];
  improvements: number;
  brief: number;
  defence: number;
  twist: number;
  demo: number;
  notes?: string;
}

export interface JudgeScore extends ScoreInput {
  teamId: string;
  judge: string;
  total: number;
  updatedAt: number;
}

export interface ScoreTeam {
  teamId: string;
  teamName: string;
  track?: TrackId;
  card?: string;
  panel: number;
  order: number;
  state: 'waiting' | 'called' | 'done';
}

export interface ScoresView {
  locked: boolean;
  panels: { suit: string; name: string; judges: string; track?: TrackId; tracks?: TrackId[] }[];
  teams: ScoreTeam[];
  scores: JudgeScore[];
}

export const ktTotal = (kt: (KtResult | null)[]) => kt.reduce((n, r) => n + (r ? KT_POINTS[r] : 0), 0);

export function totalOf(s: ScoreInput): number {
  return ktTotal(s.kt) + CRITERIA.reduce((n, c) => n + (s[c.key] || 0), 0);
}

export const blankScore = (): ScoreInput => ({ kt: [null, null, null], improvements: 0, brief: 0, defence: 0, twist: 0, demo: 0, notes: '' });

/** Cleans what a client sent: clamps every number to its range. */
export function cleanScore(raw: Partial<ScoreInput>): ScoreInput {
  const kt = [0, 1, 2].map((i) => {
    const r = raw.kt?.[i];
    return r === 'pass' || r === 'partial' || r === 'fail' ? r : null;
  });
  const out = { ...blankScore(), kt, notes: String(raw.notes ?? '').slice(0, 1000) };
  for (const c of CRITERIA) {
    const n = Math.round(Number(raw[c.key]));
    out[c.key] = Number.isFinite(n) ? Math.max(0, Math.min(c.max, n)) : 0;
  }
  return out;
}

export interface TeamResult {
  teamId: string;
  teamName: string;
  panel: number;
  judges: number;
  avg: number;
  kt: number;
  crit: Record<CriterionKey, number>;
  rank: number;
}

const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Average of each team's judges, ranked. Teams nobody has scored are left at the bottom. */
export function results(teams: ScoreTeam[], scores: JudgeScore[]): TeamResult[] {
  const rows = teams.map((t) => {
    const mine = scores.filter((s) => s.teamId === t.teamId);
    const crit = Object.fromEntries(CRITERIA.map((c) => [c.key, r1(avgOf(mine.map((s) => s[c.key])))])) as Record<CriterionKey, number>;
    return {
      teamId: t.teamId,
      teamName: t.teamName,
      panel: t.panel,
      judges: mine.length,
      avg: r1(avgOf(mine.map((s) => s.total))),
      kt: r1(avgOf(mine.map((s) => ktTotal(s.kt)))),
      crit,
      rank: 0,
    };
  });
  rows.sort((a, b) => (b.judges ? 1 : 0) - (a.judges ? 1 : 0) || b.avg - a.avg || b.kt - a.kt || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  let last: number | null = null;
  rows.forEach((r, i) => {
    if (!r.judges) return;
    if (last === null || r.avg !== last) rank = i + 1;
    last = r.avg;
    r.rank = rank;
  });
  return rows;
}
