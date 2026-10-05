/**
 * The Trading Floor price engine (pure functions, run on the server).
 *
 * Every card in play is a stock. Each tick a price moves by:
 *   order flow  – net shares bought since the last tick push it up (sold: down), capped per tick
 *   noise       – a small random wobble
 *   pull        – flow-driven bubbles slowly drift back to the anchor
 *   news        – a shock moves the price and the anchor together, so news sticks
 */

import { CARD_BY_CODE, TRACKS, type TrackId } from '@/lib/cardDrop/cards';
import type { NewsItem, Ticker } from './types';

export const START_PRICE = 100;
export const START_CASH = 10_000;
export const TICK_MS = 2500;
export const SPREAD = 0.01;
export const MAX_ORDER = 100;
export const ORDER_COOLDOWN_MS = 1200;
const HIST = 160;
const IMPACT_PER_SHARE = 0.0003;
const MAX_FLOW_MOVE = 0.08;
const NOISE = 0.006;
const PULL = 0.03;

export interface MarketDoc {
  tickers: Ticker[];
  /** News moves the anchor; flow and noise do not. */
  anchor: Record<string, number>;
  flowTotal: Record<string, number>;
  flowApplied: Record<string, number>;
  tick: number;
  lastTickAt: number;
  openAt?: number;
  closeAt?: number;
  haltUntil?: number;
  news: NewsItem[];
  autoNews: boolean;
  nextAutoAt?: number;
  durationMin: number;
}

export function newMarket(cards: string[], durationMin: number): MarketDoc {
  return {
    tickers: cards.map((code) => ({ code, price: START_PRICE, open: START_PRICE, hist: [START_PRICE], high: START_PRICE, low: START_PRICE, vol: 0 })),
    anchor: Object.fromEntries(cards.map((c) => [c, START_PRICE])),
    flowTotal: {},
    flowApplied: {},
    tick: 0,
    lastTickAt: 0,
    news: [],
    autoNews: true,
    durationMin,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function gauss() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Which tickers a news target hits. */
export function targets(m: MarketDoc, target: string): string[] {
  if (target === 'all') return m.tickers.map((t) => t.code);
  if (target.startsWith('track:')) {
    const tr = target.slice(6) as TrackId;
    return m.tickers.filter((t) => CARD_BY_CODE[t.code]?.track === tr).map((t) => t.code);
  }
  return m.tickers.some((t) => t.code === target) ? [target] : [];
}

/** One step of the market. `shock` maps card → fraction (0.15 = +15%). */
export function step(m: MarketDoc, now: number, shock: Record<string, number> = {}): MarketDoc {
  const tickers = m.tickers.map((t) => {
    const flow = (m.flowTotal[t.code] || 0) - (m.flowApplied[t.code] || 0);
    const anchor = m.anchor[t.code] || START_PRICE;
    const flowMove = Math.max(-MAX_FLOW_MOVE, Math.min(MAX_FLOW_MOVE, flow * IMPACT_PER_SHARE));
    const pull = -PULL * Math.log(t.price / anchor);
    let price = t.price * Math.exp(flowMove + pull + NOISE * gauss());
    if (shock[t.code]) price *= 1 + shock[t.code];
    price = Math.max(5, r2(price));
    const hist = [...t.hist, price].slice(-HIST);
    return { ...t, price, hist, high: Math.max(t.high, price), low: Math.min(t.low, price) };
  });
  const anchor = { ...m.anchor };
  for (const [code, pct] of Object.entries(shock)) anchor[code] = r2((anchor[code] || START_PRICE) * (1 + pct));
  return { ...m, tickers, anchor, flowApplied: { ...m.flowTotal }, tick: m.tick + 1, lastTickAt: now };
}

/* ── Rumours: random news that keeps the floor moving ─────────────────── */

const UP = [
  'Insiders say a {card} team just passed a Killer Test',
  'A mentor was seen nodding at the {card} tables',
  '{card} demo runs first time. Traders pile in',
  'Leaked: judges love what the {card} teams are building',
  '{card} teams ship a Differentiator nobody saw coming',
];
const DOWN = [
  'Rumour: a {card} demo crashed on a mentor’s laptop',
  'Merge-conflict chaos reported at the {card} tables',
  '{card} teams spotted reading the original’s code. Clean-room probe?',
  'A {card} Killer Test fails live. Panic selling',
  'Whispers of a missing .env.example on {card}',
];
const TRACK_UP = ['The {track} track is on fire this morning', 'Judges overheard praising the {track} track'];
const TRACK_DOWN = ['Sell-off hits the {track} track', 'Mentors worried about the {track} track'];

export function rumour(m: MarketDoc, now: number): { item: NewsItem; shock: Record<string, number> } | null {
  if (!m.tickers.length) return null;
  const up = Math.random() < 0.5;
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  if (Math.random() < 0.2) {
    const tracks = [...new Set(m.tickers.map((t) => CARD_BY_CODE[t.code]?.track).filter(Boolean))] as TrackId[];
    const tr = pick(tracks);
    const pct = (up ? 1 : -1) * (0.04 + Math.random() * 0.05);
    const target = `track:${tr}`;
    const headline = pick(up ? TRACK_UP : TRACK_DOWN).replace('{track}', `${TRACKS[tr].suit} ${TRACKS[tr].label}`);
    return { item: { id: `n${now}`, at: now, headline, target, pct: r2(pct), auto: true }, shock: Object.fromEntries(targets(m, target).map((c) => [c, pct])) };
  }
  const t = pick(m.tickers);
  const pct = (up ? 1 : -1) * (0.05 + Math.random() * 0.08);
  const headline = pick(up ? UP : DOWN).replace('{card}', (CARD_BY_CODE[t.code]?.name ?? t.code).replace(/^The /, ''));
  return { item: { id: `n${now}`, at: now, headline, target: t.code, pct: r2(pct), auto: true }, shock: { [t.code]: pct } };
}

export function worthOf(cash: number, h: Record<string, number> | undefined, tickers: Ticker[]): number {
  const price = Object.fromEntries(tickers.map((t) => [t.code, t.price]));
  let w = cash;
  for (const [code, qty] of Object.entries(h || {})) w += (price[code] || 0) * qty;
  return r2(w);
}
