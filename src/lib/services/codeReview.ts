import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAdminSubmissions } from '@/lib/services/submission';
import { CARDS, CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { buildPrompt, setupCommands } from '@/lib/codeReview/prompts';
import { RUBRIC, type CodeReviewView, type RubricKey } from '@/lib/codeReview/rubric';
import { SUBMISSION_WINDOW } from '@/lib/submission/config';

/**
 * Code review scores (after the 12:30 code freeze). One score per team: the latest save wins,
 * and the reviewer's name and the agent's report are kept with it.
 */

export interface CodeTeam {
  teamId: string;
  teamName: string;
  card: string | null;
  repoUrl: string | null;
  /** Last commit before the code freeze, when the freeze snapshot was taken. */
  sha: string | null;
  pushedAfterFreeze: boolean;
}

export interface CodeScore {
  teamId: string;
  parts: Record<RubricKey, number>;
  total: number;
  reviewer: string;
  notes: string;
  report: string;
  updatedAt: number;
}

interface CodeScoreDoc extends Omit<CodeScore, 'updatedAt'> {
  eventId: ObjectId;
  updatedAt: Date;
}

const col = async () => (await getDb()).collection<CodeScoreDoc>('code_scores');

export async function getCodeReview(eventId: ObjectId): Promise<{ teams: CodeTeam[]; scores: CodeScore[] }> {
  const [subs, docs] = await Promise.all([getAdminSubmissions(eventId), (await col()).find({ eventId }).toArray()]);
  return {
    teams: subs.rows
      .filter((r) => r.card)
      .map((r) => ({
        teamId: r.teamId as string,
        teamName: r.teamName as string,
        card: r.card,
        repoUrl: r.submission?.repoUrl ?? null,
        sha: r.submission?.snapshots?.code?.beforeFreezeSha ?? null,
        pushedAfterFreeze: !!r.submission?.snapshots?.code?.pushedAfterFreeze,
      })),
    scores: docs.map((d) => ({ teamId: d.teamId, parts: d.parts, total: d.total, reviewer: d.reviewer, notes: d.notes, report: d.report, updatedAt: d.updatedAt.getTime() })),
  };
}

/** Everything the page needs, with the prompts built here so they only reach logged-in reviewers. */
export async function codeReviewView(eventId: ObjectId, me: string): Promise<CodeReviewView> {
  const { teams, scores } = await getCodeReview(eventId);
  return {
    me,
    freezeAt: SUBMISSION_WINDOW.codeFreezeAt,
    cards: CARDS.map((c) => ({
      code: c.code,
      title: c.title,
      name: c.name,
      track: c.track,
      suit: TRACKS[c.track].suit,
      trackLabel: TRACKS[c.track].label,
      rank: c.rank,
      source: { name: c.source.name, url: c.source.url },
      prompt: buildPrompt(c),
    })),
    teams: teams.map((t) => {
      const card = t.card ? CARD_BY_CODE[t.card] : undefined;
      return { ...t, setup: setupCommands(t), prompt: card ? buildPrompt(card, t) : null };
    }),
    scores,
  };
}

export async function saveCodeScore(
  eventId: ObjectId,
  input: { teamId?: string; parts?: Partial<Record<RubricKey, number>>; notes?: string; report?: string; remove?: boolean },
  reviewer: string
) {
  const teamId = String(input.teamId || '').trim();
  if (!teamId) return { ok: false as const, code: 'VALIDATION', message: 'Pick a team.' };
  const c = await col();
  if (input.remove) {
    await c.deleteOne({ eventId, teamId });
    return { ok: true as const };
  }
  const parts = Object.fromEntries(
    RUBRIC.map((r) => {
      const n = Math.round(Number(input.parts?.[r.key]) * 2) / 2;
      return [r.key, Number.isFinite(n) ? Math.max(0, Math.min(r.max, n)) : 0];
    })
  ) as Record<RubricKey, number>;
  const total = RUBRIC.reduce((n, r) => n + parts[r.key], 0);
  await c.updateOne(
    { eventId, teamId },
    { $set: { parts, total, reviewer, notes: String(input.notes || '').slice(0, 2000), report: String(input.report || '').slice(0, 40000), updatedAt: new Date() } },
    { upsert: true }
  );
  return { ok: true as const };
}
