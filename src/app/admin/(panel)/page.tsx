'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, ClipboardCheck, Copy, Mail, RefreshCw, Undo2, X } from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { api, post } from '@/components/portal/api';
import { REJECT_REASONS, STATUS_META, fmtDateTime, inr, timeAgo } from '@/components/portal/theme';
import type { DashboardStatsDTO, PaymentDTO, RegistrationDTO, RegistrationStatus } from '@/components/portal/types';
import { Banner, Button, LoadingBlock, Meter, PageTitle, Panel, SectionLabel, cx, inputCls } from '@/components/portal/ui';

/**
 * Admin home = the payment verification desk.
 * Every team waiting for UTR verification is listed here (oldest first) with its UTR,
 * amount and one-tap Approve / Reject — no need to open each team.
 */

const PAGE = 20;
const STATUS_ORDER: RegistrationStatus[] = ['CONFIRMED', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'REJECTED', 'CANCELLED', 'EXPIRED'];

interface QueueItem {
  reg: RegistrationDTO;
  payment?: PaymentDTO;
}

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [fee, setFee] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    const res = await api<DashboardStatsDTO>('/api/admin/stats', {}, 'admin');
    if (res.ok) setStats(res.data);
    else setError(res.message);
  }, []);

  const loadQueue = useCallback(async () => {
    const p = new URLSearchParams({ status: 'UNDER_REVIEW', order: 'asc', page: '1', limit: String(limit) });
    const res = await api<{ registrations: RegistrationDTO[]; pagination: { total: number } }>(`/api/admin/registrations?${p}`, {}, 'admin');
    if (!res.ok) return setError(res.message);
    // The list has no payment info, so fetch each team's latest UTR in parallel.
    const items = await Promise.all(
      res.data.registrations.map(async (reg) => {
        const d = await api<{ registration: RegistrationDTO; payments: PaymentDTO[] }>(`/api/admin/registrations/${reg.teamId}`, {}, 'admin');
        return { reg, payment: d.ok ? d.data.payments?.[0] : undefined };
      })
    );
    setQueue(items);
    setTotal(res.data.pagination.total);
    setError(null);
  }, [limit]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadQueue()]);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [loadStats, loadQueue]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Numbers refresh on their own; the queue only on demand, so a card never jumps while you read it.
  useEffect(() => {
    const t = setInterval(loadStats, 30_000);
    return () => clearInterval(t);
  }, [loadStats]);

  useEffect(() => {
    api<{ fee: number }>('/api/event').then((r) => r.ok && typeof r.data?.fee === 'number' && setFee(r.data.fee));
  }, []);

  const waiting = stats?.underReviewTeams ?? total;

  return (
    <>
      <PageTitle
        kicker="Game master console"
        title="Verify payments"
        subtitle={
          <>
            {waiting > 0 ? `${waiting} team${waiting === 1 ? '' : 's'} waiting` : 'Nothing waiting'}
            {stats?.oldestPending && waiting > 0 ? ` · oldest ${timeAgo(stats.oldestPending)}` : ''}
            {updatedAt ? ` · updated ${updatedAt.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}` : ''}
          </>
        }
        actions={
          <Button onClick={refresh} loading={loading}>
            {!loading && <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        }
      />

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      {/* Headline numbers on a playing card, like the landing page info strip */}
      {stats && (
        <div className="paper-card relative mb-6 rounded-2xl p-2 text-[var(--ink)]">
          <div className="relative grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-[var(--card-red)]/45 px-6 py-5 sm:px-10 md:grid-cols-4">
            <span aria-hidden className="absolute left-2.5 top-2 text-sm leading-none">♠</span>
            <span aria-hidden className="absolute right-2.5 top-2 text-sm leading-none text-[var(--card-red)]">♥</span>
            <span aria-hidden className="absolute bottom-2 left-2.5 text-sm leading-none text-[var(--card-red)]">♦</span>
            <span aria-hidden className="absolute bottom-2 right-2.5 text-sm leading-none">♣</span>
            <Headline label="To verify" value={stats.underReviewTeams} sub={stats.oldestPending ? `Oldest ${timeAgo(stats.oldestPending)}` : 'Queue clear'} />
            <Headline label="Confirmed" value={stats.confirmedTeams} sub={`${stats.capacityUsed} / ${stats.capacity} seats used`} href="/admin/registrations?view=CONFIRMED" />
            <Headline label="Not paid yet" value={stats.paymentPendingTeams} sub="No UTR submitted" href="/admin/registrations?view=PAYMENT_PENDING" />
            <Headline label="Collected" value={inr(stats.revenueConfirmed)} sub={`${inr(stats.revenuePending)} waiting`} />
          </div>
        </div>
      )}

      <Alerts stats={stats} />

      {/* ── The queue ── */}
      <section aria-label="Payments to verify">
        <div className="mb-4 flex items-end justify-between gap-3 border-b border-neutral-800 pb-3">
          <h2 className="font-poster text-2xl uppercase leading-none text-[#f5eee1] sm:text-3xl">Waiting for you</h2>
          <p className="hidden font-label text-sm text-neutral-500 sm:block">Check each UTR in the bank app, then approve or reject.</p>
        </div>

        {!queue && !error && <LoadingBlock label="Loading payments…" />}

        {queue && queue.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-800 px-6 py-14 text-center">
            <div className="text-5xl leading-none text-[#f5eee1]" aria-hidden>
              ♣
            </div>
            <p className="mt-4 font-poster text-3xl uppercase text-[#f5eee1]">All caught up</p>
            <p className="mt-1.5 font-label text-sm text-neutral-500">New UTRs show up here as teams submit them.</p>
          </div>
        )}

        {queue && queue.length > 0 && (
          <div className="space-y-4">
            {queue.map((item) => (
              <VerifyCard key={item.reg.teamId} item={item} fee={fee} onDone={loadStats} />
            ))}
          </div>
        )}

        {queue && total > queue.length && (
          <div className="mt-5 text-center">
            <Button onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, total - queue.length)} more · {total - queue.length} left
            </Button>
          </div>
        )}
      </section>

      {/* ── Everything else, kept small ── */}
      {stats && (
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2">
            <SectionLabel right={<Link href="/admin/registrations" className="font-label text-sm font-semibold text-neutral-400 hover:text-white">All teams →</Link>}>
              Team status · {stats.totalTeams}
            </SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUS_ORDER.map((s) => {
                const m = STATUS_META[s];
                return (
                  <Link
                    key={s}
                    href={`/admin/registrations?view=${s}`}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-[#141417] px-3 py-2.5 transition-colors hover:border-neutral-600"
                  >
                    <span className="flex items-center gap-2 font-label text-sm text-neutral-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.glow }} />
                      {m.label}
                    </span>
                    <span className="font-poster text-xl leading-none text-[#f5eee1]">{stats.statusCounts[s] || 0}</span>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <SectionLabel
              icon={<ClipboardCheck className="h-4 w-4" />}
              right={<Link href="/admin/attendance-report" className="font-label text-sm font-semibold text-neutral-400 hover:text-white">Report →</Link>}
            >
              Attendance
            </SectionLabel>
            {[1, 2].map((d) => {
              const n = d === 1 ? stats.attendanceDay1 : stats.attendanceDay2;
              return (
                <div key={d} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="font-label text-sm font-semibold text-neutral-300">Day {d}</span>
                    <span className="font-poster text-2xl leading-none text-[#f5eee1]">
                      {n}
                      <span className="font-label text-sm text-neutral-500"> / {stats.confirmedTeams}</span>
                    </span>
                  </div>
                  <Meter value={n} max={stats.confirmedTeams} color="#34d399" />
                </div>
              );
            })}
          </Panel>
        </div>
      )}
    </>
  );
}

/* ── One team waiting for verification ─────────────────────────── */

type CardState = 'idle' | 'confirm-approve' | 'rejecting' | 'approved' | 'rejected' | 'gone';

function VerifyCard({ item, fee, onDone }: { item: QueueItem; fee: number | null; onDone: () => void }) {
  const { reg, payment } = item;
  const [state, setState] = useState<CardState>('idle');
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyKind, setBusyKind] = useState<null | 'approve' | 'reject' | 'undo-reject'>(null);

  const leader = reg.players.find((p) => p.isLeader) ?? reg.players[0];
  const mismatch = fee != null && payment && payment.amount !== fee;
  const url = `/api/admin/registrations/${reg.teamId}`;

  // "Approve" needs a second tap within 4s — one stray click can't issue a Visa.
  useEffect(() => {
    if (state !== 'confirm-approve') return;
    const t = setTimeout(() => setState('idle'), 4000);
    return () => clearTimeout(t);
  }, [state]);

  async function run(kind: 'approve' | 'reject' | 'undo-reject', body?: unknown) {
    playHudClick();
    setBusyKind(kind);
    setError(null);
    const res = await post(`${url}/${kind}`, body, 'admin');
    setBusyKind(null);
    if (!res.ok) {
      if (res.code === 'STALE_STATE') {
        setError(`${res.message} Someone may have handled this team already.`);
        setState('gone');
      } else {
        setError(res.message);
        setState(kind === 'reject' ? 'rejecting' : kind === 'undo-reject' ? 'rejected' : 'idle');
      }
      return;
    }
    if (kind === 'approve') playAccessGranted();
    setState(kind === 'approve' ? 'approved' : kind === 'reject' ? 'rejected' : 'idle');
    onDone();
  }

  function copyUtr() {
    if (!payment) return;
    navigator.clipboard?.writeText(payment.utr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Finished cards shrink to a one-line receipt.
  if (state === 'approved' || state === 'rejected' || state === 'gone') {
    return (
      <div
        className={cx(
          'flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 font-label text-[15px]',
          state === 'approved' && 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100',
          state === 'rejected' && 'border-[var(--card-red)]/60 bg-[var(--card-red)]/10 text-red-100',
          state === 'gone' && 'border-neutral-800 bg-[#0d0d10] text-neutral-400'
        )}
      >
        {state === 'approved' ? <Check className="h-5 w-5 text-emerald-400" /> : state === 'rejected' ? <X className="h-5 w-5 text-[#ff8a8a]" /> : null}
        <span className="font-poster text-xl uppercase leading-none tracking-wide text-[#f5eee1]">{reg.teamId}</span>
        <span className="min-w-0 flex-1">
          {state === 'approved' && 'Approved — Entry Visa issued, confirmation email queued.'}
          {state === 'rejected' && 'Rejected — the leader was emailed the reason.'}
          {state === 'gone' && (error || 'Already handled.')}
        </span>
        {state === 'rejected' && (
          <Button size="sm" onClick={() => run('undo-reject')} loading={busyKind === 'undo-reject'}>
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
        )}
        <Link href={`/admin/registrations/${reg.teamId}`} className="font-label text-sm font-semibold text-neutral-300 hover:text-white">
          Open →
        </Link>
      </div>
    );
  }

  const busy = busyKind !== null;

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#0d0d10]">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.1fr_1.3fr_auto] lg:items-center">
        {/* Team */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Link href={`/admin/registrations/${reg.teamId}`} className="font-poster text-3xl uppercase leading-none tracking-wide text-[#f5eee1] hover:text-[#ff8a8a]">
              {reg.teamId}
            </Link>
            <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 font-label text-xs font-semibold text-amber-200">
              {timeAgo(payment?.createdAt ?? reg.updatedAt)}
            </span>
          </div>
          <p className="mt-1.5 truncate font-label text-[15px] font-semibold text-white">{reg.teamName}</p>
          <p className="mt-0.5 truncate font-label text-sm text-neutral-500">
            {leader?.fullName} · {reg.leaderPhone} · {reg.players.length} players
          </p>
          {reg.rejectCount > 0 && (
            <p className="mt-1.5 font-label text-xs font-semibold text-[#ff8a8a]">Rejected {reg.rejectCount}× before — this is a new UTR</p>
          )}
        </div>

        {/* Payment — what to look for in the bank app */}
        <div className="rounded-xl border border-neutral-800 bg-[#141417] px-4 py-3.5">
          {payment ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">UTR</span>
                <button onClick={copyUtr} className="inline-flex items-center gap-1 font-label text-xs font-semibold text-neutral-400 hover:text-white">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-1 break-all font-label text-2xl font-bold tabular-nums tracking-wider text-white">{payment.utr}</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-label text-sm">
                <span className={cx('font-bold', mismatch ? 'text-amber-300' : 'text-[#f5eee1]')}>
                  {inr(payment.amount)}
                  {mismatch && <span className="ml-1.5 font-semibold">≠ fee {inr(fee as number)}</span>}
                </span>
                {payment.payerUpi && <span className="text-neutral-400">{payment.payerUpi}</span>}
                <span className="text-neutral-500">{fmtDateTime(payment.createdAt)}</span>
              </div>
            </>
          ) : (
            <p className="font-label text-sm text-neutral-500">Couldn’t load the UTR — open the team to check it.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 lg:w-52 lg:flex-col">
          <Button
            variant="success"
            className="min-h-[48px] flex-1 lg:w-full"
            onClick={() => (state === 'confirm-approve' ? run('approve') : setState('confirm-approve'))}
            disabled={busy || !payment || state === 'rejecting'}
            loading={busyKind === 'approve'}
          >
            {busyKind !== 'approve' && <Check className="h-4 w-4" />}
            {state === 'confirm-approve' ? 'Tap again to confirm' : 'Approve'}
          </Button>
          <Button
            variant="danger"
            className="min-h-[48px] flex-1 lg:w-full"
            onClick={() => {
              setReason(REJECT_REASONS[0]);
              setState(state === 'rejecting' ? 'idle' : 'rejecting');
            }}
            disabled={busy}
          >
            <X className="h-4 w-4" /> {state === 'rejecting' ? 'Cancel' : 'Reject'}
          </Button>
        </div>
      </div>

      {error && state !== 'rejecting' && (
        <div className="border-t border-neutral-800 px-5 py-3 font-label text-sm text-[#ff8a8a] sm:px-6">{error}</div>
      )}

      {/* Inline reject — pick a reason, confirm */}
      {state === 'rejecting' && (
        <div className="border-t border-neutral-800 bg-[#0a0a0d] px-5 py-4 sm:px-6">
          <p className="font-label text-sm font-semibold text-neutral-300">Why? The leader sees this and can send a new UTR.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...REJECT_REASONS, 'OTHER'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cx(
                  'rounded-full border px-3.5 py-1.5 font-label text-sm font-semibold transition-colors',
                  reason === r ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                )}
              >
                {r === 'OTHER' ? 'Other…' : r}
              </button>
            ))}
          </div>
          {reason === 'OTHER' && (
            <input
              autoFocus
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Explain in simple words"
              className={cx(inputCls(), 'mt-3')}
            />
          )}
          {error && <p className="mt-3 font-label text-sm text-[#ff8a8a]">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => run('reject', { reason: reason === 'OTHER' ? custom.trim() : reason })}
              disabled={reason === 'OTHER' ? custom.trim().length < 5 : !reason}
              loading={busyKind === 'reject'}
            >
              <X className="h-4 w-4" /> Reject & email leader
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ── Small bits ─────────────────────────────────────────────────── */

function Alerts({ stats }: { stats: DashboardStatsDTO | null }) {
  if (!stats) return null;
  const items: Array<{ icon: React.ReactNode; text: React.ReactNode; href: string }> = [];
  if (stats.failedEmails > 0)
    items.push({
      icon: <Mail className="h-4 w-4" />,
      text: (
        <>
          <b>{stats.failedEmails}</b> email{stats.failedEmails > 1 ? 's' : ''} failed to send
        </>
      ),
      href: '/admin/emails?status=FAILED',
    });
  if (stats.capacity > 0 && stats.capacityUsed / stats.capacity >= 0.9)
    items.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      text: <>Seats are {Math.round((stats.capacityUsed / stats.capacity) * 100)}% full — consider closing registrations</>,
      href: '/admin/registrations',
    });
  if (items.length === 0) return null;
  return (
    <div className="mb-6 grid gap-2 md:grid-cols-2">
      {items.map((it, i) => (
        <Link
          key={i}
          href={it.href}
          className="flex items-center gap-3 rounded-xl border border-[var(--card-red)]/60 bg-[var(--card-red)]/10 px-4 py-3.5 font-label text-[15px] text-red-100 transition hover:-translate-y-0.5"
        >
          {it.icon}
          <span className="flex-1">{it.text}</span>
          <ArrowRight className="h-4 w-4 opacity-70" />
        </Link>
      ))}
    </div>
  );
}

function Headline({ label, value, sub, href }: { label: string; value: React.ReactNode; sub: string; href?: string }) {
  const body = (
    <>
      <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">{label}</div>
      <div className="mt-1.5 font-poster text-4xl leading-none sm:text-5xl">{value}</div>
      <div className="mt-1.5 font-label text-sm text-[var(--ink)]/60">{sub}</div>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-lg transition-opacity hover:opacity-80">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
