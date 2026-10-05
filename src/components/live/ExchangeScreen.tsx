'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { CARD_BY_CODE, TRACKS, TRACK_ORDER, type TrackId } from '@/lib/cardDrop/cards';
import type { GameState, NewsItem, Ticker } from '@/lib/live/types';
import { CardFace } from '@/components/carddrop/PlayingCard';
import { sfx } from '@/utils/liveSound';
import { Galaxy } from './Shaders';
import { Confetti, Rolling, SlamTitle, Sparkline, SuitWars, suitOf } from './fx';
import { fmtChips, fmtPct } from './clock';

/**
 * The Trading Floor on the projector: every card in play is a stock.
 * Breaking news from the Game Master hits the whole screen; rumours slide in from the side.
 */

const chg = (t: Ticker) => (t.price - t.open) / t.open;
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function ExchangeScreen({ s, now }: { s: GameState; now: number }) {
  const m = s.market!;
  const open = s.status === 'LIVE' && !!m.openAt && now < (m.closeAt ?? 0);
  const halted = !!m.haltUntil && now < m.haltUntil;
  const closing = open && !halted && (m.closeAt ?? 0) - now <= 10_000;

  // Breaking news (Game Master) takes over the screen; rumours slide in.
  const [breaking, setBreaking] = useState<NewsItem | null>(null);
  const [rumour, setRumour] = useState<NewsItem | null>(null);
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = m.news.map((n) => n.id);
    if (!seen.current) {
      seen.current = new Set(ids);
      return;
    }
    const fresh = m.news.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => seen.current!.add(n.id));
    const last = fresh[fresh.length - 1];
    if (!last) return;
    if (last.auto) {
      setRumour(last);
      sfx.whoosh();
    } else {
      setBreaking(last);
      if (last.pct < 0) sfx.siren();
      else sfx.rise();
      if (Math.abs(last.pct) >= 0.1) setTimeout(() => sfx.boom(), 900);
    }
  }, [m.news]);
  useEffect(() => {
    if (!breaking) return;
    const t = setTimeout(() => setBreaking(null), 5200);
    return () => clearTimeout(t);
  }, [breaking]);
  useEffect(() => {
    if (!rumour) return;
    const t = setTimeout(() => setRumour(null), 4200);
    return () => clearTimeout(t);
  }, [rumour]);

  // The closing bell.
  const closedKey = s.status === 'LIVE' && m.closeAt && now >= m.closeAt ? 'closed' : '';
  const rang = useRef(false);
  useEffect(() => {
    if (closedKey && !rang.current) {
      rang.current = true;
      sfx.bell();
    }
  }, [closedKey]);

  const warp = breaking ? (breaking.pct >= 0 ? 9 : 4) : closing ? 5 : open ? 1.4 : 0.8;
  const hue = breaking ? (breaking.pct >= 0 ? 120 : 0) : 140;
  const crash = !!breaking && breaking.pct <= -0.1;

  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#03040a] text-[#ededed] ${crash ? 'live-shake' : ''}`}>
      <Galaxy warp={warp} hue={hue} />
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,.8) 90%)' }} />

      {s.status === 'LOBBY' && <Lobby s={s} />}
      {s.status === 'LIVE' && <Floor s={s} now={now} open={open} halted={halted} />}
      {s.status === 'ENDED' && <Closed s={s} />}

      <AnimatePresence>{breaking && <Breaking key={breaking.id} n={breaking} tickers={m.tickers} />}</AnimatePresence>
      <AnimatePresence>{rumour && <Rumour key={rumour.id} n={rumour} />}</AnimatePresence>
      <AnimatePresence>{halted && <Halt until={m.haltUntil!} now={now} />}</AnimatePresence>
      <AnimatePresence>
        {closing && (
          <motion.div key="closing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={Math.ceil(((m.closeAt ?? 0) - now) / 1000)}
                initial={{ scale: 2.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.85 }}
                exit={{ scale: 0.4, opacity: 0 }}
                className="font-poster leading-none text-[#ff3b3b]"
                style={{ fontSize: '50vh', textShadow: '0 0 120px rgba(255,59,59,.9)' }}
              >
                {Math.ceil(((m.closeAt ?? 0) - now) / 1000)}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}
        {closedKey && (
          <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur">
            <motion.div initial={{ rotate: -30, scale: 0 }} animate={{ rotate: [0, -18, 16, -10, 8, 0], scale: 1 }} transition={{ duration: 1.6 }} className="text-[22vh] leading-none">
              🔔
            </motion.div>
            <SlamTitle className="font-poster text-[14vh] uppercase leading-none text-[#f2e9d8]">Market closed</SlamTitle>
            <p className="mt-4 font-label text-[2.6vh] text-neutral-400">Counting the money…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Lobby ────────────────────────────────────────────────────────────── */

function Lobby({ s }: { s: GameState }) {
  const m = s.market!;
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-[3vh] px-[4vw] text-center">
      <p className="font-caps text-[2vh] uppercase tracking-[0.5em] text-[#22e584]">♣ {s.group}</p>
      <SlamTitle className="font-poster text-[15vh] uppercase leading-[0.85] text-[#f2e9d8]">
        Trading <span className="text-[#22e584]">Floor</span>
      </SlamTitle>
      <div className="grid max-w-[80vw] grid-cols-3 gap-[2vw] font-label text-[2.2vh] text-neutral-300">
        <Rule n="10,000" t="chips per team. Every card in play is a stock at ₹100." />
        <Rule n="No" t="insider trading: you cannot trade your own card." />
        <Rule n="+30" t="for the best trader. Every team that trades gets a bonus by rank." />
      </div>
      <div className="flex flex-wrap justify-center gap-[1vw]">
        {m.tickers.map((t, i) => {
          const card = CARD_BY_CODE[t.code];
          return (
            <motion.div
              key={t.code}
              className="w-[8vw]"
              initial={{ rotateY: 180, y: 80, opacity: 0 }}
              animate={{ rotateY: 0, y: [0, -10, 0], opacity: 1 }}
              transition={{ rotateY: { delay: 0.3 + i * 0.1, type: 'spring', stiffness: 80 }, opacity: { delay: 0.3 + i * 0.1 }, y: { repeat: Infinity, duration: 3, delay: i * 0.2 } }}
            >
              {card && <CardFace card={card} />}
            </motion.div>
          );
        })}
      </div>
      <div className="font-poster text-[4.5vh] text-[#f2e9d8]">
        <Rolling value={s.joined.length} /> <span className="text-neutral-500">/ {s.roster.length} traders on the floor</span>
      </div>
      <p className="font-caps text-[1.5vh] uppercase tracking-[0.4em] text-neutral-500">Space opens the market</p>
    </div>
  );
}

function Rule({ n, t }: { n: string; t: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-[2vh] backdrop-blur">
      <div className="font-poster text-[5vh] leading-none text-[#22e584]">{n}</div>
      <div className="mt-1">{t}</div>
    </div>
  );
}

/* ── The floor ────────────────────────────────────────────────────────── */

function Floor({ s, now, open, halted }: { s: GameState; now: number; open: boolean; halted: boolean }) {
  const m = s.market!;
  const board = s.exBoard ?? [];
  const cols = m.tickers.length > 9 ? 4 : m.tickers.length > 4 ? 3 : 2;
  const suitIdx = useMemo(() => {
    const acc: Partial<Record<TrackId, number[]>> = {};
    m.tickers.forEach((t) => {
      const tr = CARD_BY_CODE[t.code]?.track;
      if (tr) (acc[tr] ??= []).push(t.price);
    });
    return Object.fromEntries(TRACK_ORDER.map((t) => [t, acc[t] ? acc[t]!.reduce((a, b) => a + b, 0) / acc[t]!.length : 0])) as Record<TrackId, number>;
  }, [m.tickers]);

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-[2.5vw] pt-[2vh]">
        <div className="font-poster text-[5vh] uppercase leading-none text-[#f2e9d8]">
          <span className="text-[#22e584]">♣</span> Trading Floor <span className="font-caps text-[1.8vh] tracking-[0.3em] text-neutral-500">· {s.group}</span>
        </div>
        <div className="flex items-center gap-[1.5vw]">
          <span
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-caps text-[1.6vh] font-bold uppercase tracking-[0.3em] ${
              halted ? 'bg-[#facc15] text-black' : open ? 'bg-[#22e584]/15 text-[#22e584]' : 'bg-white/10 text-neutral-400'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${halted ? 'bg-black' : open ? 'animate-ping bg-[#22e584]' : 'bg-neutral-500'}`} />
            {halted ? 'Halted' : open ? 'Market open' : 'Closed'}
          </span>
          <span className="font-poster text-[6vh] leading-none tabular-nums text-[#f2e9d8]">{mmss((m.closeAt ?? now) - now)}</span>
        </div>
      </div>

      <Tape tickers={m.tickers} />

      <div className="flex flex-1 gap-[1.8vw] px-[2.5vw] pb-[2vh]">
        <div className="grid flex-1 content-start gap-[1.2vw]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {m.tickers.map((t) => (
            <Tile key={t.code} t={t} />
          ))}
        </div>
        <div className="flex w-[29vw] shrink-0 flex-col gap-[1.6vh]">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-[1.6vh] backdrop-blur">
            <div className="mb-[1vh] font-caps text-[1.5vh] uppercase tracking-[0.35em] text-neutral-400">Top traders</div>
            <LayoutGroup>
              {board.slice(0, 7).map((r) => {
                const pl = (r.worth - m.startCash) / m.startCash;
                return (
                  <motion.div layout key={r.teamId} transition={{ type: 'spring', stiffness: 140, damping: 20 }} className="flex items-center gap-2 border-b border-white/5 py-[0.45vh]">
                    <span className="w-[2vw] font-poster text-[3vh] text-[#f2e9d8]">{r.rank}</span>
                    {r.prevRank !== r.rank && <span className={`text-[1.6vh] ${r.prevRank > r.rank ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>{r.prevRank > r.rank ? '▲' : '▼'}</span>}
                    <span className={suitOf(r.track).red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}>{suitOf(r.track).suit}</span>
                    <span className="min-w-0 flex-1 truncate font-label text-[2.1vh] font-bold text-white">{r.teamName}</span>
                    <span className={`font-label text-[1.7vh] font-bold ${pl >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>{fmtPct(pl)}</span>
                    <span className="w-[7vw] text-right font-poster text-[2.6vh] tabular-nums text-[#f2e9d8]">
                      <Rolling value={r.worth} />
                    </span>
                  </motion.div>
                );
              })}
            </LayoutGroup>
          </div>
          <SuitWars values={suitIdx} label="Suit index · average price" format={(n) => n.toFixed(1)} />
          <div className="rounded-2xl border border-white/10 bg-black/60 p-[1.6vh] backdrop-blur">
            <div className="mb-[0.6vh] font-caps text-[1.5vh] uppercase tracking-[0.35em] text-neutral-400">Newswire</div>
            <AnimatePresence initial={false}>
              {[...m.news].reverse().slice(0, 3).map((n) => (
                <motion.div key={n.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 py-[0.4vh] font-label text-[1.7vh] leading-snug">
                  <span className={n.pct >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}>{n.pct >= 0 ? '▲' : '▼'}</span>
                  <span className={n.auto ? 'text-neutral-400' : 'font-bold text-white'}>{n.headline}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tape({ tickers }: { tickers: Ticker[] }) {
  const items = [...tickers, ...tickers];
  return (
    <div className="my-[1.4vh] overflow-hidden border-y border-[#22e584]/20 bg-black/70 py-[0.9vh]">
      <div className="live-marquee flex w-max gap-[3vw] whitespace-nowrap font-mono text-[2.2vh]">
        {items.map((t, i) => {
          const c = chg(t);
          const card = CARD_BY_CODE[t.code];
          const tr = card ? TRACKS[card.track] : null;
          return (
            <span key={`${t.code}${i}`} className="flex items-center gap-2">
              <span className={tr?.red ? 'text-[#ff6b6b]' : 'text-[#f2e9d8]'}>
                {tr?.suit}
                {card?.rank}
              </span>
              <span className="font-bold text-white">{card?.name.replace('The ', '').toUpperCase()}</span>
              <span className="text-neutral-300">{t.price.toFixed(2)}</span>
              <span className={c >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}>
                {c >= 0 ? '▲' : '▼'} {fmtPct(c)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ t }: { t: Ticker }) {
  const card = CARD_BY_CODE[t.code];
  const tr = card ? TRACKS[card.track] : null;
  const c = chg(t);
  const prev = useRef(t.price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (t.price === prev.current) return;
    setFlash(t.price > prev.current ? 'up' : 'down');
    prev.current = t.price;
    const x = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(x);
  }, [t.price]);
  const col = flash === 'up' ? '#22e584' : flash === 'down' ? '#ff3b3b' : 'rgba(255,255,255,.1)';
  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-2xl border bg-black/65 p-[1.4vh] backdrop-blur"
      animate={{ borderColor: col, boxShadow: flash ? `0 0 30px ${col}` : '0 0 0px transparent' }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-poster text-[2.6vh] leading-none">
            <span className={tr?.red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}>
              {tr?.suit}
              {card?.rank}
            </span>
            <span className="truncate uppercase text-white">{card?.name.replace('The ', '')}</span>
          </div>
          <div className="truncate font-label text-[1.4vh] text-neutral-400">{card?.title}</div>
        </div>
        <span className={`rounded-md px-1.5 py-0.5 font-label text-[1.7vh] font-bold ${c >= 0 ? 'bg-[#22e584]/15 text-[#22e584]' : 'bg-[#ff3b3b]/15 text-[#ff4a4a]'}`}>{fmtPct(c)}</span>
      </div>
      <div className="mt-[0.8vh] font-poster text-[5vh] leading-none tabular-nums text-[#f2e9d8]">
        <Rolling value={t.price} format={(n) => n.toFixed(2)} duration={0.6} />
      </div>
      <div className="mt-[0.6vh] h-[6vh]">
        <Sparkline data={t.hist} w={300} h={60} />
      </div>
      <div className="mt-[0.4vh] flex justify-between font-label text-[1.3vh] text-neutral-500">
        <span>H {t.high.toFixed(0)} · L {t.low.toFixed(0)}</span>
        <span>Vol {t.vol}</span>
      </div>
    </motion.div>
  );
}

/* ── Overlays ─────────────────────────────────────────────────────────── */

function Breaking({ n, tickers }: { n: NewsItem; tickers: Ticker[] }) {
  const up = n.pct >= 0;
  const card = CARD_BY_CODE[n.target];
  const tr = n.target.startsWith('track:') ? TRACKS[n.target.slice(6) as TrackId] : null;
  const col = up ? '#22e584' : '#ff3b3b';
  const [typed, setTyped] = useState('');
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(n.headline.slice(0, i));
      if (i >= n.headline.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [n.headline]);
  const t = tickers.find((x) => x.code === n.target);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
      <motion.div className="absolute inset-0" style={{ background: up ? 'rgba(3,30,15,.97)' : 'rgba(40,3,6,.97)' }} initial={{ clipPath: 'inset(50% 0 50% 0)' }} animate={{ clipPath: 'inset(0% 0 0% 0)' }} transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }} />
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="absolute h-[14vh] w-[220vw]" style={{ background: col, opacity: 0.12, top: `${18 + i * 28}%`, rotate: -8 }} initial={{ x: i % 2 ? '-100%' : '100%' }} animate={{ x: '0%' }} transition={{ duration: 0.7, delay: 0.1 * i }} />
      ))}
      <div className="relative z-10 flex max-w-[86vw] items-center gap-[4vw]">
        {card && (
          <motion.div className="w-[18vw] shrink-0" initial={{ rotateY: 720, scale: 0, opacity: 0 }} animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
            <CardFace card={card} glow />
          </motion.div>
        )}
        <div className="min-w-0">
          <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="live-glitch font-poster text-[14vh] uppercase leading-none" style={{ color: col }}>
            {up ? 'Breaking' : 'Crash alert'}
          </motion.div>
          <div className="mt-[2vh] min-h-[16vh] font-label text-[5vh] font-extrabold leading-tight text-white">
            {typed}
            <span className="animate-pulse">▌</span>
          </div>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="mt-[2vh] flex items-baseline gap-[2vw] font-poster leading-none" style={{ color: col }}>
            <span className="text-[12vh]">
              {up ? '▲' : '▼'} {fmtPct(n.pct)}
            </span>
            <span className="text-[4vh] text-white/80">
              {card ? card.name : tr ? `${tr.suit} ${tr.label}` : 'Whole market'}
              {t && ` → ${t.price.toFixed(2)}`}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function Rumour({ n }: { n: NewsItem }) {
  const up = n.pct >= 0;
  return (
    <motion.div
      className="fixed bottom-[4vh] right-[2vw] z-40 max-w-[44vw] rounded-2xl border-2 p-[2vh] backdrop-blur"
      style={{ borderColor: up ? '#22e584' : '#ff3b3b', background: 'rgba(0,0,0,.85)', boxShadow: `0 0 50px ${up ? 'rgba(34,229,132,.4)' : 'rgba(255,59,59,.4)'}` }}
      initial={{ x: '120%', rotate: 6 }}
      animate={{ x: 0, rotate: 0 }}
      exit={{ x: '120%' }}
      transition={{ type: 'spring', stiffness: 160, damping: 18 }}
    >
      <div className="font-caps text-[1.6vh] uppercase tracking-[0.4em] text-[#facc15]">🗞 Rumour on the floor</div>
      <div className="mt-1 font-label text-[2.8vh] font-bold leading-snug text-white">{n.headline}</div>
      <div className={`font-poster text-[4vh] ${up ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>
        {up ? '▲' : '▼'} {fmtPct(n.pct)}
      </div>
    </motion.div>
  );
}

function Halt({ until, now }: { until: number; now: number }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="live-hazard absolute inset-x-0 top-0 h-[7vh]" />
      <div className="live-hazard absolute inset-x-0 bottom-0 h-[7vh]" />
      <SlamTitle className="font-poster text-[12vh] uppercase leading-none text-[#facc15]">Circuit breaker</SlamTitle>
      <p className="mt-[2vh] font-label text-[3.4vh] font-bold text-white">Trading halted. Hands off the keyboard.</p>
      <div className="mt-[3vh] font-poster text-[16vh] leading-none tabular-nums text-[#facc15]">{mmss(until - now)}</div>
    </motion.div>
  );
}

/* ── Final ────────────────────────────────────────────────────────────── */

function Closed({ s }: { s: GameState }) {
  const board = s.exBoard ?? [];
  const m = s.market!;
  const podium = [board[1], board[0], board[2]].filter(Boolean);
  const heights = ['40vh', '54vh', '30vh'];
  const [boom, setBoom] = useState(0);
  useEffect(() => {
    sfx.fanfare();
    const t = setTimeout(() => setBoom(Date.now()), 2400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center px-[3vw] pt-[4vh]">
      <SlamTitle className="font-poster text-[10vh] uppercase leading-none text-[#22e584]">Wolves of Borderland</SlamTitle>
      <p className="mt-2 font-label text-[2.2vh] text-neutral-400">Best trader: +30 points. Every team that traded gets a bonus by rank.</p>
      <div className="mt-auto flex items-end gap-[2vw]">
        {podium.map((r, i) => {
          const place = r === board[0] ? 1 : r === board[1] ? 2 : 3;
          const pl = (r.worth - m.startCash) / m.startCash;
          return (
            <div key={r.teamId} className="flex w-[22vw] flex-col items-center">
              <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 + (3 - place) * 0.5 }} className="mb-[1.5vh] text-center">
                {place === 1 && <div className="text-[7vh] leading-none">💰</div>}
                <div className="font-poster text-[4.4vh] leading-none text-white">{r.teamName}</div>
                <div className="font-label text-[2vh] text-neutral-300">
                  {fmtChips(r.worth)} chips · <span className={pl >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}>{fmtPct(pl)}</span> · <b className="text-[#facc15]">+{r.bonus}</b>
                </div>
              </motion.div>
              <motion.div
                className="flex w-full items-start justify-center rounded-t-2xl pt-[2vh] font-poster text-[12vh] leading-none"
                style={{
                  background: place === 1 ? 'linear-gradient(#22e584,#065f46)' : place === 2 ? 'linear-gradient(#e5e7eb,#6b7280)' : 'linear-gradient(#f59e0b,#7c2d12)',
                  color: 'rgba(0,0,0,.55)',
                  boxShadow: place === 1 ? '0 0 80px rgba(34,229,132,.6)' : undefined,
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
      <Confetti fire={boom} colors={['#22e584', '#facc15', '#ffffff', '#f2e9d8', '#16a34a']} />
    </div>
  );
}
