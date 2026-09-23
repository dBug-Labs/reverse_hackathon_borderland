'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { playHudClick } from '@/utils/sound';
import { api, clearActorName, post, readActorName } from './api';
import { GridBackdrop, Wordmark, cx } from './ui';

interface DeskCtx {
  day: 1 | 2;
  setDay: (d: 1 | 2) => void;
  name: string;
}

const Ctx = createContext<DeskCtx>({ day: 1, setDay: () => {}, name: '' });
export const useDesk = () => useContext(Ctx);

const DAY_KEY = 'bnd_attendance_day';

export function AttendanceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [day, setDayState] = useState<1 | 2>(1);
  const [name, setName] = useState('');

  useEffect(() => {
    setName(readActorName('attendance'));
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(DAY_KEY);
    } catch {
      /* ignore */
    }
    if (saved === '1' || saved === '2') {
      setDayState(Number(saved) as 1 | 2);
      return;
    }
    // No saved choice → pick today's event day from the public event info.
    api<{ day1Date: string; day2Date: string }>('/api/event').then((r) => {
      if (!r.ok) return;
      const today = new Date().toDateString();
      if (new Date(r.data.day2Date).toDateString() === today) setDayState(2);
    });
  }, []);

  const setDay = (d: 1 | 2) => {
    playHudClick();
    setDayState(d);
    try {
      localStorage.setItem(DAY_KEY, String(d));
    } catch {
      /* ignore */
    }
  };

  async function logout() {
    await post('/api/attendance/logout');
    clearActorName('attendance');
    router.replace('/attendance/login');
  }

  return (
    <Ctx.Provider value={{ day, setDay, name }}>
      <div className="relative min-h-screen overflow-x-clip bg-[#08080a] text-[#ededed] selection:bg-red-600/30">
        <GridBackdrop />

        <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-[#08080a]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Wordmark href="/attendance" className="text-xl" />
              <div className="mt-1 flex items-center gap-1.5 truncate font-label text-xs font-semibold text-neutral-500">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                Check-in · {name || 'Volunteer'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-neutral-800 bg-[#0d0d10] p-1" role="tablist" aria-label="Event day">
                {[1, 2].map((d) => (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={day === d}
                    onClick={() => setDay(d as 1 | 2)}
                    className={cx(
                      'min-h-[40px] rounded-full px-3.5 font-label text-sm font-bold transition-colors sm:px-4',
                      day === d ? 'bg-[var(--paper)] text-[var(--ink)]' : 'text-neutral-400 hover:text-white'
                    )}
                  >
                    Day {d}
                  </button>
                ))}
              </div>
              <button onClick={logout} aria-label="Log out" className="flex h-[48px] w-[44px] items-center justify-center rounded-lg border border-neutral-800 bg-[#141417] text-neutral-400 hover:border-[var(--card-red)]/70 hover:text-[#ff8a8a]">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-3xl px-4 py-6">{children}</main>
      </div>
    </Ctx.Provider>
  );
}

// ── Recently marked teams (this device only) ──────────────────────
const RECENT_KEY = 'bnd_attendance_recent';
export interface RecentMark {
  teamId: string;
  teamName: string;
  day: 1 | 2;
  count: number;
  total: number;
  at: string;
}

export function readRecent(): RecentMark[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as RecentMark[];
  } catch {
    return [];
  }
}

export function pushRecent(m: RecentMark) {
  try {
    const list = [m, ...readRecent().filter((r) => !(r.teamId === m.teamId && r.day === m.day))].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
