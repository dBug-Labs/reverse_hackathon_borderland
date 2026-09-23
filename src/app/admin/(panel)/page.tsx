'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ClipboardCheck, Clock, Mail, RefreshCw, Users } from 'lucide-react';
import { api } from '@/components/portal/api';
import { STATUS_META, SUIT, inr, timeAgo } from '@/components/portal/theme';
import type { DashboardStatsDTO, RegistrationStatus } from '@/components/portal/types';
import { Banner, Button, LoadingBlock, Meter, PageTitle, Panel, SectionLabel, StatTile } from '@/components/portal/ui';

const STATUS_ORDER: RegistrationStatus[] = ['CONFIRMED', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'REJECTED', 'CANCELLED', 'EXPIRED'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<DashboardStatsDTO>('/api/admin/stats', {}, 'admin');
    if (res.ok) {
      setStats(res.data);
      setError(null);
      setUpdatedAt(new Date());
    } else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <>
      <PageTitle
        kicker="Sector 00 // Overview"
        title="The Board"
        subtitle={updatedAt ? `Live numbers · updated ${updatedAt.toLocaleTimeString('en-IN', { hour12: false })} · auto-refresh 30s` : 'Live numbers'}
        actions={
          <>
            <Button onClick={load} loading={loading} variant="ghost">
              {!loading && <RefreshCw className="h-3.5 w-3.5" />} Refresh
            </Button>
            <Link
              href="/admin/registrations?view=UNDER_REVIEW"
              className="inline-flex items-center gap-2 rounded border border-red-500 bg-red-600 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:bg-red-500"
            >
              Verify queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {error && <Banner>{error}</Banner>}
      {!stats && !error && <LoadingBlock />}

      {stats && (
        <div className="space-y-6">
          <NeedsAttention stats={stats} />

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total teams" value={stats.totalTeams} sub={`${stats.totalPlayers} players`} symbol="♠" glow={SUIT.spades.glow} />
            <StatTile label="Confirmed" value={stats.confirmedTeams} sub="Visa issued" symbol="♣" glow={SUIT.clubs.glow} />
            <StatTile
              label="Under review"
              value={stats.underReviewTeams}
              sub={stats.oldestPending ? `Oldest ${timeAgo(stats.oldestPending)}` : 'Queue clear'}
              symbol="♦"
              glow={SUIT.diamonds.glow}
            />
            <StatTile label="Payment pending" value={stats.paymentPendingTeams} sub="No UTR yet" symbol="♠" glow={SUIT.spades.glow} />
            <StatTile label="Revenue confirmed" value={inr(stats.revenueConfirmed)} sub="Should match bank" symbol="₹" glow={SUIT.clubs.glow} />
            <StatTile label="Revenue pending" value={inr(stats.revenuePending)} sub="Awaiting approval" symbol="₹" glow={SUIT.diamonds.glow} />
            <StatTile label="Rejected" value={stats.rejectedTeams} sub={`${stats.cancelledTeams} cancelled · ${stats.expiredTeams} expired`} symbol="♥" glow={SUIT.hearts.glow} />
            <div className="rounded-lg border border-neutral-800 bg-[#0e0e14]/85 p-4 backdrop-blur-md">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Capacity used</div>
              <div className="mt-1.5 font-display text-3xl font-black text-white">
                {stats.capacityUsed}
                <span className="text-lg text-neutral-500"> / {stats.capacity}</span>
              </div>
              <div className="mt-3">
                <Meter value={stats.capacityUsed} max={stats.capacity} color={stats.capacityUsed / Math.max(1, stats.capacity) > 0.9 ? '#ef4444' : '#dc2626'} />
              </div>
              <div className="mt-1.5 font-mono text-[11px] text-neutral-400">Confirmed + under review</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Status breakdown */}
            <Panel className="lg:col-span-2" hud>
              <SectionLabel icon={<Users className="h-4 w-4" />}>Status breakdown</SectionLabel>
              <StatusBar counts={stats.statusCounts} total={stats.totalTeams} />
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STATUS_ORDER.map((s) => {
                  const m = STATUS_META[s];
                  const n = stats.statusCounts[s] || 0;
                  return (
                    <Link
                      key={s}
                      href={`/admin/registrations?view=${s}`}
                      className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 transition-colors hover:border-neutral-600"
                    >
                      <span className="flex items-center gap-2 font-mono text-xs text-neutral-300">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.glow }} />
                        {m.label}
                      </span>
                      <span className="font-mono text-sm font-bold text-white">{n}</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>

            {/* Attendance */}
            <Panel hud>
              <SectionLabel
                icon={<ClipboardCheck className="h-4 w-4" />}
                right={
                  <Link href="/admin/attendance-report" className="font-mono text-[11px] text-neutral-400 hover:text-white">
                    Report →
                  </Link>
                }
              >
                Attendance
              </SectionLabel>
              {[1, 2].map((d) => {
                const n = d === 1 ? stats.attendanceDay1 : stats.attendanceDay2;
                return (
                  <div key={d} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">Day {d}</span>
                      <span className="font-display text-2xl font-black text-white">
                        {n}
                        <span className="text-sm text-neutral-500"> / {stats.confirmedTeams} teams</span>
                      </span>
                    </div>
                    <Meter value={n} max={stats.confirmedTeams} color={SUIT.clubs.glow} />
                  </div>
                );
              })}
              <p className="mt-4 font-mono text-[11px] leading-relaxed text-neutral-500">
                Marking happens only at the check-in terminal (<span className="text-neutral-300">/attendance</span>).
              </p>
            </Panel>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel>
              <SectionLabel>Team size mix</SectionLabel>
              <BarList
                rows={[2, 3, 4].map((n) => ({ label: `${n} players`, value: stats.teamSizeMix[String(n)] || 0 }))}
                color={SUIT.diamonds.glow}
              />
            </Panel>
            <Panel>
              <SectionLabel>Where teams heard about us</SectionLabel>
              {Object.keys(stats.sourceCounts).length === 0 ? (
                <p className="font-mono text-xs text-neutral-500">No source data yet.</p>
              ) : (
                <BarList
                  rows={Object.entries(stats.sourceCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, value]) => ({ label, value }))}
                  color={SUIT.spades.glow}
                />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

function NeedsAttention({ stats }: { stats: DashboardStatsDTO }) {
  const items: Array<{ icon: React.ReactNode; text: React.ReactNode; href: string; tone: string }> = [];
  if (stats.underReviewTeams > 0)
    items.push({
      icon: <Clock className="h-4 w-4" />,
      text: (
        <>
          <b>{stats.underReviewTeams}</b> UTR{stats.underReviewTeams > 1 ? 's' : ''} waiting for verification
          {stats.oldestPending && <span className="text-amber-200/70"> · oldest {timeAgo(stats.oldestPending)}</span>}
        </>
      ),
      href: '/admin/registrations?view=UNDER_REVIEW',
      tone: 'border-amber-600/60 bg-amber-950/30 text-amber-200',
    });
  if (stats.failedEmails > 0)
    items.push({
      icon: <Mail className="h-4 w-4" />,
      text: (
        <>
          <b>{stats.failedEmails}</b> email{stats.failedEmails > 1 ? 's' : ''} failed to send
        </>
      ),
      href: '/admin/emails?status=FAILED',
      tone: 'border-red-600/60 bg-red-950/40 text-red-200',
    });
  if (stats.capacity > 0 && stats.capacityUsed / stats.capacity >= 0.9)
    items.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      text: <>Capacity is {Math.round((stats.capacityUsed / stats.capacity) * 100)}% used — consider closing registrations</>,
      href: '/admin/registrations',
      tone: 'border-red-600/60 bg-red-950/40 text-red-200',
    });

  if (items.length === 0)
    return (
      <div className="flex items-center gap-3 rounded border border-emerald-700/60 bg-emerald-950/30 px-4 py-3 font-mono text-sm text-emerald-200">
        <span className="font-display text-lg">♣</span> All clear — nothing needs attention right now.
      </div>
    );

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((it, i) => (
        <Link key={i} href={it.href} className={`flex items-center gap-3 rounded border px-4 py-3 font-mono text-sm transition-transform hover:scale-[1.01] ${it.tone}`}>
          {it.icon}
          <span className="flex-1">{it.text}</span>
          <ArrowRight className="h-4 w-4 opacity-70" />
        </Link>
      ))}
    </div>
  );
}

function StatusBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (!total) return <p className="font-mono text-xs text-neutral-500">No registrations yet.</p>;
  return (
    <div className="flex h-4 w-full overflow-hidden rounded-full bg-neutral-800">
      {STATUS_ORDER.map((s) => {
        const n = counts[s] || 0;
        if (!n) return null;
        const m = STATUS_META[s];
        return <div key={s} title={`${m.label}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: m.glow }} className="h-full border-r border-[#0e0e14] last:border-0" />;
      })}
    </div>
  );
}

function BarList({ rows, color }: { rows: Array<{ label: string; value: number }>; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between font-mono text-xs">
            <span className="text-neutral-300">{r.label}</span>
            <span className="font-bold text-white">{r.value}</span>
          </div>
          <Meter value={r.value} max={max} color={color} />
        </div>
      ))}
    </div>
  );
}
