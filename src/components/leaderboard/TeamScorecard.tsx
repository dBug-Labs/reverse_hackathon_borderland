'use client';

import React, { useEffect, useState } from 'react';
import { PARTS, type TeamScorecard as Card } from '@/lib/leaderboard/types';

/**
 * The team's own final scorecard on its status link (/r/[teamId]), shown once the organisers
 * publish scorecards from the leaderboard page. Nothing renders before that.
 */

const COLOR: Record<string, string> = { detective: '#e7e2d6', docs: '#e0352f', docTest: '#ff8a5c', judging: '#facc15', code: '#22e584', trading: '#5cc8ff' };

export function TeamScorecard({ teamId, token }: { teamId: string; token: string }) {
  const [c, setC] = useState<Card | null>(null);

  useEffect(() => {
    if (!teamId || !token) return;
    fetch(`/api/registrations/${encodeURIComponent(teamId)}/scorecard?t=${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((b) => b.ok && setC(b.data))
      .catch(() => {});
  }, [teamId, token]);

  if (!c?.published || !c.config) return null;
  const r = c.row;
  const cfg = c.config;

  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-black/50 p-5 font-label">
      <div className="font-poster text-2xl uppercase leading-none text-[#f2e9d8]">
        Your <span className="text-[var(--card-red)]">scorecard</span>
      </div>
      {!r ? (
        <p className="mt-2 text-[15px] text-neutral-400">No scores were recorded for your team.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-poster text-6xl leading-none text-white">#{r.rank}</div>
              <div className="text-xs text-neutral-500">of {c.of} teams</div>
            </div>
            <div>
              <div className="font-poster text-5xl leading-none text-[#facc15]">{r.total}</div>
              <div className="text-xs text-neutral-500">final score</div>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {PARTS.filter((p) => cfg.include[p.key]).map((p) => {
              const v = r.parts[p.key];
              return (
                <div key={p.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-neutral-300">
                      {p.suit} {p.label}
                    </span>
                    <span className="font-poster text-lg text-white">
                      {v ?? '–'}
                      <span className="text-xs text-neutral-500"> / {p.max}</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((v ?? 0) / p.max) * 100)}%`, background: COLOR[p.key] }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-neutral-800 pt-4 text-center text-sm">
            <div>
              <div className="font-poster text-xl text-white">{r.subtotal}</div>
              <div className="text-[11px] text-neutral-500">parts added</div>
            </div>
            <div>
              <div className="font-poster text-xl text-white">{cfg.multiplier ? `×${r.mult.toFixed(1)}` : '×1'}</div>
              <div className="text-[11px] text-neutral-500">card difficulty</div>
            </div>
            <div>
              <div className="font-poster text-xl text-[#e0352f]">
                {cfg.visas ? `+${10 * r.visas}` : '—'}
                {r.adjust ? <span className="text-white"> {r.adjust > 0 ? `+${r.adjust}` : r.adjust}</span> : null}
              </div>
              <div className="text-[11px] text-neutral-500">
                {cfg.visas ? `${r.visas} Visa${r.visas === 1 ? '' : 's'} left` : ''}
                {r.adjust ? ` · adjustment${r.adjustNote ? `: ${r.adjustNote}` : ''}` : ''}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Final = (parts added) × card difficulty{cfg.visas ? ' + 10 × Visas left' : ''}
            {r.adjust ? ' + adjustment' : ''}.
          </p>
        </>
      )}
    </section>
  );
}
