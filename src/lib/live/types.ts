/**
 * Live games on Day 2: Code Detective (a quiz show) and the Trading Floor (a stock exchange).
 *
 * Shared by the server and the client, so no server-only imports here.
 * Dates travel as epoch milliseconds so the clients can line their clocks up with the server.
 */

import type { TrackId } from '@/lib/cardDrop/cards';

export type GameKind = 'detective' | 'exchange';
export type GameStatus = 'LOBBY' | 'LIVE' | 'ENDED';

export interface RosterTeam {
  teamId: string;
  teamName: string;
  card?: string;
  track?: TrackId;
}

/* ── Code Detective ───────────────────────────────────────────────────── */

export type DetPhase = 'lobby' | 'intro' | 'wager' | 'question' | 'reveal' | 'board' | 'final';
export type QKind = 'line' | 'mcq' | 'order' | 'sort';

export interface Round {
  title: string;
  subtitle: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

/** What a player or the screen may see of a question before the reveal. */
export interface PublicQuestion {
  qi: number;
  round: number;
  kind: QKind;
  /** Name on the dealt card. */
  title?: string;
  prompt: string;
  /** Code lines or a file tree for `line` questions. */
  code?: string[];
  options?: string[];
  /** order / sort: the items as shown. */
  items?: string[];
  buckets?: string[];
  stamp?: string;
  secs: number;
  allIn?: boolean;
  /** Every team drew its own card for this question (by its card, or from a deck). */
  dealt?: boolean;
  /** Dealt by card: the card this challenge is about. */
  card?: string;
}

export interface RevealInfo {
  qi: number;
  /** Shared questions: the right line(s) / option, the right order, or the right bucket per item. */
  correct: number[];
  explain: string;
  /** line / mcq: how many teams picked each line or option. */
  counts: number[];
  answered: number;
  right: number;
  wrong: number;
  /** Average accuracy of the teams that answered (0–1). */
  avgAcc: number;
  fastest?: { teamId: string; teamName: string; ms: number };
  /** Every team's accuracy (0–1), for the card wall. Missing = no answer. */
  perTeam: Record<string, number>;
}

export interface DetBoardRow {
  teamId: string;
  teamName: string;
  track?: TrackId;
  card?: string;
  pts: number;
  /** Points won or lost on the last revealed question. */
  delta: number;
  rank: number;
  prevRank: number;
  streak: number;
  right: number;
  /** Code Detective points out of 50 if the game ended now. */
  cd: number;
  /** How the team did on the last revealed question. */
  last?: 'right' | 'partial' | 'wrong' | 'none';
  /** Accuracy on the last revealed question (0–1). */
  acc?: number;
  /** Points bet on the All In question (once revealed). */
  stake?: number;
}

/* ── Trading Floor ────────────────────────────────────────────────────── */

export interface Ticker {
  code: string;
  price: number;
  open: number;
  hist: number[];
  high: number;
  low: number;
  /** Shares traded since the market opened. */
  vol: number;
}

export interface NewsItem {
  id: string;
  at: number;
  headline: string;
  /** Card code, `track:<id>` or `all`. */
  target: string;
  pct: number;
  auto?: boolean;
}

export interface ExBoardRow {
  teamId: string;
  teamName: string;
  track?: TrackId;
  card?: string;
  cash: number;
  worth: number;
  rank: number;
  prevRank: number;
  /** Shares held, by card (only sent to the team itself). */
  h?: Record<string, number>;
  /** Made at least one trade (only traders get a bonus). */
  traded?: boolean;
  bonus: number;
}

export interface MarketDTO {
  tickers: Ticker[];
  tick: number;
  tickMs: number;
  openAt?: number;
  closeAt?: number;
  haltUntil?: number;
  news: NewsItem[];
  autoNews: boolean;
  startCash: number;
  spread: number;
  maxOrder: number;
}

/* ── What the APIs return ─────────────────────────────────────────────── */

export interface GameSummary {
  id: string;
  kind: GameKind;
  name: string;
  group: string;
  status: GameStatus;
  teams: number;
  createdAt: number;
}

export interface GameState {
  id: string;
  kind: GameKind;
  name: string;
  group: string;
  status: GameStatus;
  v: number;
  now: number;
  roster: RosterTeam[];
  joined: string[];
  // detective
  rounds?: Round[];
  total?: number;
  qi?: number;
  phase?: DetPhase;
  openAt?: number;
  closeAt?: number;
  question?: PublicQuestion;
  reveal?: RevealInfo;
  detBoard?: DetBoardRow[];
  /** Admin/screen only: teams that have answered (or wagered) in the current phase. */
  locked?: string[];
  /** Admin/screen only: wagers placed for the All In question. */
  wagers?: Record<string, number>;
  // exchange
  market?: MarketDTO;
  exBoard?: ExBoardRow[];
  /** Admin only: the answer to the current question, for the Game Master. */
  key?: { correct: number[]; explain: string; text?: string[] };
  /** Set once the game has ended. */
  results?: GameResult[];
}

export interface GameResult {
  teamId: string;
  teamName: string;
  /** Game points (Detective) or final net worth (Exchange). */
  raw: number;
  /** Points that go into the final score: out of 50 (Detective) or a bonus out of 30 (Exchange). */
  final: number;
}

export interface LiveScoreRow {
  teamId: string;
  teamName: string;
  card?: string;
  detective?: number;
  trading?: number;
  detectiveGame?: string;
  tradingGame?: string;
}

export interface MyDetective {
  /** My answer to the current question, if I gave one. */
  answer?: { qi: number; choice: number | number[]; ms: number };
  /** After the reveal: the right answer to my own challenge. */
  key?: { correct: number[]; explain: string };
  wager?: number;
  /** My result on the last revealed question. */
  result?: { qi: number; correct: boolean; pts: number; streak: number };
  row?: DetBoardRow;
}

export interface MyExchange {
  cash: number;
  h: Record<string, number>;
  worth: number;
  rank?: number;
  bonus?: number;
  seq: number;
}

export interface TeamGameView {
  team: { teamId: string; teamName: string; card?: string; track?: TrackId };
  game?: GameState;
  det?: MyDetective;
  ex?: MyExchange;
  /** Other games this team is in (to switch between them). */
  games: GameSummary[];
  now: number;
}

/* ── Scoring: game results into the final score ───────────────────────── */

/** Per question, at best: 1,000 points (600 for being right, up to 400 for speed). */
export const Q_MAX = 1000;
export const Q_BASE = 600;
export const Q_SPEED = 400;
export const WRONG_PENALTY = 200;
export const STREAK_BONUS = 100;

/**
 * Code Detective is worth 50 points. The team with the most game points gets all 50;
 * everyone else gets the same share of 50 as their share of the top score.
 */
export function detectiveToFinal(pts: number, best: number): number {
  if (best <= 0 || pts <= 0) return 0;
  return Math.max(0, Math.min(50, Math.round((50 * pts) / best)));
}

/**
 * Trading is a bonus of up to 30 points. Every team that made at least one trade is ranked
 * by net worth: the best trader gets 30, the rest scale down by rank. No trades, no bonus.
 */
export function exchangeBonuses(rows: Array<{ teamId: string; worth: number; traded?: boolean }>): Record<string, number> {
  const active = rows.filter((r) => r.traded).sort((a, b) => b.worth - a.worth);
  const out: Record<string, number> = {};
  rows.forEach((r) => (out[r.teamId] = 0));
  active.forEach((r, i) => (out[r.teamId] = Math.round((30 * (active.length - i)) / active.length)));
  return out;
}
