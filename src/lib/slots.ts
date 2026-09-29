/**
 * Slot-capacity and urgency configuration.
 *
 * TOTAL_SLOTS        – maximum number of teams the event can accept.
 * URGENCY_THRESHOLD  – fraction of TOTAL_SLOTS; the urgency banner/popup
 *                      appear only when remaining slots fall below this.
 * CRITICAL_THRESHOLD – remaining slots below this number trigger the
 *                      stronger red/amber visual state.
 * POLL_INTERVAL_MS   – how often the client re-fetches registration data.
 */

export const TOTAL_SLOTS = 60;

/** Show urgency UI when remaining ≤ 20 % of total */
export const URGENCY_THRESHOLD = 0.2;

/** Stronger visual when remaining drops below this absolute number */
export const CRITICAL_SLOTS = 10;

/** Polling interval in milliseconds (45 s) */
export const POLL_INTERVAL_MS = 45_000;
