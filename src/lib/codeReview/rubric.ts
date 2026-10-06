/**
 * The code review score (out of 100) and the parser for the agent's last line.
 * Client-safe: the prompts themselves stay on the server (see prompts.ts).
 */

export const RUBRIC = [
  { key: 'core', label: 'Core flow', max: 30 },
  { key: 'kt', label: 'Killer Tests', max: 30 },
  { key: 'imp', label: 'Two improvements', max: 20 },
  { key: 'docs', label: 'Built from their docs', max: 10 },
  { key: 'eng', label: 'Engineering', max: 10 },
] as const;

export type RubricKey = (typeof RUBRIC)[number]['key'];
export const CODE_MAX = 100;

/** Reads "SCORE core=.. kt=.. imp=.. docs=.. eng=.. total=.." from the agent's report. */
export function parseScoreLine(text: string): Partial<Record<RubricKey | 'total', number>> | null {
  const lines = text.match(/SCORE\s+[^\n]+/gi);
  if (!lines) return null;
  const out: Partial<Record<RubricKey | 'total', number>> = {};
  for (const [, k, v] of lines[lines.length - 1].matchAll(/(core|kt|imp|docs|eng|total)\s*=\s*(\d+(?:\.\d+)?)/gi)) out[k.toLowerCase() as RubricKey | 'total'] = Number(v);
  return Object.keys(out).length ? out : null;
}

export interface CodeCardView {
  code: string;
  title: string;
  name: string;
  track: string;
  suit: string;
  trackLabel: string;
  rank: string;
  source: { name: string; url: string };
  prompt: string;
}

export interface CodeTeamView {
  teamId: string;
  teamName: string;
  card: string | null;
  repoUrl: string | null;
  sha: string | null;
  pushedAfterFreeze: boolean;
  setup: string;
  prompt: string | null;
}

export interface CodeScoreView {
  teamId: string;
  parts: Record<RubricKey, number>;
  total: number;
  reviewer: string;
  notes: string;
  report: string;
  updatedAt: number;
}

export interface CodeReviewView {
  me: string;
  freezeAt: string;
  cards: CodeCardView[];
  teams: CodeTeamView[];
  scores: CodeScoreView[];
}
