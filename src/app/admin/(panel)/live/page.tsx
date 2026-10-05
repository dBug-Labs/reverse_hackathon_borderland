'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Play, RefreshCw, Trash2 } from 'lucide-react';
import { api, post } from '@/components/portal/api';
import { Banner, Button, PageTitle, Panel, SectionLabel, inputCls } from '@/components/portal/ui';
import { CARD_BY_CODE, TRACKS, TRACK_ORDER } from '@/lib/cardDrop/cards';
import type { GameState, GameSummary, LiveScoreRow } from '@/lib/live/types';
import { fmtChips, fmtPct, getJSON, postJSON, usePoll, useServerNow } from '@/components/live/clock';

/**
 * /admin/live — the Game Master's control room for Code Detective and the Trading Floor.
 * Create a game for all teams or a group, open its screen on the projector, drive it from here.
 */

interface ListData {
  games: GameSummary[];
  scores: LiveScoreRow[];
}

export default function LiveAdminPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string>('');

  const load = useCallback(async () => {
    const r = await api<ListData>('/api/admin/live', {}, 'admin');
    if (r.ok) {
      setData(r.data);
      setError(null);
      setSel((s) => s || r.data.games.find((g) => g.status !== 'ENDED')?.id || '');
    } else setError(r.message);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(g: GameSummary) {
    if (!confirm(`Delete "${g.name}" and all its answers and trades? This cannot be undone.`)) return;
    const r = await post<{ games: GameSummary[] }>('/api/admin/live', { action: 'delete', id: g.id }, 'admin');
    if (r.ok) {
      if (sel === g.id) setSel('');
      load();
    } else setError(r.message);
  }

  return (
    <>
      <PageTitle
        kicker="Day 2"
        title="Live games"
        subtitle="Code Detective (♠, 50 points) and the Trading Floor (♣, +30 bonus). Teams play on their phones from their team link → Play live."
        actions={
          <Button onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      {error && <Banner>{error}</Banner>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          <CreateGame
            onCreated={(id) => {
              setSel(id);
              load();
            }}
          />
          <Panel>
            <SectionLabel>Games</SectionLabel>
            {!data?.games.length ? (
              <p className="font-label text-sm text-neutral-500">No games yet.</p>
            ) : (
              <div className="space-y-2">
                {data.games.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${sel === g.id ? 'border-[var(--paper)] bg-[#141417]' : 'border-neutral-800'}`}
                  >
                    <span className="text-2xl">{g.kind === 'detective' ? '♠' : '♣'}</span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setSel(g.id)}>
                      <div className="truncate font-label font-semibold text-white">{g.name}</div>
                      <div className="font-label text-xs text-neutral-500">
                        {g.teams} teams · <StatusPill status={g.status} />
                      </div>
                    </button>
                    <a href={`/admin/arena/${g.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-neutral-700 px-2.5 py-1.5 font-label text-xs font-semibold text-neutral-200 hover:border-white">
                      <ExternalLink className="h-3.5 w-3.5" /> Screen
                    </a>
                    <button onClick={() => remove(g)} className="rounded-md p-1.5 text-neutral-600 hover:text-[#ff8a8a]" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Scores rows={data?.scores ?? []} />
        </div>
        <div>{sel ? <Control id={sel} onChange={load} /> : <Panel><p className="font-label text-sm text-neutral-500">Create or pick a game to drive it from here.</p></Panel>}</div>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = status === 'LIVE' ? 'text-emerald-400' : status === 'LOBBY' ? 'text-amber-300' : 'text-neutral-500';
  return <span className={`font-semibold ${c}`}>{status === 'LOBBY' ? 'lobby' : status === 'LIVE' ? 'live' : 'ended'}</span>;
}

/* ── Create ───────────────────────────────────────────────────────────── */

function CreateGame({ onCreated }: { onCreated: (id: string) => void }) {
  const [kind, setKind] = useState<'detective' | 'exchange'>('detective');
  const [group, setGroup] = useState('all');
  const [teamIds, setTeamIds] = useState('');
  const [presentOnly, setPresentOnly] = useState(true);
  const [set, setSet] = useState<'A' | 'B'>('A');
  const [mins, setMins] = useState(15);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function create() {
    setBusy(true);
    setMsg('');
    const r = await post<{ id: string }>(
      '/api/admin/live',
      { action: 'create', kind, group, teamIds: teamIds.split(/[\s,]+/).filter(Boolean), presentOnly, set, durationMin: mins, name },
      'admin'
    );
    setBusy(false);
    if (r.ok) {
      setName('');
      onCreated(r.data.id);
    } else setMsg(r.message || 'Could not create the game.');
  }

  return (
    <Panel>
      <SectionLabel>New game</SectionLabel>
      <div className="space-y-3 font-label text-sm">
        <div className="grid grid-cols-2 gap-2">
          {(['detective', 'exchange'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-3 text-left ${kind === k ? 'border-[var(--paper)] bg-[#18181c] text-white' : 'border-neutral-800 text-neutral-400'}`}
            >
              <div className="font-poster text-xl uppercase">{k === 'detective' ? '♠ Code Detective' : '♣ Trading Floor'}</div>
              <div className="text-xs text-neutral-500">{k === 'detective' ? '11 questions, 4 rounds, ~20 min' : 'A live stock market of the cards'}</div>
            </button>
          ))}
        </div>
        <div>
          <div className="mb-1 font-semibold text-neutral-300">Who plays</div>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={group === 'all'} onClick={() => setGroup('all')}>
              All teams
            </Chip>
            {TRACK_ORDER.map((t) => (
              <Chip key={t} on={group === `track:${t}`} onClick={() => setGroup(`track:${t}`)}>
                {TRACKS[t].suit} {TRACKS[t].label}
              </Chip>
            ))}
            <Chip on={group === 'custom'} onClick={() => setGroup('custom')}>
              Pick teams
            </Chip>
          </div>
          {group === 'custom' && (
            <textarea className={`${inputCls()} mt-2 h-20 text-sm`} placeholder="DBG-101, DBG-136, …" value={teamIds} onChange={(e) => setTeamIds(e.target.value)} />
          )}
          <label className="mt-2 flex items-center gap-2 text-neutral-400">
            <input type="checkbox" checked={presentOnly} onChange={(e) => setPresentOnly(e.target.checked)} className="accent-[#b3202a]" />
            Only teams checked in today (Day 2), if anyone is checked in yet
          </label>
        </div>
        {kind === 'detective' ? (
          <div>
            <div className="mb-1 font-semibold text-neutral-300">Question set</div>
            <div className="flex gap-1.5">
              <Chip on={set === 'A'} onClick={() => setSet('A')}>
                Set A
              </Chip>
              <Chip on={set === 'B'} onClick={() => setSet('B')}>
                Set B
              </Chip>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Groups that play one after another: give the second group the other set.</p>
          </div>
        ) : (
          <div>
            <div className="mb-1 font-semibold text-neutral-300">Market open for</div>
            <div className="flex gap-1.5">
              {[8, 12, 15, 20].map((n) => (
                <Chip key={n} on={mins === n} onClick={() => setMins(n)}>
                  {n} min
                </Chip>
              ))}
            </div>
          </div>
        )}
        <input className={inputCls()} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        {msg && <p className="text-[#ff8a8a]">{msg}</p>}
        <Button variant="primary" onClick={create} loading={busy} className="w-full">
          Create game
        </Button>
      </div>
    </Panel>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${on ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]' : 'border-neutral-800 text-neutral-300 hover:border-neutral-600'}`}>
      {children}
    </button>
  );
}

/* ── Control ──────────────────────────────────────────────────────────── */

function Control({ id, onChange }: { id: string; onChange: () => void }) {
  const [s, setS] = useState<GameState | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useServerNow(4);

  const load = useCallback(async () => {
    const r = await getJSON<GameState>(`/api/admin/live/${id}`);
    if (r.ok && r.data) setS(r.data);
    else if (r.message) setMsg(r.message);
  }, [id]);
  usePoll(load, 1500, !!id);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}, ask?: string) => {
      if (ask && !confirm(ask)) return;
      setBusy(true);
      const r = await postJSON<GameState>(`/api/admin/live/${id}`, { action, v: s?.v, ...extra });
      setBusy(false);
      if (r.ok && r.data) {
        setS(r.data);
        setMsg('');
        if (action === 'start' || action === 'end' || action === 'next') onChange();
      } else setMsg(r.message || 'Action failed.');
    },
    [id, s?.v, onChange]
  );

  if (!s) return <Panel><p className="font-label text-sm text-neutral-500">Loading…</p></Panel>;

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-poster text-2xl uppercase text-[#f5eee1]">{s.name}</div>
          <div className="font-label text-xs text-neutral-500">
            {s.roster.length} teams · {s.joined.length} joined on a phone · <StatusPill status={s.status} />
          </div>
        </div>
        <a href={`/admin/arena/${s.id}`} target="_blank" rel="noreferrer">
          <Button variant="paper">
            <ExternalLink className="h-3.5 w-3.5" /> Open screen
          </Button>
        </a>
      </div>
      {msg && <Banner>{msg}</Banner>}
      {s.kind === 'detective' ? <DetControl s={s} now={now} act={act} busy={busy} /> : <ExControl s={s} now={now} act={act} busy={busy} />}
    </Panel>
  );
}

type Act = (action: string, extra?: Record<string, unknown>, ask?: string) => void;

const PHASE_LABEL: Record<string, string> = {
  lobby: 'Lobby: teams are joining',
  intro: 'Round title on screen',
  wager: 'Teams are placing bets',
  question: 'Question running',
  reveal: 'Answer revealed',
  board: 'Leaderboard',
  final: 'Game over',
};

function DetControl({ s, now, act, busy }: { s: GameState; now: number; act: Act; busy: boolean }) {
  const q = s.question;
  const left = s.closeAt ? Math.max(0, Math.ceil((s.closeAt - now) / 1000)) : 0;
  const nextLabel =
    s.phase === 'lobby' ? 'Start the game' : s.phase === 'intro' ? (q?.allIn ? 'Open the bets' : 'Show the question') : s.phase === 'wager' ? 'Show the question' : s.phase === 'question' ? 'Reveal now' : s.phase === 'reveal' ? 'Leaderboard' : s.phase === 'board' ? ((s.qi ?? 0) + 1 >= (s.total ?? 0) ? 'Final results' : 'Next question') : '';
  return (
    <div className="space-y-4 font-label text-sm">
      <div className="rounded-lg border border-neutral-800 bg-[#0d0d10] p-3">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {s.qi !== undefined && s.qi >= 0 ? `Question ${s.qi + 1} of ${s.total} · ` : ''}
          {PHASE_LABEL[s.phase ?? 'lobby']}
          {(s.phase === 'question' || s.phase === 'wager') && ` · ${left}s left · ${s.locked?.length ?? 0}/${s.roster.length} locked`}
        </div>
        {q?.prompt && <p className="mt-2 text-neutral-200">{q.prompt}</p>}
        {s.key && s.phase !== 'lobby' && (
          <div className="mt-2 rounded-md border border-emerald-900 bg-emerald-950/40 p-2 text-emerald-200">
            <b>Answer (only you see this):</b>{' '}
            {q?.kind === 'line' ? `line ${s.key.correct.map((c) => c + 1).join(' or ')}` : q?.kind === 'mcq' ? q.options?.[s.key.correct[0]] : 'each team has its own card question'}
            {s.key.explain && <div className="mt-1 text-xs text-emerald-300/80">{s.key.explain}</div>}
          </div>
        )}
      </div>
      {s.status !== 'ENDED' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="lg" onClick={() => act('next')} loading={busy}>
            <Play className="h-4 w-4" /> {nextLabel}
          </Button>
          {(s.phase === 'question' || s.phase === 'wager') && <Button onClick={() => act('extend', { secs: 10 })}>+10 s</Button>}
          {s.phase === 'question' && (
            <Button variant="danger" onClick={() => act('restart-question', {}, 'Restart this question? Answers given so far are thrown away.')}>
              Restart question
            </Button>
          )}
          <Button variant="danger" onClick={() => act('end', {}, 'End the game now and lock the scores as they are?')}>
            End game
          </Button>
        </div>
      )}
      <p className="text-xs text-neutral-500">The screen reveals by itself when time is up or every team has locked in. Space on the screen does the same as the red button.</p>
      <MiniBoard rows={(s.detBoard ?? []).map((r) => ({ id: r.teamId, rank: r.rank, name: r.teamName, value: `${r.pts.toLocaleString('en-IN')} pts`, extra: `${r.cd}/50` }))} />
    </div>
  );
}

const NEWS_UP = ['Passed a Killer Test live at the checkpoint', 'Mentors are impressed by the demo', 'Shipped a Differentiator nobody saw coming', 'Docs scored top marks in Deduction'];
const NEWS_DOWN = ['Demo crashed in front of a mentor', 'Killer Test failed at the checkpoint', 'Team missing from the table at the checkpoint', 'Merge conflict ate an hour of work'];

function ExControl({ s, now, act, busy }: { s: GameState; now: number; act: Act; busy: boolean }) {
  const m = s.market!;
  const [target, setTarget] = useState(m.tickers[0]?.code ?? 'all');
  const [pct, setPct] = useState(0.15);
  const [headline, setHeadline] = useState('');
  const left = Math.max(0, (m.closeAt ?? now) - now);
  const halted = !!m.haltUntil && now < m.haltUntil;
  const targetName = useMemo(() => {
    if (target === 'all') return 'The whole market';
    if (target.startsWith('track:')) {
      const t = TRACKS[target.slice(6) as keyof typeof TRACKS];
      return `${t.suit} ${t.label}`;
    }
    return CARD_BY_CODE[target]?.name ?? target;
  }, [target]);

  function fire() {
    const text = headline.trim() || `${targetName}: ${(pct >= 0 ? NEWS_UP : NEWS_DOWN)[0]}`;
    act('news', { target, pct, headline: text });
    setHeadline('');
  }

  return (
    <div className="space-y-4 font-label text-sm">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-800 bg-[#0d0d10] p-3">
        <span className="font-poster text-3xl text-white">
          {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
        </span>
        <span className="text-neutral-400">{s.status === 'LOBBY' ? 'Not open yet' : s.status === 'ENDED' ? 'Ended, scores saved' : halted ? 'Halted' : left > 0 ? 'Open' : 'Closed: press End & score'}</span>
        <label className="ml-auto flex items-center gap-2 text-neutral-400">
          <input type="checkbox" checked={m.autoNews} onChange={(e) => act('auto', { on: e.target.checked })} className="accent-[#b3202a]" />
          Random rumours
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {s.status === 'LOBBY' && (
          <Button variant="primary" size="lg" onClick={() => act('start')} loading={busy}>
            <Play className="h-4 w-4" /> Open the market
          </Button>
        )}
        {s.status === 'LIVE' && (
          <>
            {halted ? <Button onClick={() => act('resume')}>Resume trading</Button> : <Button onClick={() => act('halt', { secs: 30 })}>Circuit breaker 30 s</Button>}
            <Button onClick={() => act('extend', { minutes: 2 })}>+2 min</Button>
            <Button variant="danger" onClick={() => act('close', {}, 'Close the market now? The closing bell rings on the screen.')}>
              Close now
            </Button>
            <Button variant="success" onClick={() => act('end', {}, 'End the game and save the trading bonuses?')}>
              End & score
            </Button>
          </>
        )}
      </div>

      {s.status === 'LIVE' && (
        <div className="rounded-lg border border-neutral-800 p-3">
          <div className="mb-2 font-semibold text-neutral-200">Breaking news</div>
          <select className={inputCls()} value={target} onChange={(e) => setTarget(e.target.value)}>
            {m.tickers.map((t) => (
              <option key={t.code} value={t.code}>
                {TRACKS[CARD_BY_CODE[t.code].track].suit} {CARD_BY_CODE[t.code].name} ({t.price.toFixed(1)})
              </option>
            ))}
            {TRACK_ORDER.map((t) => (
              <option key={t} value={`track:${t}`}>
                Whole track: {TRACKS[t].suit} {TRACKS[t].label}
              </option>
            ))}
            <option value="all">Whole market</option>
          </select>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0.08, 0.15, 0.25, 0.4, -0.08, -0.15, -0.25, -0.4].map((p) => (
              <Chip key={p} on={pct === p} onClick={() => setPct(p)}>
                <span className={p > 0 ? 'text-emerald-500' : 'text-red-500'}>{fmtPct(p)}</span>
              </Chip>
            ))}
          </div>
          <input className={`${inputCls()} mt-2`} placeholder={`Headline, e.g. "${targetName}: ${(pct >= 0 ? NEWS_UP : NEWS_DOWN)[0]}"`} value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(pct >= 0 ? NEWS_UP : NEWS_DOWN).map((h) => (
              <button key={h} onClick={() => setHeadline(`${targetName}: ${h}`)} className="rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:text-white">
                {h}
              </button>
            ))}
          </div>
          <Button variant="primary" className="mt-3 w-full" onClick={fire}>
            🚨 Fire the news
          </Button>
          <p className="mt-2 text-xs text-neutral-500">Use real news from the checkpoints: a team that passed a Killer Test moves its card up.</p>
        </div>
      )}
      <MiniBoard
        rows={(s.exBoard ?? []).map((r) => ({
          id: r.teamId,
          rank: r.rank,
          name: r.teamName,
          value: `${fmtChips(r.worth)} (${fmtPct((r.worth - m.startCash) / m.startCash)})`,
          extra: `+${r.bonus}`,
        }))}
      />
    </div>
  );
}

function MiniBoard({ rows }: { rows: Array<{ id: string; rank: number; name: string; value: string; extra: string }> }) {
  if (!rows.length) return null;
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-neutral-800">
      <table className="w-full text-left text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-neutral-900">
              <td className="px-2 py-1.5 font-poster text-base text-neutral-300">{r.rank}</td>
              <td className="px-2 py-1.5 text-neutral-200">{r.name}</td>
              <td className="px-2 py-1.5 text-right text-neutral-400">{r.value}</td>
              <td className="px-2 py-1.5 text-right font-semibold text-amber-300">{r.extra}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Scores into the final total ──────────────────────────────────────── */

function Scores({ rows }: { rows: LiveScoreRow[] }) {
  const [copied, setCopied] = useState(false);
  const played = rows.filter((r) => r.detective !== undefined || r.trading !== undefined);
  async function copy() {
    const lines = ['Team ID\tTeam\tCard\tCode Detective (/50)\tTrading bonus (/30)', ...rows.map((r) => `${r.teamId}\t${r.teamName}\t${r.card ? CARD_BY_CODE[r.card]?.title ?? r.card : ''}\t${r.detective ?? ''}\t${r.trading ?? ''}`)];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <Panel>
      <SectionLabel
        right={
          <Button size="sm" onClick={copy} disabled={!played.length}>
            <Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy for the sheet'}
          </Button>
        }
      >
        Into the final score
      </SectionLabel>
      <p className="mb-3 font-label text-xs text-neutral-500">
        From ended games only. Code Detective: the top team gets 50, everyone else the same share of 50 as their share of the top score. Trading: every team that traded is ranked by net worth, the best gets +30, the rest scale down by rank. If a team played twice, its best counts.
      </p>
      {!played.length ? (
        <p className="font-label text-sm text-neutral-500">No ended games yet.</p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left font-label text-xs">
            <thead className="text-neutral-500">
              <tr>
                <th className="px-2 py-1">Team</th>
                <th className="px-2 py-1 text-right">♠ /50</th>
                <th className="px-2 py-1 text-right">♣ /30</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.teamId} className="border-t border-neutral-900">
                  <td className="px-2 py-1.5 text-neutral-200">
                    {r.teamId} · {r.teamName}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-white">{r.detective ?? '–'}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-white">{r.trading ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
