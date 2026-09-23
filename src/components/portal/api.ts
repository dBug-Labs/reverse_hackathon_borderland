'use client';

/**
 * Tiny fetch wrapper for the admin + attendance APIs.
 * Every API answers { ok: true, data } or { ok: false, code, message, fields? }.
 * A 401 sends the user back to the right login page.
 */

// Kept as one flat shape (not a discriminated union) because tsconfig has strict: false,
// where narrowing on `ok: true | false` does not work.
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  fields?: Record<string, string>;
}

export type Area = 'admin' | 'attendance';

export async function api<T>(url: string, init: RequestInit = {}, area?: Area): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });

    if (res.status === 401 && area && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/${area}/login?next=${next}`;
      return { ok: false, code: 'UNAUTHORIZED', message: 'Session expired — please log in again.' };
    }

    const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (!body) {
      return { ok: false, code: 'INTERNAL', message: `Unexpected response from server (${res.status}).` };
    }
    return body;
  } catch {
    return { ok: false, code: 'NETWORK', message: 'Network error — check your connection and try again.' };
  }
}

export const post = <T,>(url: string, body?: unknown, area?: Area) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(body ?? {}) }, area);

// ── Name of the logged-in person (the API only returns it at login) ──
const nameKey = (area: Area) => `bnd_${area}_name`;

export function saveActorName(area: Area, name: string) {
  try {
    localStorage.setItem(nameKey(area), name);
  } catch {
    /* storage unavailable — name just won't show */
  }
}

export function readActorName(area: Area): string {
  try {
    return localStorage.getItem(nameKey(area)) || '';
  } catch {
    return '';
  }
}

export function clearActorName(area: Area) {
  try {
    localStorage.removeItem(nameKey(area));
  } catch {
    /* ignore */
  }
}
