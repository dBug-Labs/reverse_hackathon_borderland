import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAdminSubmissions } from '@/lib/services/submission';
import { CARDS, CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { buildPrompt, setupCommands } from '@/lib/codeReview/prompts';
import { RUBRIC, type CodeReviewView, type RubricKey } from '@/lib/codeReview/rubric';
import { SUBMISSION_WINDOW, parseRepoUrl } from '@/lib/submission/config';

/**
 * Code review scores (after the code freeze). One score per team: the latest save wins,
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

/* ── Running the review on a participant's laptop ───────────────────── */

interface LinkDoc {
  eventId: ObjectId;
  code: string;
  teamId: string;
  createdBy: string;
  expiresAt: Date;
}

const LINK_MIN = 30;
const links = async () => (await getDb()).collection<LinkDoc>('codeReviewLinks');

/**
 * A short link that shows one team's commands and prompt without logging in, so a judge never
 * signs in to the kit on a participant's laptop. Expires after 30 minutes.
 */
export async function createShareLink(eventId: ObjectId, teamId: string, actor: string) {
  const { teams } = await getCodeReview(eventId);
  if (!teams.some((t) => t.teamId === teamId)) return { ok: false as const, code: 'NOT_FOUND', message: 'Unknown team.' };
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  await (await links()).insertOne({ eventId, code, teamId, createdBy: actor, expiresAt: new Date(Date.now() + LINK_MIN * 60_000) });
  return { ok: true as const, code, minutes: LINK_MIN };
}

export async function readShareLink(code: string) {
  const l = await (await links()).findOne({ code: code.toUpperCase(), expiresAt: { $gt: new Date() } });
  if (!l) return null;
  const { teams } = await getCodeReview(l.eventId);
  const t = teams.find((x) => x.teamId === l.teamId);
  const card = t?.card ? CARD_BY_CODE[t.card] : undefined;
  if (!t || !card) return null;
  return { teamId: t.teamId, teamName: t.teamName, cardTitle: card.title, setup: setupCommands(t), prompt: buildPrompt(card, t), expiresAt: l.expiresAt.getTime() };
}

/** The CODE_REVIEW.md the agent pushed to the team's repo (GitHub API, so it is fresh). */
export async function fetchRepoReport(eventId: ObjectId, teamId: string) {
  const { teams } = await getCodeReview(eventId);
  const t = teams.find((x) => x.teamId === teamId);
  const parsed = t?.repoUrl ? parseRepoUrl(t.repoUrl) : null;
  if (!parsed) return { ok: false as const, code: 'NOT_FOUND', message: 'This team has no repo.' };
  const headers: Record<string, string> = { Accept: 'application/vnd.github.raw', 'User-Agent': 'hackback-code-review' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/CODE_REVIEW.md`, { headers, cache: 'no-store' });
  if (res.status === 404) return { ok: false as const, code: 'NOT_FOUND', message: 'No CODE_REVIEW.md in their repo yet. Did the push go through?' };
  if (!res.ok) return { ok: false as const, code: 'GITHUB', message: `GitHub said ${res.status}. Try again in a minute.` };
  return { ok: true as const, report: (await res.text()).slice(0, 40000) };
}
