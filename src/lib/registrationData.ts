'use client';

/**
 * Shared client-side data layer for registration social-proof features.
 *
 * • Single fetch + in-memory cache shared across ticker, banner, and popup.
 * • Polls every POLL_INTERVAL_MS and pauses when the tab is hidden.
 * • Converts timestamps to relative time strings.
 * • On failure, returns null so consumers can hide their UI gracefully.
 */

import { POLL_INTERVAL_MS } from '@/lib/slots';

// ── Types ───────────────────────────────────────────────────────────────────

export interface RecentRegistration {
  name: string;
  createdAt: string;
  relativeTime: string;
}

export interface RegistrationData {
  recent: RecentRegistration[];
  count: number;
}

// ── Relative time ───────────────────────────────────────────────────────────

export function toRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Cache ───────────────────────────────────────────────────────────────────

let cached: { data: RegistrationData; fetchedAt: number } | null = null;

/** Cache is fresh for half the poll interval */
function isFresh(): boolean {
  return cached !== null && Date.now() - cached.fetchedAt < POLL_INTERVAL_MS / 2;
}

// ── Fetch ───────────────────────────────────────────────────────────────────

let inflightPromise: Promise<RegistrationData | null> | null = null;

/**
 * Dev-only fallback when the DB is unreachable (e.g. Atlas IP allowlist).
 * Returns sample data so the features can be tested visually.
 */
function devFallback(): RegistrationData | null {
  if (process.env.NODE_ENV !== 'development') return null;

  const now = Date.now();
  const names = [
    'Aarav K.', 'Priya M.', 'Rohan S.', 'Ananya D.', 'Vikram P.',
    'Sneha R.', 'Arjun T.', 'Ishaan B.', 'Kavya N.', 'Rahul G.',
    'Meera J.', 'Aditya L.',
  ];

  return {
    recent: names.map((name, i) => ({
      name,
      createdAt: new Date(now - (i + 1) * 180_000).toISOString(),
      relativeTime: toRelativeTime(new Date(now - (i + 1) * 180_000).toISOString()),
    })),
    count: 52, // simulates low-slots condition (60 - 52 = 8 remaining)
  };
}

async function doFetch(): Promise<RegistrationData | null> {
  try {
    const [recentRes, countRes] = await Promise.all([
      fetch('/api/registrations/recent'),
      fetch('/api/registrations/count'),
    ]);

    if (!recentRes.ok || !countRes.ok) {
      // In dev mode, use fallback data so the UI can be tested
      const fb = devFallback();
      if (fb) {
        cached = { data: fb, fetchedAt: Date.now() };
        return fb;
      }
      return null;
    }

    const [recentJson, countJson] = await Promise.all([
      recentRes.json(),
      countRes.json(),
    ]);

    if (!recentJson.ok || !countJson.ok) {
      const fb = devFallback();
      if (fb) {
        cached = { data: fb, fetchedAt: Date.now() };
        return fb;
      }
      return null;
    }

    const recent: RecentRegistration[] = (recentJson.data ?? []).map(
      (r: { name: string; createdAt: string }) => ({
        name: r.name,
        createdAt: r.createdAt,
        relativeTime: toRelativeTime(r.createdAt),
      })
    );

    const data: RegistrationData = {
      recent,
      count: countJson.data?.count ?? 0,
    };

    cached = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    const fb = devFallback();
    if (fb) {
      cached = { data: fb, fetchedAt: Date.now() };
      return fb;
    }
    return null;
  } finally {
    inflightPromise = null;
  }
}

/**
 * Get registration data. Returns cached data if fresh, otherwise fetches.
 * Deduplicates concurrent calls.
 */
export function fetchRegistrationData(): Promise<RegistrationData | null> {
  if (isFresh()) return Promise.resolve(cached!.data);
  if (inflightPromise) return inflightPromise;
  inflightPromise = doFetch();
  return inflightPromise;
}

/**
 * Refresh relative times on already-cached data without re-fetching.
 */
export function refreshRelativeTimes(): RegistrationData | null {
  if (!cached) return null;
  cached.data.recent = cached.data.recent.map((r) => ({
    ...r,
    relativeTime: toRelativeTime(r.createdAt),
  }));
  return cached.data;
}

// ── Polling hook ────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * React hook that provides registration data with automatic polling.
 * Pauses when the tab is hidden. Shared cache means multiple consumers
 * don't cause duplicate network requests.
 */
export function useRegistrationData() {
  const [data, setData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const result = await fetchRegistrationData();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial fetch
    load();

    // Poll
    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        load(); // immediate refresh
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    // Refresh relative times every 30s (no network)
    const relativeTimer = setInterval(() => {
      const refreshed = refreshRelativeTimes();
      if (refreshed) setData({ ...refreshed });
    }, 30_000);

    return () => {
      stopPolling();
      clearInterval(relativeTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  return { data, loading };
}
