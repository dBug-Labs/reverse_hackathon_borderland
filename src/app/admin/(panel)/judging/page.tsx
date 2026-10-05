'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Megaphone, Play, RotateCcw, Shuffle, SkipForward, X } from 'lucide-react';
import { Banner, Button, PageTitle, Panel, SectionLabel, inputCls } from '@/components/portal/ui';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { etaFor, fmtClock, queueOf, type JudgingState, type PanelInfo } from '@/lib/judging/types';
import { getJSON, postJSON, usePoll, useServerNow } from '@/components/live/clock';

/**
 * /admin/judging — final judging panels.
 * Draw the teams present after lunch into the four panels, show the draw on the projector,
 * then call teams in from here (any Game Master with an admin login can drive a panel).
 */

type State = JudgingState & { counts?: Record<number, number> };

const STATUS: Record<string, string> = {
  SETUP: 'Not drawn yet',
  DRAWN: 'Drawn, not announced (teams cannot see it yet)',
  ANNOUNCED: 'Announced: teams see their panel on Play live',
  DONE: 'Judging finished',
};

const RED = new Set(['♥', '♦']);

export default function JudgingAdminPage() {
  const [s, setS] = useState<State | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const now = useServerNow(1);

  const load = useCallback(async () => {
    const r = await getJSON<State>('/api/admin/judging?counts=1');
    if (r.ok && r.data) setS(r.data);
    else if (r.message) setMsg(r.message);
  }, []);
  usePoll(load, 2500);

  const act = useCallback(async (action: string, extra: Record<string, unknown> = {}, ask?: string) => {
    if (ask && !confirm(ask)) return false;
    setBusy(true);
    const r = await postJSON<State>('/api/admin/judging', { action, ...extra });
    setBusy(false);
    if (r.ok && r.data) {
      setS((old) => ({ ...r.data!, counts: old?.counts }));
      setMsg('');
      return true;
    }
    setMsg(r.message || 'Action failed.');
    return false;
  }, []);

  async function draw(mode: 'track' | 'random', session: 4 | 2) {
    const label = session === 4 ? 'Day 2 · post-lunch' : 'Day 2 morning';
    const ask = `Draw the panels from the teams marked present (${label})?${s && s.slots.length ? ' This replaces the current draw.' : ''}`;
    if (!confirm(ask)) return;
    setBusy(true);
    let r = await postJSON<State>('/api/admin/judging', { action: 'draw', mode, session });
    if (!r.ok && (r.code === 'ANNOUNCED' || r.code === 'RUNNING') && confirm(`${r.message} Teams will see the new panels.`)) {
      r = await postJSON<State>('/api/admin/judging', { action: 'draw', mode, session, force: true });
    }
    setBusy(false);
    if (r.ok && r.data) {
      setS((old) => ({ ...r.data!, counts: old?.counts }));
      setMsg('');
    } else setMsg(r.message || 'Could not draw.');
  }

  if (!s) return <PageTitle kicker="Day 2 · 1:15" title="Judging panels" subtitle={msg || 'Loading…'} />;

  const present = s.counts?.[4] ?? 0;
  const morning = s.counts?.[2] ?? 0;

  return (
    <>
      <PageTitle
        kicker="Day 2 · 1:15"
        title="Judging panels"
        subtitle="Teams marked present after lunch (attendance tab D2 PM) are drawn into the four panels. Show the draw on the projector, then call teams in from here."
        actions={
          <a href="/admin/judging-screen" target="_blank" rel="noreferrer">
            <Button variant="paper">
              <ExternalLink className="h-3.5 w-3.5" /> Open the screen
            </Button>
          </a>
        }
      />
      {msg && <Banner>{msg}</Banner>}

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <Panel>
            <SectionLabel>The draw</SectionLabel>
            <div className="space-y-3 font-label text-sm">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="font-poster text-5xl leading-none text-white">{present}</div>
                  <div className="text-xs text-neutral-500">teams present after lunch (D2 PM)</div>
                </div>
                <div>
                  <div className="font-poster text-3xl leading-none text-neutral-400">{morning}</div>
                  <div className="text-xs text-neutral-500">present this morning (D2)</div>
                </div>
                <div>
                  <div className="font-poster text-3xl leading-none text-neutral-400">{s.slots.length}</div>
                  <div className="text-xs text-neutral-500">on the panels now</div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-[#0d0d10] px-3 py-2 text-neutral-300">
                <b>{STATUS[s.status]}</b>
                {s.source && (
                  <span className="text-neutral-500">
                    {' '}
                    · drawn from {s.source.session === 4 ? 'D2 PM' : 'D2 morning'} ({s.source.present} teams) at {fmtClock(s.source.at)}, {s.mode === 'track' ? 'own track first' : 'fully random'}
                  </span>
                )}
              </div>
              {present === 0 && <p className="text-amber-300">Nobody is marked for D2 PM yet. Volunteers: Attendance desk → D2 PM tab → mark each team after lunch.</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => draw('track', 4)} loading={busy} disabled={present === 0}>
                  <Shuffle className="h-4 w-4" /> Draw · own track first
                </Button>
                <Button onClick={() => draw('random', 4)} disabled={busy || present === 0}>
                  Draw · fully random
                </Button>
                {present === 0 && morning > 0 && (
                  <Button onClick={() => draw('track', 2)} disabled={busy}>
                    Draw from the morning list
                  </Button>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Own track first: every team goes to its own track&apos;s panel; a panel with more than its share passes a few random teams to the emptiest panels, so all four finish together. The calling order is random.
              </p>
              <div className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
                <Button variant="success" onClick={() => act('announce')} disabled={busy || !s.slots.length || s.status === 'ANNOUNCED'}>
                  <Megaphone className="h-4 w-4" /> Announce (without the screen)
                </Button>
                <Button onClick={() => act('finish', {}, 'Mark judging as finished?')} disabled={busy || s.status !== 'ANNOUNCED'}>
                  Finish judging
                </Button>
                <Button variant="danger" onClick={() => act('reset', {}, 'Wipe the draw, the panel queues and the setup?')} disabled={busy}>
                  Reset
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                The screen announces by itself at the end of its draw animation (Space on the screen starts it). Teams then see their panel, slot and time on Play live, and their phone rings when they are called.
              </p>
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Setup s={s} act={act} busy={busy} />
          <AddLate s={s} act={act} busy={busy} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {s.panels.map((p, i) => (
          <PanelCard key={i} s={s} i={i} p={p} now={now} act={act} busy={busy} />
        ))}
      </div>
    </>
  );
}

type Act = (action: string, extra?: Record<string, unknown>, ask?: string) => Promise<boolean>;

function PanelCard({ s, i, p, now, act, busy }: { s: State; i: number; p: PanelInfo; now: number; act: Act; busy: boolean }) {
  const q = queueOf(s.slots, i);
  const cur = q.find((x) => x.state === 'called');
  const waiting = q.filter((x) => x.state === 'waiting');
  const done = q.filter((x) => x.state === 'done');
  const over = cur?.calledAt ? now - cur.calledAt > s.slotMin * 60_000 : false;
  const mins = cur?.calledAt ? Math.floor((now - cur.calledAt) / 60_000) : 0;
  const secs = cur?.calledAt ? Math.floor(((now - cur.calledAt) % 60_000) / 1000) : 0;
  return (
    <Panel>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-poster text-2xl uppercase leading-none ${RED.has(p.suit) ? 'text-[#ff6b6b]' : 'text-[#f5eee1]'}`}>
            {p.suit} {p.name}
          </div>
          <div className="mt-1 font-label text-xs text-neutral-500">
            {[p.place, p.judges].filter(Boolean).join(' · ') || 'Set the room and judges below'} · {done.length}/{q.length} done
          </div>
        </div>
      </div>
      <div className={`rounded-lg border p-3 font-label ${cur ? (over ? 'border-red-700 bg-red-950/40' : 'border-emerald-800 bg-emerald-950/30') : 'border-neutral-800 bg-[#0d0d10]'}`}>
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">Now presenting</div>
        {cur ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-lg font-bold text-white">
              {cur.teamName} <span className="text-xs font-normal text-neutral-500">{cur.teamId}</span>
            </span>
            <span className={`font-poster text-2xl tabular-nums ${over ? 'text-red-400' : 'text-emerald-300'}`}>
              {mins}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <div className="text-neutral-500">{done.length && !waiting.length ? 'All done ✓' : 'Nobody yet'}</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => act('call', { panel: i })} loading={busy} disabled={!cur && !waiting.length}>
          <Play className="h-4 w-4" /> {cur ? (waiting.length ? 'Done · call next' : 'Done') : 'Call the first team'}
        </Button>
        {cur && (
          <Button onClick={() => act('skip', { panel: i }, `${cur.teamName} is not here? They go to the end of the queue and the next team is called.`)} disabled={busy}>
            <SkipForward className="h-4 w-4" /> Not here
          </Button>
        )}
        {(cur || done.length > 0) && (
          <Button onClick={() => act('undo', { panel: i })} disabled={busy} title="Undo the last call">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-1 font-label text-sm">
        {waiting.map((t, k) => (
          <div key={t.teamId} className="flex items-center gap-2 rounded-md border border-neutral-800 px-2 py-1.5">
            <span className="w-5 text-right font-poster text-neutral-500">{k + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-neutral-100">
                {t.teamName} {t.late && <span className="text-[10px] text-amber-300">late</span>}
              </span>
              <span className="block truncate text-[11px] text-neutral-500">
                {t.teamId} · {t.card ? `${TRACKS[CARD_BY_CODE[t.card]?.track]?.suit ?? ''} ${CARD_BY_CODE[t.card]?.title ?? t.card}` : 'no card'} · ~{fmtClock(etaFor(s, t, now))}
                {t.moved && <span className="text-amber-300"> · from another track</span>}
              </span>
            </span>
            <button className="p-1 text-neutral-500 hover:text-white" onClick={() => act('shift', { teamId: t.teamId, dir: -1 })} title="Earlier">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button className="p-1 text-neutral-500 hover:text-white" onClick={() => act('shift', { teamId: t.teamId, dir: 1 })} title="Later">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <select
              className="rounded border border-neutral-700 bg-black px-1 py-0.5 text-xs text-neutral-300"
              value={i}
              onChange={(e) => act('move', { teamId: t.teamId, panel: Number(e.target.value) })}
              title="Move to another panel"
            >
              {s.panels.map((pp, j) => (
                <option key={j} value={j}>
                  {pp.suit} {j + 1}
                </option>
              ))}
            </select>
            <button className="p-1 text-neutral-600 hover:text-[#ff8a8a]" onClick={() => act('remove', { teamId: t.teamId }, `Take ${t.teamName} off the panels?`)} title="Remove">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {done.length > 0 && <div className="pt-1 text-xs text-neutral-500">Done: {done.map((t) => t.teamName).join(', ')}</div>}
      </div>
    </Panel>
  );
}

function Setup({ s, act, busy }: { s: State; act: Act; busy: boolean }) {
  const [panels, setPanels] = useState(s.panels);
  const [time, setTime] = useState(() => fmtTime(s.startAt));
  const [slot, setSlot] = useState(s.slotMin);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (dirty) return;
    setPanels(s.panels);
    setTime(fmtTime(s.startAt));
    setSlot(s.slotMin);
  }, [s, dirty]);
  const edit = (i: number, k: 'name' | 'place' | 'judges', v: string) => {
    setDirty(true);
    setPanels((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  };
  async function save() {
    const [h, m] = time.split(':').map(Number);
    const day = new Date(s.startAt + 5.5 * 3600_000).toISOString().slice(0, 10);
    const startAt = new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`).getTime();
    if (await act('setup', { panels, startAt, slotMin: slot })) setDirty(false);
  }
  return (
    <Panel>
      <SectionLabel>Panels and timing</SectionLabel>
      <div className="space-y-2 font-label text-sm">
        {panels.map((p, i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr] items-start gap-2">
            <span className={`pt-2 text-center font-poster text-2xl ${RED.has(p.suit) ? 'text-[#ff6b6b]' : 'text-[#f5eee1]'}`}>{p.suit}</span>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <input className={inputCls()} value={p.name} onChange={(e) => edit(i, 'name', e.target.value)} placeholder="Panel name" />
              <input className={inputCls()} value={p.place} onChange={(e) => edit(i, 'place', e.target.value)} placeholder="Room / spot" />
              <input className={inputCls()} value={p.judges} onChange={(e) => edit(i, 'judges', e.target.value)} placeholder="Judges" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <label className="flex items-center gap-2 text-neutral-400">
            First slot
            <input
              type="time"
              className={`${inputCls()} w-32`}
              value={time}
              onChange={(e) => {
                setDirty(true);
                setTime(e.target.value);
              }}
            />
          </label>
          <label className="flex items-center gap-2 text-neutral-400">
            Minutes per team
            <input
              type="number"
              min={3}
              max={20}
              className={`${inputCls()} w-20`}
              value={slot}
              onChange={(e) => {
                setDirty(true);
                setSlot(Number(e.target.value));
              }}
            />
          </label>
          <Button variant="primary" onClick={save} loading={busy} disabled={!dirty}>
            Save
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function fmtTime(ms: number) {
  const d = new Date(ms + 5.5 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function AddLate({ s, act, busy }: { s: State; act: Act; busy: boolean }) {
  const [id, setId] = useState('');
  const [panel, setPanel] = useState(-1);
  return (
    <Panel>
      <SectionLabel>Late arrival</SectionLabel>
      <div className="flex flex-wrap gap-2 font-label text-sm">
        <input className={`${inputCls()} w-36`} placeholder="DBG-123" value={id} onChange={(e) => setId(e.target.value)} />
        <select className={`${inputCls()} w-48`} value={panel} onChange={(e) => setPanel(Number(e.target.value))}>
          <option value={-1}>Own track&apos;s panel</option>
          {s.panels.map((p, j) => (
            <option key={j} value={j}>
              {p.suit} {p.name}
            </option>
          ))}
        </select>
        <Button
          onClick={async () => {
            if (await act('add', { teamId: id, ...(panel >= 0 ? { panel } : {}) })) setId('');
          }}
          disabled={busy || !id.trim()}
        >
          Add to the end of the queue
        </Button>
      </div>
    </Panel>
  );
}
