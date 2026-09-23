'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, Search, Trash2 } from 'lucide-react';
import { api } from '@/components/portal/api';
import { STATUS_META, timeAgo } from '@/components/portal/theme';
import type { Pagination, RegistrationDTO, RegistrationStatus } from '@/components/portal/types';
import { Banner, Button, Empty, LoadingBlock, PageTitle, StatusBadge, cx, inputCls } from '@/components/portal/ui';

type View = 'ALL' | RegistrationStatus;

const VIEWS: Array<{ id: View; label: string }> = [
  { id: 'ALL', label: 'All teams' },
  { id: 'UNDER_REVIEW', label: 'Verify queue' },
  { id: 'PAYMENT_PENDING', label: 'Unpaid' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'EXPIRED', label: 'Expired' },
];

const LIMIT = 25;

export default function RegistrationsPage() {
  const [view, setView] = useState<View>('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [rows, setRows] = useState<RegistrationDTO[] | null>(null);
  const [pg, setPg] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Initial view from ?view=… (links from the dashboard)
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view') as View | null;
    if (v && VIEWS.some((x) => x.id === v)) setView(v);
    setReady(true);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (view !== 'ALL') p.set('status', view);
    if (query) p.set('search', query);
    if (showDeleted) p.set('deleted', 'true');
    // Verify queue works oldest-first; everything else newest-first
    p.set('order', view === 'UNDER_REVIEW' ? 'asc' : 'desc');
    const res = await api<{ registrations: RegistrationDTO[]; pagination: Pagination }>(`/api/admin/registrations?${p}`, {}, 'admin');
    if (res.ok) {
      setRows(res.data.registrations);
      setPg(res.data.pagination);
      setError(null);
    } else setError(res.message);
  }, [page, view, query, showDeleted]);

  useEffect(() => {
    if (!ready) return;
    setRows(null);
    load();
    const url = new URL(window.location.href);
    if (view === 'ALL') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    window.history.replaceState(null, '', url);
  }, [load, ready, view]);

  const exportHref = `/api/admin/export${view !== 'ALL' ? `?status=${view}` : ''}`;

  return (
    <>
      <PageTitle
        kicker="Sector 01 // Player groups"
        title="Registrations"
        subtitle={pg ? `${pg.total} team${pg.total === 1 ? '' : 's'} in this view` : 'Loading…'}
        actions={
          <a
            href={exportHref}
            download
            className="inline-flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-neutral-200 hover:bg-neutral-800 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        }
      />

      {/* Views */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Registration views">
        {VIEWS.map((v) => {
          const active = v.id === view;
          const m = v.id !== 'ALL' ? STATUS_META[v.id] : null;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(v.id);
                setPage(1);
              }}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded border px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all',
                active ? 'border-red-600 bg-neutral-900 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)]' : 'border-neutral-800 bg-neutral-950/50 text-neutral-400 hover:text-white'
              )}
            >
              {m && <span style={{ color: m.glow }}>{m.symbol}</span>}
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Search + toggles */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Team ID, team name, leader email, register no. or phone   ( / )"
            aria-label="Search registrations"
            className={`${inputCls()} pl-10`}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-neutral-400">
          <input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} className="h-4 w-4 accent-red-600" />
          Include deleted
        </label>
      </div>

      {error && <Banner>{error}</Banner>}
      {!rows && !error && <LoadingBlock />}
      {rows && rows.length === 0 && <Empty title="No teams here">Try another view or clear the search.</Empty>}

      {rows && rows.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border border-neutral-800 bg-[#0e0e14]/85 backdrop-blur-md md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-800 bg-neutral-950/60 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Team ID</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Leader</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3 text-right">{view === 'UNDER_REVIEW' ? 'Waiting' : 'Registered'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const leader = r.players.find((p) => p.isLeader) ?? r.players[0];
                  return (
                    <tr key={r._id} className={cx('group border-b border-neutral-900 transition-colors last:border-0 hover:bg-red-950/10', r.deletedAt && 'opacity-50')}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/registrations/${r.teamId}`} className="font-mono text-sm font-bold text-red-400 group-hover:text-red-300">
                          {r.teamId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/registrations/${r.teamId}`} className="block">
                          <div className="font-semibold text-white">{r.teamName}</div>
                          <div className="font-mono text-[11px] text-neutral-500">
                            {r.players.length} players{r.deletedAt && ' · deleted'}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-neutral-200">{leader?.fullName}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{leader?.regNo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DayChips reg={r} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-neutral-400">{timeAgo(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => {
              const leader = r.players.find((p) => p.isLeader) ?? r.players[0];
              return (
                <Link
                  key={r._id}
                  href={`/admin/registrations/${r.teamId}`}
                  className={cx('block rounded-lg border border-neutral-800 bg-[#0e0e14]/85 p-4', r.deletedAt && 'opacity-50')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-bold text-red-400">{r.teamId}</div>
                      <div className="font-semibold text-white">{r.teamName}</div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-neutral-500">
                    <span>
                      {leader?.fullName} · {r.players.length}P
                    </span>
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.deletedAt && (
                    <div className="mt-2 flex items-center gap-1 font-mono text-[11px] text-red-400">
                      <Trash2 className="h-3 w-3" /> deleted
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {pg && pg.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between font-mono text-xs text-neutral-400">
              <span>
                Page {pg.page} of {pg.totalPages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pg.page <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <Button size="sm" onClick={() => setPage((p) => p + 1)} disabled={pg.page >= pg.totalPages}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function DayChips({ reg }: { reg: RegistrationDTO }) {
  if (reg.status !== 'CONFIRMED') return <span className="font-mono text-xs text-neutral-700">—</span>;
  return (
    <div className="flex gap-1.5">
      {[1, 2].map((d) => {
        const e = reg.attendance?.find((a) => a.day === d);
        return (
          <span
            key={d}
            title={e ? `Day ${d}: ${e.playersPresent.length}/${reg.players.length} present` : `Day ${d}: not marked`}
            className={cx(
              'rounded border px-1.5 py-0.5 font-mono text-[10px]',
              e ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-300' : 'border-neutral-800 text-neutral-600'
            )}
          >
            D{d} {e ? `${e.playersPresent.length}/${reg.players.length}` : '·'}
          </span>
        );
      })}
    </div>
  );
}
