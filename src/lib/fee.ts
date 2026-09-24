/**
 * Entry fee per team, in rupees. The single source of truth — the server
 * uses this over `event.fee` in the DB so the UI, UPI QR, amount check,
 * emails and admin totals can never disagree.
 */
export const ENTRY_FEE = 200;
