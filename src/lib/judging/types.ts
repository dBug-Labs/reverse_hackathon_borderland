/**
 * Final judging: four panels, teams drawn into them from the post-lunch attendance.
 * Shared by the server and the client, so no server-only imports here.
 */

import type { TrackId } from '@/lib/cardDrop/cards';

export type Suit = '♠' | '♥' | '♦' | '♣';

/** SETUP: nothing drawn · DRAWN: drawn, not shown yet · ANNOUNCED: teams can see it, panels running · DONE */
export type JudgingStatus = 'SETUP' | 'DRAWN' | 'ANNOUNCED' | 'DONE';

/** waiting: in the queue · called: in front of the panel now · done: judged */
export type SlotState = 'waiting' | 'called' | 'done';

export interface PanelInfo {
  suit: Suit;
  /** The track this panel judges first (its judges know these cards). */
  track?: TrackId;
  name: string;
  place: string;
  judges: string;
}

export interface Slot {
  teamId: string;
  teamName: string;
  track?: TrackId;
  card?: string;
  panel: number;
  order: number;
  state: SlotState;
  calledAt?: number;
  doneAt?: number;
  /** Drawn into a panel that is not its own track's (to balance the panels). */
  moved?: boolean;
  /** Added by hand after the draw (a late arrival). */
  late?: boolean;
}

export interface JudgingState {
  status: JudgingStatus;
  v: number;
  now: number;
  /** Planned start of the first slot (epoch ms) and the length of one slot. */
  startAt: number;
  slotMin: number;
  mode: 'track' | 'random';
  panels: PanelInfo[];
  slots: Slot[];
  /** Which attendance session the draw used, and how many teams were present. */
  source?: { session: number; present: number; at: number };
  drawnAt?: number;
  announcedAt?: number;
}

/** What a team's phone gets. */
export interface TeamJudging {
  status: JudgingStatus;
  teamName: string;
  panel: PanelInfo & { index: number };
  order: number;
  total: number;
  state: SlotState;
  calledAt?: number;
  /** Teams still in front of this one (the one presenting counts). */
  ahead: number;
  /** Rough time this team will be called (epoch ms). */
  eta: number;
  slotMin: number;
}

/** Teams of one panel, in calling order. */
export function queueOf(slots: Slot[], panel: number): Slot[] {
  return slots.filter((s) => s.panel === panel).sort((a, b) => a.order - b.order);
}

/**
 * When each waiting team should expect to be called. Before the panel starts it is
 * the planned time; once it runs, it counts on from the team presenting now.
 */
export function etaFor(st: Pick<JudgingState, 'slots' | 'startAt' | 'slotMin'>, s: Slot, now: number): number {
  const slot = st.slotMin * 60_000;
  const q = queueOf(st.slots, s.panel);
  const cur = q.find((x) => x.state === 'called');
  const waiting = q.filter((x) => x.state === 'waiting');
  const k = waiting.findIndex((x) => x.teamId === s.teamId);
  if (s.state !== 'waiting' || k < 0) return s.calledAt ?? st.startAt;
  const started = q.some((x) => x.state !== 'waiting');
  if (!started) return Math.max(st.startAt, now) + k * slot;
  const base = cur?.calledAt ? Math.max(now, cur.calledAt + slot) : now;
  return base + k * slot;
}

export const fmtClock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
