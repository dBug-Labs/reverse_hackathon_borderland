'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Check,
  ClipboardCheck,
  Copy,
  CreditCard,
  History,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  StickyNote,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { api, post } from '@/components/portal/api';
import { RECONCILE_META, REJECT_REASONS, STATUS_META, fmtDateTime, fmtTime, inr } from '@/components/portal/theme';
import type { AuditLogDTO, PaymentDTO, PlayerDTO, RegistrationDTO } from '@/components/portal/types';
import { Banner, Button, Field, LoadingBlock, Modal, Panel, SectionLabel, StatusBadge, cx, inputCls } from '@/components/portal/ui';

type Dialog = null | 'approve' | 'reject' | 'cancel' | 'delete';

const YEARS = ['', '1', '2', '3', '4', '5', 'PG'];

function validatePlayers(players: PlayerDTO[], teamName: string) {
  const e: Record<string, string> = {};
  if (teamName.trim().length < 2) e.teamName = 'Team name is too short';
  const seenEmail = new Set<string>();
  const seenReg = new Set<string>();
  players.forEach((p, i) => {
    if (!/^[a-zA-Z\s.'-]{2,60}$/.test(p.fullName.trim())) e[`${i}.fullName`] = 'Letters only, 2–60 characters';
    if (!/^[^\s@]+@srmist\.edu\.in$/i.test(p.email.trim())) e[`${i}.email`] = 'Must be an @srmist.edu.in email';
    if (!/^RA\d{13}$/.test(p.regNo.trim().toUpperCase())) e[`${i}.regNo`] = 'Format: RA + 13 digits';
    if (p.isLeader && !/^[6-9]\d{9}$/.test((p.phone || '').replace(/\D/g, '').slice(-10))) e[`${i}.phone`] = '10-digit mobile number';
    const em = p.email.trim().toLowerCase();
    const rn = p.regNo.trim().toUpperCase();
    if (seenEmail.has(em)) e[`${i}.email`] = 'Same email as another player';
    if (seenReg.has(rn)) e[`${i}.regNo`] = 'Same register number as another player';
    seenEmail.add(em);
    seenReg.add(rn);
  });
  return e;
}


// Same suit order as the /register player cards.
const PLAYER_SUITS = [
  { symbol: '♠', red: false },
  { symbol: '♥', red: true },
  { symbol: '♦', red: true },
  { symbol: '♣', red: false },
];
export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [reg, setReg] = useState<RegistrationDTO | null>(null);
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // edit state
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPlayers, setDraftPlayers] = useState<PlayerDTO[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const [r, a] = await Promise.all([
      api<{ registration: RegistrationDTO; payments: PaymentDTO[] }>(`/api/admin/registrations/${teamId}`, {}, 'admin'),
      api<{ logs: AuditLogDTO[] }>(`/api/admin/audit?targetId=${encodeURIComponent(teamId)}&limit=30`, {}, 'admin'),
    ]);
    if (r.ok) {
      setReg(r.data.registration);
      setPayments(r.data.payments || []);
      setNotes(r.data.registration.adminNotes || '');
      setError(null);
    } else setError(r.code === 'NOT_FOUND' ? `No team with ID ${teamId}.` : r.message);
    if (a.ok) setLogs(a.data.logs || []);
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const deleted = !!reg?.deletedAt;
  const can = useMemo(
    () => ({
      approve: reg?.status === 'UNDER_REVIEW' && !deleted,
      reject: reg?.status === 'UNDER_REVIEW' && !deleted,
      undo: reg?.status === 'REJECTED' && !deleted,
      cancel: !!reg && ['PAYMENT_PENDING', 'UNDER_REVIEW', 'CONFIRMED'].includes(reg.status) && !deleted,
    }),
    [reg, deleted]
  );

  // Keyboard shortcuts: A approve · R reject
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (dialog || editing || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || e.metaKey || e.ctrlKey) return;
      if (e.key.toLowerCase() === 'a' && can.approve) setDialog('approve');
      if (e.key.toLowerCase() === 'r' && can.reject) openReject();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can, dialog, editing]);

  function openReject() {
    setReason(REJECT_REASONS[0]);
    setCustomReason('');
    setDialog('reject');
  }

  async function act(kind: 'approve' | 'reject' | 'undo-reject' | 'cancel' | 'restore' | 'delete', body?: unknown) {
    playHudClick();
    setBusy(kind);
    setError(null);
    const url = `/api/admin/registrations/${teamId}`;
    const res =
      kind === 'delete'
        ? await api(url, { method: 'DELETE' }, 'admin')
        : await post(`${url}/${kind}`, body, 'admin');
    setBusy(null);
    setDialog(null);
    if (!res.ok) {
      setError(res.code === 'STALE_STATE' ? `${res.message} Someone may have handled this team already.` : res.message);
      await load();
      return;
    }
    const msg: Record<string, string> = {
      approve: 'Payment approved — Entry Visa issued and confirmation email queued.',
      reject: 'Payment rejected — the leader has been emailed with the reason.',
      'undo-reject': 'Rejection undone — team is back in the verify queue.',
      cancel: 'Team cancelled — Visa revoked.',
      restore: 'Team restored.',
      delete: 'Team moved to deleted. You can restore it any time.',
    };
    if (kind === 'approve') playAccessGranted();
    setFlash(msg[kind]);
    await load();
  }

  function startEdit() {
    if (!reg) return;
    setDraftName(reg.teamName);
    setDraftPlayers(reg.players.map((p) => ({ ...p })));
    setFieldErrors({});
    setEditing(true);
  }

  async function saveEdit() {
    const errs = validatePlayers(draftPlayers, draftName);
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy('edit');
    const players = draftPlayers.map((p) => ({
      ...p,
      fullName: p.fullName.trim(),
      email: p.email.trim().toLowerCase(),
      regNo: p.regNo.trim().toUpperCase(),
      phone: p.phone ? p.phone.replace(/\D/g, '').slice(-10) : undefined,
    }));
    const res = await api(`/api/admin/registrations/${teamId}`, { method: 'PATCH', body: JSON.stringify({ teamName: draftName.trim(), players }) }, 'admin');
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      if (res.fields) setFieldErrors(res.fields);
      return;
    }
    setEditing(false);
    setFlash('Team details saved.');
    await load();
  }

  async function saveNotes() {
    setBusy('notes');
    const res = await api(`/api/admin/registrations/${teamId}`, { method: 'PATCH', body: JSON.stringify({ adminNotes: notes }) }, 'admin');
    setBusy(null);
    if (res.ok) {
      setFlash('Notes saved.');
      load();
    } else setError(res.message);
  }

  if (!reg && !error) return <LoadingBlock />;

  const current = payments[0];
  const meta = reg ? STATUS_META[reg.status] : null;

  return (
    <>
      <Link href="/admin/registrations" className="mb-5 inline-flex items-center gap-1.5 font-label text-sm font-semibold text-neutral-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All registrations
      </Link>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}
      {flash && (
        <Banner tone="success" onClose={() => setFlash(null)}>
          {flash}
        </Banner>
      )}

      {reg && meta && (
        <>
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={reg.status} size="lg" />
                {reg.visa && (
                  <span
                    className={cx(
                      'rounded-full border px-3 py-1 font-label text-sm font-semibold',
                      reg.visa.status === 'VALID' ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200' : 'border-[var(--card-red)]/60 bg-[var(--card-red)]/10 text-[#ff8a8a]'
                    )}
                  >
                    Visa {reg.visa.status}
                  </span>
                )}
                {deleted && <span className="rounded-full border border-[var(--card-red)] bg-[var(--card-red)]/10 px-3 py-1 font-label text-sm font-semibold text-[#ff8a8a]">Deleted</span>}
              </div>
              <h1 className="mt-3 font-poster text-6xl uppercase leading-none text-[#f5eee1] sm:text-7xl">
                {reg.teamId}
              </h1>
              <p className="mt-2 font-poster text-2xl uppercase leading-none text-neutral-300 sm:text-3xl">{reg.teamName}</p>
              <p className="mt-2.5 font-label text-sm text-neutral-500">
                Registered {fmtDateTime(reg.createdAt)} · updated {fmtDateTime(reg.updatedAt)}
              </p>
            </div>
            {can.approve && (
              <p className="font-label text-xs text-neutral-500">
                Shortcuts: <kbd className="rounded-md border border-neutral-700 bg-[#141417] px-1.5 font-label">A</kbd> approve · <kbd className="rounded-md border border-neutral-700 bg-[#141417] px-1.5 font-label">R</kbd> reject
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Left column ── */}
            <div className="space-y-6 lg:col-span-2">
              <Panel hud>
                <SectionLabel
                  icon={<Users className="h-4 w-4" />}
                  right={
                    !editing && !deleted ? (
                      <Button size="sm" onClick={startEdit}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    ) : editing ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="subtle" onClick={() => setEditing(false)}>
                          <X className="h-3.5 w-3.5" /> Cancel
                        </Button>
                        <Button size="sm" variant="primary" onClick={saveEdit} loading={busy === 'edit'}>
                          <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    ) : null
                  }
                >
                  Players ({reg.players.length})
                </SectionLabel>

                {editing && (
                  <div className="mb-4">
                    <Field label="Team name" htmlFor="edit-team" error={fieldErrors.teamName}>
                      <input id="edit-team" value={draftName} onChange={(e) => setDraftName(e.target.value)} className={inputCls(!!fieldErrors.teamName)} />
                    </Field>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {(editing ? draftPlayers : reg.players).map((p, i) => (
                    <div key={p.slot} className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#141417] p-4">
                      <span
                        aria-hidden
                        className={cx(
                          'pointer-events-none absolute -right-2 -top-5 text-[88px] leading-none opacity-[0.07]',
                          PLAYER_SUITS[(p.slot - 1) % 4].red ? 'text-[var(--card-red)]' : 'text-white'
                        )}
                      >
                        {PLAYER_SUITS[(p.slot - 1) % 4].symbol}
                      </span>
                      <div className="relative mb-3 flex items-center gap-2.5 border-b border-neutral-800 pb-3">
                        <span className={cx('text-xl leading-none', PLAYER_SUITS[(p.slot - 1) % 4].red ? 'text-[var(--card-red)]' : 'text-[#f5eee1]')}>
                          {PLAYER_SUITS[(p.slot - 1) % 4].symbol}
                        </span>
                        <span className="font-heading text-base font-bold text-neutral-100">Player {p.slot}</span>
                        {p.isLeader && <span className="rounded-full bg-[var(--paper)] px-2.5 py-0.5 font-label text-xs font-bold text-[var(--ink)]">Team leader</span>}
                      </div>
                      {editing ? (
                        <div className="space-y-3">
                          {(
                            [
                              ['fullName', 'Full name'],
                              ['email', 'SRM email'],
                              ['regNo', 'Register no.'],
                              ['phone', p.isLeader ? 'Phone' : 'Phone (optional)'],
                              ['department', 'Department'],
                            ] as const
                          ).map(([k, label]) => (
                            <Field key={k} label={label} htmlFor={`p${i}-${k}`} error={fieldErrors[`${i}.${k}`] || fieldErrors[`players.${i}.${k}`]}>
                              <input
                                id={`p${i}-${k}`}
                                value={(p[k] as string) || ''}
                                onChange={(e) => setDraftPlayers((arr) => arr.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                                className={inputCls(!!fieldErrors[`${i}.${k}`])}
                              />
                            </Field>
                          ))}
                          <Field label="Year" htmlFor={`p${i}-year`}>
                            <select
                              id={`p${i}-year`}
                              value={p.year || ''}
                              onChange={(e) => setDraftPlayers((arr) => arr.map((x, j) => (j === i ? { ...x, year: e.target.value || undefined } : x)))}
                              className={inputCls()}
                            >
                              {YEARS.map((y) => (
                                <option key={y} value={y}>
                                  {y ? (y === 'PG' ? 'PG' : `Year ${y}`) : '—'}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                      ) : (
                        <dl className="space-y-1.5 text-sm">
                          <div className="font-semibold text-white">{p.fullName}</div>
                          <Row k="Email" v={p.email} copy />
                          <Row k="Reg no." v={p.regNo} copy />
                          {p.phone && <Row k="Phone" v={p.phone} copy />}
                          {(p.year || p.department) && <Row k="Year / dept" v={[p.year && (p.year === 'PG' ? 'PG' : `Y${p.year}`), p.department].filter(Boolean).join(' · ')} />}
                        </dl>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel>
                <SectionLabel icon={<StickyNote className="h-4 w-4" />}>Admin notes</SectionLabel>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Private notes — e.g. “Paid twice, refund ₹200 to leader”."
                  className={inputCls()}
                  disabled={deleted}
                />
                <div className="mt-3 flex justify-end">
                  <Button size="sm" onClick={saveNotes} loading={busy === 'notes'} disabled={deleted || notes === (reg.adminNotes || '')}>
                    <Save className="h-3.5 w-3.5" /> Save notes
                  </Button>
                </div>
              </Panel>

              <Panel>
                <SectionLabel icon={<History className="h-4 w-4" />}>Timeline</SectionLabel>
                {logs.length === 0 ? (
                  <p className="font-label text-sm text-neutral-500">No admin or volunteer actions yet.</p>
                ) : (
                  <ol className="relative space-y-4 border-l border-neutral-800 pl-5">
                    {logs.map((l) => (
                      <li key={l._id} className="relative">
                        <span className={cx('absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0e0e14]', l.scope === 'attendance' ? 'bg-emerald-500' : 'bg-[var(--card-red)]')} />
                        <div className="font-label text-sm text-white">
                          {l.action.replace(/_/g, ' ')} <span className="text-neutral-500">by</span> {l.actorName}
                        </div>
                        <div className="font-label text-xs text-neutral-500">
                          {fmtDateTime(l.createdAt)} · {l.scope}
                        </div>
                        {l.after && Object.keys(l.after).length > 0 && (
                          <div className="mt-1 break-words font-label text-xs text-neutral-400">{summarise(l.after)}</div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-6">
              <Panel hud className="border-[var(--card-red)]/60">
                <SectionLabel icon={<ShieldCheck className="h-4 w-4" />}>Decision</SectionLabel>
                <div className="space-y-2">
                  {can.approve && (
                    <Button variant="success" size="lg" className="w-full" onClick={() => setDialog('approve')}>
                      <Check className="h-4 w-4" /> Approve payment
                    </Button>
                  )}
                  {can.reject && (
                    <Button variant="danger" size="lg" className="w-full" onClick={openReject}>
                      <X className="h-4 w-4" /> Reject payment
                    </Button>
                  )}
                  {can.undo && (
                    <Button variant="ghost" className="w-full" onClick={() => act('undo-reject')} loading={busy === 'undo-reject'}>
                      <Undo2 className="h-4 w-4" /> Undo reject
                    </Button>
                  )}
                  {!can.approve && !can.reject && !can.undo && (
                    <p className="rounded-lg border border-neutral-800 bg-[#141417] p-3 font-label text-sm text-neutral-400">
                      {reg.status === 'PAYMENT_PENDING' && 'Waiting for the leader to submit a UTR.'}
                      {reg.status === 'CONFIRMED' && `Approved by ${reg.verifiedBy || '—'} · ${fmtDateTime(reg.verifiedAt)}`}
                      {reg.status === 'CANCELLED' && `Cancelled: ${reg.cancelReason || '—'}`}
                      {reg.status === 'EXPIRED' && 'Expired — no UTR before the deadline.'}
                      {deleted && ' · This team is deleted.'}
                    </p>
                  )}
                  <div className="flex gap-2 pt-2">
                    {can.cancel && (
                      <Button size="sm" variant="subtle" className="flex-1" onClick={() => { setReason(''); setDialog('cancel'); }}>
                        <Ban className="h-3.5 w-3.5" /> Cancel team
                      </Button>
                    )}
                    {deleted ? (
                      <Button size="sm" className="flex-1" onClick={() => act('restore')} loading={busy === 'restore'}>
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                    ) : (
                      <Button size="sm" variant="subtle" className="flex-1 hover:text-[#ff8a8a]" onClick={() => setDialog('delete')}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>

              <Panel>
                <SectionLabel icon={<CreditCard className="h-4 w-4" />}>Payment</SectionLabel>
                {!current ? (
                  <p className="font-label text-sm text-neutral-500">No UTR submitted yet.</p>
                ) : (
                  <>
                    <div className="rounded-lg border border-neutral-800 bg-[#141417] p-4">
                      <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">UTR</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-label text-xl font-bold tracking-wider text-white">{current.utr}</span>
                        <CopyBtn text={current.utr} />
                      </div>
                      <dl className="mt-3 space-y-1.5 text-sm">
                        <Row k="Amount" v={inr(current.amount)} />
                        {current.payerUpi && <Row k="Payer" v={current.payerUpi} />}
                        <Row k="Submitted" v={fmtDateTime(current.createdAt)} />
                        <Row k="Attempt" v={current.status} />
                      </dl>
                      {current.reconcileResult && (
                        <div className={cx('mt-3 inline-block rounded-full border px-2.5 py-0.5 font-label text-xs font-semibold', RECONCILE_META[current.reconcileResult].text, RECONCILE_META[current.reconcileResult].bg, RECONCILE_META[current.reconcileResult].border)}>
                          Bank: {RECONCILE_META[current.reconcileResult].label}
                        </div>
                      )}
                      {current.rejectReason && <p className="mt-3 font-label text-sm text-[#ff8a8a]">Rejected: {current.rejectReason}</p>}
                    </div>
                    {payments.length > 1 && (
                      <div className="mt-4">
                        <div className="mb-2 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">Earlier attempts</div>
                        <ul className="space-y-2">
                          {payments.slice(1).map((p) => (
                            <li key={p._id} className="rounded-lg border border-neutral-800 px-3 py-2 font-label text-sm">
                              <div className="flex justify-between">
                                <span className="text-neutral-300">{p.utr}</span>
                                <span className={p.status === 'REJECTED' ? 'text-[#ff8a8a]' : 'text-neutral-400'}>{p.status}</span>
                              </div>
                              {p.rejectReason && <div className="mt-1 text-neutral-500">{p.rejectReason}</div>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {reg.rejectCount > 0 && <p className="mt-3 font-label text-xs text-neutral-500">Rejected {reg.rejectCount}× so far</p>}
              </Panel>

              <Panel>
                <SectionLabel icon={<ClipboardCheck className="h-4 w-4" />}>Attendance</SectionLabel>
                {[1, 2].map((d) => {
                  const e = reg.attendance?.find((a) => a.day === d);
                  return (
                    <div key={d} className="mb-3 rounded-lg border border-neutral-800 bg-[#141417] p-3 last:mb-0">
                      <div className="flex items-center justify-between font-label text-sm">
                        <span className="font-semibold text-neutral-300">Day {d}</span>
                        {e ? (
                          <span className="text-emerald-200">
                            ✓ {fmtTime(e.markedAt)} · {e.markedBy}
                          </span>
                        ) : (
                          <span className="text-neutral-600">Not marked</span>
                        )}
                      </div>
                      {e && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {reg.players.map((p) => (
                            <span
                              key={p.slot}
                              className={cx(
                                'rounded-lg border px-1.5 py-0.5 font-label text-[11px]',
                                e.playersPresent.includes(p.slot) ? 'border-emerald-700 text-emerald-200' : 'border-[var(--card-red)] text-[#ff8a8a] line-through'
                              )}
                            >
                              {p.fullName.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="mt-3 font-label text-xs text-neutral-500">Read-only. Volunteers mark attendance at /attendance.</p>
              </Panel>

              <Panel>
                <SectionLabel>Details</SectionLabel>
                <dl className="space-y-1.5 text-sm">
                  <Row k="Leader email" v={reg.leaderEmail} copy />
                  <Row k="Leader phone" v={reg.leaderPhone} copy />
                  {reg.source && <Row k="Heard via" v={reg.source} />}
                  {reg.visa && <Row k="Visa issued" v={fmtDateTime(reg.visa.issuedAt)} />}
                  {reg.status === 'PAYMENT_PENDING' && reg.expiresAt && <Row k="Expires" v={fmtDateTime(reg.expiresAt)} />}
                </dl>
              </Panel>
            </div>
          </div>

          {/* ── Dialogs ── */}
          <Modal
            open={dialog === 'approve'}
            title="Approve payment?"
            onClose={() => setDialog(null)}
            footer={
              <>
                <Button variant="subtle" onClick={() => setDialog(null)}>
                  Back
                </Button>
                <Button variant="success" onClick={() => act('approve')} loading={busy === 'approve'}>
                  <Check className="h-4 w-4" /> Approve & issue Visa
                </Button>
              </>
            }
          >
            <p>
              Only approve if UTR <b className="font-label text-white">{current?.utr}</b> for <b className="text-white">{current ? inr(current.amount) : '—'}</b> is on the bank statement.
            </p>
            <p className="font-label text-sm text-neutral-500">This confirms {reg.teamId}, issues the Entry Visa and emails the team.</p>
          </Modal>

          <Modal
            open={dialog === 'reject'}
            title="Reject payment"
            onClose={() => setDialog(null)}
            footer={
              <>
                <Button variant="subtle" onClick={() => setDialog(null)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={() => act('reject', { reason: reason === 'OTHER' ? customReason.trim() : reason })}
                  loading={busy === 'reject'}
                  disabled={reason === 'OTHER' ? customReason.trim().length < 5 : !reason}
                >
                  <X className="h-4 w-4" /> Reject & email leader
                </Button>
              </>
            }
          >
            <p className="font-label text-sm text-neutral-400">The leader sees this reason and can submit a new UTR.</p>
            <div className="space-y-2" role="radiogroup" aria-label="Reject reason">
              {[...REJECT_REASONS, 'OTHER'].map((r) => (
                <label key={r} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm', reason === r ? 'border-[var(--card-red)] bg-[var(--card-red)]/10 text-white' : 'border-neutral-800 text-neutral-300')}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-[var(--card-red)]" />
                  {r === 'OTHER' ? 'Other…' : r}
                </label>
              ))}
            </div>
            {reason === 'OTHER' && (
              <textarea value={customReason} onChange={(e) => setCustomReason(e.target.value)} rows={3} placeholder="Explain in simple words" className={inputCls()} />
            )}
          </Modal>

          <Modal
            open={dialog === 'cancel'}
            title={`Cancel ${reg.teamId}?`}
            onClose={() => setDialog(null)}
            footer={
              <>
                <Button variant="subtle" onClick={() => setDialog(null)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => act('cancel', { reason })} loading={busy === 'cancel'} disabled={reason.trim().length < 3}>
                  <Ban className="h-4 w-4" /> Cancel team
                </Button>
              </>
            }
          >
            <p>The team loses its seat and its Entry Visa is revoked. Use this for refunds or withdrawals.</p>
            <Field label="Reason" htmlFor="cancel-reason">
              <textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls()} placeholder="e.g. Team withdrew, refund issued" />
            </Field>
          </Modal>

          <Modal
            open={dialog === 'delete'}
            title={`Delete ${reg.teamId}?`}
            onClose={() => setDialog(null)}
            footer={
              <>
                <Button variant="subtle" onClick={() => setDialog(null)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => act('delete')} loading={busy === 'delete'}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            }
          >
            <p>Use this for spam or duplicate entries. It’s a soft delete — the team can be restored, and its emails, register numbers and UTR stay blocked.</p>
          </Modal>
        </>
      )}
    </>
  );
}

function Row({ k, v, copy }: { k: string; v?: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">{k}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 truncate font-label text-sm text-neutral-200">
        <span className="truncate">{v || '—'}</span>
        {copy && v && <CopyBtn text={v} small />}
      </dd>
    </div>
  );
}

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${text}`}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      className={cx('shrink-0 rounded text-neutral-500 hover:text-white', small ? 'p-0.5' : 'border border-neutral-700 p-1.5')}
    >
      {done ? <Check className={cx(small ? 'h-3 w-3' : 'h-4 w-4', 'text-emerald-400')} /> : <Copy className={small ? 'h-3 w-3' : 'h-4 w-4'} />}
    </button>
  );
}

function summarise(obj: Record<string, unknown>) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
    .slice(0, 220);
}
