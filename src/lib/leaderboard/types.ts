/**
 * The live leaderboard: every score a team earns, added up.
 *
 *   Total = (counted parts) × card multiplier + 10 × Visas left + adjustment
 *
 * Which parts count is a setting, so the organisers decide (e.g. whether the code review counts).
 * Client-safe (no server imports).
 */

export type PartKey = 'detective' | 'docs' | 'docTest' | 'judging' | 'code' | 'trading';

export const PARTS: { key: PartKey; label: string; short: string; max: number; suit: string; source: string }[] = [
  { key: 'detective', label: 'Code Detective', short: 'Detective', max: 50, suit: '♠', source: 'Live games (best ended game)' },
  { key: 'docs', label: 'Deduction · docs', short: 'Docs', max: 150, suit: '♦', source: 'Docs scores' },
  { key: 'docTest', label: 'Doc Test', short: 'Doc Test', max: 50, suit: '♦', source: 'Entered here' },
  { key: 'judging', label: 'Final judging', short: 'Judging', max: 150, suit: '♥', source: 'Judge scoring (average of judges)' },
  { key: 'code', label: 'Code review', short: 'Code', max: 100, suit: '♥', source: 'Code review kit' },
  { key: 'trading', label: 'Trading bonus', short: 'Trading', max: 30, suit: '♣', source: 'Live games (Trading Floor)' },
];

export interface LeaderConfig {
  include: Record<PartKey, boolean>;
  multiplier: boolean;
  visas: boolean;
  /** Hide teams with no score at all. */
  scoredOnly: boolean;
}

export const DEFAULT_CONFIG: LeaderConfig = {
  include: { detective: true, docs: true, docTest: true, judging: true, code: true, trading: true },
  multiplier: true,
  visas: true,
  scoredOnly: true,
};

export interface LeaderRow {
  teamId: string;
  teamName: string;
  card?: string;
  cardTitle?: string;
  track?: string;
  suit?: string;
  mult: number;
  parts: Partial<Record<PartKey, number>>;
  visas: number;
  adjust: number;
  adjustNote?: string;
  subtotal: number;
  total: number;
  rank: number;
}

export interface LeaderView {
  config: LeaderConfig;
  rows: LeaderRow[];
  now: number;
}

/** Applies the formula to one team. */
export function totalFor(r: Pick<LeaderRow, 'parts' | 'mult' | 'visas' | 'adjust'>, c: LeaderConfig) {
  const subtotal = PARTS.reduce((n, p) => n + (c.include[p.key] ? r.parts[p.key] ?? 0 : 0), 0);
  const total = subtotal * (c.multiplier ? r.mult : 1) + (c.visas ? 10 * r.visas : 0) + r.adjust;
  return { subtotal, total: Math.round(total * 10) / 10 };
}

export function rankRows(rows: LeaderRow[]): LeaderRow[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total || (b.parts.judging ?? 0) - (a.parts.judging ?? 0) || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  let last: number | null = null;
  return sorted.map((r, i) => {
    if (last === null || r.total !== last) rank = i + 1;
    last = r.total;
    return { ...r, rank };
  });
}
