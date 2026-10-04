import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { logAction } from './audit';
import { getCardDrop } from './cardDrop';
import { checkRepo, snapshotRepo } from './github';
import { SUBMISSION_WINDOW, isHttpUrl, parseRepoUrl, submissionStage } from '@/lib/submission/config';
import type { Registration, SubmissionDoc } from '@/lib/types';

/**
 * Overnight submissions: one public GitHub repo per team, plus two optional
 * links. Teams save through their status link; admins can override.
 *
 * - The repo link can change until the docs freeze (8:30 Tue).
 * - The optional links can change until the code freeze (12:30 Tue).
 * - Admins take freeze snapshots (head commit, last push) for scoring.
 */

type Fail = { ok: false; code: string; message: string };
type Result<T> = { ok: true; data: T } | Fail;
const fail = (code: string, message: string): Fail => ({ ok: false, code, message });

async function col() {
  const db = await getDb();
  return {
    subs: db.collection<SubmissionDoc>('submissions'),
    regs: db.collection<Registration>('registrations'),
  };
}

export async function getSubmission(eventId: ObjectId, teamId: string) {
  const { subs } = await col();
  return subs.findOne({ eventId, teamId });
}

/** The team's view: its submission, its card, and the clock. */
export async function getTeamSubmissionView(eventId: ObjectId, teamId: string) {
  const [sub, drop] = await Promise.all([getSubmission(eventId, teamId), getCardDrop(eventId)]);
  const assignment = drop?.assignments?.find((a) => a.teamId === teamId);
  return {
    stage: submissionStage(),
    window: SUBMISSION_WINDOW,
    card: assignment ? { code: assignment.card, title: assignment.title ?? null } : null,
    submission: sub ? publicShape(sub) : null,
  };
}

function publicShape(s: SubmissionDoc) {
  return {
    repoUrl: s.repoUrl,
    demoVideoUrl: s.demoVideoUrl ?? '',
    liveUrl: s.liveUrl ?? '',
    declaredAt: s.declaredAt,
    check: s.check ?? null,
    updatedAt: s.updatedAt,
  };
}

interface SaveInput {
  repoUrl?: unknown;
  demoVideoUrl?: unknown;
  liveUrl?: unknown;
  declaration?: unknown;
}

/** Team save. Runs a GitHub check straight after so the team sees what is missing. */
export async function saveTeamSubmission(eventId: ObjectId, teamId: string, input: SaveInput): Promise<Result<SubmissionDoc>> {
  const stage = submissionStage();
  if (stage === 'NOT_OPEN') return fail('NOT_OPEN', 'Submissions open at 4 PM on Monday, after the Card Drop.');
  if (stage === 'CLOSED') return fail('CLOSED', 'The code freeze has passed. Submissions are closed.');

  const drop = await getCardDrop(eventId);
  if (!drop?.assignments?.some((a) => a.teamId === teamId)) {
    return fail('NO_CARD', 'Your team has no card yet. Submissions open once the Card Drop has given you one.');
  }

  const parsed = parseRepoUrl(String(input.repoUrl ?? ''));
  if (!parsed) return fail('VALIDATION', 'Enter your GitHub repo link, like https://github.com/your-name/your-repo');
  const video = String(input.demoVideoUrl ?? '').trim();
  const live = String(input.liveUrl ?? '').trim();
  if (video && !isHttpUrl(video)) return fail('VALIDATION', 'The demo video link must start with https://');
  if (live && !isHttpUrl(live)) return fail('VALIDATION', 'The live link must start with https://');

  const { subs } = await col();
  const existing = await subs.findOne({ eventId, teamId });
  if (!existing && input.declaration !== true) {
    return fail('VALIDATION', 'Tick the clean-room declaration to submit.');
  }
  if (existing && stage === 'DOCS_FROZEN' && existing.repoUrl !== parsed.url) {
    return fail('FROZEN', 'The docs freeze has passed, so the repo link is locked. See a Game Master if it is wrong.');
  }
  if (!existing && stage === 'DOCS_FROZEN') {
    return fail('FROZEN', 'The docs freeze has passed. See a Game Master to add your repo.');
  }

  // Another team already submitted this repo?
  const clash = await subs.findOne({ eventId, owner: parsed.owner, repo: parsed.repo, teamId: { $ne: teamId } }, { collation: { locale: 'en', strength: 2 } });
  if (clash) return fail('TAKEN', 'Another team has already submitted this repo.');

  const now = new Date();
  const check = await checkRepo(parsed.owner, parsed.repo);
  const set: Partial<SubmissionDoc> = {
    repoUrl: parsed.url,
    owner: parsed.owner,
    repo: parsed.repo,
    demoVideoUrl: video || undefined,
    liveUrl: live || undefined,
    check,
    updatedAt: now,
  };
  const changedRepo = !existing || existing.repoUrl !== parsed.url;
  const res = await subs.findOneAndUpdate(
    { eventId, teamId },
    {
      $set: set,
      $setOnInsert: { eventId, teamId, declaredAt: now, createdAt: now },
      ...(changedRepo ? { $push: { history: { at: now, by: 'team', repoUrl: parsed.url } } } : {}),
    },
    { upsert: true, returnDocument: 'after' }
  );
  return { ok: true, data: res as SubmissionDoc };
}

/** Re-run the GitHub check for one team. */
export async function recheck(eventId: ObjectId, teamId: string): Promise<Result<SubmissionDoc>> {
  const { subs } = await col();
  const sub = await subs.findOne({ eventId, teamId });
  if (!sub) return fail('NOT_FOUND', 'Save your repo link first.');
  const check = await checkRepo(sub.owner, sub.repo);
  const res = await subs.findOneAndUpdate({ _id: sub._id }, { $set: { check, updatedAt: new Date() } }, { returnDocument: 'after' });
  return { ok: true, data: res as SubmissionDoc };
}

/* ── Admin ──────────────────────────────────────────────────────────── */

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

export async function getAdminSubmissions(eventId: ObjectId) {
  const { subs, regs } = await col();
  const [teams, all, drop] = await Promise.all([
    regs
      .find({ eventId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, teamName: 1 } })
      .sort({ teamId: 1 })
      .toArray(),
    subs.find({ eventId }).toArray(),
    getCardDrop(eventId),
  ]);
  const byTeam = new Map(all.map((s) => [s.teamId, s]));
  const cards = new Map((drop?.assignments ?? []).map((a) => [a.teamId, a]));
  return {
    stage: submissionStage(),
    window: SUBMISSION_WINDOW,
    rows: teams.map((t) => {
      const s = byTeam.get(t.teamId);
      const a = cards.get(t.teamId);
      return {
        teamId: t.teamId,
        teamName: t.teamName,
        card: a?.card ?? null,
        title: a?.title ?? null,
        submission: s
          ? {
              repoUrl: s.repoUrl,
              demoVideoUrl: s.demoVideoUrl ?? null,
              liveUrl: s.liveUrl ?? null,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
              check: s.check ?? null,
              snapshots: s.snapshots ?? {},
              history: s.history,
            }
          : null,
      };
    }),
  };
}

export async function adminCheckAll(eventId: ObjectId, actor: string, ipHash: string) {
  const { subs } = await col();
  const all = await subs.find({ eventId }).toArray();
  await inBatches(all, 5, async (s) => {
    const check = await checkRepo(s.owner, s.repo);
    await subs.updateOne({ _id: s._id }, { $set: { check, updatedAt: new Date() } });
  });
  await logAction(actor, 'admin', 'SUBMISSIONS_CHECK_ALL', 'submissions', ipHash, undefined, { repos: all.length });
  return { ok: true as const };
}

export async function adminSnapshot(eventId: ObjectId, which: 'docs' | 'code', actor: string, ipHash: string) {
  const { subs } = await col();
  const freezeAt = which === 'docs' ? SUBMISSION_WINDOW.docsFreezeAt : SUBMISSION_WINDOW.codeFreezeAt;
  const all = await subs.find({ eventId }).toArray();
  await inBatches(all, 5, async (s) => {
    const snap = await snapshotRepo(s.owner, s.repo, freezeAt, actor);
    await subs.updateOne({ _id: s._id }, { $set: { [`snapshots.${which}`]: snap, updatedAt: new Date() } });
  });
  await logAction(actor, 'admin', which === 'docs' ? 'SUBMISSIONS_SNAPSHOT_DOCS' : 'SUBMISSIONS_SNAPSHOT_CODE', 'submissions', ipHash, undefined, {
    repos: all.length,
  });
  return { ok: true as const };
}

/** Admin sets or fixes a team's repo at any time (e.g. a typo noticed after the freeze). */
export async function adminSetRepo(eventId: ObjectId, teamId: string, repoUrl: string, actor: string, ipHash: string): Promise<Result<true>> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) return fail('VALIDATION', 'Not a GitHub repo link.');
  const { subs, regs } = await col();
  const team = await regs.findOne({ eventId, teamId, status: 'CONFIRMED', deletedAt: { $exists: false } });
  if (!team) return fail('NOT_FOUND', `${teamId} is not a confirmed team.`);
  const clash = await subs.findOne({ eventId, owner: parsed.owner, repo: parsed.repo, teamId: { $ne: teamId } }, { collation: { locale: 'en', strength: 2 } });
  if (clash) return fail('TAKEN', `${clash.teamId} already submitted this repo.`);

  const before = await subs.findOne({ eventId, teamId });
  const now = new Date();
  const check = await checkRepo(parsed.owner, parsed.repo);
  await subs.updateOne(
    { eventId, teamId },
    {
      $set: { repoUrl: parsed.url, owner: parsed.owner, repo: parsed.repo, check, updatedAt: now },
      $setOnInsert: { eventId, teamId, declaredAt: now, createdAt: now },
      $push: { history: { at: now, by: actor, repoUrl: parsed.url } },
    },
    { upsert: true }
  );
  await logAction(actor, 'admin', 'SUBMISSION_SET_REPO', teamId, ipHash, { repoUrl: before?.repoUrl }, { repoUrl: parsed.url });
  return { ok: true, data: true };
}
