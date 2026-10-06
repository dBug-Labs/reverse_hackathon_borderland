'use client';

import React, { useCallback, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Banner, Button, PageTitle, Panel, SectionLabel } from '@/components/portal/ui';
import { getJSON, postJSON, usePoll } from '@/components/live/clock';
import { PARTS, type LeaderConfig, type LeaderRow, type LeaderView } from '@/lib/leaderboard/types';

/**
 * /admin/leaderboard — every score added up, live. Choose what counts, enter the parts the
 * app does not track (Visas left, Doc Test, adjustments), and put the board on the projector.
 */

const RED = new Set(['♥', '♦']);

export default function LeaderboardAdminPage() {
  const [v, setV] = useState<LeaderView | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const r = await getJSON<LeaderView>('/api/admin/leaderboard');
    if (r.ok && r.data) setV(r.data);
    else if (r.message) setMsg(r.message);
  }, []);
  usePoll(load, 4000);

  const send = useCallback(async (body: Record<string, unknown>) => {
    const r = await postJSON<LeaderView>('/api/admin/leaderboard', body);
    if (r.ok && r.data) {
      setV(r.data);
      setMsg('');
    } else setMsg(r.message || 'Could not save.');
  }, []);

  if (!v) return <PageTitle kicker="Live" title="Leaderboard" subtitle={msg || 'Loading…'} />;
  const c = v.config;
  const setCfg = (config: Partial<LeaderConfig>) => send({ action: 'config', config });

  function csv() {
    const head = ['Rank', 'Team ID', 'Team', 'Card', ...PARTS.map((p) => p.label), 'Multiplier', 'Visas', 'Adjust', 'Total'];
    const lines = v!.rows.map((r) => [r.rank, r.teamId, r.teamName, r.cardTitle ?? '', ...PARTS.map((p) => r.parts[p.key] ?? ''), r.mult, r.visas, r.adjust, r.total]);
    navigator.clipboard?.writeText([head, ...lines].map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n'));
    setMsg('');
  }

  const formula = `( ${PARTS.filter((p) => c.include[p.key]).map((p) => p.short).join(' + ') || 'nothing'} )${c.multiplier ? ' × card' : ''}${c.visas ? ' + 10 × Visas' : ''} + adjust`;

  return (
    <>
      <PageTitle
        kicker="Live · updates by itself"
        title="Leaderboard"
        subtitle="Every score added up as it comes in: live games, docs, judges, code review. Choose what counts and fill in Visas and the Doc Test here."
        actions={
          <div className="flex gap-2">
            <Button onClick={csv}>
              <Copy className="h-3.5 w-3.5" /> CSV
            </Button>
            <a href="/admin/leaderboard-screen" target="_blank" rel="noreferrer">
              <Button variant="paper">
                <ExternalLink className="h-3.5 w-3.5" /> Open the screen
              </Button>
            </a>
          </div>
        }
      />
      {msg && <Banner>{msg}</Banner>}

      <Panel className="mb-6">
        <SectionLabel>What counts</SectionLabel>
        <div className="flex flex-wrap gap-2 font-label text-sm">
          {PARTS.map((p) => (
            <Toggle key={p.key} on={c.include[p.key]} onClick={() => setCfg({ include: { ...c.include, [p.key]: !c.include[p.key] } })}>
              <span className={RED.has(p.suit) ? 'text-[#e0352f]' : ''}>{p.suit}</span> {p.label} <span className="text-neutral-500">/{p.max}</span>
            </Toggle>
          ))}
          <Toggle on={c.multiplier} onClick={() => setCfg({ multiplier: !c.multiplier })}>
            × Card multiplier
          </Toggle>
          <Toggle on={c.visas} onClick={() => setCfg({ visas: !c.visas })}>
            + 10 × Visas left
          </Toggle>
          <Toggle on={c.scoredOnly} onClick={() => setCfg({ scoredOnly: !c.scoredOnly })}>
            Only teams with a score
          </Toggle>
        </div>
        <p className="mt-3 font-mono text-xs text-neutral-400">Total = {formula}</p>
        <p className="mt-1 font-label text-xs text-neutral-500">
          Sources: {PARTS.map((p) => `${p.short}: ${p.source}`).join(' · ')}. Card multiplier: 7–8 ×1.0, J–Q ×1.1, K ×1.2.
        </p>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full font-label text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-3">Team</th>
                {PARTS.map((p) => (
                  <th key={p.key} className={`py-2 pr-2 text-right ${c.include[p.key] ? '' : 'opacity-40'}`}>
                    {p.short}
                  </th>
                ))}
                <th className="py-2 pr-2 text-right">×</th>
                <th className="py-2 pr-2 text-center">Visas</th>
                <th className="py-2 pr-2 text-right">Adjust</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {v.rows.map((r) => (
                <Row key={r.teamId} r={r} c={c} send={send} />
              ))}
            </tbody>
          </table>
          {!v.rows.length && <p className="py-4 font-label text-sm text-neutral-500">No scores yet.</p>}
        </div>
      </Panel>
    </>
  );
}

function Row({ r, c, send }: { r: LeaderRow; c: LeaderConfig; send: (b: Record<string, unknown>) => void }) {
  const [docTest, setDocTest] = useState<string>(r.parts.docTest !== undefined ? String(r.parts.docTest) : '');
  const [adjust, setAdjust] = useState(String(r.adjust || ''));
  const num = 'w-14 rounded border border-neutral-800 bg-[#0d0d10] px-1.5 py-0.5 text-right text-white';
  return (
    <tr className="border-b border-neutral-900 text-neutral-300">
      <td className="py-2 pr-2 font-poster text-lg text-white">{r.rank}</td>
      <td className="py-2 pr-3">
        <div className="text-white">{r.teamName}</div>
        <div className="text-xs text-neutral-500">
          {r.teamId} · {r.suit} {r.cardTitle ?? 'no card'}
          {(r.year || r.dept) && <span className="text-neutral-400"> · {[r.year, r.dept].filter(Boolean).join(' · ')}</span>}
        </div>
      </td>
      {PARTS.map((p) => (
        <td key={p.key} className={`py-2 pr-2 text-right ${c.include[p.key] ? '' : 'opacity-40'}`}>
          {p.key === 'docTest' ? (
            <input
              className={num}
              value={docTest}
              placeholder="—"
              onChange={(e) => setDocTest(e.target.value)}
              onBlur={() => send({ action: 'team', teamId: r.teamId, docTest: docTest.trim() === '' ? null : Number(docTest) })}
            />
          ) : (
            (r.parts[p.key] ?? '—')
          )}
        </td>
      ))}
      <td className="py-2 pr-2 text-right text-neutral-500">{r.mult.toFixed(1)}</td>
      <td className="py-2 pr-2 text-center">
        <span className="inline-flex gap-0.5">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              title={`${n} Visa${n > 1 ? 's' : ''} left`}
              onClick={() => send({ action: 'team', teamId: r.teamId, visas: r.visas >= n ? n - 1 : n })}
              className={`text-base leading-none ${r.visas >= n ? 'text-[#e0352f]' : 'text-neutral-700'}`}
            >
              ♥
            </button>
          ))}
        </span>
      </td>
      <td className="py-2 pr-2 text-right">
        <input
          className={num}
          value={adjust}
          placeholder="0"
          title={r.adjustNote || 'Bonus or penalty'}
          onChange={(e) => setAdjust(e.target.value)}
          onBlur={() => {
            if (Number(adjust || 0) === r.adjust) return;
            const note = Number(adjust || 0) ? window.prompt('Reason for the adjustment', r.adjustNote ?? '') ?? '' : '';
            send({ action: 'team', teamId: r.teamId, adjust: Number(adjust || 0), adjustNote: note });
          }}
        />
      </td>
      <td className="py-2 text-right font-poster text-xl text-white">{r.total}</td>
    </tr>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-md border px-3 py-1.5 ${on ? 'border-[var(--paper)] bg-[#18181c] text-white' : 'border-neutral-800 text-neutral-500 line-through hover:border-neutral-600'}`}>
      {children}
    </button>
  );
}
