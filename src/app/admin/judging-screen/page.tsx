'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { JudgingState } from '@/lib/judging/types';
import { getJSON, postJSON, serverNow, usePoll, useServerNow } from '@/components/live/clock';
import { JudgingScreen, type Scene } from '@/components/judging/JudgingScreen';

/**
 * /admin/judging-screen — final judging on the projector.
 *
 * Keys: Space / → draw the panels (then it announces them by itself)
 *       R replay the draw · B the live board · L the lobby · F fullscreen
 */
export default function JudgingScreenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <JudgingStage />
    </Suspense>
  );
}

function JudgingStage() {
  const [s, setS] = useState<JudgingState | null>(null);
  const [error, setError] = useState('');
  const [scene, setScene] = useState<Scene | null>(null);
  const [armed, setArmed] = useState(useSearchParams().get('armed') === '1');
  const now = useServerNow(4);

  const load = useCallback(async () => {
    const r = await getJSON<JudgingState>('/api/admin/judging');
    if (r.status === 401) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (r.ok && r.data) {
      setS(r.data);
      setError('');
      // First load: already announced → straight to the board.
      setScene((x) => x ?? (r.data!.status === 'ANNOUNCED' ? 'board' : 'lobby'));
    } else setError(r.message || 'Could not load the panels.');
  }, []);
  usePoll(load, 1500);

  const announce = useCallback(async () => {
    const r = await postJSON<JudgingState>('/api/admin/judging', { action: 'announce' });
    if (r.ok && r.data) setS(r.data);
    else if (r.message) setError(r.message);
  }, []);

  const sRef = useRef(s);
  sRef.current = s;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = sRef.current;
      const k = e.key.toLowerCase();
      if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if ((k === ' ' || k === 'arrowright' || k === 'enter') && st) {
        e.preventDefault();
        if (scene === 'lobby' && st.slots.length) setScene('draw');
        else if (scene === 'draw') setScene('board');
      } else if (k === 'r' && st?.slots.length) setScene('draw');
      else if (k === 'b') setScene('board');
      else if (k === 'l') setScene('lobby');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene]);

  if (!s || !scene) {
    return <div className="flex min-h-screen items-center justify-center bg-black font-label text-neutral-400">{error || 'Loading the panels…'}</div>;
  }

  return (
    <>
      <JudgingScreen s={s} now={now || serverNow()} scene={scene} setScene={setScene} onDrawn={() => s.status !== 'ANNOUNCED' && announce()} />
      {!armed && (
        <button
          onClick={() => {
            setArmed(true);
            document.documentElement.requestFullscreen?.().catch(() => undefined);
          }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/85 text-center backdrop-blur"
        >
          <span className="font-poster text-6xl uppercase text-[#f2e9d8]">Click to start the show</span>
          <span className="font-label text-neutral-400">Turns on sound and fullscreen. Space draws the panels · R replay the draw · B live board · L lobby · F fullscreen</span>
        </button>
      )}
      {error && <div className="fixed bottom-2 left-2 z-[90] rounded bg-red-900/80 px-3 py-1 font-label text-xs text-white">{error}</div>}
    </>
  );
}
