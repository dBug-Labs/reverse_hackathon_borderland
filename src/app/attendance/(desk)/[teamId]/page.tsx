'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertOctagon, ArrowLeft, Check, Clock, ScanLine, ShieldCheck } from 'lucide-react';
import { playAccessGranted, playHudClick, playRiskAlarm } from '@/utils/sound';
import { api, post } from '@/components/portal/api';
import { pushRecent, useDesk } from '@/components/portal/AttendanceShell';
import { STATUS_META, fmtTime } from '@/components/portal/theme';
import type { AttendanceTeamCardDTO } from '@/components/portal/types';
import { Banner, Button, LoadingBlock, Panel, cx } from '@/components/portal/ui';


// Same suit order as the /register player cards.
const SLOT_SUITS = [
  { symbol: '♠', red: false },
  { symbol: '♥', red: true },
  { symbol: '♦', red: true },
  { symbol: '♣', red: false },
];
export default function AttendanceTeamPage() {
  const { teamId: raw } = useParams<{ teamId: string }>();
  const teamId = decodeURIComponent(raw).toUpperCase();
  const router = useRouter();
  const { day } = useDesk();

  const [team, setTeam] = useState<AttendanceTeamCardDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ count: number; total: number } | null>(null);
  const [countdown, setCountdown] = useState(4);

  const load = useCallback(async () => {
    const r = await api<AttendanceTeamCardDTO>(`/api/attendance/teams/${encodeURIComponent(teamId)}`, {}, 'attendance');
    if (r.ok) {
      setTeam(r.data);
      setNotFound(false);
      if (r.data.status !== 'CONFIRMED') playRiskAlarm();
    } else if (r.code === 'NOT_FOUND') {
      setNotFound(true);
      playRiskAlarm();
    } else setError(r.message);
  }, [teamId]);

  useEffect(() => {
    load();
  }, [load]);

  const entry = useMemo(() => team?.attendance.find((a) => a.day === day), [team, day]);
  const other = useMemo(() => team?.attendance.find((a) => a.day !== day), [team, day]);
  const already = useMemo(() => new Set(entry?.playersPresent ?? []), [entry]);

  // Default ticks: everyone (first scan of the day) · nobody new (already marked → add late arrivals only)
  useEffect(() => {
    if (!team) return;
    setPicked(entry ? new Set() : new Set(team.players.map((p) => p.slot)));
    setDone(null);
  }, [team, entry]);

  // After success, go back to the scanner automatically
  useEffect(() => {
    if (!done) return;
    setCountdown(4);
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [done]);
  useEffect(() => {
    if (done && countdown <= 0) router.push('/attendance');
  }, [countdown, done, router]);

  function toggle(slot: number) {
    if (already.has(slot)) return;
    playHudClick();
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(slot)) n.delete(slot);
      else n.add(slot);
      return n;
    });
  }

  async function mark() {
    if (!team) return;
    setSaving(true);
    setError(null);
    const res = await post<{ alreadyMarked: unknown }>(
      `/api/attendance/teams/${encodeURIComponent(team.teamId)}/mark`,
      { day, playersPresent: [...picked].sort() },
      'attendance'
    );
    setSaving(false);
    if (!res.ok) {
      playRiskAlarm();
      setError(res.message);
      return;
    }
    const count = new Set([...already, ...picked]).size;
    playAccessGranted();
    pushRecent({ teamId: team.teamId, teamName: team.teamName, day, count, total: team.players.length, at: new Date().toISOString() });
    setDone({ count, total: team.players.length });
  }

  if (notFound)
    return (
      <div className="py-10 text-center">
        <AlertOctagon className="mx-auto h-16 w-16 text-[var(--card-red)]" />
        <h1 className="mt-4 font-poster text-5xl uppercase leading-none text-[#f5eee1]">Unknown team</h1>
        <p className="mt-2 font-label text-[15px] text-neutral-400">
          No team with code <b className="text-white">{teamId}</b>. Check the Visa, or search by a player’s register number.
        </p>
        <Link href="/attendance" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--card-red)] px-7 py-3.5 font-poster text-xl uppercase tracking-wide text-white shadow-lg shadow-black/40 transition hover:brightness-110">
          <ScanLine className="h-5 w-5" /> Back to scanner
        </Link>
      </div>
    );

  if (!team) return error ? <Banner>{error}</Banner> : <LoadingBlock label="Looking up team…" />;

  const confirmed = team.status === 'CONFIRMED';
  const meta = STATUS_META[team.status];
  const newCount = picked.size;
  const allIn = entry && entry.playersPresent.length >= team.players.length;

  return (
    <>
      <Link href="/attendance" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 font-label text-sm font-semibold text-neutral-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Scanner
      </Link>

      {/* Verdict banner */}
      <div
        className={cx(
          'mb-6 flex items-center gap-4 rounded-2xl border-2 p-5',
          confirmed ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-[var(--card-red)] bg-[var(--card-red)]/15'
        )}
        role="status"
      >
        {confirmed ? <ShieldCheck className="h-12 w-12 shrink-0 text-emerald-400" /> : <AlertOctagon className="h-12 w-12 shrink-0 text-[#ff8a8a]" />}
        <div>
          <div className={cx('font-poster text-3xl uppercase leading-none', confirmed ? 'text-emerald-200' : 'text-[#ff8a8a]')}>
            {confirmed ? 'Confirmed — clear to enter' : 'Not confirmed — do not admit'}
          </div>
          <div className="mt-1.5 font-label text-[15px] text-neutral-300">
            {confirmed ? 'Check every SRM ID card against the names below.' : `Status: ${meta.label}. Send the team to the help desk.`}
          </div>
        </div>
      </div>

      {/* Team header */}
      <div className="mb-5 text-center">
        <div className="font-poster text-7xl uppercase leading-none text-[#f5eee1]">{team.teamId}</div>
        <div className="mt-2 font-poster text-2xl uppercase leading-none text-neutral-300">{team.teamName}</div>
        {other && (
          <div className="mt-2.5 font-label text-sm text-neutral-500">
            Day {other.day}: {other.playersPresent.length}/{team.players.length} present at {fmtTime(other.markedAt)}
          </div>
        )}
      </div>

      {entry && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 font-label text-[15px] text-amber-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Already marked for Day {day} at <b>{fmtTime(entry.markedAt)}</b> by <b>{entry.markedBy}</b> — {entry.playersPresent.length}/{team.players.length} present.
            {!allIn && <div className="mt-1 text-amber-200/70">Tick any late arrivals below.</div>}
          </div>
        </div>
      )}

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <Panel hud className="mb-5">
        <div className="mb-4 flex items-end justify-between border-b border-neutral-800 pb-3">
          <span className="font-poster text-2xl uppercase leading-none text-[#f5eee1]">Players · Day {day}</span>
          <span className="font-label text-sm text-neutral-500">Tap to toggle</span>
        </div>
        <div className="space-y-2">
          {team.players.map((p) => {
            const locked = already.has(p.slot);
            const on = confirmed && (locked || picked.has(p.slot));
            return (
              <button
                key={p.slot}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={!confirmed || locked}
                onClick={() => toggle(p.slot)}
                className={cx(
                  'relative flex min-h-[68px] w-full items-center gap-4 overflow-hidden rounded-xl border-2 px-4 py-3 text-left transition-colors',
                  on ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-neutral-800 bg-[#141417] hover:border-neutral-600',
                  !confirmed && 'opacity-50',
                  locked && 'cursor-default'
                )}
              >
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-neutral-600')}>
                  {on && <Check className="h-5 w-5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cx('text-base leading-none', SLOT_SUITS[(p.slot - 1) % 4].red ? 'text-[var(--card-red)]' : 'text-[#f5eee1]')} aria-hidden>
                      {SLOT_SUITS[(p.slot - 1) % 4].symbol}
                    </span>
                    <span className="truncate font-label text-base font-semibold text-white">{p.fullName}</span>
                    {p.isLeader && <span className="shrink-0 rounded-full bg-[var(--paper)] px-2 py-0.5 font-label text-[11px] font-bold text-[var(--ink)]">Leader</span>}
                  </span>
                  <span className="mt-1 block font-label text-sm tracking-wider text-neutral-400">{p.regNo}</span>
                </span>
                {locked && <span className="shrink-0 font-label text-xs font-semibold text-emerald-200">In · {fmtTime(entry?.markedAt)}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="sticky bottom-4 z-20">
        <Button
          variant="success"
          size="lg"
          className="min-h-[60px] w-full text-2xl"
          onClick={mark}
          loading={saving}
          disabled={!confirmed || newCount === 0 || !!done}
        >
          <Check className="h-5 w-5" />
          {!confirmed ? 'Cannot mark — not confirmed' : allIn ? 'Everyone is already in' : newCount === 0 ? 'Select players present' : `Mark ${newCount} present · Day ${day}`}
        </Button>
      </div>

      {/* Success overlay — the Visa card is dealt face up, like the hero answer cards */}
      {done && (
        <div className="backdrop-in fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-sm">
          <div className="card-pop paper-card w-full max-w-xs rounded-2xl p-2 text-[var(--ink)]">
            <div className="relative rounded-xl border border-[var(--card-red)]/45 px-6 py-8">
              <span aria-hidden className="absolute left-2.5 top-2 text-base leading-none">♣</span>
              <span aria-hidden className="absolute bottom-2 right-2.5 rotate-180 text-base leading-none">♣</span>
              <div className="text-6xl leading-none" aria-hidden>
                ♣
              </div>
              <p className="mt-4 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Day {day} · checked in</p>
              <h2 className="mt-1.5 font-poster text-5xl uppercase leading-none">Access granted</h2>
              <p className="mt-3 font-poster text-2xl uppercase leading-none">{team.teamId}</p>
              <p className="mt-1.5 font-label text-sm text-[var(--ink)]/60">
                {done.count}/{done.total} players present
              </p>
            </div>
          </div>
          <Link
            href="/attendance"
            className="mt-8 inline-flex min-h-[56px] items-center gap-2 rounded-lg bg-[var(--card-red)] px-8 font-poster text-xl uppercase tracking-wide text-white shadow-lg shadow-black/40 transition hover:brightness-110"
          >
            <ScanLine className="h-5 w-5" /> Scan next team ({Math.max(0, countdown)})
          </Link>
          <button onClick={() => { setDone(null); load(); }} className="mt-4 font-label text-sm text-neutral-400 underline underline-offset-4 hover:text-white">
            Stay on this team
          </button>
        </div>
      )}
    </>
  );
}
