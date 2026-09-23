'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Keyboard, ScanLine, Search } from 'lucide-react';
import { playHudClick, playRiskAlarm } from '@/utils/sound';
import { api } from '@/components/portal/api';
import { useDesk, readRecent, type RecentMark } from '@/components/portal/AttendanceShell';
import { QrScanner } from '@/components/portal/QrScanner';
import { TEAM_CODE_RE, fmtTime, normaliseTeamCode } from '@/components/portal/theme';
import type { AttendanceTeamCardDTO } from '@/components/portal/types';
import { Banner, Button, Panel, SectionLabel, StatusBadge, cx, inputCls } from '@/components/portal/ui';

export default function AttendanceDesk() {
  const router = useRouter();
  const { day } = useDesk();
  const [counter, setCounter] = useState<{ teamsPresent: number; totalConfirmed: number } | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AttendanceTeamCardDTO[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentMark[]>([]);

  const loadCounter = useCallback(async () => {
    const r = await api<{ teamsPresent: number; totalConfirmed: number }>(`/api/attendance/counter?day=${day}`, {}, 'attendance');
    if (r.ok) setCounter(r.data);
  }, [day]);

  useEffect(() => {
    loadCounter();
    const t = setInterval(loadCounter, 15_000);
    return () => clearInterval(t);
  }, [loadCounter]);

  useEffect(() => setRecent(readRecent()), []);

  const openTeam = useCallback(
    (code: string) => {
      playHudClick();
      router.push(`/attendance/${encodeURIComponent(code)}`);
    },
    [router]
  );

  const onScan = useCallback(
    (raw: string) => {
      const code = normaliseTeamCode(raw);
      if (TEAM_CODE_RE.test(code)) openTeam(code);
      else {
        playRiskAlarm();
        setError(`That QR isn’t a Borderland team code (read: “${raw.slice(0, 40)}”). Ask for the Entry Visa QR, or search below.`);
      }
    },
    [openTeam]
  );

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = normaliseTeamCode(q);
    if (TEAM_CODE_RE.test(code)) return openTeam(code);
    if (q.trim().length < 4) return setError('Type at least 4 characters — Team ID, leader phone or a register number.');
    setSearching(true);
    const r = await api<AttendanceTeamCardDTO[]>(`/api/attendance/search?q=${encodeURIComponent(q.trim())}`, {}, 'attendance');
    setSearching(false);
    if (!r.ok) return setError(r.message);
    if (r.data.length === 1) return openTeam(r.data[0].teamId);
    setResults(r.data);
  }

  const recentToday = recent.filter((m) => m.day === day);

  return (
    <div className="space-y-5">
      {/* Live counter — a playing card, like the landing page info strip */}
      <div className="paper-card rounded-2xl p-2 text-[var(--ink)]">
        <div className="relative rounded-xl border border-[var(--card-red)]/45 px-5 py-5">
          <span aria-hidden className="absolute right-2.5 top-2 text-sm leading-none">♣</span>
          <span aria-hidden className="absolute bottom-2 left-2.5 rotate-180 text-sm leading-none">♣</span>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Day {day} · checked in</div>
              <div className="mt-1.5 font-poster text-6xl leading-none">
                {counter ? counter.teamsPresent : '—'}
                <span className="text-3xl text-[var(--ink)]/40"> / {counter ? counter.totalConfirmed : '—'}</span>
              </div>
            </div>
            <div className="pb-1 pr-3 text-right">
              <div className="font-poster text-3xl leading-none">
                {counter && counter.totalConfirmed > 0 ? `${Math.round((counter.teamsPresent / counter.totalConfirmed) * 100)}%` : ''}
              </div>
              <div className="mt-1 font-label text-xs text-[var(--ink)]/55">Updates every 15s</div>
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--ink)]/10">
            <div
              className="h-full rounded-full bg-[var(--card-red)] transition-all duration-500"
              style={{ width: `${counter && counter.totalConfirmed > 0 ? Math.min(100, Math.round((counter.teamsPresent / counter.totalConfirmed) * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {error && <Banner onClose={() => setError(null)}>{error}</Banner>}

      {/* Scanner */}
      <Panel>
        <SectionLabel icon={<ScanLine className="h-4 w-4" />}>Scan the Entry Visa</SectionLabel>
        <QrScanner onCode={onScan} />
      </Panel>

      {/* Manual search */}
      <Panel>
        <SectionLabel icon={<Keyboard className="h-4 w-4" />}>No QR? Search</SectionLabel>
        <form onSubmit={search} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="DBG-472 · leader phone · RA23…"
              aria-label="Search team"
              autoCapitalize="characters"
              className={cx(inputCls(), 'min-h-[48px] pl-10 text-base')}
            />
          </div>
          <Button type="submit" variant="primary" loading={searching} className="min-h-[48px]">
            Find
          </Button>
        </form>

        {results && (
          <div className="mt-4 space-y-2">
            {results.length === 0 && <p className="font-label text-sm text-neutral-500">No team found. Check the spelling or try another player’s register number.</p>}
            {results.map((t) => (
              <button
                key={t.teamId}
                onClick={() => openTeam(t.teamId)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-[#141417] p-4 text-left transition-colors hover:border-neutral-600"
              >
                <div>
                  <div className="font-poster text-2xl uppercase leading-none tracking-wide text-[#f5eee1]">{t.teamId}</div>
                  <div className="mt-1 font-label text-[15px] font-semibold text-white">{t.teamName}</div>
                  <div className="mt-1 font-label text-xs text-neutral-500">{t.players.map((p) => p.fullName.split(' ')[0]).join(' · ')}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={t.status} />
                  <ArrowRight className="h-4 w-4 text-neutral-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {/* Recently marked on this device */}
      {recentToday.length > 0 && (
        <Panel>
          <SectionLabel>Marked on this device · Day {day}</SectionLabel>
          <ul className="divide-y divide-neutral-800/70">
            {recentToday.map((m) => (
              <li key={m.teamId + m.day}>
                <Link href={`/attendance/${m.teamId}`} className="flex items-center justify-between py-2.5 font-label text-[15px] hover:text-white">
                  <span>
                    <span className="font-poster text-lg uppercase tracking-wide text-[#f5eee1]">{m.teamId}</span> <span className="text-neutral-300">{m.teamName}</span>
                  </span>
                  <span className="text-xs text-emerald-200">
                    {m.count}/{m.total} · {fmtTime(m.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
