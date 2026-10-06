'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Copy, Lock, RotateCcw, Save, SkipForward, Unlock } from 'lucide-react';
import { Banner, Button, PageTitle, Panel, SectionLabel, inputCls } from '@/components/portal/ui';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { getJSON, postJSON, usePoll } from '@/components/live/clock';
import { panelTracks } from '@/lib/judging/types';
import { CRITERIA, KT_MAX, KT_POINTS, TOTAL_MAX, blankScore, ktTotal, results, totalOf, type KtResult, type ScoreInput, type ScoresView } from '@/lib/judging/scoring';

/**
 * /admin/scoring — where the club member at each panel enters the judge's marks.
 * Pick your panel once; the team in front of the judge opens by itself; mark, save, next team.
 * Each panel's sheet is saved under its judge's name, so the panel's score is the judge's score.
 */

type View = ScoresView;

const PANEL_KEY = 'borderland.scoringPanel';
const RED = new Set(['♥', '♦']);
const KT_LABEL: Record<KtResult, string> = { pass: 'Pass', partial: 'Partial', fail: 'Fail' };
const KT_TONE: Record<KtResult, string> = {
  pass: 'border-emerald-500 bg-emerald-600 text-white',
  partial: 'border-amber-400 bg-amber-500 text-black',
  fail: 'border-[var(--card-red)] bg-[var(--card-red)] text-white',
};

export default function ScoringPage() {
  const [v, setV] = useState<View | null>(null);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<number | null>(null);
  const [teamId, setTeamId] = useState('');
  const [sheet, setSheet] = useState<ScoreInput>(blankScore());
  const [dirty, setDirty] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem(PANEL_KEY);
      if (p !== null && p !== '') setPanel(Number(p));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    const r = await getJSON<View>('/api/admin/scores');
    if (r.ok && r.data) setV(r.data);
    else if (r.message) setMsg(r.message);
  }, []);
  usePoll(load, 3000);

  const judge = panel !== null && v ? (v.panels[panel]?.judges || v.panels[panel]?.name || `Panel ${panel + 1}`) : '';
  const queue = useMemo(() => (v && panel !== null ? v.teams.filter((t) => t.panel === panel).sort((a, b) => a.order - b.order) : []), [v, panel]);
  const onNow = queue.find((t) => t.state === 'called');
  const mine = useCallback((id: string) => v?.scores.find((s) => s.teamId === id && s.judge.toLowerCase() === judge.toLowerCase()), [v, judge]);

  // Follow the panel: when a new team is called it opens by itself (unless marks are being typed).
  // Between calls the club member can open any team in the queue.
  const followed = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (dirty) return;
    if (onNow && onNow.teamId !== followed.current) {
      followed.current = onNow.teamId;
      setTeamId(onNow.teamId);
    } else if (!teamId && queue.length) {
      setTeamId((queue.find((t) => !mine(t.teamId)) ?? queue[0]).teamId);
    }
  }, [onNow, queue, mine, dirty, teamId]);

  useEffect(() => {
    if (dirty) return;
    const s = mine(teamId);
    setSheet(s ? { kt: s.kt, improvements: s.improvements, brief: s.brief, defence: s.defence, twist: s.twist, demo: s.demo, notes: s.notes ?? '' } : blankScore());
  }, [teamId, mine, dirty]);

  function choosePanel(p: number | null) {
    setPanel(p);
    setTeamId('');
    setDirty(false);
    try {
      localStorage.setItem(PANEL_KEY, p === null ? '' : String(p));
    } catch {}
  }

  function pick(id: string) {
    if (dirty && !confirm('These marks are not saved yet. Leave them?')) return;
    setDirty(false);
    setOk('');
    setTeamId(id);
  }

  function edit(patch: Partial<ScoreInput>) {
    setSheet((s) => ({ ...s, ...patch }));
    setDirty(true);
    setOk('');
  }

  async function save() {
    setBusy(true);
    const r = await postJSON<View>('/api/admin/scores', { action: 'save', judge, teamId, ...sheet });
    setBusy(false);
    if (r.ok && r.data) {
      setV(r.data);
      setDirty(false);
      setMsg('');
      setOk(`Saved: ${totalOf(sheet)} / ${TOTAL_MAX}`);
    } else setMsg(r.message || 'Could not save.');
  }

  async function queueAct(action: 'call' | 'skip' | 'undo', ask?: string) {
    if (ask && !confirm(ask)) return;
    if (action === 'call' && dirty && !confirm('These marks are not saved yet. Call the next team anyway?')) return;
    setBusy(true);
    const r = await postJSON('/api/admin/judging', { action, panel });
    setBusy(false);
    if (!r.ok) return setMsg(r.message || 'Could not update the queue.');
    setDirty(false);
    setOk('');
    setTeamId('');
    await load();
  }

  async function lock(on: boolean) {
    if (!confirm(on ? 'Lock all scores? Nobody can save after this.' : 'Unlock the scores?')) return;
    const r = await postJSON<View>('/api/admin/scores', { action: 'lock', on });
    if (r.ok && r.data) setV(r.data);
  }

  if (!v) return <PageTitle kicker="Final judging" title="Enter marks" subtitle={msg || 'Loading…'} />;

  /* ── Step 1: which panel ── */
  if (panel === null || !v.panels[panel]) {
    return (
      <>
        <PageTitle kicker="Final judging" title="Enter marks" subtitle="Which panel are you sitting with? You only choose this once." />
        {msg && <Banner>{msg}</Banner>}
        <div className="grid gap-4 md:grid-cols-2">
          {v.panels.map((p, i) => {
            const n = v.teams.filter((t) => t.panel === i).length;
            return (
              <button
                key={i}
                onClick={() => choosePanel(i)}
                className="group rounded-2xl border-2 border-neutral-800 bg-[#0d0d10] p-6 text-left transition hover:border-[var(--paper)] active:scale-[0.99]"
              >
                <div className={`font-poster text-6xl leading-none ${RED.has(p.suit) ? 'text-[#e0352f]' : 'text-[#f5eee1]'}`}>{p.suit}</div>
                <div className="mt-3 font-label text-xs uppercase tracking-[0.2em] text-neutral-500">Panel {i + 1}</div>
                <div className="font-poster text-4xl uppercase leading-tight text-white">{p.judges || p.name}</div>
                <div className="mt-1 font-label text-sm text-neutral-400">
                  {panelTracks(p).map((t) => `${TRACKS[t].suit} ${TRACKS[t].label}`).join(' · ') || p.name} · {n} teams
                </div>
                <div className="mt-4 inline-flex items-center gap-1 font-label text-sm font-semibold text-[var(--paper)]">
                  I&apos;m on this panel <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
        {!v.teams.length && <Banner tone="info">The panel draw has not happened yet. Teams appear here once it is done (Judging panels).</Banner>}
      </>
    );
  }

  /* ── Step 2: mark the team in front of the judge ── */
  const p = v.panels[panel];
  const team = v.teams.find((t) => t.teamId === teamId);
  const card = team?.card ? CARD_BY_CODE[team.card] : undefined;
  const total = totalOf(sheet);
  const done = queue.filter((t) => mine(t.teamId)).length;
  const saved = !!mine(teamId) && !dirty;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-label text-xs uppercase tracking-[0.2em] text-[var(--card-red)]">
            Panel {panel + 1} · {done} of {queue.length} marked
          </div>
          <h1 className="font-poster text-4xl uppercase leading-none text-[#f5eee1]">
            <span className={RED.has(p.suit) ? 'text-[#e0352f]' : ''}>{p.suit}</span> {judge}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={() => choosePanel(null)}>
            Change panel
          </Button>
          {v.locked ? (
            <Button size="sm" variant="paper" onClick={() => lock(false)}>
              <Unlock className="h-3.5 w-3.5" /> Unlock
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => lock(true)}>
              <Lock className="h-3.5 w-3.5" /> Lock all
            </Button>
          )}
        </div>
      </div>
      {msg && <Banner>{msg}</Banner>}
      {v.locked && <Banner tone="info">Scores are locked. Nothing can be saved.</Banner>}
      {!queue.length && <Banner tone="info">No teams on this panel yet. Run the panel draw first (Judging panels).</Banner>}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {team ? (
          <Panel>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-label text-xs uppercase tracking-wider text-neutral-500">
                  {team.state === 'called' ? <span className="font-bold text-[#22e584]">● Presenting now</span> : team.state === 'done' ? 'Done' : 'Waiting'} · {team.teamId}
                  {team.track && ` · ${TRACKS[team.track].suit} ${TRACKS[team.track].label}`}
                </div>
                <div className="font-poster text-5xl uppercase leading-none text-[#f5eee1]">{team.teamName}</div>
                {card && <div className="mt-1 font-label text-sm text-neutral-400">{card.title}</div>}
              </div>
              <div className="text-right">
                <div className="font-poster text-7xl leading-none text-white">
                  {total}
                  <span className="text-2xl text-neutral-500">/{TOTAL_MAX}</span>
                </div>
                <div className={`font-label text-xs ${saved ? 'text-emerald-300' : dirty ? 'text-amber-300' : 'text-neutral-500'}`}>{saved ? '✓ saved' : dirty ? 'not saved' : 'not marked yet'}</div>
              </div>
            </div>

            <div className="space-y-6 font-label">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="text-base font-semibold text-neutral-100">Killer Tests</div>
                  <div className="text-sm text-neutral-400">
                    <b className="text-white">{ktTotal(sheet.kt)}</b>/{KT_MAX} · Pass {KT_POINTS.pass} · Partial {KT_POINTS.partial} · Fail 0
                  </div>
                </div>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-neutral-800 bg-[#0d0d10] p-3">
                      <div className="mb-2 text-sm text-neutral-300">
                        <b className="text-neutral-500">{i + 1}.</b> {card?.killerTests[i] ?? `Killer Test ${i + 1}`}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['pass', 'partial', 'fail'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => edit({ kt: sheet.kt.map((x, k) => (k === i ? (x === r ? null : r) : x)) })}
                            className={`rounded-lg border-2 py-2.5 text-sm font-bold uppercase tracking-wide transition active:scale-95 ${sheet.kt[i] === r ? KT_TONE[r] : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}
                          >
                            {KT_LABEL[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {CRITERIA.map((c) => (
                <div key={c.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <div>
                      <span className="text-base font-semibold text-neutral-100">{c.label}</span>
                      <span className="ml-2 text-xs text-neutral-500">{c.hint}</span>
                    </div>
                    <span className="font-poster text-2xl text-white">
                      {sheet[c.key]}
                      <span className="text-sm text-neutral-500">/{c.max}</span>
                    </span>
                  </div>
                  <Steps max={c.max} value={sheet[c.key]} onChange={(n) => edit({ [c.key]: n })} />
                </div>
              ))}

              <textarea className={`${inputCls()} h-16`} value={sheet.notes ?? ''} onChange={(e) => edit({ notes: e.target.value })} placeholder="Notes from the judge (optional)" />

              {ok && <Banner tone="success">{ok}</Banner>}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" loading={busy} disabled={v.locked || (!dirty && saved)} onClick={save} className="flex-1">
                  <Save className="h-5 w-5" /> {saved ? 'Saved' : 'Save marks'}
                </Button>
                <Button variant="success" size="lg" loading={busy} onClick={() => queueAct('call')} disabled={!queue.some((t) => t.state !== 'done')} className="flex-1">
                  Next team <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel>
            <p className="font-label text-neutral-400">Nobody is presenting. Press Next team to call the first one.</p>
            <Button variant="success" size="lg" className="mt-4" loading={busy} onClick={() => queueAct('call')} disabled={!queue.length}>
              Call the first team <ChevronRight className="h-5 w-5" />
            </Button>
          </Panel>
        )}

        <Panel>
          <SectionLabel>Queue</SectionLabel>
          <div className="space-y-1.5 font-label text-sm">
            {queue.map((t) => {
              const s = mine(t.teamId);
              return (
                <button
                  key={t.teamId}
                  onClick={() => pick(t.teamId)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left ${t.teamId === teamId ? 'border-[var(--paper)] bg-[#18181c]' : 'border-neutral-800 hover:border-neutral-600'}`}
                >
                  <span className="w-5 text-right font-poster text-neutral-500">{t.order + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white">{t.teamName}</span>
                  {t.state === 'called' && <span className="h-2 w-2 shrink-0 rounded-full bg-[#22e584]" />}
                  {s ? (
                    <span className="flex items-center gap-0.5 font-poster text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                      {s.total}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </button>
              );
            })}
          </div>
          {onNow && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => queueAct('skip', `${onNow.teamName} is not here? They go to the end of the queue.`)} disabled={busy}>
                <SkipForward className="h-3.5 w-3.5" /> Not here
              </Button>
              <Button size="sm" variant="subtle" onClick={() => queueAct('undo')} disabled={busy}>
                <RotateCcw className="h-3.5 w-3.5" /> Undo call
              </Button>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Button size="sm" variant="subtle" onClick={() => setShowAll((x) => !x)}>
          {showAll ? 'Hide' : 'Show'} all results
        </Button>
        {showAll && <AllResults v={v} />}
      </div>
    </>
  );
}

/** Tap a number: quick for the club member, no typing or sliding. */
function Steps({ max, value, onChange }: { max: number; value: number; onChange: (n: number) => void }) {
  const step = max >= 25 ? 5 : 1;
  const marks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {marks.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-10 min-w-10 rounded-lg border-2 px-2 font-poster text-lg transition active:scale-95 ${value === n ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]' : 'border-neutral-800 text-neutral-300 hover:border-neutral-600'}`}
        >
          {n}
        </button>
      ))}
      {step > 1 && (
        <span className="ml-1 flex items-center gap-1">
          <button onClick={() => onChange(Math.max(0, value - 1))} className="h-10 w-10 rounded-lg border-2 border-neutral-800 font-poster text-lg text-neutral-300">
            −
          </button>
          <button onClick={() => onChange(Math.min(max, value + 1))} className="h-10 w-10 rounded-lg border-2 border-neutral-800 font-poster text-lg text-neutral-300">
            +
          </button>
        </span>
      )}
    </div>
  );
}

function AllResults({ v }: { v: View }) {
  const board = results(v.teams, v.scores);
  function csv() {
    const head = ['Rank', 'Team ID', 'Team', 'Panel', 'Judges', 'Average', 'Killer Tests', ...CRITERIA.map((c) => c.label)];
    const lines = board.map((r) => [r.rank || '', r.teamId, r.teamName, r.panel + 1, r.judges, r.avg, r.kt, ...CRITERIA.map((c) => r.crit[c.key])]);
    navigator.clipboard?.writeText([head, ...lines].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'));
  }
  return (
    <Panel className="mt-3">
      <SectionLabel
        right={
          <Button size="sm" onClick={csv}>
            <Copy className="h-3 w-3" /> CSV
          </Button>
        }
      >
        All results
      </SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full font-label text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Team</th>
              <th className="py-2 pr-3">Panel</th>
              <th className="py-2 pr-3 text-right">Killer</th>
              {CRITERIA.map((c) => (
                <th key={c.key} className="py-2 pr-3 text-right">
                  {c.label}
                </th>
              ))}
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {board.map((r) => (
              <tr key={r.teamId} className="border-b border-neutral-900 text-neutral-300">
                <td className="py-2 pr-3 font-poster text-lg text-white">{r.rank || '—'}</td>
                <td className="py-2 pr-3 text-white">{r.teamName}</td>
                <td className="py-2 pr-3">{r.panel + 1}</td>
                <td className="py-2 pr-3 text-right">{r.judges ? r.kt : '—'}</td>
                {CRITERIA.map((c) => (
                  <td key={c.key} className="py-2 pr-3 text-right">
                    {r.judges ? r.crit[c.key] : '—'}
                  </td>
                ))}
                <td className="py-2 text-right font-poster text-xl text-white">{r.judges ? r.avg : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
