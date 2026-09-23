'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PORTAL_BG, STATUS_META } from './theme';
import type { RegistrationStatus } from './types';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ── Backgrounds ──────────────────────────────────────────────── */

/** Faint inverted-city band across the top — same as the /register pages (RegisterShell). */
export function GridBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-top opacity-30" style={{ backgroundImage: `url('${PORTAL_BG}')` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,10,0.55), #08080a 95%)' }} />
    </div>
  );
}

/** Full-bleed inverted city for the login screens — same art and fade as the landing hero. */
export function CityBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-top opacity-55" style={{ backgroundImage: `url('${PORTAL_BG}')` }} />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(8,8,10,0.6) 0%, rgba(8,8,10,0.8) 45%, #08080a 90%)' }}
      />
    </div>
  );
}

/** dBug Labs mark + poster wordmark, as in the site navbar. */
export function Wordmark({ href = '/', suffix, className }: { href?: string; suffix?: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('flex min-w-0 items-center gap-2 font-poster text-2xl uppercase tracking-wide text-[#f5eee1]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/dbuglabs-logo.png" alt="" className="h-7 w-7 shrink-0" />
      <span className="leading-none">Hackback</span>
      {suffix && <span className="ml-1 truncate font-label text-xs font-semibold normal-case tracking-normal text-neutral-400">{suffix}</span>}
    </Link>
  );
}

/* ── Surfaces & type ─────────────────────────────────────────── */

export function Panel({
  children,
  className,
  hud = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Kept for API compatibility with the old HUD-corner panels; no visual effect now. */
  hud?: boolean;
}) {
  return (
    <section
      className={cx(
        'relative rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5 sm:p-6',
        hud && 'overflow-hidden',
        className
      )}
    >
      {children}
    </section>
  );
}

/** Aged playing-card surface (paper + ink) with the thin red inner frame. */
export function PaperCard({ children, className, innerClassName }: { children: React.ReactNode; className?: string; innerClassName?: string }) {
  return (
    <div className={cx('paper-card rounded-2xl p-2 text-[var(--ink)]', className)}>
      <div className={cx('h-full rounded-xl border border-[var(--card-red)]/45 p-5', innerClassName)}>{children}</div>
    </div>
  );
}

export function SectionLabel({ icon, children, right }: { icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
      <h2 className="flex items-center gap-2.5 font-poster text-xl uppercase leading-none text-[#f5eee1] sm:text-2xl">
        {icon && <span className="text-[var(--card-red)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        <span>{children}</span>
      </h2>
      {right}
    </div>
  );
}

export function Kicker({ children, tone = 'red' }: { children: React.ReactNode; tone?: 'red' | 'emerald' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 font-caps text-xs uppercase tracking-[0.3em] sm:text-sm',
        tone === 'red' ? 'text-[var(--card-red)]' : 'text-emerald-400'
      )}
    >
      {children}
    </span>
  );
}

export function PageTitle({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && <p className="font-caps text-xs uppercase tracking-[0.3em] text-[var(--card-red)] sm:text-sm">{kicker}</p>}
        <h1 className="mt-2 font-poster text-4xl uppercase leading-none text-[#f5eee1] sm:text-5xl">{title}</h1>
        {subtitle && <div className="mt-2.5 font-label text-sm text-neutral-400 sm:text-base">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Buttons & inputs ────────────────────────────────────────── */

type BtnVariant = 'primary' | 'ghost' | 'success' | 'danger' | 'subtle' | 'paper';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-[var(--card-red)] border-[var(--card-red)] text-white shadow-lg shadow-black/40 hover:brightness-110',
  paper: 'bg-[var(--paper)] border-[var(--paper)] text-[var(--ink)] hover:brightness-105',
  success: 'bg-emerald-700 border-emerald-700 text-white shadow-lg shadow-black/40 hover:bg-emerald-600',
  danger: 'bg-[var(--card-red)]/10 border-[var(--card-red)]/70 text-[#ff8a8a] hover:bg-[var(--card-red)]/20',
  ghost: 'bg-[#141417] border-neutral-800 text-neutral-200 hover:border-neutral-600 hover:text-white',
  subtle: 'bg-transparent border-transparent text-neutral-400 hover:bg-[#141417] hover:text-white',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  loading,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  // Large buttons use the poster face, like "Deal me in" on /register.
  const sz =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs font-label font-semibold rounded-md'
      : size === 'lg'
      ? 'px-7 py-3.5 font-poster uppercase text-xl tracking-wide rounded-lg'
      : 'px-4 py-2.5 text-sm font-label font-semibold rounded-lg';
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 border transition active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none disabled:brightness-100',
        BTN[variant],
        sz,
        className
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

export const inputCls = (err?: boolean) =>
  cx(
    'w-full rounded-lg border bg-[#141417] px-4 py-3 font-label text-[15px] text-white placeholder:text-neutral-600 outline-none transition focus:border-[var(--paper)] focus:bg-[#18181c]',
    err ? 'border-[var(--card-red)]' : 'border-neutral-800 hover:border-neutral-700'
  );

export function Field({ label, htmlFor, error, children, hint }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block font-label text-sm font-semibold text-neutral-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 font-label text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1.5 font-label text-sm text-[#ff6b6b]">{error}</p>}
    </div>
  );
}

/* ── Feedback ────────────────────────────────────────────────── */

export function StatusBadge({ status, size = 'sm' }: { status: RegistrationStatus; size?: 'sm' | 'lg' }) {
  const m = STATUS_META[status] ?? STATUS_META.EXPIRED;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-label font-semibold',
        size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs',
        m.text,
        m.bg,
        m.border
      )}
    >
      <span aria-hidden>{m.symbol}</span>
      {m.label}
    </span>
  );
}

export function Banner({ tone = 'error', children, onClose }: { tone?: 'error' | 'success' | 'info'; children: React.ReactNode; onClose?: () => void }) {
  const t =
    tone === 'error'
      ? 'border-[var(--card-red)]/60 bg-[var(--card-red)]/10 text-red-200'
      : tone === 'success'
      ? 'border-emerald-600/50 bg-emerald-500/10 text-emerald-200'
      : 'border-neutral-800 bg-[#0d0d10] text-neutral-300';
  const icon =
    tone === 'success' ? (
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
    ) : (
      <AlertCircle className={cx('mt-0.5 h-5 w-5 shrink-0', tone === 'error' ? 'text-[#ff6b6b]' : 'text-neutral-500')} />
    );
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('mb-5 flex items-start gap-3 rounded-xl border px-4 py-3.5 font-label text-[15px]', t)}>
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="text-current opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-12 text-center">
      <div className="text-3xl tracking-[0.3em] text-neutral-700" aria-hidden>
        ♠<span className="text-[var(--card-red)]/60">♥</span>
        <span className="text-[var(--card-red)]/60">♦</span>♣
      </div>
      <div className="mt-3 font-poster text-2xl uppercase text-neutral-300">{title}</div>
      {children && <div className="mt-1.5 font-label text-sm text-neutral-500">{children}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 font-label text-sm text-neutral-500">
      <Spinner className="text-[var(--card-red)]" />
      {label}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────── */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('textarea, input, button')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  // Portal to <body> so the overlay sits above the fixed sidebar / sticky headers.
  return createPortal(
    <div className="backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="card-pop relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-[#0d0d10] p-6 shadow-2xl shadow-black/60 sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <h3 className="font-poster text-3xl uppercase leading-none text-[#f5eee1]">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-neutral-800 bg-[#141417] p-1.5 text-neutral-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 font-label text-[15px] text-neutral-300">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ── Small data viz (CSS only) ───────────────────────────────── */

export function Meter({ value, max, color = 'var(--card-red)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800/80" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  symbol,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Legacy prop from the neon theme; ignored. */
  glow?: string;
  symbol?: string;
}) {
  const red = symbol === '♥' || symbol === '♦';
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5">
      {symbol && (
        <span
          aria-hidden
          className={cx('pointer-events-none absolute -right-2 -top-5 text-[88px] leading-none opacity-[0.07]', red ? 'text-[var(--card-red)]' : 'text-white')}
        >
          {symbol}
        </span>
      )}
      <div className="relative flex items-center gap-2 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        {symbol && <span className={cx('text-sm', red ? 'text-[var(--card-red)]' : 'text-[#f5eee1]')}>{symbol}</span>}
        {label}
      </div>
      <div className="relative mt-2 font-poster text-4xl leading-none text-[#f5eee1]">
        {value}
      </div>
      {sub && <div className="relative mt-2 font-label text-sm text-neutral-500">{sub}</div>}
    </div>
  );
}

export { cx };
