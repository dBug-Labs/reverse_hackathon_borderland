import type { RegistrationStatus, ReconcileResult } from './types';

/**
 * Portal theme tokens — same language as the public site
 * (homepage-redesign hero + /register): near-black #08080a, red-600 CTAs with glow,
 * Cinzel display type, JetBrains mono labels, HUD corners, and the four suit glow colours.
 */

// Background art for the login screens. Swap to '/images/inverted_city_bg.jpg'
// once the homepage-redesign hero + images are merged into main.
export const PORTAL_BG = '/images/dystopian_city_inverted_hero.jpg';

export const SUIT = {
  spades: { symbol: '♠', glow: '#38bdf8' }, // sky
  diamonds: { symbol: '♦', glow: '#f59e0b' }, // amber
  clubs: { symbol: '♣', glow: '#10b981' }, // emerald
  hearts: { symbol: '♥', glow: '#ef4444' }, // red
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
    glow: SUIT.spades.glow,
    text: 'text-sky-300',
    bg: 'bg-sky-950/40',
    border: 'border-sky-500/40',
  },
  UNDER_REVIEW: {
    label: 'Under review',
    symbol: '♦',
    glow: SUIT.diamonds.glow,
    text: 'text-amber-300',
    bg: 'bg-amber-950/40',
    border: 'border-amber-500/40',
  },
  CONFIRMED: {
    label: 'Confirmed',
    symbol: '♣',
    glow: SUIT.clubs.glow,
    text: 'text-emerald-300',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-500/40',
  },
  REJECTED: {
    label: 'Rejected',
    symbol: '♥',
    glow: SUIT.hearts.glow,
    text: 'text-red-300',
    bg: 'bg-red-950/50',
    border: 'border-red-500/50',
  },
  CANCELLED: {
    label: 'Cancelled',
    symbol: '✕',
    glow: '#737373',
    text: 'text-neutral-300',
    bg: 'bg-neutral-900',
    border: 'border-neutral-700',
  },
  EXPIRED: {
    label: 'Expired',
    symbol: '○',
    glow: '#737373',
    text: 'text-neutral-400',
    bg: 'bg-neutral-900',
    border: 'border-neutral-700',
  },
};

export const RECONCILE_META: Record<ReconcileResult, { label: string; text: string; bg: string; border: string }> = {
  MATCHED: { label: 'Matched', text: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-500/40' },
  AMOUNT_MISMATCH: { label: 'Amount mismatch', text: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-500/40' },
  PROBABLE: { label: 'Probable', text: 'text-sky-300', bg: 'bg-sky-950/40', border: 'border-sky-500/40' },
  NOT_FOUND: { label: 'Not found', text: 'text-red-300', bg: 'bg-red-950/50', border: 'border-red-500/50' },
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
