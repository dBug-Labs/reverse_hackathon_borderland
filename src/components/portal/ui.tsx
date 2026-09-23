'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PORTAL_BG, STATUS_META } from './theme';
import type { RegistrationStatus } from './types';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ── Backgrounds ──────────────────────────────────────────────── */

/** Faint red glow + grid — same as the /register page. */
export function GridBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.12)_0%,transparent_65%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
    </>
  );
}

/** Inverted-city artwork + vignette + scanlines — same as the homepage-redesign hero. */
export function CityBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: `url('${PORTAL_BG}')`, filter: 'brightness(0.55) contrast(1.15)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, #08080a 0%, rgba(8,8,10,0.9) 25%, rgba(8,8,10,0.55) 55%, rgba(8,8,10,0.35) 100%)',
        }}
      />
      <div className="scanline-overlay absolute inset-0 opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/10 blur-[140px]" />
    </div>
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
  hud?: boolean;
}) {
  return (
    <section
      className={cx(
        'relative rounded-lg border border-neutral-800 bg-[#0e0e14]/85 p-5 backdrop-blur-md sm:p-6',
        hud && 'hud-corner',
        className
      )}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ icon, children, right }: { icon?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-red-500">
        {icon}
        <span>{children}</span>
      </h2>
      {right}
    </div>
  );
}

export function Kicker({ children, tone = 'red' }: { children: React.ReactNode; tone?: 'red' | 'emerald' }) {
  const t =
    tone === 'red'
      ? 'text-red-400 bg-red-950/40 border-red-800/60'
      : 'text-emerald-300 bg-emerald-950/40 border-emerald-700/60';
  const dot = tone === 'red' ? 'bg-red-500' : 'bg-emerald-400';
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-widest sm:text-xs', t)}>
      <span className={cx('inline-block h-1.5 w-1.5 animate-pulse rounded-full', dot)} />
      {children}
    </span>
  );
}

export function PageTitle({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-neutral-800 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-red-400 sm:text-xs">{kicker}</div>}
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 font-mono text-xs text-neutral-400 sm:text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Buttons & inputs ────────────────────────────────────────── */

type BtnVariant = 'primary' | 'ghost' | 'success' | 'danger' | 'subtle';

const BTN: Record<BtnVariant, string> = {
  primary:
    'bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:shadow-none',
  success:
    'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] disabled:shadow-none',
  danger: 'bg-red-950/60 hover:bg-red-900/60 border-red-700 text-red-200',
  ghost: 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200 hover:text-white',
  subtle: 'bg-transparent hover:bg-neutral-900 border-transparent text-neutral-400 hover:text-white',
};

export function Button({
  variant = 'ghost',
  size = 'md',
  loading,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : size === 'lg' ? 'px-6 py-3.5 text-sm' : 'px-4 py-2.5 text-xs';
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded border font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600',
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
  return <span className={cx('inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

export const inputCls = (err?: boolean) =>
  cx(
    'w-full rounded border bg-neutral-900 px-3.5 py-2.5 font-mono text-sm text-white placeholder-neutral-600 transition-colors focus:border-red-500 focus:outline-none',
    err ? 'border-red-500' : 'border-neutral-700'
  );

export function Field({ label, htmlFor, error, children, hint }: { label: string; htmlFor?: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-neutral-300">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 font-mono text-[11px] text-neutral-500">{hint}</p>}
      {error && <p className="mt-1 font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ── Feedback ────────────────────────────────────────────────── */

export function StatusBadge({ status, size = 'sm' }: { status: RegistrationStatus; size?: 'sm' | 'lg' }) {
  const m = STATUS_META[status] ?? STATUS_META.EXPIRED;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded border font-mono font-bold uppercase tracking-wider',
        size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[10px]',
        m.text,
        m.bg,
        m.border
      )}
    >
      <span style={{ textShadow: `0 0 8px ${m.glow}` }}>{m.symbol}</span>
      {m.label}
    </span>
  );
}

export function Banner({ tone = 'error', children, onClose }: { tone?: 'error' | 'success' | 'info'; children: React.ReactNode; onClose?: () => void }) {
  const t =
    tone === 'error'
      ? 'bg-red-950/60 border-red-600 text-red-200'
      : tone === 'success'
      ? 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
      : 'bg-neutral-900 border-neutral-700 text-neutral-300';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('mb-5 flex items-start gap-3 rounded border p-3.5 font-mono text-sm', t)}>
      {tone === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="flex-1">{children}</div>
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
    <div className="rounded-lg border border-dashed border-neutral-800 px-6 py-12 text-center">
      <div className="font-display text-3xl text-neutral-700">♠ ♦ ♣ ♥</div>
      <div className="mt-3 font-mono text-sm uppercase tracking-widest text-neutral-400">{title}</div>
      {children && <div className="mt-2 text-sm text-neutral-500">{children}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'DECRYPTING DATA…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 font-mono text-xs tracking-widest text-neutral-500">
      <Spinner className="text-red-500" />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="hud-corner relative w-full max-w-lg rounded-xl border-2 border-red-600/70 bg-[#0b0c12] p-6 shadow-[0_0_60px_rgba(220,38,38,0.3)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold uppercase text-white">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 text-sm text-neutral-300">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ── Small data viz (CSS only) ───────────────────────────────── */

export function Meter({ value, max, color = '#dc2626' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}80` }} />
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  glow,
  symbol,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  glow?: string;
  symbol?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-neutral-800 bg-[#0e0e14]/85 p-4 backdrop-blur-md">
      {symbol && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-3 font-display text-6xl font-black opacity-10"
          style={{ color: glow }}
        >
          {symbol}
        </span>
      )}
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-black text-white" style={glow ? { textShadow: `0 0 18px ${glow}55` } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-1 font-mono text-[11px] text-neutral-400">{sub}</div>}
    </div>
  );
}

export { cx };
