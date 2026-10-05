'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CARD_BY_CODE, TRACK_ORDER, type TrackId } from '@/lib/cardDrop/cards';
import type { DetBoardRow, GameState } from '@/lib/live/types';
import { CardFace } from '@/components/carddrop/PlayingCard';
import { sfx } from '@/utils/liveSound';
import { FaultyTerminal } from './Shaders';
import { clockReady } from './clock';
import { CardWall, DealAnimation, DealtCard, OrderShow, SortShow } from './cards';
import { CodeText, Confetti, CountdownRing, OPTS, Rolling, Shockwave, SlamTitle, SuitWars, suitOf } from './fx';

/**
 * Code Detective on the projector. The Game Master presses Space to move on;
 * a question reveals itself when the time runs out or every team has locked in.
 */

const SITE = 'dbuglabshackback.vercel.app';

/** Window height in px (after mount; a safe default while rendering on the server). */
export function useVh() {
  const [vh, setVh] = useState(900);
  useEffect(() => {
    const f = () => setVh(window.innerHeight);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return vh;
}

export function DetectiveScreen({ s, now, act }: { s: GameState; now: number; act: (action: string) => void }) {
  const phase = s.phase ?? 'lobby';
  const q = s.question;
  const round = q ? s.rounds?.[q.round] : undefined;
  const glitch = phase === 'intro' ? 2.4 : phase === 'reveal' ? 1.8 : 1;

  // Sounds on every phase change.
  const key = `${phase}:${s.qi}`;
  const lastKey = useRef('');
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (phase === 'intro') sfx.slam();
    else if (phase === 'wager') sfx.siren();
    else if (phase === 'reveal') sfx.boom();
    else if (phase === 'board') sfx.whoosh();
    else if (phase === 'final') sfx.fanfare();
  }, [key, phase]);

  // Auto-reveal: time is up, or every team in the room has locked in.
  const fired = useRef('');
  const everyone = s.locked && s.locked.length >= Math.max(1, s.joined.length || s.roster.length);
  useEffect(() => {
    if (phase !== 'question' || !s.closeAt || !clockReady()) return;
    const timeUp = now > s.closeAt + 600;
    const allIn = everyone && now > (s.openAt ?? 0) + 1500;
    if ((timeUp || allIn) && fired.current !== key) {
      fired.current = key;
      act('next');
    }
  }, [phase, now, s.closeAt, s.openAt, everyone, key, act]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050506] text-[#ededed]">
      <FaultyTerminal tint={phase === 'final' ? '#facc15' : '#ff3b3b'} brightness={phase === 'question' ? 0.32 : 0.55} glitch={glitch} />
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.25), rgba(0,0,0,.88) 85%)' }} />
      <div className="live-scanline pointer-events-none fixed inset-0" />

      <div className="relative z-10 flex min-h-screen flex-col px-[3vw] py-[2.5vh]">
        <Header s={s} round={round?.title} />
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            className="flex flex-1 flex-col"
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
            transition={{ duration: 0.45 }}
          >
            {phase === 'lobby' && <Lobby s={s} />}
            {phase === 'intro' && round && <Intro s={s} />}
            {phase === 'wager' && <Wager s={s} now={now} />}
            {phase === 'question' && <Question s={s} now={now} />}
            {phase === 'reveal' && <Reveal s={s} />}
            {phase === 'board' && <Board s={s} />}
            {phase === 'final' && <Final s={s} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {phase === 'intro' && <Shockwave k={key} />}
    </div>
  );
}

function Header({ s, round }: { s: GameState; round?: string }) {
  return (
    <div className="flex items-center justify-between font-caps text-[1.6vh] uppercase tracking-[0.4em] text-neutral-400">
      <span>
        <span className="text-[#ff4a4a]">♠</span> Code Detective · {s.group}
      </span>
      <span>
        {s.phase !== 'lobby' && s.phase !== 'final' && s.qi !== undefined && s.qi >= 0 ? `${round ?? ''} · Q ${s.qi + 1} / ${s.total}` : 'dBug Labs · Hackback'}
      </span>
    </div>
  );
}

/* ── Lobby ────────────────────────────────────────────────────────────── */

function Lobby({ s }: { s: GameState }) {
  const joined = new Set(s.joined);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[3vh] text-center">
      <SlamTitle className="font-poster text-[15vh] uppercase leading-[0.85] text-[#f2e9d8]">
        Code <span className="text-[#ff3b3b]">Detective</span>
      </SlamTitle>
      <p className="max-w-[70vw] font-label text-[2.4vh] text-neutral-300">
        Open your <b className="text-white">team link</b> from the email on one phone (or all of them) → <b className="text-[#ff6b6b]">Play live</b>. Fast and right wins. Wrong costs you.
      </p>
      <div className="font-mono text-[2vh] text-neutral-500">{SITE}/r/&lt;team-id&gt;?t=… → Play live</div>
      <div className="flex flex-wrap justify-center gap-[0.8vh] px-[4vw]">
        {s.roster.map((t, i) => {
          const on = joined.has(t.teamId);
          const su = suitOf(t.track);
          return (
            <motion.div
              key={t.teamId}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: on ? 1 : 0.92, rotateX: on ? 0 : 0 }}
              transition={{ delay: i * 0.02 }}
              className={`rounded-lg border px-[1.1vh] py-[0.6vh] font-label text-[1.7vh] font-bold transition-all duration-500 ${
                on ? 'border-[#ff3b3b] bg-[#b3202a]/40 text-white shadow-[0_0_24px_rgba(255,59,59,.55)]' : 'border-white/10 bg-black/40 text-neutral-600'
              }`}
            >
              <span className={su.red ? 'text-[#ff6b6b]' : 'text-[#f2e9d8]'}>{su.suit}</span> {t.teamName}
            </motion.div>
          );
        })}
      </div>
      <div className="font-poster text-[5vh] text-[#f2e9d8]">
        <Rolling value={s.joined.length} /> <span className="text-neutral-600">/ {s.roster.length} teams in</span>
      </div>
      <p className="font-caps text-[1.5vh] uppercase tracking-[0.4em] text-neutral-500">Press space to begin</p>
    </div>
  );
}

/* ── Round intro ──────────────────────────────────────────────────────── */

function Intro({ s }: { s: GameState }) {
  const q = s.question!;
  const round = s.rounds![q.round];
  const red = round.suit === '♥' || round.suit === '♦';
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        className={`font-poster leading-none ${red ? 'text-[#ff3b3b]' : 'text-[#f2e9d8]'}`}
        style={{ fontSize: '34vh', textShadow: red ? '0 0 80px rgba(255,59,59,.8)' : '0 0 80px rgba(242,233,216,.5)' }}
        initial={{ rotateY: 540, scale: 0.2, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {round.suit}
      </motion.div>
      <motion.div initial={{ letterSpacing: '1em', opacity: 0 }} animate={{ letterSpacing: '0.5em', opacity: 1 }} transition={{ delay: 0.5 }} className="font-caps text-[2.6vh] uppercase text-neutral-400">
        Round {q.round + 1} of {s.rounds!.length}
      </motion.div>
      <SlamTitle className="mt-[1vh] font-poster text-[13vh] uppercase leading-[0.9] text-[#f2e9d8]">{round.title}</SlamTitle>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-[2vh] font-label text-[3vh] text-neutral-300">
        {round.subtitle}
      </motion.p>
      {q.allIn && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-[2vh] max-w-[60vw] font-label text-[2.3vh] text-[#ffb4b4]">
          Bet 0%, 25%, 50% or ALL of your points. Right: you win the bet. Wrong: you lose it.
        </motion.p>
      )}
    </div>
  );
}

/* ── Wager ────────────────────────────────────────────────────────────── */

function Wager({ s, now }: { s: GameState; now: number }) {
  const bets = s.wagers ?? {};
  const allIn = s.roster.filter((t) => bets[t.teamId] === 100);
  const placed = Object.keys(bets).length;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[3vh] text-center">
      <SlamTitle className="font-poster text-[12vh] uppercase leading-none text-[#ff3b3b]">Place your bets</SlamTitle>
      <CountdownRing start={s.openAt!} end={s.closeAt!} now={now} size={180} />
      <div className="font-poster text-[4.5vh] text-[#f2e9d8]">
        <Rolling value={placed} /> <span className="text-neutral-500">bets placed</span>
      </div>
      <div className="min-h-[14vh]">
        <div className="mb-[1vh] font-caps text-[1.8vh] uppercase tracking-[0.4em] text-[#ff6b6b]">💀 All in</div>
        <div className="flex max-w-[80vw] flex-wrap justify-center gap-2">
          <AnimatePresence>
            {allIn.map((t) => (
              <motion.span
                key={t.teamId}
                initial={{ y: -200, rotate: -30, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="rounded-full border-2 border-dashed border-[#facc15] bg-[#b3202a] px-4 py-2 font-poster text-[2.6vh] text-white shadow-[0_0_30px_rgba(255,59,59,.7)]"
              >
                {t.teamName}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── Question ─────────────────────────────────────────────────────────── */

function Question({ s, now }: { s: GameState; now: number }) {
  const vh = useVh();
  const q = s.question!;
  const openAt = s.openAt ?? 0;
  const pre = now < openAt;
  const n = Math.ceil((openAt - now) / 1000);

  const lastBeep = useRef(-1);
  useEffect(() => {
    if (pre && n !== lastBeep.current && n >= 1 && n <= 3) {
      lastBeep.current = n;
      sfx.count(false);
    }
    if (!pre && lastBeep.current !== 0) {
      lastBeep.current = 0;
      sfx.count(true);
    }
  }, [pre, n]);
  const left = Math.ceil(((s.closeAt ?? 0) - now) / 1000);
  const lastTick = useRef(-1);
  useEffect(() => {
    if (!pre && left <= 5 && left >= 1 && left !== lastTick.current) {
      lastTick.current = left;
      sfx.tick();
    }
  }, [pre, left]);

  const lastDeal = useRef(false);
  useEffect(() => {
    if (pre && !lastDeal.current) {
      lastDeal.current = true;
      sfx.whoosh();
    }
  }, [pre]);

  if (pre) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="font-caps text-[2.4vh] uppercase tracking-[0.5em] text-neutral-400">
          Card {q.qi + 1} · {q.dealt ? 'every team draws a different card' : 'dealing'}
        </div>
        <DealAnimation count={s.roster.length} n={n} />
      </div>
    );
  }

  const locked = new Set(s.locked ?? []);
  return (
    <div className="mt-[2vh] flex flex-1 gap-[2.5vw]">
      <div className="flex min-w-0 flex-1 flex-col">
        {q.allIn && <div className="mb-[1vh] font-caps text-[2vh] uppercase tracking-[0.4em] text-[#facc15]">💀 All In · double or nothing</div>}
        {q.dealt ? (
          <Dealt s={s} vh={vh} />
        ) : (
          <>
            <QHead q={q} suit={s.rounds?.[q.round]?.suit ?? '♠'} />
            {q.code && <CodePanel code={q.code} />}
            {q.kind === 'mcq' && q.options && <Options options={q.options} />}
            {q.kind === 'order' && q.items && <OrderShow items={q.items} />}
            {q.kind === 'sort' && q.items && q.buckets && <SortShow items={q.items} buckets={q.buckets} />}
          </>
        )}
      </div>
      <div className="flex w-[22vw] shrink-0 flex-col items-center gap-[2vh]">
        <CountdownRing start={openAt} end={s.closeAt!} now={now} size={Math.round(vh * 0.2)} />
        <div className="text-center">
          <div className="font-poster text-[6vh] leading-none text-[#f2e9d8]">
            <Rolling value={locked.size} duration={0.4} />
            <span className="text-[3vh] text-neutral-500"> / {s.roster.length}</span>
          </div>
          <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-neutral-400">locked in</div>
        </div>
        {!q.dealt && (
          <div className="flex flex-wrap justify-center gap-[0.4vh]">
            {s.roster.map((t) => (
              <DealtCard key={t.teamId} faceUp={locked.has(t.teamId)} suit={suitOf(t.track).suit === '·' ? '♠' : suitOf(t.track).suit} width={Math.round(vh * 0.032)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QHead({ q, suit }: { q: NonNullable<GameState['question']>; suit: string }) {
  return (
    <div className="flex items-start gap-[1.4vw]">
      <motion.div initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} className="shrink-0">
        <DealtCard faceUp suit={suit} title={q.title} width={Math.round(typeof window === 'undefined' ? 90 : window.innerHeight * 0.1)} />
      </motion.div>
      <motion.h2 initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="font-label text-[3.4vh] font-bold leading-tight text-white">
        {q.prompt}
      </motion.h2>
    </div>
  );
}

/** A question where every team drew its own card: the wall of cards is the show. */
function Dealt({ s, vh, results }: { s: GameState; vh: number; results?: Record<string, number> }) {
  const q = s.question!;
  const n = s.roster.length;
  // The biggest card size that fits every team in the space left of the clock.
  const vw = typeof window === 'undefined' ? vh * 1.78 : window.innerWidth;
  const availW = vw * 0.66;
  const availH = vh * 0.74;
  const gap = vw * 0.01;
  let width = 40;
  for (let cols = 3; cols <= 14; cols++) {
    const rows = Math.ceil(n / cols);
    const w = Math.min((availW - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows / 1.4);
    if (w > width) width = w;
  }
  width = Math.floor(Math.min(width, vh * 0.2));
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="font-label text-[3.4vh] font-bold leading-tight text-white">
        {results ? 'Every card, revealed.' : `${q.prompt}. Check your phones.`}
      </h2>
      <div className="mt-[3vh] flex-1">
        <CardWall roster={s.roster} locked={new Set(s.locked ?? [])} results={results} width={width} />
      </div>
    </div>
  );
}

function CodePanel({ code, correct, counts, scanning, stamp = 'Guilty' }: { code: string[]; correct?: number[]; counts?: number[]; scanning?: boolean; stamp?: string }) {
  const max = Math.max(1, ...(counts ?? [0]));
  const fs = code.length > 10 ? 2.9 : 3.3;
  return (
    <div className="relative mt-[2.2vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0e]/90 p-[2vh] shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)]">
      <div className="mb-[1vh] flex gap-1.5">
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
        ))}
      </div>
      {code.map((line, i) => {
        const guilty = correct?.includes(i);
        const dim = correct && !guilty;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: dim ? 0.35 : 1, x: 0 }}
            transition={{ delay: correct ? 1.1 : i * 0.05 }}
            className="relative flex items-center rounded-md font-mono leading-[1.55]"
            style={{ fontSize: `${fs}vh` }}
          >
            {counts && counts[i] > 0 && (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ background: guilty ? 'rgba(34,229,132,.18)' : 'rgba(255,59,59,.13)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(counts[i] / max) * 100}%` }}
                transition={{ delay: 1.3, duration: 0.8 }}
              />
            )}
            {guilty && (
              <motion.div
                className="absolute inset-0 rounded-md border-2 border-[#ff3b3b]"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 1, scale: 1, boxShadow: ['0 0 0px #ff3b3b', '0 0 40px #ff3b3b', '0 0 14px #ff3b3b'] }}
                transition={{ delay: 1.2, duration: 0.6 }}
              />
            )}
            <span className="relative w-[3.2vw] shrink-0 select-none pr-[1vw] text-right text-neutral-600">{i + 1}</span>
            <span className="relative whitespace-pre">
              <CodeText line={line} />
            </span>
            {counts && counts[i] > 0 && <span className="relative ml-auto pl-4 font-label text-[1.8vh] font-bold text-neutral-300">{counts[i]}</span>}
            {guilty && (
              <motion.span
                initial={{ scale: 4, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: -8, opacity: 1 }}
                transition={{ delay: 1.35, type: 'spring', stiffness: 300, damping: 14 }}
                className="relative ml-4 rounded border-4 border-[#ff3b3b] px-2 font-poster text-[2.6vh] uppercase tracking-widest text-[#ff3b3b]"
              >
                {stamp}
              </motion.span>
            )}
          </motion.div>
        );
      })}
      {scanning && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 h-[6vh]"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,59,59,.55), transparent)', boxShadow: '0 0 40px rgba(255,59,59,.6)' }}
          initial={{ top: '-10%' }}
          animate={{ top: '110%' }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

function Options({ options, correct, counts }: { options: string[]; correct?: number[]; counts?: number[] }) {
  const total = Math.max(1, (counts ?? []).reduce((a, b) => a + b, 0));
  return (
    <div className="mt-[3vh] grid grid-cols-2 gap-[1.6vh]">
      {options.map((o, i) => {
        const ok = correct?.includes(i);
        const off = correct && !ok;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: off ? 0.3 : 1, y: 0, scale: ok ? 1.04 : 1 }}
            transition={{ delay: correct ? 0.6 : 0.15 + i * 0.08 }}
            className="relative flex min-h-[18vh] items-center gap-[1.4vw] overflow-hidden rounded-2xl px-[1.8vw] py-[2vh]"
            style={{ background: `linear-gradient(135deg, ${OPTS[i].color}, ${OPTS[i].dark})`, boxShadow: ok ? `0 0 50px ${OPTS[i].color}` : undefined }}
          >
            {counts && (
              <motion.div className="absolute inset-y-0 left-0 bg-black/30" initial={{ width: 0 }} animate={{ width: `${(counts[i] / total) * 100}%` }} transition={{ delay: 0.8, duration: 0.8 }} />
            )}
            <span className="relative font-poster text-[8vh] leading-none text-white/90">{OPTS[i].suit}</span>
            <span className="relative font-label text-[3.4vh] font-bold leading-tight text-white">{o}</span>
            {counts && <span className="relative ml-auto font-poster text-[4vh] text-white">{counts[i]}</span>}
            {ok && <span className="relative font-poster text-[5vh] text-white">✓</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Reveal ───────────────────────────────────────────────────────────── */

function Reveal({ s }: { s: GameState }) {
  const vh = useVh();
  const q = s.question!;
  const r = s.reveal;
  const [scan, setScan] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setScan(false);
      sfx.correct();
    }, 1150);
    return () => clearTimeout(t);
  }, []);
  if (!r) return null;
  const none = s.roster.length - r.answered;
  return (
    <div className="mt-[2vh] flex flex-1 gap-[2.5vw]">
      <div className="flex min-w-0 flex-1 flex-col">
        {q.dealt ? (
          <Dealt s={s} vh={vh} results={r.perTeam} />
        ) : (
          <>
            <h2 className="font-label text-[3.2vh] font-bold leading-tight text-white">{q.prompt}</h2>
            {q.code && <CodePanel code={q.code} correct={r.correct} counts={r.counts} scanning={scan} stamp={q.stamp} />}
            {q.kind === 'mcq' && q.options && <Options options={q.options} correct={r.correct} counts={r.counts} />}
            {q.kind === 'order' && q.items && <OrderShow items={q.items} correct={r.correct} />}
            {q.kind === 'sort' && q.items && q.buckets && <SortShow items={q.items} buckets={q.buckets} correct={r.correct} />}
          </>
        )}
        {r.explain && !q.dealt && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} className="mt-[2.5vh] rounded-xl border-l-4 border-[#ff3b3b] bg-black/60 px-[1.4vw] py-[1.4vh] font-label text-[2.3vh] text-neutral-200">
            {r.explain}
          </motion.div>
        )}
      </div>
      <div className="flex w-[22vw] shrink-0 flex-col gap-[2vh]">
        <Stat label={q.kind === 'order' || q.kind === 'sort' || q.dealt ? 'Nailed it' : 'Right'} value={r.right} color="#22e584" delay={1.4} />
        <Stat label={q.kind === 'order' || q.kind === 'sort' || q.dealt ? 'Not quite' : 'Wrong'} value={r.wrong} color="#ff4a4a" delay={1.55} />
        {r.answered > 0 && <Stat label="Average accuracy" value={Math.round(r.avgAcc * 100)} color="#facc15" delay={1.62} />}
        <Stat label="No answer" value={none} color="#888" delay={1.7} />
        {r.fastest && (
          <motion.div
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 2.1, type: 'spring' }}
            className="rounded-2xl border border-[#facc15]/60 bg-[#facc15]/10 p-[1.6vh] text-center shadow-[0_0_40px_rgba(250,204,21,.25)]"
          >
            <div className="font-caps text-[1.5vh] uppercase tracking-[0.35em] text-[#facc15]">⚡ Fastest</div>
            <div className="mt-1 font-poster text-[3.6vh] leading-none text-white">{r.fastest.teamName}</div>
            <div className="font-label text-[2vh] text-neutral-300">{(r.fastest.ms / 1000).toFixed(2)}s</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, type: 'spring' }} className="rounded-2xl border border-white/10 bg-black/60 px-[1.4vw] py-[1.2vh]">
      <div className="font-poster text-[6vh] leading-none" style={{ color }}>
        {value}
      </div>
      <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-neutral-400">{label}</div>
    </motion.div>
  );
}

/* ── Leaderboard ──────────────────────────────────────────────────────── */

function trackAvg(rows: DetBoardRow[]) {
  const sum: Partial<Record<TrackId, { t: number; n: number }>> = {};
  rows.forEach((r) => {
    if (!r.track) return;
    sum[r.track] ??= { t: 0, n: 0 };
    sum[r.track]!.t += r.pts;
    sum[r.track]!.n += 1;
  });
  return Object.fromEntries(TRACK_ORDER.map((t) => [t, sum[t] ? sum[t]!.t / sum[t]!.n : 0])) as Record<TrackId, number>;
}

function Board({ s }: { s: GameState }) {
  const rows = s.detBoard ?? [];
  // Start in the old order, then let the rows fly to their new places.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, []);
  const order = settled ? rows : [...rows].sort((a, b) => a.prevRank - b.prevRank);
  const top = order.slice(0, 10);
  const climber = [...rows].sort((a, b) => b.prevRank - b.rank - (a.prevRank - a.rank))[0];
  const fire = rows.filter((r) => r.streak >= 3).sort((a, b) => b.streak - a.streak).slice(0, 4);
  return (
    <div className="mt-[2vh] flex flex-1 gap-[2.5vw]">
      <div className="flex-1">
        <div className="mb-[1.5vh] font-poster text-[6vh] uppercase leading-none text-[#f2e9d8]">Leaderboard</div>
        <LayoutGroup>
          <div className="space-y-[0.9vh]">
            {top.map((r) => (
              <motion.div
                layout
                key={r.teamId}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                className={`flex items-center gap-[1.2vw] rounded-xl border px-[1.2vw] py-[1vh] backdrop-blur ${
                  r.rank === 1 ? 'border-[#facc15]/70 bg-[#facc15]/10' : 'border-white/10 bg-black/60'
                }`}
              >
                <span className="w-[3vw] font-poster text-[4vh] leading-none text-[#f2e9d8]">{settled ? r.rank : r.prevRank}</span>
                <RankMove r={r} show={settled} />
                <span className={`text-[3vh] ${suitOf(r.track).red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}`}>{suitOf(r.track).suit}</span>
                <span className="min-w-0 flex-1 truncate font-label text-[2.8vh] font-bold text-white">{r.teamName}</span>
                {r.streak >= 3 && (
                  <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-[2.6vh]">
                    🔥{r.streak}
                  </motion.span>
                )}
                {settled && r.delta !== 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`font-poster text-[2.6vh] ${r.delta > 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}
                  >
                    {r.delta > 0 ? '+' : ''}
                    {r.delta}
                  </motion.span>
                )}
                <span className="w-[8vw] text-right font-poster text-[3.6vh] text-[#f2e9d8]">
                  <Rolling value={settled ? r.pts : r.pts - r.delta} />
                </span>
              </motion.div>
            ))}
          </div>
        </LayoutGroup>
      </div>
      <div className="flex w-[30vw] shrink-0 flex-col gap-[2vh]">
        <SuitWars values={trackAvg(rows)} label="Suit Wars · average points" />
        {climber && climber.prevRank - climber.rank >= 2 && (
          <motion.div initial={{ x: 300 }} animate={{ x: 0 }} transition={{ delay: 1.2, type: 'spring' }} className="rounded-2xl border border-[#22e584]/50 bg-[#22e584]/10 p-[1.6vh]">
            <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-[#22e584]">🚀 Biggest climb</div>
            <div className="font-poster text-[3.4vh] text-white">
              {climber.teamName} <span className="text-[#22e584]">▲{climber.prevRank - climber.rank}</span>
            </div>
          </motion.div>
        )}
        {fire.length > 0 && (
          <div className="rounded-2xl border border-[#ff8a3d]/50 bg-[#ff8a3d]/10 p-[1.6vh]">
            <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-[#ff8a3d]">🔥 On fire</div>
            {fire.map((r) => (
              <div key={r.teamId} className="font-label text-[2.2vh] font-bold text-white">
                {r.teamName} · {r.streak} in a row
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RankMove({ r, show }: { r: DetBoardRow; show: boolean }) {
  const d = r.prevRank - r.rank;
  if (!show || d === 0) return <span className="w-[2.6vw]" />;
  return (
    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-[2.6vw] font-poster text-[2.2vh] ${d > 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>
      {d > 0 ? `▲${d}` : `▼${-d}`}
    </motion.span>
  );
}

/* ── Final ────────────────────────────────────────────────────────────── */

function Final({ s }: { s: GameState }) {
  const rows = s.detBoard ?? [];
  const results = new Map((s.results ?? []).map((r) => [r.teamId, r.final]));
  const podium = [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights = ['42vh', '56vh', '32vh'];
  const [boom, setBoom] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBoom(Date.now()), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-1 flex-col items-center">
      <SlamTitle className="font-poster text-[9vh] uppercase leading-none text-[#facc15]">Sharpest Eyes</SlamTitle>
      <div className="mt-auto flex items-end gap-[2vw]">
        {podium.map((r, i) => {
          const place = r === rows[0] ? 1 : r === rows[1] ? 2 : 3;
          return (
            <div key={r.teamId} className="flex w-[22vw] flex-col items-center">
              <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + (3 - place) * 0.5 }} className="mb-[1.5vh] text-center">
                {place === 1 && <div className="text-[7vh] leading-none">👑</div>}
                <div className="font-poster text-[4.4vh] leading-none text-white">{r.teamName}</div>
                <div className="font-label text-[2vh] text-neutral-300">
                  {r.pts.toLocaleString('en-IN')} pts · <b className="text-[#facc15]">{results.get(r.teamId) ?? r.cd}/50</b>
                </div>
              </motion.div>
              <motion.div
                className="flex w-full items-start justify-center rounded-t-2xl pt-[2vh] font-poster text-[12vh] leading-none"
                style={{
                  background: place === 1 ? 'linear-gradient(#facc15,#a16207)' : place === 2 ? 'linear-gradient(#e5e7eb,#6b7280)' : 'linear-gradient(#f59e0b,#7c2d12)',
                  color: 'rgba(0,0,0,.55)',
                  boxShadow: place === 1 ? '0 0 80px rgba(250,204,21,.6)' : undefined,
                }}
                initial={{ height: 0 }}
                animate={{ height: heights[i] }}
                transition={{ delay: 0.3 + (3 - place) * 0.5, duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {place}
              </motion.div>
            </div>
          );
        })}
      </div>
      <Confetti fire={boom} />
    </div>
  );
}
