'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CLUE_SECS, RIDDLE_POINTS, clueAt, type GameState, type HandCard, type PublicQuestion } from '@/lib/live/types';
import { sfx } from '@/utils/liveSound';
import { DealtCard } from './cards';
import { CountdownRing, Rolling } from './fx';

/**
 * The Riddle Deck: one track at a time. Every team holds the same hand; the riddle
 * comes out one clue at a time; play the matching card. Wrong cards burn.
 */

const RED = new Set(['♥', '♦']);

/** How many clues are due by now (the screen's own clock; teams get them from the server). */
export function cluesDue(q: PublicQuestion, openAt: number, now: number) {
  const total = q.clueTotal ?? q.clues?.length ?? 0;
  if (now < openAt) return 0;
  return Math.min(total, Math.floor((now - openAt) / ((q.clueSecs ?? CLUE_SECS) * 1000)) + 1);
}

/* ── A card in the hand ──────────────────────────────────────────────── */

export function HandTile({
  c,
  state,
  selected,
  onClick,
  width,
}: {
  c: HandCard;
  /** gone: won on an earlier riddle · burned: we played it wrong · win: the answer, at the reveal */
  state?: 'gone' | 'burned' | 'win';
  selected?: boolean;
  onClick?: () => void;
  width?: number;
}) {
  const red = RED.has(c.suit);
  const out = state === 'gone' || state === 'burned';
  return (
    <motion.button
      type="button"
      layout
      disabled={!onClick || out}
      onClick={onClick}
      whileTap={onClick && !out ? { scale: 0.94 } : undefined}
      animate={{ y: selected ? -10 : 0, rotate: selected ? -2 : 0, opacity: out ? 0.28 : 1, filter: out ? 'grayscale(1)' : 'grayscale(0)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative flex aspect-square flex-col md:aspect-[5/6] items-center justify-center overflow-hidden rounded-[10%/8%] text-center"
      style={{
        width,
        background: 'linear-gradient(160deg,#fbf6ea,#e8dcc2)',
        boxShadow: selected
          ? '0 0 0 3px #ff3b3b, 0 0 30px rgba(255,59,59,.8)'
          : state === 'win'
            ? '0 0 0 3px #22e584, 0 0 30px rgba(34,229,132,.8)'
            : '0 8px 20px -8px rgba(0,0,0,.8)',
        containerType: 'inline-size',
      }}
    >
      <span className={`absolute left-[7%] top-[4%] leading-none ${red ? 'text-[#b3202a]' : 'text-[#1b1714]'}`} style={{ fontSize: '15cqw' }}>
        {c.suit}
      </span>
      <span className={`absolute bottom-[4%] right-[7%] rotate-180 leading-none ${red ? 'text-[#b3202a]' : 'text-[#1b1714]'}`} style={{ fontSize: '15cqw' }}>
        {c.suit}
      </span>
      <span className="leading-none" style={{ fontSize: '27cqw' }}>
        {c.icon}
      </span>
      <span className="mt-[6%] break-words px-[6%] font-label font-extrabold leading-[1.05] text-[#1b1714]" style={{ fontSize: c.name.length > 13 ? '9cqw' : c.name.length > 10 ? '11cqw' : '13cqw' }}>
        {c.name}
      </span>
      {state === 'burned' && (
        <span className="absolute inset-0 flex items-start justify-end bg-[#ff3b3b]/25 p-[6%]" style={{ fontSize: '22cqw' }}>
          🔥
        </span>
      )}
      {state === 'gone' && (
        <span className="absolute rotate-[-14deg] rounded border-2 border-[#1b1714] px-[4%] font-poster uppercase text-[#1b1714]" style={{ fontSize: '13cqw' }}>
          Won
        </span>
      )}
    </motion.button>
  );
}

/* ── The clues ───────────────────────────────────────────────────────── */

function Clues({ clues, total, due, openAt, now, clueSecs, big }: { clues: string[]; total: number; due: number; openAt: number; now: number; clueSecs: number; big?: boolean }) {
  return (
    <div className={big ? 'space-y-[1.4vh]' : 'space-y-2'}>
      {Array.from({ length: total }).map((_, i) => {
        const text = i < due ? clues[i] : undefined;
        const latest = i === due - 1 && i === clues.length - 1;
        const nextIn = Math.max(0, Math.ceil((openAt + i * clueSecs * 1000 - now) / 1000));
        return (
          <motion.div
            key={i}
            layout
            initial={false}
            animate={text ? { opacity: 1, scale: 1 } : { opacity: 0.55, scale: 0.98 }}
            className={`flex items-start rounded-xl border ${big ? 'gap-[1vw] px-[1.2vw] py-[1.4vh]' : 'gap-2 px-3 py-2'} ${
              text ? (latest ? 'border-[#ff3b3b] bg-[#ff3b3b]/10 shadow-[0_0_30px_rgba(255,59,59,.25)]' : 'border-white/15 bg-black/50') : 'border-dashed border-white/15 bg-black/30'
            }`}
          >
            <span className={`shrink-0 rounded-md text-center font-poster leading-none ${big ? 'w-[4.6vw] py-[0.8vh] text-[3vh]' : 'w-12 py-1 text-base'} ${text ? 'bg-[#f2e9d8] text-black' : 'bg-white/10 text-neutral-500'}`}>
              {RIDDLE_POINTS[i] ?? ''}
            </span>
            {text ? (
              <motion.span
                key={text}
                initial={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.5 }}
                className={`font-label font-bold leading-snug text-white ${big ? 'text-[3.1vh]' : 'text-[15px] md:text-lg'}`}
              >
                {text}
              </motion.span>
            ) : (
              <span className={`font-label italic text-neutral-500 ${big ? 'text-[2.6vh]' : 'text-sm'}`}>
                🔒 Clue {i + 1} {i < due ? 'is coming…' : `in ${nextIn}s`}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── The big screen ──────────────────────────────────────────────────── */

export function RiddleStage({ s, now, vh, reveal }: { s: GameState; now: number; vh: number; reveal?: boolean }) {
  const q = s.question!;
  const hand = q.hand ?? [];
  const r = reveal ? s.reveal : undefined;
  const openAt = s.openAt ?? 0;
  const total = q.clueTotal ?? 0;
  const due = reveal ? total : cluesDue(q, openAt, now);
  const answer = r?.correct[0];
  const ans = answer !== undefined ? hand[answer] : undefined;
  const gone = new Set(q.gone ?? []);
  const locked = new Set(s.locked ?? []);
  const rows = new Map((s.detBoard ?? []).map((x) => [x.teamId, x]));
  const worth = RIDDLE_POINTS[clueAt(Math.max(0, now - openAt), total, q.clueSecs)];

  // A whoosh for every new clue, a click for every card played.
  const lastDue = useRef(due);
  useEffect(() => {
    if (!reveal && due > lastDue.current) sfx.whoosh();
    lastDue.current = due;
  }, [due, reveal]);
  const lastLocked = useRef(locked.size);
  useEffect(() => {
    if (!reveal && locked.size > lastLocked.current) sfx.lock();
    lastLocked.current = locked.size;
  }, [locked.size, reveal]);

  const n = Math.max(1, s.roster.length);
  const vw = typeof window === 'undefined' ? vh * 1.78 : window.innerWidth;
  const seatW = Math.floor(Math.min(vh * 0.13, (vw * 0.86) / n - vw * 0.012));
  const tileW = Math.floor(Math.min(vh * 0.12, (vw * 0.9) / Math.max(1, hand.length) - 10));

  return (
    <div className="mt-[1.5vh] flex flex-1 flex-col gap-[1.6vh]">
      <div className="flex gap-[2vw]">
        {/* the mystery card */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="mb-[1vh] font-caps text-[1.6vh] uppercase tracking-[0.4em] text-neutral-400">
            {q.title} of {s.total}
          </div>
          <motion.div
            animate={reveal ? { scale: [1, 1.12, 1] } : { rotate: [-1.5, 1.5, -1.5] }}
            transition={reveal ? { duration: 0.6, delay: 0.3 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: reveal ? 'drop-shadow(0 0 40px rgba(34,229,132,.6))' : 'drop-shadow(0 0 40px rgba(255,59,59,.45))' }}
          >
            <DealtCard faceUp={!!ans} suit={ans?.suit ?? '♦'} title={ans?.name} icon={ans?.icon} width={Math.round(vh * 0.24)} tone={ans ? 'right' : undefined} />
          </motion.div>
        </div>

        {/* the clues */}
        <div className="min-w-0 flex-1">
          <h2 className="mb-[1.4vh] font-label text-[3.4vh] font-bold leading-tight text-white">{reveal && ans ? `It was ${ans.name}.` : 'Which card is it?'}</h2>
          <Clues clues={q.clues ?? []} total={total} due={due} openAt={openAt} now={now} clueSecs={q.clueSecs ?? CLUE_SECS} big />
          {reveal && r?.explain && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-[1.4vh] rounded-xl border-l-4 border-[#22e584] bg-black/60 px-[1.2vw] py-[1.2vh] font-label text-[2.3vh] text-neutral-200">
              {r.explain}
            </motion.div>
          )}
        </div>

        {/* the clock */}
        <div className="flex w-[15vw] shrink-0 flex-col items-center gap-[1.4vh]">
          {!reveal ? (
            <>
              <CountdownRing start={openAt} end={s.closeAt!} now={now} size={Math.round(vh * 0.17)} />
              <div className="text-center">
                <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-neutral-400">Worth now</div>
                <AnimatePresence mode="popLayout">
                  <motion.div key={worth} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poster text-[7vh] leading-none text-[#facc15]">
                    {worth}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="text-center font-poster text-[4vh] leading-none text-[#f2e9d8]">
                <Rolling value={locked.size} duration={0.4} />
                <span className="text-[2.4vh] text-neutral-500"> / {s.roster.length} played</span>
              </div>
            </>
          ) : (
            r?.firstBlood && (
              <motion.div initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 1.6, type: 'spring' }} className="w-full rounded-2xl border border-[#facc15]/60 bg-[#facc15]/10 p-[1.4vh] text-center">
                <div className="font-caps text-[1.4vh] uppercase tracking-[0.35em] text-[#facc15]">⚡ First blood</div>
                <div className="mt-1 font-poster text-[3.2vh] leading-none text-white">{s.roster.find((t) => t.teamId === r.firstBlood)?.teamName}</div>
                <div className="font-label text-[1.8vh] text-neutral-300">+50 bonus</div>
              </motion.div>
            )
          )}
        </div>
      </div>

      {/* the table: one seat per team */}
      <div
        className="flex flex-wrap items-end justify-center gap-[1.2vw] rounded-[3vh] border border-[#facc15]/20 px-[2vw] py-[1.6vh]"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(110,16,24,.55), rgba(20,4,8,.85) 75%)', boxShadow: 'inset 0 0 60px rgba(0,0,0,.8)' }}
      >
        {s.roster.map((t, i) => {
          const played = r?.plays?.[t.teamId];
          const card = played !== undefined ? hand[played] : undefined;
          const ok = r && played !== undefined && played === answer;
          const row = rows.get(t.teamId);
          const has = reveal ? played !== undefined : locked.has(t.teamId);
          return (
            <div key={t.teamId} className="flex flex-col items-center gap-[0.6vh]" style={{ width: seatW }}>
              <div className="relative" style={{ width: seatW, height: seatW * 1.4 }}>
                <div className="absolute inset-0 rounded-[10%/7%] border-2 border-dashed border-white/15" />
                <AnimatePresence>
                  {has && (
                    <motion.div
                      className="absolute inset-0"
                      initial={{ y: -vh * 0.4, rotate: (i % 5) * 12 - 24, opacity: 0, scale: 1.3 }}
                      animate={{ y: 0, rotate: 0, opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 160, damping: 15 }}
                    >
                      <DealtCard faceUp={!!card} suit={card?.suit ?? '♠'} title={card?.name} icon={card?.icon} width={seatW} tone={card ? (ok ? 'right' : 'wrong') : undefined} delay={reveal ? 0.4 + i * 0.12 : 0} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {reveal && card && !ok && (
                  <motion.div initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + i * 0.12 }} className="absolute -right-[1vh] -top-[1.6vh] text-[4.4vh]">
                    🔥
                  </motion.div>
                )}
              </div>
              <div className="w-full truncate text-center font-label text-[1.7vh] font-bold text-white">{t.teamName}</div>
              {reveal && row && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 + i * 0.12 }} className={`font-poster text-[2.4vh] leading-none ${row.delta > 0 ? 'text-[#22e584]' : 'text-neutral-500'}`}>
                  {row.delta > 0 ? `+${row.delta}` : card ? 'burned' : '—'}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* the hand everyone holds */}
      <div className="flex items-center justify-center gap-[0.6vw]">
        <span className="mr-[0.8vw] font-caps text-[1.4vh] uppercase tracking-[0.35em] text-neutral-500">The hand</span>
        {hand.map((c, i) => (
          <HandTile key={c.name} c={c} width={tileW} state={i === answer ? 'win' : gone.has(i) ? 'gone' : undefined} />
        ))}
      </div>
    </div>
  );
}

/* ── The phone ───────────────────────────────────────────────────────── */

export function RiddlePlay({
  q,
  now,
  openAt,
  burned,
  onPlay,
}: {
  q: PublicQuestion;
  now: number;
  openAt: number;
  burned: number[];
  onPlay: (i: number) => void;
}) {
  const [pick, setPick] = useState<number | null>(null);
  const hand = q.hand ?? [];
  const total = q.clueTotal ?? 0;
  const due = cluesDue(q, openAt, now);
  const worth = RIDDLE_POINTS[clueAt(Math.max(0, now - openAt), total, q.clueSecs)];
  const gone = new Set(q.gone ?? []);
  const burnt = new Set(burned);
  const usable = (i: number) => !gone.has(i) && !burnt.has(i);

  const lastDue = useRef(due);
  useEffect(() => {
    if ((q.clues?.length ?? 0) > 0 && due > lastDue.current) {
      try {
        navigator.vibrate?.(40);
      } catch {
        /* no vibration */
      }
    }
    lastDue.current = due;
  }, [due, q.clues?.length]);

  // Laptops: Enter plays the picked card.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e) => {
    if (e.key === 'Enter' && pick !== null) onPlay(pick);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-caps text-[11px] uppercase tracking-[0.3em] text-neutral-400">{q.title}</span>
        <span className="rounded-full bg-[#facc15] px-3 py-0.5 font-poster text-lg text-black">Worth {worth}</span>
      </div>
      <Clues clues={q.clues ?? []} total={total} due={due} openAt={openAt} now={now} clueSecs={q.clueSecs ?? CLUE_SECS} />
      <div className="mt-1 font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">Your hand · tap a card</div>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
        {hand.map((c, i) => (
          <HandTile
            key={c.name}
            c={c}
            state={gone.has(i) ? 'gone' : burnt.has(i) ? 'burned' : undefined}
            selected={pick === i}
            onClick={
              usable(i)
                ? () => {
                    setPick(i);
                    sfx.tick();
                  }
                : undefined
            }
          />
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={pick === null}
        onClick={() => pick !== null && onPlay(pick)}
        className="sticky bottom-3 mt-1 rounded-2xl bg-[#b3202a] py-4 font-poster text-3xl uppercase text-white shadow-[0_0_30px_rgba(255,59,59,.5)] disabled:opacity-30"
      >
        {pick === null ? 'Pick a card' : `Play ${hand[pick]?.name}`}
        <span className="block font-label text-xs normal-case opacity-70">One card per riddle. A wrong card burns.</span>
      </motion.button>
    </div>
  );
}

/** The phone after a card is played: it flies to the table. */
export function RiddlePlayed({ c, ms, clueSecs, total }: { c?: HandCard; ms: number; clueSecs?: number; total: number }) {
  const at = clueAt(ms, total, clueSecs);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <motion.div initial={{ y: 200, scale: 1.4, rotate: 10 }} animate={{ y: 0, scale: 1, rotate: -4 }} transition={{ type: 'spring', stiffness: 140, damping: 13 }}>
        <DealtCard faceUp suit={c?.suit ?? '♠'} title={c?.name} icon={c?.icon} width={150} />
      </motion.div>
      <div className="font-poster text-5xl uppercase leading-none text-[#f2e9d8]">Played</div>
      <div className="font-label text-neutral-300">
        On clue {at + 1} · <b className="text-[#facc15]">{RIDDLE_POINTS[at]}</b> if it&apos;s right · ⚡ {(ms / 1000).toFixed(1)}s
      </div>
      <p className="font-label text-sm text-neutral-500">Eyes on the big screen.</p>
    </div>
  );
}
