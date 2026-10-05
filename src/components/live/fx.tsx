'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'motion/react';
import { TRACKS, TRACK_ORDER, type TrackId } from '@/lib/cardDrop/cards';

/* ── Confetti: a canvas burst, re-fired whenever `fire` changes ───────── */

export function Confetti({ fire, colors = ['#ff2e2e', '#f2e9d8', '#facc15', '#ffffff', '#b3202a'], count = 260 }: { fire: number | string; colors?: string[]; count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!fire) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const W = c.width;
    const H = c.height;
    const parts = Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      return {
        x: left ? 0 : W,
        y: H * 0.85,
        vx: (left ? 1 : -1) * (6 + Math.random() * 16),
        vy: -(14 + Math.random() * 18),
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        w: 6 + Math.random() * 8,
        h: 10 + Math.random() * 12,
        col: colors[i % colors.length],
        suit: Math.random() < 0.12 ? ['♠', '♥', '♦', '♣'][i % 4] : '',
      };
    });
    let raf = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      const age = (t - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.45;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - age / 5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.col;
        if (p.suit) {
          ctx.font = '28px serif';
          ctx.fillText(p.suit, -10, 10);
        } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        ctx.restore();
      }
      if (age < 5.5) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fire, colors, count]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60]" />;
}

/* ── Shockwave: rings that blast out from the centre ──────────────────── */

export function Shockwave({ k, color = '#ff2e2e' }: { k: number | string; color?: string }) {
  return (
    <div key={k} aria-hidden className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
      {[0, 0.12, 0.26].map((d) => (
        <motion.div
          key={d}
          className="absolute rounded-full"
          style={{ border: `3px solid ${color}`, boxShadow: `0 0 40px ${color}` }}
          initial={{ width: 40, height: 40, opacity: 0.9 }}
          animate={{ width: '170vmax', height: '170vmax', opacity: 0 }}
          transition={{ duration: 1.3, delay: d, ease: [0.2, 0.7, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/* ── Countdown ring ───────────────────────────────────────────────────── */

export function CountdownRing({ start, end, now, size = 150 }: { start: number; end: number; now: number; size?: number }) {
  const total = Math.max(1, end - start);
  const left = Math.max(0, end - now);
  const frac = Math.min(1, left / total);
  const secs = Math.ceil(left / 1000);
  const r = size / 2 - 10;
  const C = 2 * Math.PI * r;
  const hot = secs <= 5 && left > 0;
  return (
    <div className={hot ? 'live-pulse-red rounded-full' : 'rounded-full'} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={10} fill="rgba(0,0,0,.55)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={hot ? '#ff2e2e' : '#f2e9d8'}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 120ms linear', filter: hot ? 'drop-shadow(0 0 12px #ff2e2e)' : undefined }}
        />
      </svg>
      <div className="relative -mt-[100%] flex h-full items-center justify-center">
        <motion.span
          key={secs}
          initial={{ scale: hot ? 1.6 : 1.15, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-poster leading-none ${hot ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}`}
          style={{ fontSize: size * 0.42 }}
        >
          {secs}
        </motion.span>
      </div>
    </div>
  );
}

/* ── Numbers that roll to their new value ─────────────────────────────── */

export function Rolling({ value, format = (n: number) => Math.round(n).toLocaleString('en-IN'), className, duration = 0.9 }: { value: number; format?: (n: number) => string; className?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const ctl = animate(prev.current, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    prev.current = value;
    return () => ctl.stop();
  }, [value, duration]);
  return <span className={className}>{format(shown)}</span>;
}

/* ── Sparkline ────────────────────────────────────────────────────────── */

export function Sparkline({ data, w = 160, h = 48, stroke }: { data: number[]; w?: number; h?: number; stroke?: string }) {
  const id = useRef(`g${Math.random().toString(36).slice(2)}`).current;
  if (data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const up = data[data.length - 1] >= data[0];
  const col = stroke ?? (up ? '#22e584' : '#ff3b3b');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity={0.45} />
          <stop offset="100%" stopColor={col} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${col})` }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={col} />
    </svg>
  );
}

/* ── Suit Wars: the four tracks racing each other ─────────────────────── */

export function SuitWars({ values, label = 'Suit Wars', format = (n: number) => Math.round(n).toLocaleString('en-IN') }: { values: Partial<Record<TrackId, number>>; label?: string; format?: (n: number) => string }) {
  const max = Math.max(1, ...TRACK_ORDER.map((t) => Math.abs(values[t] ?? 0)));
  const leader = [...TRACK_ORDER].sort((a, b) => (values[b] ?? 0) - (values[a] ?? 0))[0];
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur">
      <div className="mb-3 font-caps text-xs uppercase tracking-[0.35em] text-neutral-400">{label}</div>
      <div className="space-y-2.5">
        {TRACK_ORDER.map((t) => {
          const v = values[t] ?? 0;
          const tr = TRACKS[t];
          return (
            <div key={t} className="flex items-center gap-3">
              <span className={`w-7 text-center text-2xl leading-none ${tr.red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}`}>{tr.suit}</span>
              <span className="w-28 shrink-0 truncate font-label text-xs font-bold uppercase tracking-wider text-neutral-300">{tr.label}</span>
              <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ background: tr.red ? 'linear-gradient(90deg,#7a0f16,#ff3b3b)' : 'linear-gradient(90deg,#3a3530,#f2e9d8)' }}
                  animate={{ width: `${Math.max(2, (Math.max(0, v) / max) * 100)}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 14 }}
                />
              </div>
              <span className="w-20 text-right font-poster text-xl text-[#f2e9d8]">{format(v)}</span>
              {t === leader && v > 0 && <span className="text-lg">👑</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function suitOf(track?: TrackId) {
  if (!track) return { suit: '·', red: false };
  return { suit: TRACKS[track].suit, red: TRACKS[track].red };
}

/** Big title that slams in, with RGB-split glitch. */
export function SlamTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 3.2, opacity: 0, filter: 'blur(18px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
    >
      <span className="live-glitch inline-block">{children}</span>
    </motion.div>
  );
}

/** The four answer buttons: suits with their own colours, used on the screen and the phones. */
export const OPTS = [
  { suit: '♠', color: '#3b82f6', dark: '#1e3a8a' },
  { suit: '♥', color: '#ef4444', dark: '#7f1d1d' },
  { suit: '♦', color: '#f59e0b', dark: '#78350f' },
  { suit: '♣', color: '#10b981', dark: '#064e3b' },
];

const KW = /^(const|let|var|async|await|function|return|if|else|for|try|catch|throw|new|true|false|null)$/;

/** Tiny syntax colouring for the code snippets. */
export function CodeText({ line }: { line: string }) {
  const out: React.ReactNode[] = [];
  const re = /(\/\/.*$)|('[^']*'|`[^`]*`?|"[^"]*")|(\b\d[\d_.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    const [tok, com, str, num, word] = m;
    let cls = 'text-[#e8e2d6]';
    if (com) cls = 'text-neutral-500 italic';
    else if (str) cls = 'text-[#9be38c]';
    else if (num) cls = 'text-[#f5b56b]';
    else if (word && KW.test(word)) cls = 'text-[#ff7a85]';
    else if (word && line[m.index + tok.length] === '(') cls = 'text-[#7cc4ff]';
    out.push(
      <span key={i++} className={cls}>
        {tok}
      </span>
    );
  }
  return <>{out}</>;
}
