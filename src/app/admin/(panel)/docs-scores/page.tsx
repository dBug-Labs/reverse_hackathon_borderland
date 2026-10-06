'use client';

import React, { useCallback, useState } from 'react';
import { ExternalLink, Pencil } from 'lucide-react';
import { Banner, Button, PageTitle, Panel, inputCls } from '@/components/portal/ui';
import { getJSON, postJSON, usePoll } from '@/components/live/clock';
import type { DocScore } from '@/lib/services/docScores';

/**
 * /admin/docs-scores — the Deduction (docs, out of 150) for every team, as scored by the
 * AI reviewers at the 8:30 AM docs freeze. Any part can be corrected here.
 */

const MAX = { accuracy: 60, completeness: 50, gaps: 40 } as const;
const BREAK_LABEL: Record<string, string> = { prd: 'PRD', data_model: 'Data model', api: 'API', architecture: 'Architecture', observations: 'Observations', agent_log: 'Agent log', gaps: 'Gaps', imp1: 'Improvement 1', imp2: 'Improvement 2' };

export default function DocsScoresPage() {
  const [rows, setRows] = useState<DocScore[] | null>(null);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getJSON<DocScore[]>('/api/admin/docs-scores');
    if (r.ok && r.data) setRows(r.data);
    else if (r.message) setMsg(r.message);
  }, []);
  usePoll(load, 10000);

  return (
    <>
      <PageTitle
        kicker="♦ The Deduction · out of 150"
        title="Docs scores"
        subtitle="Each team's docs at the 8:30 AM freeze: accuracy of their claims about the original (60), completeness of the 7 docs (50), gaps and the two improvements (40). Scored by AI reviewers; correct any part with Edit."
      />
      {msg && <Banner>{msg}</Banner>}
      {rows && !rows.length && <Banner tone="info">No docs scores imported yet.</Banner>}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full font-label text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Team</th>
                <th className="py-2 pr-3 text-right">Accuracy /60</th>
                <th className="py-2 pr-3 text-right">Complete /50</th>
                <th className="py-2 pr-3 text-right">Gaps /40</th>
                <th className="py-2 pr-3 text-right">Total /150</th>
                <th className="py-2 pr-3">Doc Test</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <React.Fragment key={r.teamId}>
                  <tr className="cursor-pointer border-b border-neutral-900 text-neutral-300 hover:bg-[#111114]" onClick={() => setOpen(open === r.teamId ? null : r.teamId)}>
                    <td className="py-2 pr-3 font-poster text-lg text-white">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="text-white">{r.teamName}</span> <span className="text-xs text-neutral-500">{r.teamId} · {r.card}</span>
                      {r.flags.length > 0 && <span className="ml-2 rounded bg-amber-900/40 px-1.5 text-[10px] font-bold uppercase text-amber-300">flag</span>}
                      {r.editedBy && <span className="ml-2 rounded bg-neutral-800 px-1.5 text-[10px] font-bold uppercase text-neutral-300">edited</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{r.accuracy}</td>
                    <td className="py-2 pr-3 text-right">{r.completeness}</td>
                    <td className="py-2 pr-3 text-right">{r.gaps}</td>
                    <td className="py-2 pr-3 text-right font-poster text-xl text-white">{r.total}</td>
                    <td className="py-2 pr-3 text-xs text-neutral-400">{r.docTest.split(/[—–-]/)[0].trim()}</td>
                    <td className="py-2 text-right">
                      <Pencil className="inline h-3.5 w-3.5 text-neutral-500" />
                    </td>
                  </tr>
                  {open === r.teamId && (
                    <tr className="border-b border-neutral-900">
                      <td colSpan={8} className="bg-[#0d0d10] p-4">
                        <Detail r={r} onSaved={setRows} onError={setMsg} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Detail({ r, onSaved, onError }: { r: DocScore; onSaved: (rows: DocScore[]) => void; onError: (m: string) => void }) {
  const [v, setV] = useState({ accuracy: r.accuracy, completeness: r.completeness, gaps: r.gaps });
  const [note, setNote] = useState(r.editNote ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await postJSON<DocScore[]>('/api/admin/docs-scores', { teamId: r.teamId, ...v, note });
    setBusy(false);
    if (res.ok && res.data) onSaved(res.data);
    else onError(res.message || 'Could not save.');
  }

  return (
    <div className="grid gap-5 font-label text-sm lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-2 text-neutral-300">
        <div className="text-xs text-neutral-500">
          {r.repo && (
            <a href={r.repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
              {r.repo.replace('https://github.com/', '')} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {r.commit && ` · judged ${r.commit.slice(0, 7)} (${r.commitDate ?? ''})`} · {r.claims.checked} claims checked: {r.claims.right} right, {r.claims.half} half, {r.claims.wrong} wrong
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(r.breakdown).map(([k, n]) => (
            <span key={k} className="rounded border border-neutral-800 px-2 py-0.5 text-xs">
              {BREAK_LABEL[k] ?? k} <b className="text-white">{n}</b>
            </span>
          ))}
        </div>
        <p>
          <b className="text-emerald-300">Strongest:</b> {r.strongest}
        </p>
        <p>
          <b className="text-[#ff8a8a]">Weakest:</b> {r.weakest}
        </p>
        <p>
          <b className="text-neutral-200">Doc Test:</b> {r.docTest}
        </p>
        {r.flags.map((f) => (
          <p key={f} className="text-amber-300">
            ⚑ {f}
          </p>
        ))}
        {r.notes.map((n) => (
          <p key={n} className="text-xs text-neutral-500">
            Normalised: {n}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        {(Object.keys(MAX) as (keyof typeof MAX)[]).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <span className="flex-1 capitalize text-neutral-300">{k === 'gaps' ? 'Gaps & improvements' : k}</span>
            <input
              type="number"
              step={0.5}
              min={0}
              max={MAX[k]}
              value={v[k]}
              onChange={(e) => setV((o) => ({ ...o, [k]: Number(e.target.value) }))}
              className="w-20 rounded-md border border-neutral-700 bg-[#08080a] px-2 py-1 text-right text-white"
            />
            <span className="w-16 text-xs text-neutral-500">
              / {MAX[k]} (AI {r.ai[k]})
            </span>
          </label>
        ))}
        <input className={inputCls()} placeholder="Why you changed it" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button variant="primary" loading={busy} onClick={save}>
          Save · {v.accuracy + v.completeness + v.gaps} / 150
        </Button>
        {r.editedBy && <p className="text-xs text-neutral-500">Edited by {r.editedBy}{r.editNote ? `: ${r.editNote}` : ''}</p>}
      </div>
    </div>
  );
}
