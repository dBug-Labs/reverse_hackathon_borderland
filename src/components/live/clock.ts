'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Server clock and polling for the live games.
 *
 * Every response carries the server's `now`. We keep the offset from the
 * fastest round trip seen recently, so every phone and the projector count
 * down to the same server moment even though each polls at its own time.
 */

let offset = 0;
let bestRtt = Infinity;
let bestAt = 0;
let samples = 0;

export function noteServerTime(serverNow: number | undefined, sentAt: number, gotAt: number) {
  if (!serverNow) return;
  samples += 1;
  const rtt = gotAt - sentAt;
  // Prefer quick round trips; let the best one age out after a minute.
  if (rtt <= bestRtt * 1.2 || Date.now() - bestAt > 60_000) {
    bestRtt = rtt;
    bestAt = Date.now();
    offset = serverNow - (sentAt + gotAt) / 2;
  }
}

export const serverNow = () => Date.now() + offset;

/** True once a few round trips have been seen, so the offset can be trusted for decisions. */
export const clockReady = () => samples >= 3 && bestRtt < 2500;

/** GET JSON and line the clock up with the server. */
export async function getJSON<T>(url: string): Promise<{ ok: boolean; data?: T; code?: string; message?: string; status: number }> {
  const sentAt = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    const body = await res.json().catch(() => null);
    const gotAt = Date.now();
    noteServerTime(body?.data?.now, sentAt, gotAt);
    if (!body) return { ok: false, status: res.status, message: `Unexpected response (${res.status})` };
    return { ...body, status: res.status };
  } catch {
    return { ok: false, status: 0, code: 'NETWORK', message: 'Network error' };
  }
}

export async function postJSON<T>(url: string, payload: unknown): Promise<{ ok: boolean; data?: T; code?: string; message?: string; status: number }> {
  const sentAt = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    });
    const body = await res.json().catch(() => null);
    noteServerTime(body?.data?.now, sentAt, Date.now());
    if (!body) return { ok: false, status: res.status, message: `Unexpected response (${res.status})` };
    return { ...body, status: res.status };
  } catch {
    return { ok: false, status: 0, code: 'NETWORK', message: 'Network error' };
  }
}

/** Calls `fn` now and then every `ms`, never overlapping, slower while the tab is hidden. */
export function usePoll(fn: () => Promise<unknown>, ms: number, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      if (stop) return;
      try {
        await fnRef.current();
      } finally {
        if (!stop) timer = setTimeout(run, document.hidden ? Math.max(ms, 5000) : ms);
      }
    };
    run();
    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        run();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms, enabled]);
}

/** Server time, re-rendered `hz` times a second. */
export function useServerNow(hz = 10) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const iv = setInterval(() => setNow(serverNow()), 1000 / hz);
    return () => clearInterval(iv);
  }, [hz]);
  return now;
}

export const fmtChips = (n: number) => Math.round(n).toLocaleString('en-IN');
export const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${(p * 100).toFixed(1)}%`;
