'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CARDS, CARD_BY_CODE, TRACKS, TRACK_ORDER } from '@/lib/cardDrop/cards';
import { shuffleOrder } from '@/lib/cardDrop/draw';
import { PORTAL_BG } from '@/components/portal/theme';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { CardBack, CardFace, FlipCard, viaLabel } from './PlayingCard';
import type { AssignmentDTO } from './types';

/**
 * Projector scenes for the Card Drop. Motion ideas adapted from the
 * Animations library: 3DCarousel (z-depth grid fly-in, slot drum),
 * Cinematic Loader Entrance (split marquee curtain) and
 * RapidLayersAnimation (stacked colour layers sweeping the screen).
 */

const EASE_CURTAIN = [0.76, 0, 0.24, 1] as const;
const pseudo = (i: number, salt = 1) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ── Backdrop: inverted city, red vignette, sweeping lasers ─────────────── */

export function StageBackdrop() {
  const beams = [8, 23, 41, 62, 79, 93];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#050506]">
      <div className="absolute inset-0 bg-cover bg-top opacity-[0.18]" style={{ backgroundImage: `url('${PORTAL_BG}')` }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(179,32,42,.35), transparent 60%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,.85) 100%)' }} />
      {beams.map((left, i) => (
        <motion.div
          key={left}
          className="absolute -top-[20%] h-[140%] w-[2px] origin-top"
          style={{
            left: `${left}%`,
            background: 'linear-gradient(to bottom, transparent, rgba(255,40,40,.9) 45%, rgba(255,40,40,.2) 80%, transparent)',
            boxShadow: '0 0 14px rgba(255,40,40,.8)',
          }}
          animate={{ opacity: [0.08, 0.55, 0.08], rotate: [i % 2 ? 8 : -8, i % 2 ? -6 : 6, i % 2 ? 8 : -8] }}
          transition={{ duration: 5 + i * 1.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 3px)' }}
      />
    </div>
  );
}

/* ── Idle: the twelve cards as a wall, 2×2 track blocks of 3 cards ─────── */

export function CardWall({ cardWidth = 130 }: { cardWidth?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-14 gap-y-5" style={{ perspective: 1600 }}>
      {TRACK_ORDER.map((t, row) => (
        <div key={t} className="flex items-center gap-4">
          <div className="w-36 text-right">
            <div className={`text-3xl leading-none ${TRACKS[t].red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}`}>{TRACKS[t].suit}</div>
            <div className="mt-1 font-poster text-2xl uppercase leading-none text-[#f2e9d8]">{TRACKS[t].label}</div>
            <div className="mt-1 font-caps text-xs uppercase tracking-[0.12em] text-neutral-500">{TRACKS[t].name}</div>
          </div>
          {CARDS.filter((c) => c.track === t).map((c, col) => {
            const i = row * 3 + col;
            return (
              <motion.div
                key={c.code}
                style={{ width: cardWidth }}
                initial={{ rotateY: 180, opacity: 0, y: 40 }}
                animate={{ rotateY: 0, opacity: 1, y: [0, -8, 0] }}
                transition={{
                  rotateY: { type: 'spring', stiffness: 90, damping: 14, delay: 0.3 + i * 0.12 },
                  opacity: { duration: 0.3, delay: 0.3 + i * 0.12 },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 + i * 0.35 },
                }}
                whileHover={{ scale: 1.08, rotateZ: -1.5 }}
              >
                <motion.div
                  className="rounded-md"
                  animate={{ boxShadow: ['0 0 0px rgba(255,40,40,0)', '0 0 34px rgba(255,40,40,.75)', '0 0 0px rgba(255,40,40,0)'] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 5.6, delay: 2.5 + i * 0.16 }}
                >
                  <CardFace card={c} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Intro: split marquee curtain, then rapid colour layers ─────────────── */

export function IntroCurtain({ onCovered, onDone }: { onCovered: () => void; onDone: () => void }) {
  useEffect(() => {
    const a = setTimeout(onCovered, 2900);
    const b = setTimeout(onDone, 4000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [onCovered, onDone]);

  const line = 'THE GAME HAS BEGUN ♠ ゲーム開始 ♦ THE CARD DROP ♣ 今際のハッカソン ♥ ';
  const halves = [
    { top: true, colour: 'text-[#f2e9d8]', from: '0%', to: '-50%' },
    { top: false, colour: 'text-[#ff4a4a]', from: '-50%', to: '0%' },
  ];
  const layers = ['#b3202a', '#f2e9d8', '#1b1714', '#ff2e2e', '#050506'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {halves.map((h) => (
        <motion.div
          key={String(h.top)}
          className={`absolute inset-x-0 flex h-1/2 overflow-hidden bg-[#0a0a0c] ${h.top ? 'top-0 items-end' : 'bottom-0 items-start'}`}
          initial={{ y: h.top ? '-100%' : '100%' }}
          animate={{ y: [h.top ? '-100%' : '100%', '0%', '0%'] }}
          transition={{ duration: 2.2, times: [0, 0.35, 1], ease: EASE_CURTAIN }}
        >
          <motion.div
            className={`whitespace-nowrap font-poster uppercase leading-[0.85] ${h.colour}`}
            style={{ fontSize: '17vh' }}
            initial={{ x: h.from }}
            animate={{ x: h.to }}
            transition={{ duration: 4, ease: 'linear' }}
          >
            {line.repeat(4)}
          </motion.div>
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 bg-[#ff2e2e]"
        style={{ boxShadow: '0 0 30px #ff2e2e, 0 0 80px rgba(255,46,46,.6)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 1] }}
        transition={{ duration: 1.6, delay: 0.5, times: [0, 0.6, 1], ease: EASE_CURTAIN }}
      />
      {layers.map((c, i) => (
        <motion.div
          key={c + i}
          className="absolute inset-0"
          style={{ background: c }}
          initial={{ y: '101%' }}
          animate={{ y: ['101%', '0%', '0%', '-101%'] }}
          transition={{ duration: 1.7, delay: 1.85 + i * 0.09, times: [0, 0.4, 0.62, 1], ease: EASE_CURTAIN }}
        />
      ))}
    </div>
  );
}

/* ── Shuffle: a slot-machine drum of team IDs ───────────────────────────── */

export function ShuffleDrum({ order, seedHash, onDone }: { order: string[]; seedHash?: string; onDone: () => void }) {
  const slots = useMemo(() => {
    const base = order.length ? order : ['DBG-000'];
    const out: string[] = [];
    while (out.length < Math.max(18, base.length)) out.push(...base);
    return out.slice(0, Math.max(18, base.length));
  }, [order]);
  const n = slots.length;
  const itemH = 96;
  const radius = itemH / (2 * Math.tan(Math.PI / n));
  const [landed, setLanded] = useState(false);
  const [scramble, setScramble] = useState(seedHash ?? '');

  useEffect(() => {
    const chars = '0123456789abcdef';
    const iv = setInterval(() => {
      setScramble((s) =>
        (seedHash ?? 'x'.repeat(64))
          .split('')
          .map((ch) => (Math.random() < 0.7 ? chars[Math.floor(Math.random() * 16)] : ch))
          .join('')
      );
    }, 60);
    const land = setTimeout(() => {
      setLanded(true);
      clearInterval(iv);
      setScramble(seedHash ?? '');
      playAccessGranted();
    }, 4100);
    const done = setTimeout(onDone, 5600);
    return () => {
      clearInterval(iv);
      clearTimeout(land);
      clearTimeout(done);
    };
  }, [seedHash, onDone]);

  return (
    <div className="relative z-10 flex h-screen flex-col items-center justify-center">
      <motion.p
        className="font-caps text-sm uppercase tracking-[0.5em] text-[#ff6b6b]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Shuffling the pick order
      </motion.p>
      <div className="relative mt-6 w-[min(760px,88vw)]" style={{ height: itemH * 3.4, perspective: 1100 }}>
        <div className="absolute inset-x-0 top-1/2 z-20 h-[104px] -translate-y-1/2 border-y-2 border-[#ff2e2e]" style={{ boxShadow: '0 0 30px rgba(255,46,46,.55), inset 0 0 40px rgba(255,46,46,.25)' }} />
        <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to bottom, #050506 0%, transparent 32%, transparent 68%, #050506 100%)' }} />
        <motion.div
          className="absolute inset-x-0 top-1/2"
          style={{ transformStyle: 'preserve-3d', height: itemH, marginTop: -itemH / 2 }}
          initial={{ rotateX: 0 }}
          animate={{ rotateX: 360 * 5 }}
          transition={{ duration: 4.1, ease: [0.15, 0.55, 0.12, 1] }}
        >
          {slots.map((id, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center font-poster uppercase text-[#f2e9d8]"
              style={{ fontSize: 76, transform: `rotateX(${(-i * 360) / n}deg) translateZ(${radius}px)`, backfaceVisibility: 'hidden' }}
            >
              {id}
            </div>
          ))}
        </motion.div>
      </div>
      <AnimatePresence>
        {landed && (
          <motion.div
            className="mt-8 font-poster text-5xl uppercase text-[#ff4a4a]"
            initial={{ scale: 3, opacity: 0, filter: 'blur(14px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            Pick #01 · {order[0]}
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-6 max-w-[80vw] break-all text-center font-mono text-xs text-neutral-500">seal {scramble}</p>
    </div>
  );
}

/* ── Order: draft tickets fly in from deep z ────────────────────────────── */

export function OrderGrid({ order, names }: { order: string[]; names: Record<string, string> }) {
  const cols = order.length > 20 ? 5 : order.length > 12 ? 4 : 3;
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 py-10">
      <motion.h2
        className="font-poster text-[9vh] uppercase leading-none text-[#f2e9d8]"
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.02em' }}
        transition={{ duration: 1.1, ease: EASE_CURTAIN }}
      >
        The order is <span className="text-[#ff3b3b]">sealed</span>
      </motion.h2>
      <div className="mt-8 grid w-full max-w-6xl gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, perspective: 1600 }}>
        {order.map((id, i) => (
          <motion.div
            key={id}
            className="paper-card flex items-center gap-3 rounded-xl px-4 py-3"
            initial={{ opacity: 0, z: -2600, rotateY: pseudo(i) > 0.5 ? 100 : -100, x: (pseudo(i, 2) - 0.5) * 900, y: (pseudo(i, 3) - 0.5) * 500 }}
            animate={{ opacity: 1, z: 0, rotateY: 0, x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 15, delay: 0.25 + i * 0.06 }}
          >
            <span className="font-poster text-3xl leading-none text-[var(--card-red)]">{String(i + 1).padStart(2, '0')}</span>
            <span className="min-w-0">
              <span className="block font-poster text-xl leading-none text-[var(--ink)]">{id}</span>
              <span className="block truncate font-label text-xs font-semibold text-[var(--ink)]/60">{names[id]}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Reveal: one pick at a time, the card flies into the board ──────────── */

function Board({ revealed, cap, highlight }: { revealed: AssignmentDTO[]; cap: number; highlight?: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5">
      {TRACK_ORDER.map((t) => (
        <div key={t}>
          <div className="mb-1.5 font-caps text-[11px] uppercase tracking-[0.3em] text-neutral-400">
            <span className={TRACKS[t].red ? 'text-[#ff5a5a]' : 'text-neutral-200'}>{TRACKS[t].suit}</span> {TRACKS[t].label}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CARDS.filter((c) => c.track === t).map((c) => {
              const holders = revealed.filter((a) => a.card === c.code);
              const hot = highlight === c.code;
              return (
                <motion.div
                  key={c.code}
                  className="rounded-xl border p-2"
                  animate={{
                    borderColor: hot ? 'rgba(255,60,60,0.95)' : 'rgba(64,64,64,0.6)',
                    boxShadow: hot ? '0 0 26px rgba(255,40,40,.55)' : '0 0 0 rgba(0,0,0,0)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-9 shrink-0">
                      <CardFace card={c} />
                    </div>
                    <div className="min-w-0 font-poster text-[14px] uppercase leading-tight text-[#f2e9d8]">{c.title}</div>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {Array.from({ length: cap }).map((_, s) => {
                      const a = holders[s];
                      return a ? (
                        <motion.div
                          key={a.teamId}
                          layoutId={`pick-${a.teamId}`}
                          className="rounded-md bg-[var(--paper)] px-2 py-1 font-poster text-sm leading-none text-[var(--ink)]"
                          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                        >
                          {a.teamId}
                        </motion.div>
                      ) : (
                        <div key={`empty-${s}`} className="h-[22px] rounded-md border border-dashed border-neutral-700/70" />
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RevealScene({ picks, idx, cap, total }: { picks: AssignmentDTO[]; idx: number; cap: number; total: number }) {
  const current = picks[idx];
  const [flipped, setFlipped] = useState(false);
  const [stamped, setStamped] = useState(false);

  useEffect(() => {
    setFlipped(false);
    setStamped(false);
    playHudClick();
    const f = setTimeout(() => {
      setFlipped(true);
      playAccessGranted();
    }, 750);
    const s = setTimeout(() => setStamped(true), 1350);
    return () => {
      clearTimeout(f);
      clearTimeout(s);
    };
  }, [current?.teamId]);

  if (!current) return null;
  const card = CARD_BY_CODE[current.card];

  return (
    <LayoutGroup>
      <div className="relative z-10 grid h-screen grid-cols-[1.55fr_1fr] gap-8 px-10 py-8">
        <div className="relative flex flex-col items-center justify-center">
          <div className="absolute left-0 top-0 flex items-baseline gap-3">
            <span className="font-caps text-sm uppercase tracking-[0.4em] text-neutral-500">Pick</span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={current.pick}
                className="font-poster text-7xl leading-none text-[#ff3b3b]"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                {String(current.pick).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
            <span className="font-poster text-3xl text-neutral-600">/ {String(total).padStart(2, '0')}</span>
          </div>

          <AnimatePresence mode="popLayout">
            <motion.div
              key={current.teamId}
              className="mb-6 text-center"
              initial={{ scale: 2.6, opacity: 0, filter: 'blur(16px)', y: -30 }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)', y: 0, x: [0, -10, 10, -5, 5, 0] }}
              exit={{ opacity: 0, y: -40, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 220, damping: 16, x: { delay: 0.25, duration: 0.4 } }}
            >
              <div className="font-poster text-[13vh] uppercase leading-[0.9] text-[#f2e9d8]" style={{ textShadow: '0 0 40px rgba(255,60,60,.35)' }}>
                {current.teamId}
              </div>
              <div className="mt-1 font-label text-2xl font-semibold text-neutral-300">{current.teamName}</div>
            </motion.div>
          </AnimatePresence>

          <div className="relative w-[min(300px,24vw)]">
            <motion.div key={current.teamId} layoutId={`pick-${current.teamId}`} transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
              <motion.div initial={{ y: 420, rotate: -18, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 18 }}>
                <FlipCard code={current.card} flipped={flipped} glow={flipped} />
              </motion.div>
            </motion.div>
            <AnimatePresence>
              {stamped && (
                <motion.div
                  className="absolute -right-24 top-6 rotate-[-14deg] rounded-md border-4 border-[#ff3b3b] px-4 py-1.5 font-poster text-3xl uppercase text-[#ff3b3b]"
                  style={{ textShadow: '0 0 18px rgba(255,59,59,.6)', background: 'rgba(5,5,6,.75)' }}
                  initial={{ scale: 3.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                >
                  {viaLabel(current.via)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {flipped && card && (
              <motion.div
                key={current.teamId}
                className="mt-6 max-w-2xl text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="font-poster text-4xl uppercase leading-none text-[#f2e9d8]">{card.title}</div>
                <div className="mt-2 font-label text-lg text-neutral-300">{card.brief}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Board revealed={picks.slice(0, idx)} cap={cap} highlight={flipped ? current.card : undefined} />
      </div>
    </LayoutGroup>
  );
}

/* ── Final board: everything set, the seal checked in public ────────────── */

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function FinalBoard({
  picks,
  seed,
  seedHash,
  order,
}: {
  picks: AssignmentDTO[];
  seed?: string;
  seedHash?: string;
  order: string[];
}) {
  const [check, setCheck] = useState<{ seal: boolean; order: boolean } | null>(null);
  useEffect(() => {
    if (!seed || !seedHash) return;
    sha256Hex(seed).then((h) => {
      const recomputed = shuffleOrder(seed, order);
      setCheck({ seal: h === seedHash, order: recomputed.join() === order.join() });
    });
  }, [seed, seedHash, order]);

  const title = 'THE GAMES ARE SET';
  const moved = picks.filter((p) => p.movedBy).length;

  return (
    <div className="relative z-10 flex min-h-screen flex-col px-10 py-8">
      <FallingSuits />
      <h2 className="flex flex-wrap justify-center font-poster text-[10vh] uppercase leading-none text-[#f2e9d8]" style={{ perspective: 800 }}>
        {title.split('').map((ch, i) => (
          <motion.span
            key={i}
            className={ch === ' ' ? 'w-[0.3em]' : i > 9 ? 'text-[#ff3b3b]' : undefined}
            initial={{ rotateX: -110, y: -80, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: i * 0.045 }}
          >
            {ch}
          </motion.span>
        ))}
      </h2>

      <div className="mt-6 grid flex-1 grid-cols-4 gap-5">
        {TRACK_ORDER.map((t, ti) => (
          <div key={t} className="flex flex-col gap-3">
            <div className="text-center font-caps text-sm uppercase tracking-[0.35em] text-neutral-400">
              <span className={TRACKS[t].red ? 'text-[#ff5a5a]' : 'text-neutral-100'}>{TRACKS[t].suit}</span> {TRACKS[t].label}
            </div>
            {CARDS.filter((c) => c.track === t).map((c, ci) => (
              <motion.div
                key={c.code}
                className="flex gap-3 rounded-2xl border border-neutral-800 bg-black/50 p-3 backdrop-blur-sm"
                initial={{ opacity: 0, y: 60, rotateX: 40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: 'spring', stiffness: 90, damping: 16, delay: 0.6 + ti * 0.15 + ci * 0.1 }}
              >
                <div className="w-16 shrink-0">
                  <CardFace card={c} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  <div className="truncate font-label text-xs font-bold uppercase tracking-wide text-neutral-400">{c.title}</div>
                  {picks
                    .filter((p) => p.card === c.code)
                    .map((p) => (
                      <div key={p.teamId} className="flex items-baseline gap-2 truncate">
                        <span className="font-poster text-xl leading-none text-[#f2e9d8]">{p.teamId}</span>
                        <span className="truncate font-label text-sm text-neutral-400">{p.teamName}</span>
                      </div>
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      <motion.div
        className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-mono text-xs text-neutral-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <span>seal {seedHash?.slice(0, 16)}…</span>
        <span>seed {seed?.slice(0, 16)}…</span>
        {check && (
          <span className={check.seal && check.order ? 'text-emerald-400' : 'text-[#ff6b6b]'}>
            {check.seal ? '✓ seed matches the seal' : '✗ seed does not match the seal'} ·{' '}
            {check.order ? '✓ order re-computed' : '✗ order differs'}
          </span>
        )}
        {moved > 0 && <span className="text-amber-400">{moved} team(s) moved by a Game Master</span>}
      </motion.div>
    </div>
  );
}

function FallingSuits() {
  const suits = ['♠', '♦', '♣', '♥'];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {Array.from({ length: 34 }).map((_, i) => {
        const s = suits[i % 4];
        const red = s === '♦' || s === '♥';
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: `${pseudo(i, 4) * 100}%`, fontSize: 18 + pseudo(i, 5) * 36, color: red ? 'rgba(255,60,60,.55)' : 'rgba(242,233,216,.35)' }}
            initial={{ y: '-10vh', rotate: 0 }}
            animate={{ y: '110vh', rotate: pseudo(i, 6) > 0.5 ? 360 : -360 }}
            transition={{ duration: 7 + pseudo(i, 7) * 7, repeat: Infinity, ease: 'linear', delay: pseudo(i, 8) * 6 }}
          >
            {s}
          </motion.span>
        );
      })}
    </div>
  );
}

export { CardBack };
