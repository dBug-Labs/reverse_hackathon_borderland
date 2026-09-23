'use client';

import React, { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { CheckCheck, FileSpreadsheet, Play, Upload } from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { post } from '@/components/portal/api';
import { RECONCILE_META, inr } from '@/components/portal/theme';
import type { ReconcileReportDTO, ReconcileResult } from '@/components/portal/types';
import { Banner, Button, Empty, Field, Modal, PageTitle, Panel, SectionLabel, StatTile, cx, inputCls } from '@/components/portal/ui';

interface Mapping {
  utrColumn: string;
  amountColumn: string;
  dateColumn: string;
  remarksColumn: string;
}

// Best-guess the bank's column names so most uploads need zero clicks.
function guess(headers: string[]): Mapping {
  const find = (...needles: string[]) => headers.find((h) => needles.some((n) => h.toLowerCase().includes(n))) || '';
  return {
    utrColumn: find('utr', 'ref', 'reference', 'transaction id', 'rrn'),
    amountColumn: find('credit', 'amount', 'deposit', 'cr'),
    dateColumn: find('date', 'value dt', 'txn dt'),
    remarksColumn: find('remark', 'narration', 'description', 'particular', 'details'),
  };
}

type Filter = 'ALL' | ReconcileResult;

export default function ReconcilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({ utrColumn: '', amountColumn: '', dateColumn: '', remarksColumn: '' });
  const [report, setReport] = useState<ReconcileReportDTO | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<{ done: number; total: number; failed: string[] } | null>(null);

  function onFile(f: File | undefined) {
    if (!f) return;
    setError(null);
    setReport(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, preview: 6 });
      const hs = parsed.meta.fields || [];
      if (!hs.length) {
        setError('Could not read any columns. Export the statement as CSV (comma-separated) and try again.');
        return;
      }
      setFileName(f.name);
      setCsvText(text);
      setHeaders(hs);
      setPreview(parsed.data.slice(0, 5));
      setMapping(guess(hs));
    };
    reader.readAsText(f);
  }

  async function run() {
    playHudClick();
    setBusy(true);
    setError(null);
    const res = await post<ReconcileReportDTO>(
      '/api/admin/reconcile',
      {
        csvText,
        fileName,
        mapping: {
          utrColumn: mapping.utrColumn,
          amountColumn: mapping.amountColumn,
          ...(mapping.dateColumn ? { dateColumn: mapping.dateColumn } : {}),
          ...(mapping.remarksColumn ? { remarksColumn: mapping.remarksColumn } : {}),
        },
      },
      'admin'
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setReport(res.data);
    setFilter('ALL');
  }

  const matched = useMemo(() => report?.matches.filter((m) => m.result === 'MATCHED') ?? [], [report]);

  // There is no bulk endpoint yet, so approve MATCHED teams one by one.
  async function approveAllMatched() {
    setBulkOpen(false);
    const state = { done: 0, total: matched.length, failed: [] as string[] };
    setBulk({ ...state });
    for (const m of matched) {
      const r = await post(`/api/admin/registrations/${m.teamId}/approve`, {}, 'admin');
      state.done += 1;
      if (!r.ok) state.failed.push(`${m.teamId} (${r.message})`);
      setBulk({ ...state, failed: [...state.failed] });
    }
    playAccessGranted();
    setFlash(`Approved ${state.total - state.failed.length} of ${state.total} matched teams.`);
  }

  const rows = report ? report.matches.filter((m) => filter === 'ALL' || m.result === filter) : [];
  const canRun = csvText && mapping.utrColumn && mapping.amountColumn;

  return (
    <>
      <PageTitle
        kicker="Sector 02 // The Ledger"
        title="Bank Reconcile"
        subtitle="Upload the bank statement CSV → we match every UTR under review against it."
      />

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
      {flash && (
        <Banner tone="success" onClose={() => setFlash(null)}>
          {flash}
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel hud className="lg:col-span-2">
          <SectionLabel icon={<Upload className="h-4 w-4" />}>1 · Upload statement</SectionLabel>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-950/50 px-4 py-10 text-center transition-colors hover:border-red-600"
          >
            <FileSpreadsheet className="h-10 w-10 text-red-500" />
            <span className="font-mono text-sm text-white">{fileName || 'Drop CSV here or click to choose'}</span>
            <span className="font-mono text-[11px] text-neutral-500">The file stays in your browser until you press Run — it’s never stored.</span>
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

          {headers.length > 0 && (
            <>
              <div className="mb-3 mt-6 font-mono text-xs uppercase tracking-widest text-red-500">2 · Match columns</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['utrColumn', 'UTR / reference *'],
                    ['amountColumn', 'Amount (credit) *'],
                    ['dateColumn', 'Date'],
                    ['remarksColumn', 'Remarks / narration'],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} label={label} htmlFor={k}>
                    <select id={k} value={mapping[k]} onChange={(e) => setMapping((m) => ({ ...m, [k]: e.target.value }))} className={inputCls(k.startsWith('utr') || k.startsWith('amount') ? !mapping[k] : false)}>
                      <option value="">—</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <Button variant="primary" size="lg" className="mt-5 w-full" onClick={run} loading={busy} disabled={!canRun}>
                <Play className="h-4 w-4" /> Run match
              </Button>
            </>
          )}
        </Panel>

        <Panel className="lg:col-span-3">
          <SectionLabel>Preview</SectionLabel>
          {preview.length === 0 ? (
            <Empty title="No file yet">Bank exports often hide the UTR inside the narration (e.g. UPI/417612345678/…) — that’s fine, we pull out every 12-digit number.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="text-neutral-500">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className={cx('whitespace-nowrap border-b border-neutral-800 px-2 py-2', Object.values(mapping).includes(h) && 'text-red-400')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-neutral-300">
                  {preview.map((r, i) => (
                    <tr key={i} className="border-b border-neutral-900">
                      {headers.map((h) => (
                        <td key={h} className="max-w-[220px] truncate whitespace-nowrap px-2 py-2">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {report && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatTile label="Matched" value={report.counts.matched} symbol="♣" glow="#10b981" sub="Safe to approve" />
            <StatTile label="Amount mismatch" value={report.counts.amountMismatch} symbol="♦" glow="#f59e0b" sub="Check manually" />
            <StatTile label="Probable" value={report.counts.probable} symbol="♠" glow="#38bdf8" sub="Team ID in remarks" />
            <StatTile label="Not found" value={report.counts.notFound} symbol="♥" glow="#ef4444" sub="UTR not on statement" />
            <StatTile label="Unclaimed" value={report.counts.unclaimed} sub="Paid, no team yet" />
          </div>

          <Panel hud>
            <SectionLabel
              right={
                matched.length > 0 && !bulk ? (
                  <Button variant="success" size="sm" onClick={() => setBulkOpen(true)}>
                    <CheckCheck className="h-3.5 w-3.5" /> Approve all matched ({matched.length})
                  </Button>
                ) : bulk ? (
                  <span className="font-mono text-xs text-emerald-300">
                    Approving {bulk.done}/{bulk.total}
                    {bulk.failed.length > 0 && <span className="text-red-400"> · {bulk.failed.length} failed</span>}
                  </span>
                ) : null
              }
            >
              Results
            </SectionLabel>

            <div className="mb-4 flex flex-wrap gap-2">
              {(['ALL', 'MATCHED', 'AMOUNT_MISMATCH', 'PROBABLE', 'NOT_FOUND'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx(
                    'rounded border px-2.5 py-1 font-mono text-[11px] uppercase',
                    filter === f ? 'border-red-600 bg-neutral-900 text-white' : 'border-neutral-800 text-neutral-400 hover:text-white'
                  )}
                >
                  {f === 'ALL' ? 'All' : RECONCILE_META[f].label}
                </button>
              ))}
            </div>

            {bulk && bulk.failed.length > 0 && (
              <Banner>
                Could not approve: {bulk.failed.join(', ')}
              </Banner>
            )}

            {rows.length === 0 ? (
              <p className="font-mono text-xs text-neutral-500">Nothing in this group.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-800 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">UTR</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => {
                      const meta = RECONCILE_META[m.result];
                      return (
                        <tr key={m.teamId + m.utr} className="border-b border-neutral-900">
                          <td className="px-3 py-2.5">
                            <Link href={`/admin/registrations/${m.teamId}`} className="font-mono font-bold text-red-400 hover:text-red-300">
                              {m.teamId}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-neutral-200">{m.utr}</td>
                          <td className="px-3 py-2.5 font-mono text-neutral-300">{inr(m.amount)}</td>
                          <td className="px-3 py-2.5">
                            <span className={cx('rounded border px-2 py-0.5 font-mono text-[10px] uppercase', meta.text, meta.bg, meta.border)}>{meta.label}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs text-neutral-500">{m.details || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {report.unclaimedRows.length > 0 && (
            <Panel>
              <SectionLabel>Unclaimed payments — on the statement, but no team submitted this UTR</SectionLabel>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="px-3 py-2">UTR</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-300">
                    {report.unclaimedRows.map((r, i) => (
                      <tr key={r.utr + i} className="border-t border-neutral-900">
                        <td className="px-3 py-2">{r.utr}</td>
                        <td className="px-3 py-2">{inr(r.amount)}</td>
                        <td className="px-3 py-2">{r.date || '—'}</td>
                        <td className="max-w-[360px] truncate px-3 py-2 text-neutral-500">{r.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 font-mono text-[11px] text-neutral-500">Look for a Team ID (DBG-xxx) in the remarks to find who paid, then contact them.</p>
            </Panel>
          )}
        </div>
      )}

      <Modal
        open={bulkOpen}
        title={`Approve ${matched.length} matched teams?`}
        onClose={() => setBulkOpen(false)}
        footer={
          <>
            <Button variant="subtle" onClick={() => setBulkOpen(false)}>
              Back
            </Button>
            <Button variant="success" onClick={approveAllMatched}>
              <CheckCheck className="h-4 w-4" /> Approve all
            </Button>
          </>
        }
      >
        <p>Each team’s UTR and amount were found on the statement. Approving issues their Entry Visas and sends confirmation emails.</p>
        <p className="font-mono text-xs text-neutral-500">Teams already handled by someone else are skipped and listed.</p>
      </Modal>
    </>
  );
}
