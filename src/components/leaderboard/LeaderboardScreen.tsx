'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { PARTS, type LeaderRow, type LeaderView, type PartKey } from '@/lib/leaderboard/types';

/**
 * The leaderboard on the projector.
 * live:   every team, re-sorting itself as scores land (rows glide to their new place,
 *         totals count up, a +N chip pops on the team that scored).
 * reveal: every card face down; each press flips the next one from last place up, and the
 *         top three get a spotlight of their own.
 */

export type Mode = 'live' | 'reveal';

const RED = new Set(['♥', '♦']);
const PART_COLOR: Record<PartKey, string> = {
  detective: '#e7e2d6',
  docs: '#e0352f',
  docTest: '#ff8a5c',
  judging: '#facc15',
  code: '#22e584',
  trading: '#5cc8ff',
};
const SUITS = ['♠', '♥', '♦', '♣'];

function useCount(to: number, ms = 900) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(a + (to - a) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

function Num({ to, className }: { to: number; className?: string }) {
  const v = useCount(to);
  return <span className={className}>{Number.isInteger(to) ? Math.round(v) : v.toFixed(1)}</span>;
}

export function LeaderboardScreen({ v, mode, revealed, spotlightOn }: { v: LeaderView; mode: Mode; revealed: number; spotlightOn: boolean }) {
  const rows = v.rows;
  const top = Math.max(1, ...rows.map((r) => r.total));
  const prev = useRef(new Map<string, { total: number; rank: number }>());
  const [pops, setPops] = useState<Record<string, { d: number; k: number }>>({});

  // Who scored since the last poll: a +N chip and an arrow for the rank change.
  const moved = useMemo(() => {
    const out: Record<string, number> = {};
    rows.forEach((r) => {
      const p = prev.current.get(r.teamId);
      if (p) out[r.teamId] = p.rank - r.rank;
    });
    return out;
  }, [rows]);
  useEffect(() => {
    const fresh: Record<string, { d: number; k: number }> = {};
    rows.forEach((r) => {
      const p = prev.current.get(r.teamId);
      if (p && r.total > p.total) fresh[r.teamId] = { d: Math.round((r.total - p.total) * 10) / 10, k: Date.now() };
    });
    if (Object.keys(fresh).length) {
      setPops((o) => ({ ...o, ...fresh }));
      setTimeout(() => setPops((o) => Object.fromEntries(Object.entries(o).filter(([id]) => !fresh[id]))), 2600);
    }
    prev.current = new Map(rows.map((r) => [r.teamId, { total: r.total, rank: r.rank }]));
  }, [rows]);

  const half = Math.ceil(rows.length / 2);
  const cols = rows.length > 10 ? [rows.slice(0, half), rows.slice(half)] : [rows];
  // In reveal mode cards open from the bottom: the last `revealed` ranks are face up.
  const shown = (r: LeaderRow) => mode === 'live' || rows.indexOf(r) >= rows.length - revealed;
  const spotlight = spotlightOn && mode === 'reveal' && revealed > 0 && rows.length - revealed < 3 ? rows[rows.length - revealed] : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050506] text-[#f2e9d8]">
      <Backdrop />
      <header className="relative z-10 flex items-end justify-between px-[3vw] pt-[3vh]">
        <div>
          <motion.div initial={{ letterSpacing: '1.4em', opacity: 0 }} animate={{ letterSpacing: '0.5em', opacity: 1 }} transition={{ duration: 1.2 }} className="font-caps text-[1.7vh] uppercase text-[#ff6b6b]">
            HACKBACK · Borderland
          </motion.div>
          <h1 className="font-poster text-[7.5vh] uppercase leading-none tracking-wide">
            The <span className="text-[#e0352f]">Leaderboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-[2vw] pb-[0.6vh]">
          <div className="hidden gap-[1vw] font-label text-[1.4vh] text-neutral-400 xl:flex">
            {PARTS.filter((p) => v.config.include[p.key]).map((p) => (
              <span key={p.key} className="flex items-center gap-1.5">
                <span className="inline-block h-[1vh] w-[1vh] rounded-sm" style={{ background: PART_COLOR[p.key] }} /> {p.short}
              </span>
            ))}
          </div>
          {mode === 'live' ? (
            <span className="flex items-center gap-2 font-caps text-[1.8vh] uppercase tracking-[0.3em] text-[#22e584]">
              <motion.span animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }} className="inline-block h-[1.2vh] w-[1.2vh] rounded-full bg-[#22e584]" />
              Live
            </span>
          ) : (
            <span className="font-caps text-[1.8vh] uppercase tracking-[0.3em] text-[#facc15]">
              Reveal · {revealed}/{rows.length}
            </span>
          )}
        </div>
      </header>

      <LayoutGroup>
        <div className={`relative z-10 grid gap-x-[2vw] px-[3vw] pt-[2.5vh] ${cols.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {cols.map((col, ci) => (
            <div key={ci} className="space-y-[0.9vh]">
              {col.map((r) => (
                <Row key={r.teamId} r={r} top={top} v={v} open={shown(r)} pop={pops[r.teamId]} moved={moved[r.teamId] ?? 0} dense={rows.length > 14} />
              ))}
            </div>
          ))}
        </div>
      </LayoutGroup>

      {!rows.length && <div className="relative z-10 mt-[30vh] text-center font-poster text-[5vh] uppercase text-neutral-600">Scores are on their way</div>}

      <AnimatePresence>{spotlight && <Spotlight key={spotlight.teamId} r={spotlight} />}</AnimatePresence>
    </div>
  );
}

function Row({ r, top, v, open, pop, moved, dense }: { r: LeaderRow; top: number; v: LeaderView; open: boolean; pop?: { d: number; k: number }; moved: number; dense: boolean }) {
  const h = dense ? 'h-[8.2vh]' : 'h-[9.6vh]';
  const medal = r.rank === 1 ? '#facc15' : r.rank === 2 ? '#d7dde4' : r.rank === 3 ? '#e09a5c' : null;
  const parts = PARTS.filter((p) => v.config.include[p.key] && (r.parts[p.key] ?? 0) > 0);
  const mult = v.config.multiplier ? r.mult : 1;
  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 120, damping: 18 }} className={`relative ${h} [perspective:1200px]`}>
      <motion.div
        initial={false}
        animate={{ rotateX: open ? 0 : 180 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative h-full w-full [transform-style:preserve-3d]"
      >
        {/* face up */}
        <div
          className="absolute inset-0 flex items-center gap-[1.2vw] overflow-hidden rounded-[1vh] border px-[1.2vw] [backface-visibility:hidden]"
          style={{
            borderColor: medal ?? 'rgba(255,255,255,0.08)',
            background: medal ? `linear-gradient(90deg, ${medal}22, #0d0d10 55%)` : 'linear-gradient(90deg,#111114,#0b0b0d)',
            boxShadow: medal ? `0 0 3vh ${medal}33` : undefined,
          }}
        >
          <AnimatePresence>
            {pop && (
              <motion.div
                key={pop.k}
                initial={{ opacity: 0.9, scaleX: 0 }}
                animate={{ opacity: 0, scaleX: 1 }}
                transition={{ duration: 1.6 }}
                className="pointer-events-none absolute inset-0 origin-left bg-gradient-to-r from-[#facc15]/40 to-transparent"
              />
            )}
          </AnimatePresence>
          <div className="relative w-[4.2vw] text-center font-poster text-[4.6vh] leading-none" style={{ color: medal ?? '#6b6b70' }}>
            {r.rank}
            {moved !== 0 && (
              <motion.span initial={{ opacity: 0, y: moved > 0 ? 10 : -10 }} animate={{ opacity: 1, y: 0 }} className={`absolute -right-[0.4vw] top-0 text-[1.6vh] ${moved > 0 ? 'text-[#22e584]' : 'text-[#ff6b6b]'}`}>
                {moved > 0 ? '▲' : '▼'}
                {Math.abs(moved)}
              </motion.span>
            )}
          </div>
          <div className={`flex h-[6vh] w-[2.4vw] shrink-0 items-center justify-center rounded-[0.5vh] bg-[#f2e9d8] font-poster text-[2.6vh] ${RED.has(r.suit ?? '') ? 'text-[#b3202a]' : 'text-[#111]'}`}>{r.suit ?? '?'}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-poster text-[3.4vh] uppercase leading-none tracking-wide">{r.teamName}</div>
            <div className="mt-[0.4vh] truncate font-label text-[1.35vh] text-neutral-500">
              {r.teamId}
              {(r.year || r.dept) && <span className="text-neutral-300"> · {[r.year, r.dept].filter(Boolean).join(' · ')}</span>} · {r.cardTitle ?? 'no card'}
              {mult !== 1 && <span className="text-[#facc15]"> · ×{mult.toFixed(1)}</span>}
              {v.config.visas && <span className="text-[#e0352f]"> · {'♥'.repeat(r.visas)}<span className="text-neutral-700">{'♥'.repeat(3 - r.visas)}</span></span>}
            </div>
            <div className="mt-[0.7vh] flex h-[0.8vh] w-full overflow-hidden rounded-full bg-white/5">
              {parts.map((p, i) => (
                <motion.div
                  key={p.key}
                  initial={{ width: 0 }}
                  animate={{ width: `${(((r.parts[p.key] ?? 0) * mult) / top) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 16, delay: i * 0.06 }}
                  style={{ background: PART_COLOR[p.key] }}
                  className="h-full"
                />
              ))}
            </div>
          </div>
          <div className="relative w-[7vw] text-right">
            <Num to={r.total} className="font-poster text-[4.8vh] leading-none" />
            <AnimatePresence>
              {pop && (
                <motion.span
                  key={pop.k}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 1, 0], y: -40, scale: 1.2 }}
                  transition={{ duration: 2.4 }}
                  className="absolute -top-[1vh] right-0 font-poster text-[2.6vh] text-[#facc15]"
                >
                  +{pop.d}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* face down */}
        <div className="absolute inset-0 flex items-center justify-between rounded-[1vh] border border-[#e0352f]/40 bg-[repeating-linear-gradient(45deg,#1a0607_0_1vh,#120304_1vh_2vh)] px-[1.5vw] [backface-visibility:hidden] [transform:rotateX(180deg)]">
          <span className="font-poster text-[4.6vh] text-[#e0352f]/70">{r.rank}</span>
          <span className="font-caps text-[2vh] uppercase tracking-[0.6em] text-[#e0352f]/60">♠ ♥ ♦ ♣</span>
          <span className="font-poster text-[4vh] text-[#e0352f]/50">?</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Spotlight({ r }: { r: LeaderRow }) {
  const medal = r.rank === 1 ? '#facc15' : r.rank === 2 ? '#d7dde4' : '#e09a5c';
  const burst = useMemo(
    () =>
      Array.from({ length: r.rank === 1 ? 64 : 36 }, (_, i) => ({
        s: SUITS[i % 4],
        a: (i / (r.rank === 1 ? 64 : 36)) * Math.PI * 2 + Math.random() * 0.3,
        d: 30 + Math.random() * 45,
        r: Math.random() * 720 - 360,
        z: 2 + Math.random() * 3,
      })),
    [r.rank]
  );
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.6, 1], rotate: 0 }}
        transition={{ duration: 1.2, times: [0, 0.6, 1] }}
        className="pointer-events-none absolute h-[90vh] w-[90vh] rounded-full"
        style={{ background: `radial-gradient(circle, ${medal}55, transparent 60%)` }}
      />
      {burst.map((b, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: `${Math.cos(b.a) * b.d}vw`, y: `${Math.sin(b.a) * b.d}vh`, opacity: 0, rotate: b.r }}
          transition={{ duration: 2.2, delay: 0.5, ease: 'easeOut' }}
          className={`absolute font-poster ${RED.has(b.s) ? 'text-[#e0352f]' : 'text-[#f2e9d8]'}`}
          style={{ fontSize: `${b.z}vh` }}
        >
          {b.s}
        </motion.span>
      ))}
      <div className="relative text-center [perspective:1600px]">
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-caps text-[2.4vh] uppercase tracking-[0.8em]" style={{ color: medal }}>
          {r.rank === 1 ? 'Champions of the Borderland' : r.rank === 2 ? 'Second place' : 'Third place'}
        </motion.div>
        <motion.div
          initial={{ rotateY: 180, scale: 0.4 }}
          animate={{ rotateY: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 60, damping: 12, delay: 0.3 }}
          className="mx-auto mt-[3vh] flex h-[46vh] w-[33vh] flex-col items-center justify-between rounded-[2vh] border-[0.4vh] bg-[#f2e9d8] p-[3vh] text-[#111] [backface-visibility:hidden]"
          style={{ borderColor: medal, boxShadow: `0 0 12vh ${medal}88` }}
        >
          <div className="self-start font-poster text-[6vh] leading-none" style={{ color: RED.has(r.suit ?? '') ? '#b3202a' : '#111' }}>
            {r.rank}
            <div className="text-[4vh]">{r.suit}</div>
          </div>
          <div className="font-poster text-[12vh] leading-none" style={{ color: RED.has(r.suit ?? '') ? '#b3202a' : '#111' }}>
            {r.suit}
          </div>
          <div className="self-end rotate-180 font-poster text-[6vh] leading-none" style={{ color: RED.has(r.suit ?? '') ? '#b3202a' : '#111' }}>
            {r.rank}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 2, filter: 'blur(20px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 1, duration: 0.8 }} className="mt-[3vh] font-poster text-[9vh] uppercase leading-none">
          {r.teamName}
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-[1.5vh] font-label text-[2vh] text-neutral-400">
          {r.teamId} · {[r.year, r.dept].filter(Boolean).join(' · ')}
          {(r.year || r.dept) && ' · '}
          {r.cardTitle}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} className="mt-[1vh] font-poster text-[7vh]" style={{ color: medal }}>
          <Num to={r.total} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function Backdrop() {
  const drift = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ s: SUITS[i % 4], x: Math.random() * 100, d: 18 + Math.random() * 22, z: 3 + Math.random() * 6, delay: -Math.random() * 30 })), []);
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(224,53,47,0.22),transparent_60%)]" />
      <motion.div animate={{ opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity }} className="absolute inset-x-0 bottom-0 h-[40vh] bg-[radial-gradient(ellipse_at_bottom,rgba(250,204,21,0.08),transparent_70%)]" />
      {drift.map((d, i) => (
        <motion.span
          key={i}
          initial={{ y: '110vh' }}
          animate={{ y: '-15vh', rotate: 360 }}
          transition={{ duration: d.d, repeat: Infinity, ease: 'linear', delay: d.delay }}
          className={`absolute font-poster ${RED.has(d.s) ? 'text-[#e0352f]/10' : 'text-white/[0.05]'}`}
          style={{ left: `${d.x}vw`, fontSize: `${d.z}vh` }}
        >
          {d.s}
        </motion.span>
      ))}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.015)_0_1px,transparent_1px_3px)]" />
    </div>
  );
}
