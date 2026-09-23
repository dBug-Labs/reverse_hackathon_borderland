import type { RegistrationStatus, ReconcileResult } from './types';

/**
 * Portal theme tokens — same poster language as the public site (landing + /register):
 * near-black #08080a, Anton poster headings in cream, Cinzel caps eyebrows in card red,
 * Plus Jakarta labels, aged playing-card paper, and a playing-card suit palette
 * (♠ ♣ cream, ♥ ♦ card red).
 */

// Background art (same image the /register pages use).
export const PORTAL_BG = '/images/inverted_city_bg.jpg';

export const CREAM = '#f5eee1';
export const CARD_RED = '#b3202a';

export const SUIT = {
  spades: { symbol: '♠', glow: CREAM },
  diamonds: { symbol: '♦', glow: CARD_RED },
  clubs: { symbol: '♣', glow: CREAM },
  hearts: { symbol: '♥', glow: CARD_RED },
} as const;

interface StatusMeta {
  label: string;
  symbol: string;
  glow: string;
  text: string;
  bg: string;
  border: string;
}

export const STATUS_META: Record<RegistrationStatus, StatusMeta> = {
  PAYMENT_PENDING: {
    label: 'Payment pending',
    symbol: '♠',
    glow: '#a3a3a3',
    text: 'text-neutral-200',
    bg: 'bg-neutral-800/70',
    border: 'border-neutral-700',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    symbol: '♦',
    glow: '#e0a93b',
    text: 'text-amber-200',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/35',
  },
  CONFIRMED: {
    label: 'Confirmed',
    symbol: '♣',
    glow: '#34d399',
    text: 'text-emerald-200',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/35',
  },
  REJECTED: {
    label: 'Rejected',
    symbol: '♥',
    glow: '#e5484d',
    text: 'text-[#ff8a8a]',
    bg: 'bg-[var(--card-red)]/15',
    border: 'border-[var(--card-red)]/60',
  },
  CANCELLED: {
    label: 'Cancelled',
    symbol: '✕',
    glow: '#737373',
    text: 'text-neutral-400',
    bg: 'bg-neutral-900',
    border: 'border-neutral-800',
  },
  EXPIRED: {
    label: 'Expired',
    symbol: '○',
    glow: '#737373',
    text: 'text-neutral-500',
    bg: 'bg-neutral-900',
    border: 'border-neutral-800',
  },
};

export const RECONCILE_META: Record<ReconcileResult, { label: string; text: string; bg: string; border: string }> = {
  MATCHED: { label: 'Matched', text: 'text-emerald-200', bg: 'bg-emerald-500/10', border: 'border-emerald-500/35' },
  AMOUNT_MISMATCH: { label: 'Amount mismatch', text: 'text-amber-200', bg: 'bg-amber-500/10', border: 'border-amber-500/35' },
  PROBABLE: { label: 'Probable', text: 'text-neutral-200', bg: 'bg-neutral-800/70', border: 'border-neutral-700' },
  NOT_FOUND: { label: 'Not found', text: 'text-[#ff8a8a]', bg: 'bg-[var(--card-red)]/15', border: 'border-[var(--card-red)]/60' },
};

export const REJECT_REASONS = [
  'UTR not found in bank statement',
  'Amount paid does not match the fee',
  'UTR belongs to a different payment',
  'Duplicate payment',
];

// ── Formatting helpers ────────────────────────────────────────────
export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function timeAgo(iso?: string) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '—';
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Team codes are plain text in the attendance QR: "DBG-472".
export const TEAM_CODE_RE = /^[A-Z]{2,6}-\d{3,5}$/;
export const normaliseTeamCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, '');
