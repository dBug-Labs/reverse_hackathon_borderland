'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { REQUIRED_FILES, SUBMISSION_WINDOW, type SubmissionStage } from '@/lib/submission/config';

/**
 * Overnight submission for a team. Same signed status token as /r/[teamId]?t=...
 *
 * - SubmissionSummary: a short block on the status page.
 * - SubmissionPage:    the full page at /r/[teamId]/submit.
 */

interface RepoCheckDTO {
  at: string;
  ok: boolean;
  error?: string;
  public?: boolean;
  fork?: string;
  defaultBranch?: string;
  headSha?: string;
  headAt?: string;
  pushedAt?: string;
  files?: Record<string, string | null>;
  warnings?: string[];
}

interface ViewDTO {
  stage: SubmissionStage;
  card: { code: string; title: string | null } | null;
  submission: {
    repoUrl: string;
    demoVideoUrl: string;
    liveUrl: string;
    declaredAt: string;
    check: RepoCheckDTO | null;
    updatedAt: string;
  } | null;
}

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
const ist = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: '2-digit' });
const submitHref = (teamId: string, token: string) => `/r/${encodeURIComponent(teamId)}/submit?t=${encodeURIComponent(token)}`;

function useSubmission(teamId: string, token: string) {
  const [view, setView] = useState<ViewDTO | null>(null);
  const [error, setError] = useState('');
  const url = `/api/submissions/${encodeURIComponent(teamId)}?t=${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setView(json.data);
        setError('');
      } else setError(json.message || 'Could not load your submission.');
    } catch {
      setError('Network error. Check your connection.');
    }
  }, [url]);

  useEffect(() => {
    if (teamId && token) load();
  }, [load, teamId, token]);

  async function send(body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) return json.message || 'That did not work.';
      setView(json.data);
      return null;
    } catch {
      return 'Network error. Try again.';
    }
  }

  return { view, error, send };
}

function filesFound(check: RepoCheckDTO | null) {
  if (!check?.files) return 0;
  return REQUIRED_FILES.filter((f) => check.files![f.key]).length;
}

/* ── On the status page ───────────────────────────────────────────────── */

export function SubmissionSummary({ teamId, token }: { teamId: string; token: string }) {
  const { view } = useSubmission(teamId, token);
  if (!view || !view.card) return null;
  const s = view.submission;
  const found = filesFound(s?.check ?? null);

  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-black/50 p-5 font-label">
      <div className="font-poster text-2xl uppercase leading-none text-[#f2e9d8]">
        Your <span className="text-[var(--card-red)]">submission</span>
      </div>
      <p className="mt-1.5 text-[15px] text-neutral-300">
        {view.stage === 'NOT_OPEN' && 'Opens at 4 PM on Monday. You submit one public GitHub repo.'}
        {view.stage !== 'NOT_OPEN' && !s && 'Not submitted yet. Save your GitHub repo link before the 11 PM checkpoint.'}
        {s && (
          <>
            Repo saved · {found} of {REQUIRED_FILES.length} required files found
            {s.check?.warnings?.length ? ` · ${s.check.warnings.length} warning${s.check.warnings.length > 1 ? 's' : ''}` : ''}
          </>
        )}
      </p>
      {view.stage !== 'NOT_OPEN' && (
        <Link
          href={submitHref(teamId, token)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--card-red)] px-5 py-2.5 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110"
        >
          {s ? 'Open submission' : 'Submit your repo'} →
        </Link>
      )}
    </section>
  );
}

/* ── The full page ────────────────────────────────────────────────────── */

const STEPS = [
  { at: SUBMISSION_WINDOW.opensAt, label: 'Opens', note: 'Repo may get its first commit' },
  { at: SUBMISSION_WINDOW.checkpointAt, label: 'Checkpoint', note: 'Repo link saved, first docs pushed' },
  { at: SUBMISSION_WINDOW.docsFreezeAt, label: 'Docs freeze', note: 'docs/ scored as of now; link locked' },
  { at: SUBMISSION_WINDOW.codeFreezeAt, label: 'Code freeze', note: 'Code judged as of now; all locked' },
];

function Timeline() {
  const now = Date.now();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const past = now >= Date.parse(s.at);
        const next = !past && (i === 0 || now >= Date.parse(STEPS[i - 1].at));
        return (
          <div
            key={s.label}
            className={cx(
              'rounded-xl border p-3',
              next ? 'border-[var(--card-red)] bg-[var(--card-red)]/10' : past ? 'border-neutral-800 opacity-60' : 'border-neutral-800'
            )}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{ist(s.at)}</div>
            <div className={cx('mt-0.5 font-poster text-xl uppercase', next ? 'text-[#ff6b6b]' : 'text-[#f2e9d8]')}>
              {past && <Check className="mr-1 inline h-4 w-4 align-[-2px] text-emerald-400" />}
              {s.label}
            </div>
            <div className="text-xs text-neutral-400">{s.note}</div>
          </div>
        );
      })}
    </div>
  );
}

function CheckPanel({ check, onRecheck, busy, canCheck }: { check: RepoCheckDTO; onRecheck: () => void; busy: boolean; canCheck: boolean }) {
  const found = filesFound(check);
  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-poster text-2xl uppercase text-[#f2e9d8]">Repo check</div>
        {canCheck && (
          <button
            onClick={onRecheck}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 transition hover:border-neutral-500 disabled:opacity-50"
          >
            <RefreshCw className={cx('h-4 w-4', busy && 'animate-spin')} /> Check again
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-500">Last checked {ist(check.at)}. Push your changes, then check again.</p>

      {check.error ? (
        <p className="mt-3 rounded-lg border border-[var(--card-red)]/60 bg-[var(--card-red)]/10 p-3 text-[15px] text-[#ff8a8a]">{check.error}</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-800 p-2.5">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Visibility</div>
              <div className={check.public ? 'text-emerald-400' : 'text-[#ff8a8a]'}>{check.public ? 'Public' : 'Private'}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 p-2.5">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Files</div>
              <div className={found === REQUIRED_FILES.length ? 'text-emerald-400' : 'text-amber-300'}>
                {found} of {REQUIRED_FILES.length} found
              </div>
            </div>
            <div className="rounded-lg border border-neutral-800 p-2.5">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Latest commit</div>
              <div className="font-mono text-neutral-200">
                {check.headSha?.slice(0, 7) ?? '—'} {check.headAt && <span className="font-label text-neutral-500">· {ist(check.headAt)}</span>}
              </div>
            </div>
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {REQUIRED_FILES.map((f) => {
              const hit = check.files?.[f.key];
              return (
                <li key={f.key} className="flex items-start gap-2 text-sm">
                  {hit ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6b6b]" />}
                  <span>
                    <span className={cx('font-mono', hit ? 'text-neutral-200' : 'text-white')}>{hit ?? f.label}</span>
                    <span className="block text-xs text-neutral-500">{f.why}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {!!check.warnings?.length && (
        <ul className="mt-3 space-y-1.5">
          {check.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-sm text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SubmissionPage({ teamId, token }: { teamId: string; token: string }) {
  const { view, error, send } = useSubmission(teamId, token);
  const [repoUrl, setRepoUrl] = useState('');
  const [video, setVideo] = useState('');
  const [live, setLive] = useState('');
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState<'' | 'save' | 'check'>('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (view?.submission && !filled) {
      setRepoUrl(view.submission.repoUrl);
      setVideo(view.submission.demoVideoUrl);
      setLive(view.submission.liveUrl);
      setFilled(true);
    }
  }, [view, filled]);

  if (!token) return <p className="font-label text-[#ff8a8a]">Open this page from the link in your email.</p>;
  if (error && !view) return <p className="font-label text-[#ff8a8a]">{error}</p>;
  if (!view) return <p className="font-label text-neutral-400">Loading…</p>;

  const card = view.card ? CARD_BY_CODE[view.card.code] : null;
  const s = view.submission;
  const stage = view.stage;
  const repoLocked = stage === 'DOCS_FROZEN' || stage === 'CLOSED';
  const allLocked = stage === 'CLOSED' || stage === 'NOT_OPEN';
  const needsDeclaration = !s;

  async function save() {
    setBusy('save');
    setMsg(null);
    const err = await send({ type: 'save', repoUrl, demoVideoUrl: video, liveUrl: live, declaration: declared });
    setBusy('');
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Saved. The repo check below is up to date.' });
  }
  async function recheck() {
    setBusy('check');
    setMsg(null);
    const err = await send({ type: 'check' });
    setBusy('');
    if (err) setMsg({ ok: false, text: err });
  }

  return (
    <div className="space-y-5 font-label">
      {card ? (
        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {TRACKS[card.track].suit} {TRACKS[card.track].label} · your card
          </div>
          <div className="mt-1 font-poster text-3xl uppercase leading-none text-[#f2e9d8]">{card.title}</div>
          {view.card?.title && <div className="mt-1 text-[15px] text-neutral-300">Your solution: {view.card.title}</div>}
          <a href={card.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-[#ff8a8a] underline">
            Original: {card.source.name} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <p className="rounded-xl border border-neutral-800 p-4 text-neutral-300">Your team has no card yet. Submissions open after the Card Drop.</p>
      )}

      <Timeline />

      {stage === 'NOT_OPEN' && (
        <p className="rounded-xl border border-neutral-800 p-4 text-neutral-300">Submissions open at 4 PM on Monday. Create your repo after that.</p>
      )}

      {card && stage !== 'NOT_OPEN' && (
        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-5">
          <div className="font-poster text-2xl uppercase text-[#f2e9d8]">{s ? 'Your submission' : 'Submit your repo'}</div>
          <p className="mt-1 text-sm text-neutral-400">
            One public GitHub repo holds everything: your docs, your rebuild and <span className="font-mono text-neutral-200">deck.pdf</span> in the root.
            Layout and rules are in the participant guide.
          </p>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">GitHub repo link (required)</span>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={repoLocked}
              placeholder="https://github.com/your-name/your-repo"
              className="w-full rounded-lg border border-neutral-700 bg-[#141417] px-3 py-2.5 font-mono text-[15px] text-white placeholder:text-neutral-600 focus:border-[var(--card-red)] focus:outline-none disabled:opacity-60"
            />
            {repoLocked && <span className="mt-1 block text-xs text-neutral-500">Locked after the docs freeze. See a Game Master if it is wrong.</span>}
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Demo video (optional)</span>
              <input
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                disabled={allLocked}
                placeholder="https://… 2-minute screen recording"
                className="w-full rounded-lg border border-neutral-700 bg-[#141417] px-3 py-2.5 text-[15px] text-white placeholder:text-neutral-600 focus:border-[var(--card-red)] focus:outline-none disabled:opacity-60"
              />
              <span className="mt-1 block text-xs text-neutral-500">Your backup if the live demo fails on Tuesday.</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Live link (optional)</span>
              <input
                value={live}
                onChange={(e) => setLive(e.target.value)}
                disabled={allLocked}
                placeholder="https://… if you deployed it"
                className="w-full rounded-lg border border-neutral-700 bg-[#141417] px-3 py-2.5 text-[15px] text-white placeholder:text-neutral-600 focus:border-[var(--card-red)] focus:outline-none disabled:opacity-60"
              />
              <span className="mt-1 block text-xs text-neutral-500">Not required: the rebuild must run on your laptop.</span>
            </label>
          </div>

          {needsDeclaration && (
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-800 p-3">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--card-red)]" />
              <span className="text-sm text-neutral-300">
                <span className="font-semibold text-white">Clean-room declaration.</span> Our repo was created after 4 PM Monday. We did not copy the original’s
                code or install its own packages. Our docs were pushed before our code. The repo is public, and nothing in it is written to steer the AI reviewer.
              </span>
            </label>
          )}

          {!allLocked && (
            <button
              onClick={save}
              disabled={!!busy || !repoUrl.trim() || (needsDeclaration && !declared)}
              className="mt-4 w-full rounded-lg border border-[var(--card-red)] bg-[var(--card-red)] py-3 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
            >
              {busy === 'save' ? 'Saving and checking GitHub…' : s ? 'Save changes' : 'Submit'}
            </button>
          )}
          {stage === 'CLOSED' && <p className="mt-3 text-sm text-neutral-400">The code freeze has passed. Your submission is locked.</p>}
          {msg && <p className={cx('mt-2 text-center text-sm', msg.ok ? 'text-emerald-400' : 'text-[#ff8a8a]')}>{msg.text}</p>}
        </div>
      )}

      {s?.check && <CheckPanel check={s.check} onRecheck={recheck} busy={busy === 'check'} canCheck={stage !== 'CLOSED'} />}

      {s && (
        <p className="text-sm text-neutral-500">
          What gets scored: <span className="text-neutral-300">docs/</span> as of the last push before 8:30 AM, and the code as of the last push before
          12:30 PM on Tuesday. We use GitHub’s own push times.
        </p>
      )}
    </div>
  );
}
