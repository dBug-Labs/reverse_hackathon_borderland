'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fmtClock, type TeamJudging } from '@/lib/judging/types';
import { sfx } from '@/utils/liveSound';

/** A team's panel on its phone, and the full-screen call when the panel calls it. */

const RED = new Set(['♥', '♦']);
const colorOf = (s: string) => (RED.has(s) ? '#ff3b3b' : '#f2e9d8');

const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* no vibration */
  }
};

export function JudgingPhone({ j, big }: { j: TeamJudging; big?: boolean }) {
  const c = colorOf(j.panel.suit);
  const next = j.state === 'waiting' && j.ahead <= 1;

  // A heads-up buzz when we become next in line.
  const wasNext = useRef(next);
  useEffect(() => {
    if (next && !wasNext.current) {
      buzz([200, 100, 200]);
      sfx.rise();
    }
    wasNext.current = next;
  }, [next]);

  if (!big) {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: `${c}66`, background: `${c}14` }}>
        <span className="font-poster text-3xl leading-none" style={{ color: c }}>
          {j.panel.suit}
        </span>
        <span className="min-w-0 flex-1 font-label text-xs text-neutral-300">
          <b className="text-white">{j.panel.name}</b>
          {j.panel.place && ` · ${j.panel.place}`}
          <br />
          {j.state === 'done' ? 'Judged ✓' : j.state === 'called' ? 'Your panel is calling you!' : `Slot ${j.order + 1} of ${j.total} · ~${fmtClock(j.eta)} · ${j.ahead} ahead`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="font-caps text-xs uppercase tracking-[0.4em] text-neutral-400">Final judging · your panel</div>
      <motion.div
        initial={{ rotateY: 540, scale: 0.2 }}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        className="font-poster text-[9rem] leading-none"
        style={{ color: c, textShadow: `0 0 50px ${c}` }}
      >
        {j.panel.suit}
      </motion.div>
      <div className="font-poster text-4xl uppercase leading-none text-[#f2e9d8]">{j.panel.name}</div>
      {j.panel.place && <div className="font-label text-lg text-neutral-200">📍 {j.panel.place}</div>}
      {j.panel.judges && <div className="font-label text-sm text-neutral-500">Judges: {j.panel.judges}</div>}

      {j.state === 'done' ? (
        <div className="mt-2 rounded-2xl border border-[#22e584]/60 bg-[#22e584]/10 px-6 py-4">
          <div className="font-poster text-5xl leading-none text-[#22e584]">Judged ✓</div>
          <div className="mt-1 font-label text-sm text-neutral-300">Well played. Results at 2:30.</div>
        </div>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-6">
            <div>
              <div className="font-poster text-6xl leading-none text-[#f2e9d8]">#{j.order + 1}</div>
              <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">of {j.total}</div>
            </div>
            <div>
              <div className="font-poster text-4xl leading-none text-[#facc15]">~{fmtClock(j.eta)}</div>
              <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">your turn</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(12, j.ahead) }).map((_, i) => (
              <motion.span key={i} className="h-2.5 w-2.5 rounded-full bg-white/30" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }} />
            ))}
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 12px ${c}` }} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={next ? 'next' : 'wait'}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`max-w-xs font-label text-base ${next ? 'live-pulse-red rounded-xl border-2 border-[#facc15] px-4 py-2 font-bold text-[#facc15]' : 'text-neutral-400'}`}
            >
              {next ? 'You’re next! Laptop open, rebuild running, everyone ready.' : `${j.ahead} team${j.ahead === 1 ? '' : 's'} ahead of you. Stay at your table; this phone rings when you’re called.`}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/** Full screen, flashing, buzzing: the panel is calling this team. */
export function JudgingCall({ j }: { j: TeamJudging }) {
  const key = `${j.panel.index}:${j.calledAt}`;
  const [closed, setClosed] = useState('');
  const show = j.state === 'called' && closed !== key;
  useEffect(() => {
    if (!show) return;
    sfx.siren();
    buzz([400, 150, 400, 150, 400]);
    const iv = setInterval(() => buzz([400, 150, 400]), 4000);
    return () => clearInterval(iv);
  }, [show]);
  const c = colorOf(j.panel.suit);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 overflow-hidden bg-[#060608] px-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.2 }}>
          <motion.div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${c}66, #060608 70%)` }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.7, repeat: Infinity }} />
          <div className="live-hazard absolute inset-x-0 top-0 h-5" />
          <div className="live-hazard absolute inset-x-0 bottom-0 h-5" />
          <motion.div initial={{ rotateY: 720, scale: 0 }} animate={{ rotateY: 0, scale: 1 }} transition={{ duration: 0.9 }} className="relative font-poster text-[10rem] leading-none" style={{ color: c, textShadow: `0 0 60px ${c}` }}>
            {j.panel.suit}
          </motion.div>
          <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 12 }} className="relative font-poster text-7xl uppercase leading-none text-white">
            <span className="live-glitch inline-block">You&apos;re up!</span>
          </motion.div>
          <div className="relative font-poster text-3xl uppercase" style={{ color: c }}>
            Go to {j.panel.name}
          </div>
          {j.panel.place && <div className="relative font-label text-xl font-bold text-white">📍 {j.panel.place}</div>}
          <p className="relative font-label text-sm text-neutral-300">Bring the laptop with your rebuild running. {j.slotMin} minutes: Killer Tests, pitch, defence.</p>
          <button onClick={() => setClosed(key)} className="relative mt-4 rounded-2xl bg-white px-8 py-4 font-poster text-2xl uppercase text-black">
            On our way
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
