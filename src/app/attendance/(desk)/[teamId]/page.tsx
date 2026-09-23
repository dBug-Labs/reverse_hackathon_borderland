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
        <AlertOctagon className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="glow-red mt-4 font-display text-3xl font-black uppercase text-white">Unknown team</h1>
        <p className="mt-2 font-mono text-sm text-neutral-400">
          No team with code <b className="text-white">{teamId}</b>. Check the Visa, or search by a player’s register number.
        </p>
        <Link href="/attendance" className="mt-6 inline-flex items-center gap-2 rounded border border-red-500 bg-red-600 px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white">
          <ScanLine className="h-4 w-4" /> Back to scanner
        </Link>
      </div>
    );

  if (!team) return error ? <Banner>{error}</Banner> : <LoadingBlock label="LOOKING UP TEAM…" />;

  const confirmed = team.status === 'CONFIRMED';
  const meta = STATUS_META[team.status];
  const newCount = picked.size;
  const allIn = entry && entry.playersPresent.length >= team.players.length;

  return (
    <>
      <Link href="/attendance" className="mb-4 inline-flex min-h-[44px] items-center gap-2 font-mono text-xs text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4 text-red-500" /> SCANNER
      </Link>

      {/* Verdict banner */}
      <div
        className={cx(
          'mb-5 flex items-center gap-4 rounded-xl border-2 p-5',
          confirmed ? 'border-emerald-500 bg-emerald-950/50 shadow-[0_0_40px_rgba(16,185,129,0.25)]' : 'border-red-500 bg-red-950/60 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
        )}
        role="status"
      >
        {confirmed ? <ShieldCheck className="h-12 w-12 shrink-0 text-emerald-400" /> : <AlertOctagon className="h-12 w-12 shrink-0 text-red-400" />}
        <div>
          <div className={cx('font-display text-2xl font-black uppercase leading-tight', confirmed ? 'text-emerald-300' : 'text-red-300')}>
            {confirmed ? 'Confirmed — clear to enter' : 'Not confirmed — do not admit'}
          </div>
          <div className="mt-1 font-mono text-xs text-neutral-300">
            {confirmed ? 'Check every SRM ID card against the names below.' : `Status: ${meta.label}. Send the team to the help desk.`}
          </div>
        </div>
      </div>

      {/* Team header */}
      <div className="mb-5 text-center">
        <div className="font-display text-5xl font-black tracking-tight text-white sm:text-6xl" style={{ textShadow: `0 0 30px ${meta.glow}66` }}>
          {team.teamId}
        </div>
        <div className="mt-1 text-lg font-semibold text-neutral-200">{team.teamName}</div>
        {other && (
          <div className="mt-2 font-mono text-[11px] text-neutral-500">
            Day {other.day}: {other.playersPresent.length}/{team.players.length} present at {fmtTime(other.markedAt)}
          </div>
        )}
      </div>

      {entry && (
        <div className="mb-4 flex items-start gap-3 rounded border border-amber-600/60 bg-amber-950/30 p-3.5 font-mono text-sm text-amber-200">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Already marked for Day {day} at <b>{fmtTime(entry.markedAt)}</b> by <b>{entry.markedBy}</b> — {entry.playersPresent.length}/{team.players.length} present.
            {!allIn && <div className="mt-1 text-amber-200/70">Tick any late arrivals below.</div>}
          </div>
        </div>
      )}

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      <Panel hud className="mb-5">
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          <span>Players · Day {day}</span>
          <span>Tap to toggle</span>
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
                  'flex min-h-[68px] w-full items-center gap-4 rounded-lg border-2 px-4 py-3 text-left transition-all',
                  on ? 'border-emerald-600/80 bg-emerald-950/40' : 'border-neutral-800 bg-neutral-950/60',
                  !confirmed && 'opacity-50',
                  locked && 'cursor-default'
                )}
              >
                <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded border-2', on ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-neutral-600')}>
                  {on && <Check className="h-5 w-5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-white">{p.fullName}</span>
                    {p.isLeader && <span className="rounded border border-red-700 px-1.5 font-mono text-[10px] text-red-300">LEADER</span>}
                  </span>
                  <span className="mt-0.5 block font-mono text-sm tracking-wider text-neutral-300">{p.regNo}</span>
                </span>
                {locked && <span className="font-mono text-[10px] text-emerald-300">IN · {fmtTime(entry?.markedAt)}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="sticky bottom-4 z-20">
        <Button
          variant="success"
          size="lg"
          className="min-h-[60px] w-full text-base"
          onClick={mark}
          loading={saving}
          disabled={!confirmed || newCount === 0 || !!done}
        >
          <Check className="h-5 w-5" />
          {!confirmed ? 'Cannot mark — not confirmed' : allIn ? 'Everyone is already in' : newCount === 0 ? 'Select players present' : `Mark ${newCount} present · Day ${day}`}
        </Button>
      </div>

      {/* Success overlay */}
      {done && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6 text-center backdrop-blur-md">
          <div className="font-display text-7xl text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]">♣</div>
          <h2 className="mt-4 font-display text-4xl font-black uppercase text-white" style={{ textShadow: '0 0 30px rgba(16,185,129,0.6)' }}>
            Access granted
          </h2>
          <p className="mt-2 font-mono text-lg text-emerald-300">
            {team.teamId} · {done.count}/{done.total} players · Day {day}
          </p>
          <Link
            href="/attendance"
            className="mt-8 inline-flex min-h-[56px] items-center gap-2 rounded border border-red-500 bg-red-600 px-8 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_25px_rgba(220,38,38,0.5)]"
          >
            <ScanLine className="h-5 w-5" /> Scan next team ({Math.max(0, countdown)})
          </Link>
          <button onClick={() => { setDone(null); load(); }} className="mt-4 font-mono text-xs text-neutral-400 underline hover:text-white">
            Stay on this team
          </button>
        </div>
      )}
    </>
  );
}
