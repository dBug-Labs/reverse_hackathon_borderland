'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Lock, Save, Trash2, Unlock } from 'lucide-react';
import { Banner, Button, PageTitle, Panel, SectionLabel, inputCls } from '@/components/portal/ui';
import { readActorName } from '@/components/portal/api';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { getJSON, postJSON, usePoll } from '@/components/live/clock';
import {
  CRITERIA,
  KT_MAX,
  KT_POINTS,
  TOTAL_MAX,
  blankScore,
  ktTotal,
  results,
  totalOf,
  type KtResult,
  type ScoreInput,
  type ScoresView,
} from '@/lib/judging/scoring';

/**
 * /admin/scoring — the judges' score sheet for final judging.
 * Each judge scores every team on their panel out of 150; the final judging score is the
 * average of the judges. Teams come from the panel draw (Judging panels).
 */

const RED = new Set(['♥', '♦']);
const JUDGE_KEY = 'borderland.judge';
const KT_LABEL: Record<KtResult, string> = { pass: 'Pass', partial: 'Partial', fail: 'Fail' };
const KT_TONE: Record<KtResult, string> = {
  pass: 'border-emerald-600 bg-emerald-900/40 text-emerald-200',
  partial: 'border-amber-500 bg-amber-900/30 text-amber-200',
  fail: 'border-[var(--card-red)] bg-[var(--card-red)]/15 text-[#ff8a8a]',
};

export default function ScoringPage() {
  const [v, setV] = useState<ScoresView | null>(null);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [judge, setJudge] = useState('');
  const [panel, setPanel] = useState<number | 'all'>('all');
  const [teamId, setTeamId] = useState('');
  const [sheet, setSheet] = useState<ScoreInput>(blankScore());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let saved = '';
    try {
      saved = localStorage.getItem(JUDGE_KEY) || '';
    } catch {}
    setJudge(saved || readActorName('admin'));
  }, []);

  const load = useCallback(async () => {
    const r = await getJSON<ScoresView>('/api/admin/scores');
    if (r.ok && r.data) setV(r.data);
    else if (r.message) setMsg(r.message);
  }, []);
  usePoll(load, 4000);

  const teams = useMemo(() => (v ? v.teams.filter((t) => panel === 'all' || t.panel === panel).sort((a, b) => a.panel - b.panel || a.order - b.order) : []), [v, panel]);
  const me = judge.trim().toLowerCase();
  const mine = useCallback((id: string) => v?.scores.find((s) => s.teamId === id && s.judge.toLowerCase() === me), [v, me]);

  // Follow the panel: when nothing is picked, open the team in front of the judges now.
  useEffect(() => {
    if (teamId || !teams.length) return;
    setTeamId((teams.find((t) => t.state === 'called') ?? teams[0]).teamId);
  }, [teams, teamId]);

  // Load my saved sheet for the team (unless I am in the middle of editing it).
  useEffect(() => {
    if (dirty) return;
    const s = mine(teamId);
    setSheet(s ? { kt: s.kt, improvements: s.improvements, brief: s.brief, defence: s.defence, twist: s.twist, demo: s.demo, notes: s.notes ?? '' } : blankScore());
  }, [teamId, mine, dirty]);

  function pick(id: string) {
    if (dirty && !confirm('You have unsaved scores for this team. Leave them?')) return;
    setDirty(false);
    setOk('');
    setTeamId(id);
  }

  function edit(patch: Partial<ScoreInput>) {
    setSheet((s) => ({ ...s, ...patch }));
    setDirty(true);
    setOk('');
  }

  async function send(action: 'save' | 'delete' | 'lock', extra: Record<string, unknown> = {}) {
    setBusy(true);
    const r = await postJSON<ScoresView>('/api/admin/scores', { action, judge, teamId, ...extra });
    setBusy(false);
    if (r.ok && r.data) {
      setV(r.data);
      setMsg('');
      return true;
    }
    setMsg(r.message || 'Could not save.');
    return false;
  }

  async function save() {
    try {
      localStorage.setItem(JUDGE_KEY, judge.trim());
    } catch {}
    if (await send('save', { ...sheet })) {
      setDirty(false);
      setOk(`Saved: ${totalOf(sheet)} / ${TOTAL_MAX}`);
    }
  }

  const board = useMemo(() => (v ? results(v.teams, v.scores) : []), [v]);

  if (!v) return <PageTitle kicker="Day 2 · 1:15" title="Judge scoring" subtitle={msg || 'Loading…'} />;

  const team = v.teams.find((t) => t.teamId === teamId);
  const card = team?.card ? CARD_BY_CODE[team.card] : undefined;
  const others = v.scores.filter((s) => s.teamId === teamId && s.judge.toLowerCase() !== me);
  const total = totalOf(sheet);
  const missingKt = sheet.kt.filter((r) => !r).length;

  function copyCsv() {
    const head = ['Rank', 'Team ID', 'Team', 'Panel', 'Judges', 'Average', 'Killer Tests', ...CRITERIA.map((c) => c.label)];
    const lines = board.map((r) => [r.rank || '', r.teamId, r.teamName, r.panel + 1, r.judges, r.avg, r.kt, ...CRITERIA.map((c) => r.crit[c.key])].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
    navigator.clipboard?.writeText([head.join(','), ...lines].join('\n')).then(
      () => setOk('Results copied as CSV.'),
      () => setMsg('Could not copy.')
    );
  }

  return (
    <>
      <PageTitle
        kicker="Day 2 · 1:15"
        title="Judge scoring"
        subtitle={`Score each team on your panel out of ${TOTAL_MAX}. Every judge scores on their own; the final judging score is the average of the judges.`}
        actions={
          v.locked ? (
            <Button variant="paper" loading={busy} onClick={() => confirm('Unlock the scores so judges can edit again?') && send('lock', { on: false })}>
              <Unlock className="h-3.5 w-3.5" /> Unlock scores
            </Button>
          ) : (
            <Button variant="danger" loading={busy} onClick={() => confirm('Lock all scores? Judges can no longer save.') && send('lock', { on: true })}>
              <Lock className="h-3.5 w-3.5" /> Lock scores
            </Button>
          )
        }
      />
      {msg && <Banner>{msg}</Banner>}
      {v.locked && <Banner tone="info">Scores are locked. Nothing can be saved until they are unlocked.</Banner>}
      {!v.teams.length && <Banner tone="info">No teams on the panels yet. Run the draw on Judging panels first: the teams to score come from it.</Banner>}

      <Panel className="mb-6">
        <div className="flex flex-wrap items-end gap-4 font-label text-sm">
          <label className="block">
            <div className="mb-1 font-semibold text-neutral-300">You are judging as</div>
            <input className={`${inputCls(!judge.trim())} w-64`} placeholder="Your name" value={judge} onChange={(e) => setJudge(e.target.value)} />
          </label>
          <div>
            <div className="mb-1 font-semibold text-neutral-300">Your panel</div>
            <div className="flex flex-wrap gap-1.5">
              <PanelChip on={panel === 'all'} onClick={() => setPanel('all')}>
                All
              </PanelChip>
              {v.panels.map((p, i) => (
                <PanelChip key={i} on={panel === i} onClick={() => setPanel(i)}>
                  <span className={RED.has(p.suit) ? 'text-[#e0352f]' : ''}>{p.suit}</span> {p.name}
                </PanelChip>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Panel>
          <SectionLabel>Teams · calling order</SectionLabel>
          <div className="space-y-1.5 font-label text-sm">
            {teams.map((t) => {
              const s = mine(t.teamId);
              const n = v.scores.filter((x) => x.teamId === t.teamId).length;
              return (
                <button
                  key={t.teamId}
                  onClick={() => pick(t.teamId)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    t.teamId === teamId ? 'border-[var(--paper)] bg-[#18181c]' : 'border-neutral-800 hover:border-neutral-600'
                  }`}
                >
                  <span className="w-6 text-right font-poster text-lg text-neutral-500">{t.order + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-white">{t.teamName}</span>
                    <span className="text-xs text-neutral-500">
                      {t.teamId} · {v.panels[t.panel]?.suit} · {n} judge{n === 1 ? '' : 's'}
                    </span>
                  </span>
                  {t.state === 'called' && <span className="rounded bg-[var(--card-red)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">On now</span>}
                  {s ? (
                    <span className="flex items-center gap-1 font-poster text-lg text-emerald-300">
                      <Check className="h-3.5 w-3.5" />
                      {s.total}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-600">—</span>
                  )}
                </button>
              );
            })}
            {!teams.length && <p className="text-neutral-500">No teams on this panel.</p>}
          </div>
        </Panel>

        {team ? (
          <Panel>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-label text-xs uppercase tracking-wider text-neutral-500">
                  {team.teamId} · {v.panels[team.panel]?.name} · slot {team.order + 1}
                  {team.track && ` · ${TRACKS[team.track].suit} ${TRACKS[team.track].label}`}
                </div>
                <div className="font-poster text-4xl uppercase leading-tight text-[#f5eee1]">{team.teamName}</div>
                {card && (
                  <div className="font-label text-sm text-neutral-400">
                    {card.code} · {card.title}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-poster text-6xl leading-none text-white">
                  {total}
                  <span className="text-2xl text-neutral-500"> / {TOTAL_MAX}</span>
                </div>
                <div className="font-label text-xs text-neutral-500">{dirty ? 'not saved yet' : mine(teamId) ? 'saved' : 'not scored yet'}</div>
              </div>
            </div>

            <div className="space-y-6 font-label text-sm">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <div className="font-semibold text-neutral-200">Killer Tests</div>
                  <div className="text-neutral-400">
                    <b className="text-white">{ktTotal(sheet.kt)}</b> / {KT_MAX} · Pass {KT_POINTS.pass} · Partial {KT_POINTS.partial} · Fail 0
                  </div>
                </div>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-[#0d0d10] px-3 py-2">
                      <span className="font-poster text-lg text-neutral-500">{i + 1}</span>
                      <span className="min-w-0 flex-1 text-neutral-300">{card?.killerTests[i] ?? `Killer Test ${i + 1}`}</span>
                      <div className="flex gap-1">
                        {(['pass', 'partial', 'fail'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => edit({ kt: sheet.kt.map((x, k) => (k === i ? (x === r ? null : r) : x)) })}
                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${sheet.kt[i] === r ? KT_TONE[r] : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'}`}
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
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <div>
                      <span className="font-semibold text-neutral-200">{c.label}</span>
                      <span className="ml-2 text-xs text-neutral-500">{c.hint}</span>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <input
                        type="number"
                        min={0}
                        max={c.max}
                        value={sheet[c.key]}
                        onChange={(e) => edit({ [c.key]: Math.max(0, Math.min(c.max, Math.round(Number(e.target.value) || 0))) })}
                        className="w-16 rounded-md border border-neutral-700 bg-[#0d0d10] px-2 py-1 text-right text-white"
                      />
                      / {c.max}
                    </div>
                  </div>
                  <input type="range" min={0} max={c.max} value={sheet[c.key]} onChange={(e) => edit({ [c.key]: Number(e.target.value) })} className="w-full accent-[#b3202a]" />
                </div>
              ))}

              <label className="block">
                <div className="mb-1 font-semibold text-neutral-200">Notes (only judges see these)</div>
                <textarea className={`${inputCls()} h-20`} value={sheet.notes ?? ''} onChange={(e) => edit({ notes: e.target.value })} placeholder="What stood out, follow-ups, tie-break thoughts…" />
              </label>

              {missingKt > 0 && <p className="text-xs text-amber-300">{missingKt} Killer Test{missingKt === 1 ? '' : 's'} not marked yet: unmarked tests count as 0.</p>}
              {ok && <Banner tone="success">{ok}</Banner>}

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="lg" loading={busy} disabled={!judge.trim() || v.locked} onClick={save}>
                  <Save className="h-4 w-4" /> Save score
                </Button>
                {mine(teamId) && (
                  <Button
                    variant="danger"
                    loading={busy}
                    disabled={v.locked}
                    onClick={async () => {
                      if (!confirm('Delete your score for this team?')) return;
                      if (await send('delete')) setDirty(false);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete my score
                  </Button>
                )}
              </div>

              {others.length > 0 && (
                <div className="rounded-lg border border-neutral-800 bg-[#0d0d10] p-3">
                  <div className="mb-1 text-xs uppercase tracking-wider text-neutral-500">Other judges on this team</div>
                  {others.map((o) => (
                    <div key={o.judge} className="flex justify-between text-neutral-300">
                      <span>{o.judge}</span>
                      <span className="font-poster text-lg text-white">{o.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        ) : (
          <Panel>
            <p className="font-label text-sm text-neutral-500">Pick a team.</p>
          </Panel>
        )}
      </div>

      <Panel className="mt-6">
        <SectionLabel
          right={
            <Button size="sm" onClick={copyCsv} disabled={!board.length}>
              <Copy className="h-3 w-3" /> Copy CSV
            </Button>
          }
        >
          Results · average of the judges
        </SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full font-label text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3">Panel</th>
                <th className="py-2 pr-3 text-right">Judges</th>
                <th className="py-2 pr-3 text-right">Killer</th>
                {CRITERIA.map((c) => (
                  <th key={c.key} className="py-2 pr-3 text-right">
                    {c.label}
                  </th>
                ))}
                <th className="py-2 text-right">Average / {TOTAL_MAX}</th>
              </tr>
            </thead>
            <tbody>
              {board.map((r) => (
                <tr key={r.teamId} className="border-b border-neutral-900 text-neutral-300">
                  <td className="py-2 pr-3 font-poster text-lg text-white">{r.rank || '—'}</td>
                  <td className="py-2 pr-3">
                    <span className="text-white">{r.teamName}</span> <span className="text-xs text-neutral-500">{r.teamId}</span>
                  </td>
                  <td className="py-2 pr-3">{v.panels[r.panel]?.suit}</td>
                  <td className="py-2 pr-3 text-right">{r.judges}</td>
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
    </>
  );
}

function PanelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md border px-2.5 py-1.5 ${on ? 'border-[var(--paper)] bg-[#18181c] text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
      {children}
    </button>
  );
}
