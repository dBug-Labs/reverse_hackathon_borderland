'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, LogOut, Save, Search, Trash2, TriangleAlert } from 'lucide-react';
import { Banner, Button, GridBackdrop, Panel, SectionLabel, Wordmark, inputCls } from '@/components/portal/ui';
import { getJSON, postJSON } from '@/components/live/clock';
import { CODE_MAX, RUBRIC, parseScoreLine, type CodeReviewView, type CodeTeamView, type RubricKey } from '@/lib/codeReview/rubric';

/**
 * The code review kit: one judging prompt per card, the teams on each card with their repo
 * and judged commit, and a place to save each team's score from the agent's report.
 */

const RED = new Set(['♥', '♦']);
const TRACK_ORDER = ['vault', 'institution', 'grid', 'cyber'];
const blankParts = (): Record<RubricKey, number> => ({ core: 0, kt: 0, imp: 0, docs: 0, eng: 0 });

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? '' : k)), 1600);
    } catch {
      window.prompt('Copy this:', text);
    }
  }, []);
  return { copied, copy };
}

export function CodeReview() {
  const [v, setV] = useState<CodeReviewView | null>(null);
  const [state, setState] = useState<'loading' | 'login' | 'ready'>('loading');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await getJSON<CodeReviewView>('/api/code-review');
    if (r.ok && r.data) {
      setV(r.data);
      setState('ready');
    } else if (r.status === 401) {
      setState('login');
      if (r.message && !/required/i.test(r.message)) setMsg(r.message);
    } else setMsg(r.message || 'Could not load.');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-screen bg-[#08080a] text-neutral-200">
      <GridBackdrop />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Wordmark href="/code-review" suffix="Code review" />
          {state === 'ready' && v && (
            <div className="flex items-center gap-3 font-label text-sm text-neutral-400">
              <span>
                Reviewing as <b className="text-white">{v.me}</b>
              </span>
              <Button
                size="sm"
                variant="subtle"
                onClick={async () => {
                  await fetch('/api/code-review/login', { method: 'DELETE' });
                  setV(null);
                  setState('login');
                }}
              >
                <LogOut className="h-3.5 w-3.5" /> Log out
              </Button>
            </div>
          )}
        </div>
        {state === 'loading' && <p className="font-label text-sm text-neutral-500">{msg || 'Loading…'}</p>}
        {state === 'login' && <Login msg={msg} onDone={load} />}
        {state === 'ready' && v && <Kit v={v} setV={setV} />}
      </div>
    </div>
  );
}

function Login({ msg, onDone }: { msg: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(msg);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await postJSON('/api/code-review/login', { name, password });
    setBusy(false);
    if (r.ok) onDone();
    else setErr(r.message || 'Could not log in.');
  }

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <Panel>
        <div className="mb-1 font-label text-xs uppercase tracking-[0.2em] text-[var(--card-red)]">Game Masters and judges</div>
        <h1 className="mb-5 font-poster text-4xl uppercase text-[#f5eee1]">Code review</h1>
        <form onSubmit={submit} className="space-y-3 font-label text-sm">
          <input className={inputCls()} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <input className={inputCls()} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          {err && <Banner>{err}</Banner>}
          <Button variant="primary" size="lg" className="w-full" loading={busy} disabled={!name.trim() || !password}>
            Open the kit
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function Kit({ v, setV }: { v: CodeReviewView; setV: (v: CodeReviewView) => void }) {
  const [track, setTrack] = useState<string>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [scoring, setScoring] = useState<string | null>(null);
  const { copied, copy } = useCopy();

  const scoreOf = useMemo(() => new Map(v.scores.map((s) => [s.teamId, s])), [v.scores]);
  const needle = q.trim().toLowerCase();
  const cards = v.cards.filter((c) => track === 'all' || c.track === track);
  const teamsOf = (code: string) =>
    v.teams.filter((t) => t.card === code && (!needle || t.teamId.toLowerCase().includes(needle) || t.teamName.toLowerCase().includes(needle)));
  const tracks = TRACK_ORDER.map((id) => v.cards.find((c) => c.track === id)).filter(Boolean) as CodeReviewView['cards'];
  const done = v.teams.filter((t) => scoreOf.has(t.teamId)).length;
  const freeze = new Date(v.freezeAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

  const ranked = useMemo(
    () =>
      v.teams
        .map((t) => ({ t, s: scoreOf.get(t.teamId), c: v.cards.find((c) => c.code === t.card) }))
        .sort((a, b) => (b.s ? 1 : 0) - (a.s ? 1 : 0) || (b.s?.total ?? 0) - (a.s?.total ?? 0) || a.t.teamId.localeCompare(b.t.teamId)),
    [v, scoreOf]
  );

  function csv() {
    const head = ['Team ID', 'Team', 'Card', ...RUBRIC.map((r) => r.label), 'Total', 'Reviewer', 'Notes'];
    const rows = ranked.map(({ t, s, c }) => [t.teamId, t.teamName, c?.title ?? '', ...RUBRIC.map((r) => (s ? s.parts[r.key] : '')), s?.total ?? '', s?.reviewer ?? '', s?.notes ?? '']);
    copy('csv', [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'));
  }

  return (
    <>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="font-label text-xs uppercase tracking-[0.2em] text-[var(--card-red)]">After the code freeze · {freeze} IST</div>
          <h1 className="mt-1 font-poster text-4xl uppercase leading-none text-[#f5eee1] sm:text-5xl">Judge the codebase</h1>
          <ol className="mt-4 list-decimal space-y-1.5 pl-5 font-label text-sm text-neutral-300">
            <li>
              Find the team below and press <b>Copy commands</b>. Run them: it clones the repo at the last commit before the freeze.
            </li>
            <li>
              Open that folder in your agent (Claude Code, Codex or Antigravity), press <b>Copy prompt</b> and paste it. It is already filled in for the team and their card.
            </li>
            <li>
              When the agent finishes, press <b>Score</b> and paste its whole report: the numbers fill in from its last line. Check them, then save.
            </li>
          </ol>
          <p className="mt-3 font-label text-xs text-neutral-500">The agent reviews read-only and must give path:line evidence for every point. Open at least one cited line yourself before saving.</p>
        </Panel>
        <Panel>
          <SectionLabel>The score · out of {CODE_MAX}</SectionLabel>
          <div className="space-y-1.5 font-label text-sm">
            {RUBRIC.map((r) => (
              <div key={r.key} className="flex items-center gap-3">
                <span className="w-44 text-neutral-300">{r.label}</span>
                <span className="h-1.5 flex-1 rounded bg-neutral-800">
                  <span className="block h-full rounded bg-[var(--card-red)]" style={{ width: `${(r.max / 30) * 100}%` }} />
                </span>
                <span className="w-8 text-right font-poster text-lg text-white">{r.max}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-label text-xs text-neutral-500">Clean-room, secrets and faked features are reported as flags, not points. The Game Masters decide on those.</p>
          <div className="mt-3 font-label text-sm text-neutral-400">
            <b className="font-poster text-2xl text-white">{done}</b> of {v.teams.length} teams scored
          </div>
        </Panel>
      </div>

      <div className="sticky top-0 z-10 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-neutral-900 bg-[#08080a]/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Tab on={track === 'all'} onClick={() => setTrack('all')}>
          All 12
        </Tab>
        {tracks.map((c) => (
          <Tab key={c.track} on={track === c.track} onClick={() => setTrack(c.track)}>
            <span className={RED.has(c.suit) ? 'text-[#e0352f]' : ''}>{c.suit}</span> {c.trackLabel}
          </Tab>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-lg border border-neutral-800 bg-[#0d0d10] px-3 py-1.5 font-label text-sm">
          <Search className="h-3.5 w-3.5 text-neutral-500" />
          <input className="w-40 bg-transparent outline-none placeholder:text-neutral-600" placeholder="Team name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <div className="space-y-5">
        {cards.map((c) => {
          const teams = teamsOf(c.code);
          if (needle && !teams.length) return null;
          return (
            <Panel key={c.code}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className={`flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-neutral-700 bg-[#f5eee1] font-poster ${RED.has(c.suit) ? 'text-[#b3202a]' : 'text-[#111]'}`}>
                    <span className="text-xl leading-none">{c.rank}</span>
                    <span className="text-lg leading-none">{c.suit}</span>
                  </div>
                  <div>
                    <div className="font-label text-xs uppercase tracking-wider text-neutral-500">
                      {c.trackLabel} · {c.name}
                    </div>
                    <div className="font-poster text-3xl uppercase leading-tight text-[#f5eee1]">{c.title}</div>
                    <a href={c.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-label text-xs text-neutral-500 hover:text-white">
                      Original: {c.source.name} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setOpen(open === c.code ? null : c.code)}>
                    <ChevronDown className={`h-3.5 w-3.5 transition ${open === c.code ? 'rotate-180' : ''}`} /> {open === c.code ? 'Hide' : 'Read'} prompt
                  </Button>
                  <Button size="sm" variant="paper" onClick={() => copy(`card:${c.code}`, c.prompt)}>
                    {copied === `card:${c.code}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Blank prompt
                  </Button>
                </div>
              </div>

              {open === c.code && (
                <pre className="mt-4 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-[#0a0a0c] p-4 font-mono text-xs leading-relaxed text-neutral-300">{c.prompt}</pre>
              )}

              <div className="mt-4 divide-y divide-neutral-900 rounded-lg border border-neutral-800">
                {teams.map((t) => (
                  <TeamRow key={t.teamId} t={t} score={scoreOf.get(t.teamId)?.total} copied={copied} copy={copy} onScore={() => setScoring(scoring === t.teamId ? null : t.teamId)} scoring={scoring === t.teamId}>
                    {scoring === t.teamId && <ScoreForm t={t} saved={scoreOf.get(t.teamId)} onSaved={(nv) => setV(nv)} onClose={() => setScoring(null)} />}
                  </TeamRow>
                ))}
                {!teams.length && <p className="px-4 py-3 font-label text-sm text-neutral-500">No team holds this card.</p>}
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-8">
        <SectionLabel
          right={
            <Button size="sm" onClick={csv}>
              {copied === 'csv' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy CSV
            </Button>
          }
        >
          Code review results
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full font-label text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Card</th>
                {RUBRIC.map((r) => (
                  <th key={r.key} className="py-2 pr-3 text-right">
                    {r.label}
                  </th>
                ))}
                <th className="py-2 pr-3 text-right">Total</th>
                <th className="py-2">Reviewer</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ t, s, c }) => (
                <tr key={t.teamId} className="border-b border-neutral-900 text-neutral-300">
                  <td className="py-2 pr-3">
                    <span className="text-white">{t.teamName}</span> <span className="text-xs text-neutral-500">{t.teamId}</span>
                  </td>
                  <td className="py-2 pr-3 text-neutral-400">
                    {c?.suit} {c?.title}
                  </td>
                  {RUBRIC.map((r) => (
                    <td key={r.key} className="py-2 pr-3 text-right">
                      {s ? s.parts[r.key] : '—'}
                    </td>
                  ))}
                  <td className="py-2 pr-3 text-right font-poster text-xl text-white">{s ? s.total : '—'}</td>
                  <td className="py-2 text-xs text-neutral-500">{s?.reviewer ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function TeamRow({
  t,
  score,
  copied,
  copy,
  onScore,
  scoring,
  children,
}: {
  t: CodeTeamView;
  score?: number;
  copied: string;
  copy: (key: string, text: string) => void;
  onScore: () => void;
  scoring: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 font-label text-sm">
        <div className="min-w-0 flex-1">
          <div className="text-white">
            {t.teamName} <span className="text-xs text-neutral-500">{t.teamId}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
            {t.repoUrl ? (
              <a href={t.repoUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                {t.repoUrl.replace('https://github.com/', '')}
              </a>
            ) : (
              <span className="text-amber-300">No repo submitted</span>
            )}
            <span>{t.sha ? `commit ${t.sha.slice(0, 7)}` : 'no freeze snapshot: commands pick the last commit before 12:30'}</span>
            {t.pushedAfterFreeze && (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <TriangleAlert className="h-3 w-3" /> pushed after the freeze
              </span>
            )}
          </div>
        </div>
        {score !== undefined && <span className="font-poster text-2xl text-emerald-300">{score}</span>}
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" disabled={!t.repoUrl} onClick={() => copy(`cmd:${t.teamId}`, t.setup)}>
            {copied === `cmd:${t.teamId}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy commands
          </Button>
          <Button size="sm" variant="paper" disabled={!t.prompt} onClick={() => t.prompt && copy(`p:${t.teamId}`, t.prompt)}>
            {copied === `p:${t.teamId}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy prompt
          </Button>
          <Button size="sm" variant={scoring ? 'subtle' : 'primary'} onClick={onScore}>
            {scoring ? 'Close' : score !== undefined ? 'Edit score' : 'Score'}
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function ScoreForm({
  t,
  saved,
  onSaved,
  onClose,
}: {
  t: CodeTeamView;
  saved?: CodeReviewView['scores'][number];
  onSaved: (v: CodeReviewView) => void;
  onClose: () => void;
}) {
  const [report, setReport] = useState(saved?.report ?? '');
  const [parts, setParts] = useState<Record<RubricKey, number>>(saved?.parts ?? blankParts());
  const [notes, setNotes] = useState(saved?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [parsed, setParsed] = useState<'' | 'ok' | 'none'>('');
  const total = RUBRIC.reduce((n, r) => n + (parts[r.key] || 0), 0);

  function onReport(text: string) {
    setReport(text);
    const p = parseScoreLine(text);
    if (!p) return setParsed(text.trim() ? 'none' : '');
    setParts((old) => {
      const next = { ...old };
      for (const r of RUBRIC) if (p[r.key] !== undefined) next[r.key] = Math.max(0, Math.min(r.max, p[r.key]!));
      return next;
    });
    setParsed('ok');
  }

  async function send(remove = false) {
    if (remove && !confirm(`Delete the code score for ${t.teamName}?`)) return;
    setBusy(true);
    const r = await postJSON<CodeReviewView>('/api/code-review', remove ? { teamId: t.teamId, remove: true } : { teamId: t.teamId, parts, notes, report });
    setBusy(false);
    if (r.ok && r.data) {
      onSaved(r.data);
      onClose();
    } else setMsg(r.message || 'Could not save.');
  }

  return (
    <div className="mt-3 grid gap-4 rounded-lg border border-neutral-800 bg-[#0d0d10] p-4 font-label text-sm lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="mb-1 font-semibold text-neutral-200">The agent&apos;s report</div>
        <textarea
          className={`${inputCls()} h-56 font-mono text-xs`}
          placeholder="Paste the whole report. Its last line (SCORE core=… total=…) fills the numbers."
          value={report}
          onChange={(e) => onReport(e.target.value)}
        />
        {parsed === 'ok' && <p className="mt-1 text-xs text-emerald-300">Numbers filled from the SCORE line. Check them before saving.</p>}
        {parsed === 'none' && <p className="mt-1 text-xs text-amber-300">No SCORE line found. Enter the numbers by hand.</p>}
      </div>
      <div className="space-y-2">
        {RUBRIC.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span className="flex-1 text-neutral-300">{r.label}</span>
            <input
              type="number"
              min={0}
              max={r.max}
              step={0.5}
              value={parts[r.key]}
              onChange={(e) => setParts((p) => ({ ...p, [r.key]: Math.max(0, Math.min(r.max, Number(e.target.value) || 0)) }))}
              className="w-20 rounded-md border border-neutral-700 bg-[#08080a] px-2 py-1 text-right text-white"
            />
            <span className="w-8 text-neutral-500">/ {r.max}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-neutral-800 pt-2">
          <span className="font-semibold text-neutral-200">Total</span>
          <span className="font-poster text-3xl text-white">
            {total}
            <span className="text-base text-neutral-500"> / {CODE_MAX}</span>
          </span>
        </div>
        <textarea className={`${inputCls()} h-16`} placeholder="Your notes, flags you confirmed…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {msg && <Banner>{msg}</Banner>}
        <div className="flex gap-2">
          <Button variant="primary" loading={busy} onClick={() => send()}>
            <Save className="h-3.5 w-3.5" /> Save score
          </Button>
          {saved && (
            <Button variant="danger" loading={busy} onClick={() => send(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {saved && (
          <p className="text-xs text-neutral-500">
            Last saved by {saved.reviewer} at {new Date(saved.updatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md border px-3 py-1.5 font-label text-sm ${on ? 'border-[var(--paper)] bg-[#18181c] text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
      {children}
    </button>
  );
}
