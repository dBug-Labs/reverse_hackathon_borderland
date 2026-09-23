'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Search } from 'lucide-react';
import { api } from '@/components/portal/api';
import { SUIT, fmtTime } from '@/components/portal/theme';
import type { Pagination, RegistrationDTO } from '@/components/portal/types';
import { Banner, Button, Empty, LoadingBlock, Meter, PageTitle, Panel, SectionLabel, StatTile, cx, inputCls } from '@/components/portal/ui';

type Show = 'ALL' | 'PRESENT' | 'PARTIAL' | 'ABSENT';

// Read-only view. There is no dedicated report endpoint yet, so we page through
// confirmed teams (100 per request) and work the numbers out in the browser.
async function fetchAllConfirmed(): Promise<RegistrationDTO[] | string> {
  const all: RegistrationDTO[] = [];
  for (let page = 1; page < 50; page++) {
    const res = await api<{ registrations: RegistrationDTO[]; pagination: Pagination }>(
      `/api/admin/registrations?status=CONFIRMED&limit=100&page=${page}&order=asc`,
      {},
      'admin'
    );
    if (!res.ok) return res.message;
    all.push(...res.data.registrations);
    if (page >= res.data.pagination.totalPages) break;
  }
  return all;
}

export default function AttendanceReportPage() {
  const [teams, setTeams] = useState<RegistrationDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<1 | 2>(1);
  const [show, setShow] = useState<Show>('ALL');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchAllConfirmed();
    if (typeof r === 'string') setError(r);
    else {
      setTeams(r);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const data = useMemo(() => {
    if (!teams) return null;
    const rows = teams.map((t) => {
      const e = t.attendance?.find((a) => a.day === day);
      const present = e?.playersPresent.length ?? 0;
      const state: Show = !e ? 'ABSENT' : present >= t.players.length ? 'PRESENT' : 'PARTIAL';
      return { t, e, present, state };
    });
    const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
    const playersIn = rows.reduce((s, r) => s + r.present, 0);
    const teamsIn = rows.filter((r) => r.e).length;
    // arrivals per 30 minutes
    const buckets = new Map<string, number>();
    rows.forEach((r) => {
      if (!r.e) return;
      const d = new Date(r.e.markedAt);
      d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
      const k = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
      buckets.set(k, (buckets.get(k) || 0) + 1);
    });
    const arrivals = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { rows, totalPlayers, playersIn, teamsIn, arrivals, partial: rows.filter((r) => r.state === 'PARTIAL').length };
  }, [teams, day]);

  const visible = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        (show === 'ALL' || r.state === show) &&
        (!needle || r.t.teamId.toLowerCase().includes(needle) || r.t.teamName.toLowerCase().includes(needle))
    );
  }, [data, show, q]);

  return (
    <>
      <PageTitle
        kicker="Sector 03 // Gate report"
        title="Attendance"
        subtitle="Read-only. Volunteers mark attendance at the check-in terminal (/attendance)."
        actions={
          <Button onClick={load} loading={loading}>
            {!loading && <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </Button>
        }
      />

      <div className="mb-6 inline-flex rounded border border-neutral-800 bg-neutral-950/60 p-1" role="tablist" aria-label="Day">
        {[1, 2].map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={day === d}
            onClick={() => setDay(d as 1 | 2)}
            className={cx(
              'rounded px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all',
              day === d ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-neutral-400 hover:text-white'
            )}
          >
            Day 0{d}
          </button>
        ))}
      </div>

      {error && <Banner>{error}</Banner>}
      {!data && !error && <LoadingBlock />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Teams in" value={`${data.teamsIn}/${data.rows.length}`} symbol="♣" glow={SUIT.clubs.glow} sub={`${data.rows.length ? Math.round((data.teamsIn / data.rows.length) * 100) : 0}% of confirmed`} />
            <StatTile label="Players in" value={`${data.playersIn}/${data.totalPlayers}`} symbol="♠" glow={SUIT.spades.glow} />
            <StatTile label="Partial teams" value={data.partial} symbol="♦" glow={SUIT.diamonds.glow} sub="Some players missing" />
            <StatTile label="No-shows" value={data.rows.length - data.teamsIn} symbol="♥" glow={SUIT.hearts.glow} sub="Not marked yet" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel className="lg:col-span-1" hud>
              <SectionLabel>Arrivals (per 30 min)</SectionLabel>
              {data.arrivals.length === 0 ? (
                <p className="font-mono text-xs text-neutral-500">Nobody marked for Day {day} yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {data.arrivals.map(([slot, n]) => (
                    <div key={slot} className="grid grid-cols-[52px_1fr_28px] items-center gap-3 font-mono text-xs">
                      <span className="text-neutral-400">{slot}</span>
                      <Meter value={n} max={Math.max(...data.arrivals.map((a) => a[1]))} color={SUIT.clubs.glow} />
                      <span className="text-right text-white">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['ALL', 'All'],
                      ['PRESENT', 'Full team'],
                      ['PARTIAL', 'Partial'],
                      ['ABSENT', 'No-show'],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setShow(k)}
                      className={cx('rounded border px-2.5 py-1 font-mono text-[11px] uppercase', show === k ? 'border-red-600 bg-neutral-900 text-white' : 'border-neutral-800 text-neutral-400 hover:text-white')}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team ID or name" aria-label="Filter teams" className={`${inputCls()} py-2 pl-10`} />
                </div>
              </div>

              {visible.length === 0 ? (
                <Empty title="No teams in this filter" />
              ) : (
                <div className="max-h-[560px] overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-[#0e0e14] font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">Team</th>
                        <th className="px-3 py-2">Present</th>
                        <th className="px-3 py-2">Marked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(({ t, e, present, state }) => (
                        <tr key={t._id} className="border-t border-neutral-900">
                          <td className="px-3 py-2.5">
                            <Link href={`/admin/registrations/${t.teamId}`} className="font-mono font-bold text-red-400 hover:text-red-300">
                              {t.teamId}
                            </Link>
                            <div className="text-xs text-neutral-400">{t.teamName}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cx(
                                'rounded border px-2 py-0.5 font-mono text-xs',
                                state === 'PRESENT' && 'border-emerald-600/60 text-emerald-300',
                                state === 'PARTIAL' && 'border-amber-600/60 text-amber-300',
                                state === 'ABSENT' && 'border-red-800 text-red-400'
                              )}
                            >
                              {present}/{t.players.length}
                            </span>
                            {state === 'PARTIAL' && e && (
                              <div className="mt-1 font-mono text-[10px] text-neutral-500">
                                Missing: {t.players.filter((p) => !e.playersPresent.includes(p.slot)).map((p) => p.fullName.split(' ')[0]).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-neutral-400">{e ? `${fmtTime(e.markedAt)} · ${e.markedBy}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
