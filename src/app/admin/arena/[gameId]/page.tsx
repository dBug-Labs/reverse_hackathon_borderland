'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { GameState } from '@/lib/live/types';
import { getJSON, postJSON, serverNow, usePoll, useServerNow } from '@/components/live/clock';
import { DetectiveScreen } from '@/components/live/DetectiveScreen';
import { ExchangeScreen } from '@/components/live/ExchangeScreen';

/**
 * /admin/arena/[gameId] — a live game on the projector.
 *
 * Keys: Space / → next (Code Detective) or open the market (Trading Floor)
 *       E +10 s on the clock · H halt trading 30 s · R resume · F fullscreen
 */
export default function ArenaPage() {
  const id = (useParams()?.gameId as string) || '';
  const [s, setS] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  // ?armed=1 skips the "click to start" cover (sound then waits for the first key press).
  const [armed, setArmed] = useState(useSearchParams().get('armed') === '1');
  const now = useServerNow(20);
  const vRef = useRef(0);

  const load = useCallback(async () => {
    const r = await getJSON<GameState>(`/api/admin/live/${id}`);
    if (r.status === 401) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (r.ok && r.data) {
      vRef.current = r.data.v;
      setS(r.data);
      setError('');
    } else setError(r.message || 'Could not load the game.');
  }, [id]);

  usePoll(load, 1000, !!id);

  const busy = useRef(false);
  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (busy.current) return;
      busy.current = true;
      const r = await postJSON<GameState>(`/api/admin/live/${id}`, { action, v: vRef.current, ...extra });
      busy.current = false;
      if (r.ok && r.data) {
        vRef.current = r.data.v;
        setS(r.data);
      } else if (r.message) setError(r.message);
    },
    [id]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!s) return;
      const k = e.key.toLowerCase();
      if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
        return;
      }
      if (k === ' ' || k === 'arrowright' || k === 'enter') {
        e.preventDefault();
        if (s.kind === 'detective') act('next');
        else if (s.status === 'LOBBY') act('start');
      } else if (k === 'e') act('extend', { secs: 10 });
      else if (k === 'h' && s.kind === 'exchange') act('halt', { secs: 30 });
      else if (k === 'r' && s.kind === 'exchange') act('resume');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s, act]);

  if (!s) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-label text-neutral-400">
        {error || 'Loading the arena…'}
      </div>
    );
  }

  return (
    <>
      {s.kind === 'detective' ? <DetectiveScreen s={s} now={now || serverNow()} act={act} /> : <ExchangeScreen s={s} now={now || serverNow()} />}
      {!armed && (
        <button
          onClick={() => {
            setArmed(true);
            document.documentElement.requestFullscreen?.().catch(() => undefined);
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/85 text-center backdrop-blur"
        >
          <span className="font-poster text-6xl uppercase text-[#f2e9d8]">Click to start the show</span>
          <span className="font-label text-neutral-400">Turns on sound and fullscreen. Space moves on · E +10 s · H halt · R resume · F fullscreen</span>
        </button>
      )}
      {error && <div className="fixed bottom-2 left-2 z-[90] rounded bg-red-900/80 px-3 py-1 font-label text-xs text-white">{error}</div>}
    </>
  );
}
