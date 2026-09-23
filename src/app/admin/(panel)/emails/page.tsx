'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, RotateCw } from 'lucide-react';
import { api, post } from '@/components/portal/api';
import { fmtDateTime } from '@/components/portal/theme';
import type { EmailJobDTO } from '@/components/portal/types';
import { Banner, Button, Empty, LoadingBlock, PageTitle, cx } from '@/components/portal/ui';

type St = 'ALL' | EmailJobDTO['status'];
const TABS: Array<{ id: St; label: string; tone: string }> = [
  { id: 'ALL', label: 'All', tone: '' },
  { id: 'QUEUED', label: 'Queued', tone: 'text-neutral-200' },
  { id: 'SENDING', label: 'Sending', tone: 'text-amber-200' },
  { id: 'SENT', label: 'Sent', tone: 'text-emerald-200' },
  { id: 'FAILED', label: 'Failed', tone: 'text-[#ff8a8a]' },
];
const PILL: Record<EmailJobDTO['status'], string> = {
  QUEUED: 'border-neutral-700 bg-neutral-800/70 text-neutral-200',
  SENDING: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
  SENT: 'border-emerald-600/35 bg-emerald-500/10 text-emerald-200',
  FAILED: 'border-[var(--card-red)]/60 bg-[var(--card-red)]/10 text-[#ff8a8a]',
};
const LIMIT = 30;

export default function EmailsPage() {
  const [status, setStatus] = useState<St>('ALL');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<EmailJobDTO[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status') as St | null;
    if (s && TABS.some((t) => t.id === s)) setStatus(s);
    setReady(true);
  }, []);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status !== 'ALL') p.set('status', status);
    const res = await api<{ jobs: EmailJobDTO[]; total: number }>(`/api/admin/emails?${p}`, {}, 'admin');
    if (res.ok) {
      setJobs(res.data.jobs);
      setTotal(res.data.total);
      setError(null);
    } else setError(res.message);
  }, [page, status]);

  useEffect(() => {
    if (ready) {
      setJobs(null);
      load();
    }
  }, [load, ready]);

  async function retry(id: string) {
    setRetrying(id);
    const res = await post(`/api/admin/emails/${id}/retry`, {}, 'admin');
    setRetrying(null);
    if (res.ok) {
      setFlash('Email re-queued. It will go out on the next send cycle.');
      load();
    } else setError(res.message);
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <PageTitle
        kicker="Transmissions"
        title="Email Outbox"
        subtitle="Every email the platform sends goes through this queue. Failed ones can be retried."
        actions={
          <Button onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setStatus(t.id);
              setPage(1);
            }}
            className={cx(
              'shrink-0 rounded-full border px-4 py-2 font-label text-sm font-semibold transition-colors',
              status === t.id
                ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]'
                : cx('border-neutral-800 hover:border-neutral-600 hover:text-white', t.tone || 'text-neutral-400')
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
      {flash && (
        <Banner tone="success" onClose={() => setFlash(null)}>
          {flash}
        </Banner>
      )}
      {!jobs && !error && <LoadingBlock />}
      {jobs && jobs.length === 0 && <Empty title="Outbox empty">No emails in this state.</Empty>}

      {jobs && jobs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-[#0d0d10]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-[#141417] font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j._id} className="border-b border-neutral-900 align-top last:border-0">
                  <td className="px-4 py-3 font-label text-sm font-bold text-white">{j.template}</td>
                  <td className="px-4 py-3 font-label text-sm text-neutral-300">
                    {(Array.isArray(j.to) ? j.to : [j.to]).join(', ')}
                    {j.cc && j.cc.length > 0 && <div className="text-neutral-500">cc {j.cc.length}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cx('rounded-full border px-2.5 py-0.5 font-label text-xs font-semibold', PILL[j.status])}>{j.status}</span>
                    {j.lastError && <div className="mt-1.5 max-w-[260px] break-words font-label text-xs text-[#ff8a8a]">{j.lastError.slice(0, 140)}</div>}
                  </td>
                  <td className="px-4 py-3 font-label text-sm text-neutral-400">{j.attempts}</td>
                  <td className="px-4 py-3 font-label text-sm text-neutral-400">
                    {j.sentAt ? `Sent ${fmtDateTime(j.sentAt)}` : j.status === 'FAILED' ? `Queued ${fmtDateTime(j.createdAt)}` : `Next ${fmtDateTime(j.nextAttemptAt)}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {j.status === 'FAILED' && (
                      <Button size="sm" onClick={() => retry(j._id)} loading={retrying === j._id}>
                        {retrying !== j._id && <RotateCw className="h-3.5 w-3.5" />} Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between font-label text-sm text-neutral-400">
          <span>
            Page {page} of {pages} · {total} emails
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Button>
            <Button size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
