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
  { id: 'QUEUED', label: 'Queued', tone: 'text-sky-300' },
  { id: 'SENDING', label: 'Sending', tone: 'text-amber-300' },
  { id: 'SENT', label: 'Sent', tone: 'text-emerald-300' },
  { id: 'FAILED', label: 'Failed', tone: 'text-red-300' },
];
const PILL: Record<EmailJobDTO['status'], string> = {
  QUEUED: 'border-sky-600/50 bg-sky-950/40 text-sky-300',
  SENDING: 'border-amber-600/50 bg-amber-950/40 text-amber-300',
  SENT: 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300',
  FAILED: 'border-red-600/60 bg-red-950/50 text-red-300',
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
        kicker="Sector 04 // Transmissions"
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
              'shrink-0 rounded border px-3 py-2 font-mono text-xs uppercase tracking-wider',
              status === t.id ? 'border-red-600 bg-neutral-900 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)]' : cx('border-neutral-800 bg-neutral-950/50 hover:text-white', t.tone || 'text-neutral-400')
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
        <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-[#0e0e14]/85 backdrop-blur-md">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-neutral-800 bg-neutral-950/60 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
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
                  <td className="px-4 py-3 font-mono text-xs font-bold text-white">{j.template}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-300">
                    {(Array.isArray(j.to) ? j.to : [j.to]).join(', ')}
                    {j.cc && j.cc.length > 0 && <div className="text-neutral-500">cc {j.cc.length}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cx('rounded border px-2 py-0.5 font-mono text-[10px] uppercase', PILL[j.status])}>{j.status}</span>
                    {j.lastError && <div className="mt-1.5 max-w-[260px] break-words font-mono text-[11px] text-red-400">{j.lastError.slice(0, 140)}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">{j.attempts}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">
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
        <div className="mt-5 flex items-center justify-between font-mono text-xs text-neutral-400">
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
