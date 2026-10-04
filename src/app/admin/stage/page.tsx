'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { api, post } from '@/components/portal/api';
import { playHudClick, playRiskAlarm } from '@/utils/sound';
import { CardWall, FinalBoard, IntroCurtain, OrderGrid, RevealScene, ShuffleDrum, StageBackdrop } from '@/components/carddrop/StageScenes';
import type { AdminViewDTO } from '@/components/carddrop/types';

/**
 * /admin/stage — the Card Drop on the projector.
 *
 * Keys: Space / → next · A auto-play · B jump to the board · R replay · F fullscreen
 */

type Scene = 'idle' | 'shuffle' | 'order' | 'reveal' | 'board';
const AUTO_MS = 3600;

export default function CardDropStage() {
  const [view, setView] = useState<AdminViewDTO | null>(null);
  const [error, setError] = useState('');
  const [scene, setScene] = useState<Scene>('idle');
  const [curtain, setCurtain] = useState(false);
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [presentOnly, setPresentOnly] = useState<boolean | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardWidth, setCardWidth] = useState(120);

  // Two rows of track blocks (2×2) between the title and the controls.
  useEffect(() => setCardWidth(Math.max(80, Math.min(140, Math.round((window.innerHeight - 490) / 2 / 1.4)))), []);

  const load = useCallback(async () => {
    const res = await api<AdminViewDTO>('/api/admin/card-drop', {}, 'admin');
    if (res.ok && res.data) {
      setView(res.data);
      setError('');
    } else if (res.message) setError(res.message);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live counter of teams that have chosen, while waiting on the idle screen.
  useEffect(() => {
    if (scene !== 'idle') return;
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [scene, load]);

  const picks = useMemo(() => [...(view?.assignments ?? [])].sort((a, b) => a.pick - b.pick), [view]);
  const names = useMemo(() => Object.fromEntries(picks.map((p) => [p.teamId, p.teamName])), [picks]);
  const presentCount = view?.teams.filter((t) => t.presentDay1).length ?? 0;
  const usePresent = presentOnly ?? presentCount > 0;
  const chosen = view?.teams.filter((t) => t.choices.length > 0).length ?? 0;
  const pool = usePresent ? presentCount : view?.teams.length ?? 0;
  const drawn = view?.phase === 'DRAWN' || view?.phase === 'LOCKED';

  const startShow = useCallback(() => {
    playRiskAlarm();
    setIdx(0);
    setAuto(false);
    setCurtain(true);
  }, []);

  async function draw() {
    if (!armed) {
      setArmed(true);
      playHudClick();
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    setBusy(true);
    const res = await post<AdminViewDTO>('/api/admin/card-drop', { action: 'draw', presentOnly: usePresent }, 'admin');
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.message || 'The draw failed.');
      return;
    }
    setView(res.data);
    startShow();
  }

  const next = useCallback(() => {
    if (scene === 'order') {
      setScene('reveal');
      setIdx(0);
    } else if (scene === 'reveal') {
      if (idx + 1 >= picks.length) setScene('board');
      else setIdx((i) => i + 1);
    }
  }, [scene, idx, picks.length]);

  // Auto-play through the reveal.
  useEffect(() => {
    if (!auto || (scene !== 'reveal' && scene !== 'order')) return;
    const t = setTimeout(next, scene === 'order' ? 2500 : AUTO_MS);
    return () => clearTimeout(t);
  }, [auto, scene, idx, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'arrowright' || k === 'enter') {
        e.preventDefault();
        next();
      } else if (k === 'a') setAuto((v) => !v);
      else if (k === 'b' && drawn) setScene('board');
      else if (k === 'r' && drawn) startShow();
      else if (k === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      } else if (k === 'escape' && scene !== 'idle' && !curtain) setScene('idle');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, drawn, startShow, scene, curtain]);

  const onCovered = useCallback(() => setScene('shuffle'), []);
  const onCurtainDone = useCallback(() => setCurtain(false), []);
  const onShuffled = useCallback(() => setScene('order'), []);

  return (
    <div className="relative min-h-screen overflow-hidden text-[#ededed]">
      <StageBackdrop />

      {scene === 'idle' && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-between px-8 py-8">
          <div className="text-center">
            <p className="font-caps text-sm uppercase tracking-[0.5em] text-[#ff6b6b]">dBug Labs · Hackback · ゲーム開始</p>
            <motion.h1
              className="mt-2 font-poster text-[13vh] uppercase leading-[0.9] text-[#f2e9d8]"
              initial={{ opacity: 0, y: 30, letterSpacing: '0.3em' }}
              animate={{ opacity: 1, y: 0, letterSpacing: '0.01em' }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
            >
              The Card <span className="text-[#ff3b3b]" style={{ textShadow: '0 0 40px rgba(255,59,59,.5)' }}>Drop</span>
            </motion.h1>
            <p className="mt-2 font-label text-lg text-neutral-400">12 problem statements. 4 tracks. One draw decides who plays which game.</p>
          </div>

          <CardWall cardWidth={cardWidth} />

          <div className="flex w-full max-w-4xl flex-col items-center gap-4">
            {view && view.phase === 'CLOSED' && (
              <p className="font-label text-neutral-400">
                The Card Drop is not open yet. Open it from the{' '}
                <Link href="/admin/card-drop" className="text-[#ff6b6b] underline">
                  console
                </Link>
                .
              </p>
            )}

            {view && view.phase === 'PREFS_OPEN' && (
              <>
                <div className="flex items-end gap-10">
                  <Counter label="teams have chosen" value={chosen} of={view.teams.length} />
                  <Counter label="checked in today" value={presentCount} of={view.teams.length} />
                </div>
                <label className="flex items-center gap-2 font-label text-sm text-neutral-400">
                  <input type="checkbox" checked={usePresent} onChange={(e) => setPresentOnly(e.target.checked)} className="accent-[#b3202a]" />
                  Only teams checked in today ({pool} teams in the draw)
                </label>
                <motion.button
                  onClick={draw}
                  disabled={busy || pool === 0}
                  className="relative rounded-xl border-2 border-[#ff3b3b] bg-[#b3202a] px-14 py-4 font-poster text-4xl uppercase tracking-wide text-white disabled:opacity-40"
                  animate={armed ? { scale: [1, 1.06, 1], boxShadow: ['0 0 0px #ff3b3b', '0 0 60px #ff3b3b', '0 0 0px #ff3b3b'] } : { scale: 1 }}
                  transition={armed ? { duration: 0.8, repeat: Infinity } : {}}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {busy ? 'Drawing…' : armed ? 'Press again to draw' : 'Draw the cards'}
                </motion.button>
              </>
            )}

            {view && drawn && (
              <div className="flex gap-3">
                <StageButton onClick={startShow}>Replay the draw</StageButton>
                <StageButton onClick={() => setScene('board')}>Show the board</StageButton>
              </div>
            )}

            {view?.seedHash && (
              <p className="max-w-[90vw] break-all text-center font-mono text-xs text-neutral-500">
                Seal (sha256 of the secret seed, fixed before anyone chose): {view.seedHash}
              </p>
            )}
            {error && <p className="font-label text-sm text-[#ff8a8a]">{error}</p>}
          </div>
        </div>
      )}

      {scene === 'shuffle' && <ShuffleDrum order={view?.order ?? []} seedHash={view?.seedHash} onDone={onShuffled} />}
      {scene === 'order' && <OrderGrid order={view?.order ?? []} names={names} />}
      {scene === 'reveal' && <RevealScene picks={picks} idx={idx} cap={view?.cap ?? 3} total={picks.length} />}
      {scene === 'board' && <FinalBoard picks={picks} seed={view?.seed} seedHash={view?.seedHash} order={view?.order ?? []} />}

      {curtain && <IntroCurtain onCovered={onCovered} onDone={onCurtainDone} />}

      {scene !== 'idle' && !curtain && (
        <div className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 font-label text-[11px] uppercase tracking-[0.2em] text-neutral-600">
          Space next · A auto {auto ? '(on)' : '(off)'} · B board · R replay · F fullscreen · Esc back
        </div>
      )}
    </div>
  );
}

function Counter({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <div className="text-center">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          className="font-poster text-6xl leading-none text-[#f2e9d8]"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
        >
          {value}
          <span className="text-3xl text-neutral-600">/{of}</span>
        </motion.div>
      </AnimatePresence>
      <div className="mt-1 font-caps text-xs uppercase tracking-[0.3em] text-neutral-500">{label}</div>
    </div>
  );
}

function StageButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={() => {
        playHudClick();
        onClick();
      }}
      className="rounded-xl border border-neutral-700 bg-black/60 px-6 py-3 font-poster text-2xl uppercase tracking-wide text-[#f2e9d8] backdrop-blur transition hover:border-[#ff3b3b] hover:text-white"
    >
      {children}
    </button>
  );
}
