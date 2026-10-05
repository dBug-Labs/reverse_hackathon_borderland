'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, Reorder, motion, useDragControls } from 'motion/react';
import { GripVertical } from 'lucide-react';
import type { RosterTeam } from '@/lib/live/types';
import { sfx } from '@/utils/liveSound';
import { suitOf } from './fx';

/* ── A playing card that flips ────────────────────────────────────────── */

const RED_SUITS = new Set(['♥', '♦']);

export function DealtCard({
  faceUp,
  suit,
  title,
  sub,
  width = 120,
  tone,
  delay = 0,
}: {
  faceUp: boolean;
  suit: string;
  title?: string;
  sub?: string;
  width?: number;
  /** Result colour shown on the face after a reveal. */
  tone?: 'right' | 'partial' | 'wrong' | 'none';
  delay?: number;
}) {
  const red = RED_SUITS.has(suit);
  const ring =
    tone === 'right' ? '#22e584' : tone === 'partial' ? '#facc15' : tone === 'wrong' ? '#ff3b3b' : tone === 'none' ? '#555' : undefined;
  return (
    <div style={{ width, height: width * 1.4, perspective: 900 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay }}
      >
        {/* face */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[10%/7%] text-center"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(160deg,#fbf6ea,#e8dcc2)',
            boxShadow: ring ? `0 0 0 3px ${ring}, 0 0 28px ${ring}` : '0 12px 30px -10px rgba(0,0,0,.8)',
            containerType: 'inline-size',
          }}
        >
          <span className={`absolute left-[8%] top-[5%] leading-none ${red ? 'text-[#b3202a]' : 'text-[#1b1714]'}`} style={{ fontSize: '17cqw' }}>
            {suit}
          </span>
          <span className={`absolute bottom-[5%] right-[8%] rotate-180 leading-none ${red ? 'text-[#b3202a]' : 'text-[#1b1714]'}`} style={{ fontSize: '17cqw' }}>
            {suit}
          </span>
          <span aria-hidden className={`absolute inset-0 flex items-center justify-center opacity-[0.08] ${red ? 'text-[#b3202a]' : 'text-[#1b1714]'}`} style={{ fontSize: '80cqw' }}>
            {suit}
          </span>
          {title && (
            <span className="relative px-[8%] font-poster uppercase leading-[1] text-[#1b1714]" style={{ fontSize: '13cqw' }}>
              {title}
            </span>
          )}
          {sub && (
            <span className="relative mt-[6%] px-[8%] font-label font-bold leading-tight text-[#1b1714]/70" style={{ fontSize: '8.5cqw' }}>
              {sub}
            </span>
          )}
        </div>
        {/* back */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-[10%/7%]"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'repeating-linear-gradient(45deg,#7a1118 0 9%,#8e1820 9% 18%)',
            border: `${Math.max(2, width * 0.04)}px solid #f2e9d8`,
            boxShadow: '0 12px 30px -10px rgba(0,0,0,.8)',
            containerType: 'inline-size',
          }}
        >
          <span className="font-poster text-[#f2e9d8]" style={{ fontSize: '45cqw', textShadow: '0 0 20px rgba(0,0,0,.5)' }}>
            ?
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ── The big screen: every team's card ────────────────────────────────── */

export function CardWall({
  roster,
  locked,
  results,
  width,
}: {
  roster: RosterTeam[];
  /** Teams that have locked in: their card turns face up. */
  locked: Set<string>;
  /** After the reveal: each team's accuracy (missing = no answer). */
  results?: Record<string, number>;
  width: number;
}) {
  return (
    <div className="flex flex-wrap content-start justify-center gap-[1vw]">
      {roster.map((t, i) => {
        const su = suitOf(t.track);
        const acc = results?.[t.teamId];
        const tone = results ? (acc === undefined ? 'none' : acc >= 1 ? 'right' : acc > 0 ? 'partial' : 'wrong') : undefined;
        const up = results ? true : locked.has(t.teamId);
        const sub = results ? (acc === undefined ? '—' : acc >= 1 ? '✓ Nailed it' : acc > 0 ? `${Math.round(acc * 100)}%` : '✗') : 'Locked';
        return (
          <motion.div
            key={t.teamId}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: -300, rotate: (i % 7) * 9 - 27, scale: 0.4 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 140, damping: 16, delay: i * 0.035 }}
          >
            <DealtCard faceUp={up} suit={su.suit === '·' ? '♠' : su.suit} title={t.teamName} sub={sub} width={width} tone={tone} delay={results ? i * 0.05 : 0} />
          </motion.div>
        );
      })}
    </div>
  );
}

/** The deck shuffles, then fans cards out to every team while the countdown runs. */
export function DealAnimation({ count, n }: { count: number; n: number }) {
  const cards = Math.min(24, Math.max(8, count));
  return (
    <div className="relative flex h-[60vh] w-full items-center justify-center">
      {Array.from({ length: cards }).map((_, i) => {
        const angle = (i / cards) * Math.PI * 2;
        const r = 34;
        return (
          <motion.div
            key={i}
            className="absolute"
            initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
            animate={{
              x: [0, (i % 2 ? 1 : -1) * 60, Math.cos(angle) * r + 'vw'],
              y: [0, -20, Math.sin(angle) * (r * 0.55) + 'vh'],
              rotate: [0, (i % 2 ? 15 : -15), (angle * 180) / Math.PI + 90],
              opacity: [0, 1, 1],
            }}
            transition={{ duration: 1.6, delay: 0.25 + i * 0.03, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <DealtCard faceUp={false} suit="♠" width={90} />
          </motion.div>
        );
      })}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={n}
          className="relative z-10 font-poster leading-none text-[#ff3b3b]"
          style={{ fontSize: '30vh', textShadow: '0 0 90px rgba(255,59,59,.8)' }}
          initial={{ scale: 2.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {Math.max(1, n)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ── The big screen: an order question ────────────────────────────────── */

export function OrderShow({ items, correct, big }: { items: string[]; correct?: number[]; big?: boolean }) {
  // Shown shuffled; at the reveal the steps fly into the right order.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!correct) return;
    const t = setTimeout(() => {
      setSettled(true);
      sfx.whoosh();
    }, 900);
    return () => clearTimeout(t);
  }, [correct]);
  const order = settled && correct ? correct : items.map((_, i) => i);
  const fs = items.length > 7 ? 2.3 : 2.8;
  return (
    <LayoutGroup>
      <div className={`mt-[2.5vh] grid gap-[1.1vh] ${big ? '' : ''}`}>
        {order.map((idx, pos) => (
          <motion.div
            layout
            key={idx}
            transition={{ type: 'spring', stiffness: 90, damping: 15 }}
            className="flex items-center gap-[1.2vw] rounded-xl border px-[1.4vw] py-[1vh] backdrop-blur"
            style={{
              borderColor: settled ? 'rgba(34,229,132,.6)' : 'rgba(255,255,255,.12)',
              background: settled ? 'rgba(34,229,132,.08)' : 'rgba(0,0,0,.6)',
            }}
          >
            <span className={`w-[3vw] text-center font-poster leading-none ${settled ? 'text-[#22e584]' : 'text-neutral-500'}`} style={{ fontSize: `${fs * 1.3}vh` }}>
              {settled ? pos + 1 : String.fromCharCode(65 + idx)}
            </span>
            <span className="font-label font-bold text-white" style={{ fontSize: `${fs}vh` }}>
              {items[idx]}
            </span>
          </motion.div>
        ))}
      </div>
    </LayoutGroup>
  );
}

/* ── The big screen: a sort question ──────────────────────────────────── */

export function SortShow({ items, buckets, correct }: { items: string[]; buckets: string[]; correct?: number[] }) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!correct) return;
    const t = setTimeout(() => {
      setSettled(true);
      sfx.whoosh();
    }, 900);
    return () => clearTimeout(t);
  }, [correct]);
  return (
    <LayoutGroup>
      <div className="mt-[2.5vh] flex flex-1 flex-col gap-[2vh]">
        {!settled && (
          <div className="flex flex-wrap gap-[0.8vw]">
            {items.map((it, i) => (
              <motion.span layout layoutId={`it${i}`} key={i} className="rounded-xl border border-white/15 bg-black/70 px-[1.1vw] py-[0.9vh] font-label text-[2.2vh] font-bold text-white">
                {it}
              </motion.span>
            ))}
          </div>
        )}
        <div className="grid flex-1 gap-[1vw]" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0,1fr))` }}>
          {buckets.map((b, bi) => (
            <div key={b} className="flex min-h-[22vh] flex-col gap-[0.8vh] rounded-2xl border-2 border-dashed border-white/20 bg-black/40 p-[1vh]">
              <div className="text-center font-poster text-[3vh] uppercase text-[#f2e9d8]">{b}</div>
              {settled &&
                items.map((it, i) =>
                  correct![i] === bi ? (
                    <motion.span
                      layout
                      layoutId={`it${i}`}
                      key={i}
                      transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                      className="rounded-lg border border-[#22e584]/60 bg-[#22e584]/10 px-[0.8vw] py-[0.7vh] font-label text-[1.8vh] font-bold leading-snug text-white"
                    >
                      {it}
                    </motion.span>
                  ) : null
                )}
            </div>
          ))}
        </div>
      </div>
    </LayoutGroup>
  );
}

/* ── Phones: drag the steps into order ────────────────────────────────── */

export function OrderInput({ items, onLock, disabled }: { items: string[]; onLock: (order: number[]) => void; disabled?: boolean }) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  useEffect(() => setOrder(items.map((_, i) => i)), [items]);
  return (
    <div className="flex flex-col gap-3">
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-col gap-2">
        {order.map((idx, pos) => (
          <OrderRow key={idx} idx={idx} pos={pos} label={items[idx]} />
        ))}
      </Reorder.Group>
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={disabled}
        onClick={() => onLock(order)}
        className="sticky bottom-3 rounded-2xl bg-[#b3202a] py-4 font-poster text-3xl uppercase text-white shadow-[0_0_30px_rgba(255,59,59,.5)] disabled:opacity-30"
      >
        Lock in this order
        <span className="block font-label text-xs normal-case opacity-70">Drag the ⋮⋮ handle to move a step</span>
      </motion.button>
    </div>
  );
}

function OrderRow({ idx, pos, label }: { idx: number; pos: number; label: string }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={idx}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.04, boxShadow: '0 12px 30px rgba(255,59,59,.45)', zIndex: 10 }}
      className="flex select-none items-center gap-3 rounded-xl border border-white/15 bg-[#141417] px-3 py-3"
    >
      <span className="w-6 text-center font-poster text-xl text-[#ff6b6b]">{pos + 1}</span>
      <span className="flex-1 font-label text-[14px] font-bold leading-snug text-white md:text-base">{label}</span>
      <span onPointerDown={(e) => controls.start(e)} className="touch-none cursor-grab rounded-md bg-white/10 p-2 text-neutral-300 active:cursor-grabbing" aria-label="Drag">
        <GripVertical className="h-5 w-5" />
      </span>
    </Reorder.Item>
  );
}

/* ── Phones: drag each item into its bucket (or tap item, then bucket) ── */

export function SortInput({ items, buckets, onLock, disabled }: { items: string[]; buckets: string[]; onLock: (place: number[]) => void; disabled?: boolean }) {
  const [place, setPlace] = useState<number[]>(() => items.map(() => -1));
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    setPlace(items.map(() => -1));
    setSel(null);
  }, [items]);
  const done = place.every((p) => p >= 0);
  const put = (i: number, b: number) => {
    setPlace((p) => p.map((x, k) => (k === i ? b : x)));
    setSel(null);
    sfx.tick();
  };
  const bucketAt = (x: number, y: number) => {
    const el = document.elementsFromPoint(x, y).find((e) => (e as HTMLElement).dataset?.bucket !== undefined) as HTMLElement | undefined;
    return el ? Number(el.dataset.bucket) : null;
  };
  const pool = items.map((_, i) => i).filter((i) => place[i] < 0);
  const chip = (i: number) => (
    <motion.div
      key={i}
      layout
      layoutId={`chip${i}`}
      drag
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={{ scale: 1.06, zIndex: 50, boxShadow: '0 10px 30px rgba(255,59,59,.5)' }}
      onDrag={(_, info) => setHover(bucketAt(info.point.x - window.scrollX, info.point.y - window.scrollY))}
      onDragEnd={(_, info) => {
        const b = bucketAt(info.point.x - window.scrollX, info.point.y - window.scrollY);
        setHover(null);
        if (b !== null) put(i, b);
      }}
      onTap={() => setSel((s) => (s === i ? null : i))}
      className={`touch-none cursor-grab select-none rounded-xl border px-3 py-2.5 font-label text-[13px] font-bold leading-snug text-white md:text-sm ${
        sel === i ? 'border-[#ff3b3b] bg-[#b3202a]' : 'border-white/15 bg-[#141417]'
      }`}
    >
      {items[i]}
    </motion.div>
  );
  return (
    <div className="flex flex-col gap-3">
      <LayoutGroup>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(buckets.length, 3)}, minmax(0,1fr))` }}>
          {buckets.map((b, bi) => (
            <div
              key={b}
              data-bucket={bi}
              onClick={() => sel !== null && put(sel, bi)}
              className={`flex min-h-[78px] flex-col gap-1.5 rounded-xl border-2 border-dashed p-2 transition ${
                hover === bi || sel !== null ? 'border-[#ff6b6b] bg-[#b3202a]/15' : 'border-white/20 bg-white/[0.03]'
              }`}
            >
              <div data-bucket={bi} className="text-center font-poster text-lg uppercase leading-none text-[#f2e9d8]">
                {b}
              </div>
              {items.map((_, i) => (place[i] === bi ? chip(i) : null))}
            </div>
          ))}
        </div>
        <div className="flex min-h-[60px] flex-col gap-2 rounded-xl bg-white/[0.02] p-2">
          {pool.length ? pool.map(chip) : <p className="py-3 text-center font-label text-xs text-neutral-500">All placed. Drag one again to move it.</p>}
        </div>
      </LayoutGroup>
      <p className="text-center font-label text-[11px] text-neutral-500">Drag a card into a box, or tap a card and then a box.</p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={disabled || !done}
        onClick={() => onLock(place)}
        className="sticky bottom-3 rounded-2xl bg-[#b3202a] py-4 font-poster text-3xl uppercase text-white shadow-[0_0_30px_rgba(255,59,59,.5)] disabled:opacity-30"
      >
        {done ? 'Lock in' : `${pool.length} left to place`}
      </motion.button>
    </div>
  );
}

export function useStable<T>(v: T): T {
  const r = useRef(v);
  const key = JSON.stringify(v);
  return useMemo(() => {
    r.current = v;
    return v;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
