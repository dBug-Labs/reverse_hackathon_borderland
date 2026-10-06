'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { LeaderView } from '@/lib/leaderboard/types';
import { getJSON, usePoll } from '@/components/live/clock';
import { LeaderboardScreen, type Mode } from '@/components/leaderboard/LeaderboardScreen';

/**
 * /admin/leaderboard-screen — the leaderboard on the projector.
 *
 * Keys: L live board · R reveal mode (all cards face down)
 *       Space / → flip the next card from last place up (top 3 get a spotlight)
 *       ← flip one back · Esc close the spotlight · F fullscreen
 */
export default function LeaderboardScreenPage() {
  const [v, setV] = useState<LeaderView | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('live');
  const [revealed, setRevealed] = useState(0);
  const [hold, setHold] = useState(false);

  const load = useCallback(async () => {
    const r = await getJSON<LeaderView>('/api/admin/leaderboard');
    if (r.status === 401) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (r.ok && r.data) {
      setV(r.data);
      setError('');
    } else setError(r.message || 'Could not load the leaderboard.');
  }, []);
  // During the reveal the order is frozen, so a late score cannot reshuffle the cards on stage.
  usePoll(load, 3000, mode === 'live');

  const ref = useRef({ v, revealed, hold, mode });
  ref.current = { v, revealed, hold, mode };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const n = ref.current.v?.rows.length ?? 0;
      if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (k === 'l') {
        setMode('live');
        setHold(false);
      } else if (k === 'r') {
        setMode('reveal');
        setRevealed(0);
        setHold(false);
      } else if (k === ' ' || k === 'arrowright' || k === 'enter') {
        e.preventDefault();
        if (ref.current.mode !== 'reveal') return;
        // A spotlight (top 3) stays until the next press closes it.
        if (ref.current.hold) setHold(false);
        else setRevealed(Math.min(n, ref.current.revealed + 1));
      } else if (k === 'arrowleft') setRevealed((x) => Math.max(0, x - 1));
      else if (k === 'escape') setHold(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Each top-3 flip opens a spotlight; the next press closes it before flipping on.
  useEffect(() => {
    const n = v?.rows.length ?? 0;
    // Everyone on the podium gets a spotlight (ties share a place, so it can be more than three).
    const podium = v?.rows.filter((r) => r.rank <= 3).length ?? 3;
    if (mode === 'reveal' && revealed > 0 && n - revealed < podium) setHold(true);
  }, [revealed, mode, v?.rows]);

  if (!v) return <div className="flex min-h-screen items-center justify-center bg-black font-label text-neutral-500">{error || 'Loading…'}</div>;
  return <LeaderboardScreen v={v} mode={mode} revealed={revealed} spotlightOn={hold} />;
}
