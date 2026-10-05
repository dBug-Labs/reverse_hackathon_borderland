'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { etaFor, fmtClock, queueOf, type JudgingState, type PanelInfo, type Slot } from '@/lib/judging/types';
import { sfx } from '@/utils/liveSound';
import { Galaxy } from '@/components/live/Shaders';
import { Confetti, Rolling, Shockwave, SlamTitle } from '@/components/live/fx';

/**
 * Final judging on the projector.
 *
 *   lobby  – the four panels, how many teams made it back after lunch
 *   draw   – the deck shuffles, every team is dealt into its panel, card by card
 *   board  – live: who is presenting at each panel, who is next, the queue with times
 *   call   – a full-screen call-up whenever a panel calls a team
 */

export type Scene = 'lobby' | 'draw' | 'board';

const RED = new Set(['♥', '♦']);
const DEAL_MS = 520;
const SHUFFLE_MS = 2600;

const suitColor = (s: string) => (RED.has(s) ? '#ff3b3b' : '#f2e9d8');

export function JudgingScreen({ s, now, scene, setScene, onDrawn }: { s: JudgingState; now: number; scene: Scene; setScene: (x: Scene) => void; onDrawn: () => void }) {
  const calls = useCalls(s, scene === 'board');
  const warp = scene === 'draw' ? 7 : calls.current ? 10 : 1;
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050506] text-[#ededed]">
      <Galaxy warp={warp} hue={calls.current ? 0 : 350} />
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,.15), rgba(0,0,0,.9) 85%)' }} />
      <div className="live-scanline pointer-events-none fixed inset-0" />
      <div className="relative z-10 flex min-h-screen flex-col px-[3vw] py-[2.5vh]">
        <div className="flex items-center justify-between font-caps text-[1.6vh] uppercase tracking-[0.4em] text-neutral-400">
          <span>
            <span className="text-[#ff4a4a]">♥</span> Final judging · dBug Labs · Hackback
          </span>
          <span className="font-poster text-[3vh] tracking-normal text-[#f2e9d8]">{fmtClock(now)}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={s.status === 'DONE' ? 'done' : scene}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, filter: 'blur(12px)', scale: 1.04 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(12px)', scale: 0.96 }}
            transition={{ duration: 0.5 }}
          >
            {s.status === 'DONE' ? (
              <Done s={s} />
            ) : scene === 'lobby' ? (
              <Lobby s={s} />
            ) : scene === 'draw' ? (
              <Draw
                s={s}
                onDone={() => {
                  onDrawn();
                  setTimeout(() => setScene('board'), 6500);
                }}
              />
            ) : (
              <Board s={s} now={now} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence>{calls.current && <CallUp key={calls.current.key} slot={calls.current.slot} panel={s.panels[calls.current.slot.panel]} />}</AnimatePresence>
    </div>
  );
}

/* ── Lobby ─────────────────────────────────────────────────────────────── */

function Lobby({ s }: { s: JudgingState }) {
  const n = s.slots.length || s.source?.present || 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[4vh] text-center">
      <div>
        <motion.div initial={{ letterSpacing: '2em', opacity: 0 }} animate={{ letterSpacing: '0.6em', opacity: 1 }} transition={{ duration: 1.2 }} className="font-caps text-[2.4vh] uppercase text-[#ff6b6b]">
          The panel draw
        </motion.div>
        <SlamTitle className="font-poster text-[17vh] uppercase leading-[0.85] text-[#f2e9d8]">
          Final <span className="text-[#ff3b3b]">judging</span>
        </SlamTitle>
      </div>
      <div className="flex gap-[2vw]">
        {s.panels.map((p, i) => (
          <motion.div
            key={i}
            initial={{ y: 200, opacity: 0, rotateX: 60 }}
            animate={{ y: [0, -12, 0], opacity: 1, rotateX: 0 }}
            transition={{ y: { duration: 3, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }, opacity: { delay: 0.6 + i * 0.15 }, rotateX: { delay: 0.6 + i * 0.15, type: 'spring' } }}
            className="w-[19vw] rounded-[2.4vh] border border-white/10 bg-black/60 px-[1.5vw] py-[3vh] backdrop-blur"
            style={{ boxShadow: `0 0 60px -10px ${suitColor(p.suit)}66` }}
          >
            <div className="font-poster text-[12vh] leading-none" style={{ color: suitColor(p.suit), textShadow: `0 0 40px ${suitColor(p.suit)}` }}>
              {p.suit}
            </div>
            <div className="mt-[1vh] font-poster text-[3.4vh] uppercase leading-none text-white">{p.name}</div>
            {p.place && <div className="mt-[0.8vh] font-label text-[2vh] text-neutral-300">📍 {p.place}</div>}
            {p.judges && <div className="mt-[0.4vh] font-label text-[1.7vh] text-neutral-500">{p.judges}</div>}
          </motion.div>
        ))}
      </div>
      <div className="font-poster text-[6vh] text-[#f2e9d8]">
        <Rolling value={n} /> <span className="text-[3.4vh] text-neutral-500">teams made it back after lunch</span>
      </div>
      <p className="font-caps text-[1.6vh] uppercase tracking-[0.4em] text-neutral-500">
        {s.status === 'SETUP' ? 'Waiting for the draw in the control room' : 'Press space to draw the panels'}
      </p>
    </div>
  );
}

/* ── The draw ──────────────────────────────────────────────────────────── */

function Draw({ s, onDone }: { s: JudgingState; onDone: () => void }) {
  // Deal round-robin: first slot of every panel, then the second, … so the columns fill together.
  const deal = useMemo(() => {
    const qs = s.panels.map((_, i) => queueOf(s.slots, i));
    const max = Math.max(0, ...qs.map((q) => q.length));
    const out: Slot[] = [];
    for (let k = 0; k < max; k++) qs.forEach((q) => q[k] && out.push(q[k]));
    return out;
  }, [s.panels, s.slots]);
  const [dealt, setDealt] = useState(0);
  const [phase, setPhase] = useState<'shuffle' | 'deal' | 'set'>('shuffle');
  const done = useRef(false);
  // The screen re-renders several times a second: keep the deal timers off the props.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    sfx.rise();
    const t = setTimeout(() => setPhase('deal'), SHUFFLE_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase !== 'deal') return;
    if (dealt >= deal.length) {
      const t = setTimeout(() => {
        setPhase('set');
        sfx.fanfare();
        if (!done.current) {
          done.current = true;
          onDoneRef.current();
        }
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDealt((d) => d + 1);
      sfx.whoosh();
      setTimeout(() => sfx.lock(), 260);
    }, dealt === 0 ? 200 : DEAL_MS);
    return () => clearTimeout(t);
  }, [phase, dealt, deal.length]);

  const shown = new Set(deal.slice(0, dealt).map((x) => x.teamId));
  const current = phase === 'deal' ? deal[dealt - 1] : undefined;
  const rows = Math.max(1, ...s.panels.map((_, i) => queueOf(s.slots, i).length));
  const rowH = Math.min(7.2, 62 / rows);

  return (
    <div className="relative mt-[2vh] flex flex-1 flex-col">
      <div className="h-[9vh] text-center">
        <AnimatePresence mode="wait">
          {phase === 'shuffle' && (
            <motion.div key="sh" exit={{ opacity: 0 }} className="font-poster text-[6vh] uppercase text-[#f2e9d8]">
              Shuffling {deal.length} teams…
            </motion.div>
          )}
          {phase === 'deal' && current && (
            <motion.div key={current.teamId} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="font-poster text-[6vh] uppercase leading-none">
              <span className="text-white">{current.teamName}</span> <span className="text-neutral-500">→</span>{' '}
              <span style={{ color: suitColor(s.panels[current.panel].suit) }}>
                {s.panels[current.panel].suit} {s.panels[current.panel].name}
              </span>
            </motion.div>
          )}
          {phase === 'set' && (
            <motion.div key="set" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="font-poster text-[7vh] uppercase leading-none text-[#facc15]">
              The panels are set
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid flex-1 grid-cols-4 gap-[1.6vw]">
        {s.panels.map((p, i) => {
          const q = queueOf(s.slots, i);
          const got = q.filter((x) => shown.has(x.teamId)).length;
          return (
            <motion.div
              key={i}
              animate={current?.panel === i ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col rounded-[2vh] border bg-black/55 p-[1.2vh] backdrop-blur"
              style={{ borderColor: current?.panel === i ? suitColor(p.suit) : 'rgba(255,255,255,.1)', boxShadow: current?.panel === i ? `0 0 50px ${suitColor(p.suit)}88` : undefined }}
            >
              <div className="flex items-center gap-[0.8vw] border-b border-white/10 pb-[1vh]">
                <span className="font-poster text-[7vh] leading-none" style={{ color: suitColor(p.suit) }}>
                  {p.suit}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-poster text-[2.8vh] uppercase leading-none text-white">{p.name}</div>
                  <div className="truncate font-label text-[1.6vh] text-neutral-400">{p.place || `${got} / ${q.length} teams`}</div>
                </div>
              </div>
              <div className="mt-[1vh] flex flex-col gap-[0.6vh]">
                {q.map((t, k) => (
                  <div key={t.teamId} style={{ height: `${rowH}vh`, perspective: 800 }}>
                    {shown.has(t.teamId) ? (
                      <motion.div
                        initial={{ x: `${(1.5 - i) * 22}vw`, y: '-30vh', rotateY: 180, rotate: (k % 3) * 10 - 10, scale: 1.6, opacity: 0 }}
                        animate={{ x: 0, y: 0, rotateY: 0, rotate: 0, scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 110, damping: 15 }}
                        className="flex h-full items-center gap-[0.6vw] rounded-[1vh] px-[0.8vw]"
                        style={{ background: 'linear-gradient(160deg,#fbf6ea,#e2d4b6)', boxShadow: '0 8px 24px -8px rgba(0,0,0,.8)' }}
                      >
                        <span className="w-[2vw] font-poster text-[2.6vh] text-[#1b1714]/50">{k + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-poster text-[2.6vh] uppercase leading-none text-[#1b1714]">{t.teamName}</span>
                          {rowH > 5 && (
                            <span className="block truncate font-label text-[1.4vh] font-bold text-[#1b1714]/60">
                              {t.card ? `${TRACKS[CARD_BY_CODE[t.card]?.track]?.suit ?? ''} ${CARD_BY_CODE[t.card]?.title ?? ''}` : t.teamId}
                              {t.moved ? ' · moved in' : ''}
                            </span>
                          )}
                        </span>
                        {phase === 'set' && (
                          <motion.span initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + k * 0.12 }} className="font-poster text-[2.2vh] text-[#b3202a]">
                            ~{fmtClock(etaFor(s, t, Date.now()))}
                          </motion.span>
                        )}
                      </motion.div>
                    ) : (
                      <div className="h-full rounded-[1vh] border-2 border-dashed border-white/10" />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* the deck in the middle while shuffling */}
      <AnimatePresence>{phase === 'shuffle' && <Deck />}</AnimatePresence>
      {phase === 'set' && <Confetti fire="set" />}
      {phase === 'set' && <Shockwave k="set" color="#facc15" />}
    </div>
  );
}

function Deck() {
  return (
    <motion.div exit={{ opacity: 0, scale: 0.4 }} transition={{ duration: 0.4 }} className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-[1.4vh] border-[0.4vh] border-[#f2e9d8]"
          style={{ width: '13vh', height: '18vh', background: 'repeating-linear-gradient(45deg,#7a1118 0 9%,#8e1820 9% 18%)', boxShadow: '0 20px 40px -10px rgba(0,0,0,.9)' }}
          initial={{ x: 0, y: 0, rotate: 0 }}
          animate={{
            x: [0, (i % 2 ? 1 : -1) * (14 + i * 1.5) + 'vh', 0, (i % 2 ? -1 : 1) * 10 + 'vh', 0],
            y: [0, -i * 0.5 + 'vh', -i * 0.3 + 'vh', 0, -i * 0.25 + 'vh'],
            rotate: [0, (i % 2 ? 1 : -1) * 18, 0, (i % 2 ? -1 : 1) * 12, (i - 7) * 1.2],
          }}
          transition={{ duration: SHUFFLE_MS / 1000, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
        />
      ))}
      <span className="relative z-10 font-poster text-[12vh] text-[#f2e9d8]" style={{ textShadow: '0 0 40px rgba(255,59,59,.9)' }}>
        ♠♥♦♣
      </span>
    </motion.div>
  );
}

/* ── The live board ───────────────────────────────────────────────────── */

function Board({ s, now }: { s: JudgingState; now: number }) {
  const slot = s.slotMin * 60_000;
  const all = s.slots.length;
  const done = s.slots.filter((x) => x.state === 'done').length;
  return (
    <div className="mt-[2vh] flex flex-1 flex-col gap-[1.6vh]">
      <div className="flex items-end justify-between">
        <SlamTitle className="font-poster text-[7vh] uppercase leading-none text-[#f2e9d8]">
          Now <span className="text-[#ff3b3b]">judging</span>
        </SlamTitle>
        <div className="flex items-center gap-[1.4vw]">
          <div className="h-[1.4vh] w-[20vw] overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-[#22e584]" animate={{ width: `${all ? (done / all) * 100 : 0}%` }} transition={{ type: 'spring', stiffness: 60 }} />
          </div>
          <span className="font-poster text-[3vh] text-[#f2e9d8]">
            {done}/{all} judged
          </span>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-[1.4vw]">
        {s.panels.map((p, i) => {
          const q = queueOf(s.slots, i);
          const cur = q.find((x) => x.state === 'called');
          const waiting = q.filter((x) => x.state === 'waiting');
          const gone = q.filter((x) => x.state === 'done');
          const el = cur?.calledAt ? now - cur.calledAt : 0;
          const frac = Math.min(1, el / slot);
          const over = el > slot;
          const c = suitColor(p.suit);
          return (
            <div key={i} className="flex flex-col overflow-hidden rounded-[2vh] border border-white/10 bg-black/60 backdrop-blur">
              <div className="flex items-center gap-[0.8vw] px-[1vw] py-[1.2vh]" style={{ background: `linear-gradient(90deg, ${c}33, transparent)` }}>
                <motion.span animate={{ rotateY: [0, 360] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay: i * 0.7 }} className="font-poster text-[6vh] leading-none" style={{ color: c }}>
                  {p.suit}
                </motion.span>
                <div className="min-w-0">
                  <div className="line-clamp-2 font-poster text-[2.8vh] uppercase leading-none text-white">{p.name}</div>
                  <div className="truncate font-label text-[1.6vh] text-neutral-400">{[p.place, p.judges].filter(Boolean).join(' · ')}</div>
                </div>
              </div>

              {/* now */}
              <div className="relative mx-[0.8vw] mt-[1vh] overflow-hidden rounded-[1.4vh] border px-[1vw] py-[1.4vh]" style={{ borderColor: cur ? (over ? '#ff3b3b' : c) : 'rgba(255,255,255,.08)' }}>
                {cur && <motion.div className="absolute inset-y-0 left-0" style={{ background: over ? 'rgba(255,59,59,.22)' : `${c}22` }} animate={{ width: `${frac * 100}%` }} transition={{ duration: 0.5 }} />}
                <div className="relative font-caps text-[1.3vh] uppercase tracking-[0.35em] text-neutral-400">{cur ? 'Presenting now' : gone.length && !waiting.length ? 'Panel done' : 'Up first'}</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={cur?.teamId ?? 'none'}
                    initial={{ rotateX: 90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: -90, opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="relative truncate font-poster text-[4.4vh] uppercase leading-tight text-white"
                    style={cur ? { textShadow: `0 0 30px ${c}` } : undefined}
                  >
                    {cur ? cur.teamName : gone.length && !waiting.length ? '✓ All judged' : waiting[0]?.teamName ?? '—'}
                  </motion.div>
                </AnimatePresence>
                {cur && (
                  <div className={`relative font-poster text-[2.6vh] tabular-nums ${over ? 'live-pulse-red text-[#ff4a4a]' : 'text-neutral-300'}`}>
                    {Math.floor(el / 60000)}:{String(Math.floor((el % 60000) / 1000)).padStart(2, '0')} <span className="text-[1.6vh] text-neutral-500">/ {s.slotMin}:00</span>
                  </div>
                )}
                {!cur && waiting[0] && <div className="relative font-label text-[1.8vh] text-neutral-400">at ~{fmtClock(etaFor(s, waiting[0], now))}</div>}
              </div>

              {/* next */}
              {cur && waiting[0] && (
                <div className="mx-[0.8vw] mt-[1vh] rounded-[1.2vh] border border-dashed border-[#facc15]/50 bg-[#facc15]/5 px-[1vw] py-[1vh]">
                  <div className="font-caps text-[1.2vh] uppercase tracking-[0.35em] text-[#facc15]">Get ready · next</div>
                  <div className="truncate font-poster text-[3vh] uppercase leading-tight text-white">{waiting[0].teamName}</div>
                  <div className="font-label text-[1.6vh] text-neutral-400">~{fmtClock(etaFor(s, waiting[0], now))}</div>
                </div>
              )}

              {/* queue */}
              <div className="mt-[1vh] flex-1 space-y-[0.5vh] px-[0.8vw] pb-[1vh]">
                {waiting.slice(1).map((t) => (
                  <motion.div layout key={t.teamId} className="flex items-center justify-between rounded-[0.8vh] bg-white/5 px-[0.8vw] py-[0.6vh] font-label text-[1.9vh]">
                    <span className="truncate font-bold text-neutral-200">{t.teamName}</span>
                    <span className="shrink-0 pl-2 text-neutral-500">~{fmtClock(etaFor(s, t, now))}</span>
                  </motion.div>
                ))}
                {gone.length > 0 && (
                  <div className="flex flex-wrap gap-[0.4vw] pt-[0.6vh]">
                    {gone.map((t) => (
                      <span key={t.teamId} className="rounded bg-[#22e584]/10 px-[0.5vw] font-label text-[1.4vh] text-[#22e584]/80">
                        ✓ {t.teamName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="overflow-hidden whitespace-nowrap border-y border-white/10 py-[0.8vh] font-caps text-[1.8vh] uppercase tracking-[0.3em] text-neutral-400">
        <div className="live-marquee inline-block">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              Stay at your table · Your phone rings when your panel calls you · Keep your rebuild running and your deck open · {s.slotMin} minutes: Killer Tests, pitch, defence · Scores lock at 2:15 ·{' '}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Call-ups ─────────────────────────────────────────────────────────── */

/** Every newly called team, shown one after another (calls older than 20 s on load are skipped). */
function useCalls(s: JudgingState, active: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<Array<{ key: string; slot: Slot }>>([]);
  useEffect(() => {
    const called = s.slots.filter((x) => x.state === 'called' && x.calledAt);
    if (!seen.current) {
      seen.current = new Set(called.filter((x) => s.now - (x.calledAt ?? 0) > 20_000).map((x) => `${x.teamId}:${x.calledAt}`));
    }
    const fresh = called.filter((x) => !seen.current!.has(`${x.teamId}:${x.calledAt}`));
    if (!fresh.length) return;
    fresh.forEach((x) => seen.current!.add(`${x.teamId}:${x.calledAt}`));
    if (active) setQueue((q) => [...q, ...fresh.map((x) => ({ key: `${x.teamId}:${x.calledAt}`, slot: x }))]);
  }, [s.slots, s.now, active]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    sfx.siren();
    setTimeout(() => sfx.slam(), 500);
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 5200);
    return () => clearTimeout(t);
  }, [current]);
  return { current };
}

function CallUp({ slot, panel }: { slot: Slot; panel: PanelInfo }) {
  const c = suitColor(panel.suit);
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050506]/95 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }} transition={{ duration: 0.35 }}>
      <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${c}55, #050506 70%)` }} animate={{ opacity: [0.4, 1, 0.6, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
      <div className="live-hazard absolute inset-x-0 top-0 h-[3vh]" />
      <div className="live-hazard absolute inset-x-0 bottom-0 h-[3vh]" />
      <motion.div
        className="relative font-poster leading-none"
        style={{ fontSize: '30vh', color: c, textShadow: `0 0 100px ${c}` }}
        initial={{ rotateY: 720, scale: 0.1 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {panel.suit}
      </motion.div>
      <motion.div initial={{ letterSpacing: '2em', opacity: 0 }} animate={{ letterSpacing: '0.7em', opacity: 1 }} transition={{ delay: 0.3 }} className="relative font-caps text-[3vh] uppercase text-neutral-200">
        Now calling
      </motion.div>
      <motion.div
        initial={{ scale: 4, opacity: 0, filter: 'blur(20px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 14 }}
        className="relative max-w-[90vw] font-poster text-[14vh] uppercase leading-[0.95] text-white"
      >
        <span className="live-glitch inline-block">{slot.teamName}</span>
      </motion.div>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="relative mt-[2vh] font-poster text-[5vh] uppercase" style={{ color: c }}>
        → {panel.name}
        {panel.place && <span className="text-white"> · {panel.place}</span>}
      </motion.div>
      <Shockwave k={slot.teamId + (slot.calledAt ?? 0)} color={c} />
    </motion.div>
  );
}

/* ── Done ─────────────────────────────────────────────────────────────── */

function Done({ s }: { s: JudgingState }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[3vh] text-center">
      <SlamTitle className="font-poster text-[16vh] uppercase leading-[0.85] text-[#facc15]">That&apos;s a wrap</SlamTitle>
      <p className="font-label text-[3vh] text-neutral-300">
        {s.slots.length} teams judged across {s.panels.length} panels. Scores lock at 2:15. The Final Duel is next.
      </p>
      <Confetti fire="done" />
    </div>
  );
}
