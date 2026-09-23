'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '@/components/portal/api';
import { fmtDateTime } from '@/components/portal/theme';
import type { AuditLogDTO, Pagination } from '@/components/portal/types';
import { Banner, Button, Empty, LoadingBlock, PageTitle, cx, inputCls } from '@/components/portal/ui';

const ACTIONS = ['', 'APPROVE', 'REJECT', 'UNDO_REJECT', 'CANCEL', 'EDIT', 'SOFT_DELETE', 'RESTORE', 'RECONCILE', 'MARK_ATTENDANCE'];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogDTO[] | null>(null);
  const [pg, setPg] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [target, setTarget] = useState('');
  const [targetQ, setTargetQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTargetQ(target.trim().toUpperCase());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [target]);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), limit: '50' });
    if (action) p.set('action', action);
    if (targetQ) p.set('targetId', targetQ);
    const res = await api<{ logs: AuditLogDTO[]; pagination: Pagination }>(`/api/admin/audit?${p}`, {}, 'admin');
    if (res.ok) {
      setLogs(res.data.logs);
      setPg(res.data.pagination);
      setError(null);
    } else setError(res.message);
  }, [page, action, targetQ]);

  useEffect(() => {
    setLogs(null);
    load();
  }, [load]);

  return (
    <>
      <PageTitle kicker="Black box" title="Audit Log" subtitle="Who did what, and when. Nothing here can be edited or deleted." />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Filter by action" className={`${inputCls()} sm:w-56`}>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a ? a.replace(/_/g, ' ') : 'All actions'}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Team ID, e.g. DBG-472" aria-label="Filter by team" className={`${inputCls()} pl-10`} />
        </div>
      </div>

      {error && <Banner>{error}</Banner>}
      {!logs && !error && <LoadingBlock />}
      {logs && logs.length === 0 && <Empty title="No entries" />}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-[#0d0d10]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-[#141417] font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-b border-neutral-900 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-label text-sm text-neutral-400">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-label text-sm text-white">{l.actorName}</div>
                    <span
                      className={cx(
                        'mt-1 inline-block rounded-full border px-2.5 py-0.5 font-label text-xs font-semibold',
                        l.scope === 'admin' ? 'border-[var(--card-red)]/60 text-[#ff8a8a]' : 'border-emerald-600/35 text-emerald-200'
                      )}
                    >
                      {l.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-label text-sm font-bold text-neutral-200">{l.action.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-label text-sm">
                    {/^[A-Z]+-\d+$/.test(l.targetId) ? (
                      <Link href={`/admin/registrations/${l.targetId}`} className="font-poster text-lg uppercase leading-none tracking-wide text-[#f5eee1] transition-colors hover:text-[#ff8a8a]">
                        {l.targetId}
                      </Link>
                    ) : (
                      <span className="text-neutral-400">{l.targetId}</span>
                    )}
                  </td>
                  <td className="max-w-[360px] px-4 py-3 font-label text-xs text-neutral-500">
                    {[l.before && `before ${JSON.stringify(l.before)}`, l.after && `after ${JSON.stringify(l.after)}`].filter(Boolean).join(' → ').slice(0, 260) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pg && pg.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between font-label text-sm text-neutral-400">
          <span>
            Page {pg.page} of {pg.totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPage((p) => p - 1)} disabled={pg.page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button size="sm" onClick={() => setPage((p) => p + 1)} disabled={pg.page >= pg.totalPages}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
