'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * /workshop — Day 1 workshop submission. Team ID + GitHub link, nothing else.
 * The emailed link pre-fills the team ID (?team=DBG-123).
 */

type Done = { teamId: string; teamName: string; repoUrl: string; updated: boolean };

const input =
  'w-full rounded-lg border bg-black/50 px-4 py-3 font-label text-[16px] text-white placeholder:text-neutral-600 outline-none transition focus:border-[var(--card-red)]';

export default function WorkshopPage() {
  const [teamId, setTeamId] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('team');
    if (t) setTeamId(t.toUpperCase());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, repoUrl }),
      });
      const j = await res.json();
      if (j.ok) setDone(j.data);
      else {
        setError(j.message || 'Something went wrong');
        setFields(j.fields || {});
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-24 pt-10 text-[#f2e9d8] sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="font-caps text-xs uppercase tracking-[0.3em] text-[var(--card-red)]">
          HACKBACK · dBug Labs
        </Link>
        <h1 className="mt-2 font-poster text-5xl uppercase leading-none">Workshop submission</h1>
        <p className="mt-3 font-label text-[15px] text-neutral-300">
          Push today’s workshop work to a <b className="text-white">public GitHub repo</b> and submit the link here. One link per team. You can
          submit again to replace it.
        </p>

        {done ? (
          <div className="mt-8 rounded-2xl border border-emerald-600/50 bg-emerald-900/15 p-6 font-label">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <div className="mt-3 font-poster text-3xl uppercase leading-none text-white">{done.updated ? 'Updated' : 'Submitted'}</div>
            <p className="mt-2 text-neutral-300">
              <b className="text-white">
                {done.teamId} · {done.teamName}
              </b>
            </p>
            <a href={done.repoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[#ff8a8a] underline">
              {done.repoUrl}
            </a>
            <button onClick={() => setDone(null)} className="mt-5 text-sm text-neutral-400 underline hover:text-white">
              Submit a different link
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5 font-label">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-300">Team ID</span>
              <input
                value={teamId}
                onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                placeholder="DBG-123"
                autoComplete="off"
                required
                className={`${input} mt-1.5 ${fields.teamId ? 'border-[var(--card-red)]' : 'border-neutral-800'}`}
              />
              {fields.teamId && <span className="mt-1 block text-sm text-[#ff8a8a]">{fields.teamId}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-neutral-300">GitHub repo link</span>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/your-name/your-repo"
                inputMode="url"
                autoComplete="off"
                required
                className={`${input} mt-1.5 ${fields.repoUrl ? 'border-[var(--card-red)]' : 'border-neutral-800'}`}
              />
              {fields.repoUrl && <span className="mt-1 block text-sm text-[#ff8a8a]">{fields.repoUrl}</span>}
            </label>
            {error && !Object.keys(fields).length && <p className="text-sm text-[#ff8a8a]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--card-red)] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
