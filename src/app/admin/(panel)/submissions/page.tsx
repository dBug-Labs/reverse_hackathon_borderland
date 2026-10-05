'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { api, post } from '@/components/portal/api';
import { Banner, Button, LoadingBlock, Modal, PageTitle, StatTile, cx, inputCls } from '@/components/portal/ui';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import { REQUIRED_FILES, type SubmissionStage } from '@/lib/submission/config';

interface Check {
  at: string;
  ok: boolean;
  error?: string;
  public?: boolean;
  fork?: string;
  headSha?: string;
  pushedAt?: string;
  files?: Record<string, string | null>;
  warnings?: string[];
}
interface Snap {
  at: string;
  by: string;
  freezeAt: string;
  headSha?: string;
  beforeFreezeSha?: string;
  pushedAt?: string;
  pushedAfterFreeze?: boolean;
  error?: string;
}
interface Row {
  teamId: string;
  teamName: string;
  card: string | null;
  title: string | null;
  submission: {
    repoUrl: string;
    demoVideoUrl: string | null;
    liveUrl: string | null;
    createdAt: string;
    updatedAt: string;
    check: Check | null;
    snapshots: { docs?: Snap; code?: Snap };
    history: Array<{ at: string; by: string; repoUrl: string }>;
  } | null;
}
interface View {
  stage: SubmissionStage;
  window: { opensAt: string; checkpointAt: string; docsFreezeAt: string; codeFreezeAt: string };
  rows: Row[];
}

const STAGE_LABEL: Record<SubmissionStage, string> = {
  NOT_OPEN: 'Not open yet',
  OPEN: 'Open',
  DOCS_FROZEN: 'Docs frozen',
  CLOSED: 'Closed',
};
const ist = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: '2-digit' });
const found = (c: Check | null) => (c?.files ? REQUIRED_FILES.filter((f) => c.files![f.key]).length : 0);

function SnapCell({ s }: { s?: Snap }) {
  if (!s) return <span className="text-neutral-600">—</span>;
  if (s.error) return <span className="text-[#ff8a8a]">{s.error}</span>;
  const sha = s.beforeFreezeSha ?? s.headSha;
  return (
    <div>
      <span className="font-mono text-neutral-200">{sha?.slice(0, 7) ?? '—'}</span>
      {s.pushedAfterFreeze && <div className="text-xs text-amber-300">pushed after freeze</div>}
    </div>
  );
}

export default function SubmissionsConsole() {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState<Row | null>(null);
  const [repo, setRepo] = useState('');

  const load = useCallback(async () => {
    const res = await api<View>('/api/admin/submissions', {}, 'admin');
    if (res.ok && res.data) setView(res.data);
    else setError(res.message || 'Could not load submissions.');
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  async function act(body: Record<string, unknown>, label: string, done: string) {
    setBusy(label);
    setError('');
    setNotice('');
    const res = await post<View>('/api/admin/submissions', body, 'admin');
    setBusy('');
    if (res.ok && res.data) {
      setView(res.data);
      setNotice(done);
      return true;
    }
    setError(res.message || 'That did not work.');
    return false;
  }

  function download() {
    if (!view) return;
    const blob = new Blob([JSON.stringify(view.rows, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hackback-submissions-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stats = useMemo(() => {
    const rows = view?.rows ?? [];
    const subs = rows.filter((r) => r.submission);
    return {
      teams: rows.length,
      submitted: subs.length,
      complete: subs.filter((r) => r.submission!.check?.ok).length,
      warnings: subs.filter((r) => r.submission!.check?.warnings?.length || r.submission!.check?.error).length,
    };
  }, [view]);

  if (!view) return error ? <Banner>{error}</Banner> : <LoadingBlock label="Loading submissions…" />;

  return (
    <div>
      <PageTitle
        kicker="Overnight build"
        title="Submissions"
        subtitle={
          <>
            {STAGE_LABEL[view.stage]} · checkpoint {ist(view.window.checkpointAt)} · docs freeze {ist(view.window.docsFreezeAt)} · code freeze{' '}
            {ist(view.window.codeFreezeAt)}
          </>
        }
        actions={
          <>
            <Button onClick={() => act({ action: 'check-all' }, 'check', 'Every repo re-checked.')} loading={busy === 'check'}>
              <RefreshCw className="h-4 w-4" /> Check all
            </Button>
            <Button onClick={() => act({ action: 'snapshot', which: 'docs' }, 'docs', 'Docs-freeze snapshot taken.')} loading={busy === 'docs'}>
              <Camera className="h-4 w-4" /> Snapshot 8:30
            </Button>
            <Button onClick={() => act({ action: 'snapshot', which: 'code' }, 'code', 'Code-freeze snapshot taken.')} loading={busy === 'code'}>
              <Camera className="h-4 w-4" /> Snapshot 12:30
            </Button>
            <Button variant="primary" onClick={download}>
              <Download className="h-4 w-4" /> JSON
            </Button>
          </>
        }
      />

      {error && <div className="mb-4"><Banner onClose={() => setError('')}>{error}</Banner></div>}
      {notice && <div className="mb-4"><Banner tone="success" onClose={() => setNotice('')}>{notice}</Banner></div>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Submitted" value={`${stats.submitted}/${stats.teams}`} symbol="♠" />
        <StatTile label="All files present" value={stats.complete} symbol="♦" />
        <StatTile label="Not submitted" value={stats.teams - stats.submitted} sub="At 11:30 PM: −1 Visa each" symbol="♣" />
        <StatTile label="With warnings" value={stats.warnings} symbol="♥" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-[#0d0d10]">
        <table className="w-full min-w-[1000px] font-label text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Card</th>
              <th className="px-4 py-3">Repo</th>
              <th className="px-4 py-3">Check</th>
              <th className="px-4 py-3">8:30 docs</th>
              <th className="px-4 py-3">12:30 code</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => {
              const s = r.submission;
              const card = r.card ? CARD_BY_CODE[r.card] : null;
              const c = s?.check ?? null;
              return (
                <tr key={r.teamId} className="border-b border-neutral-800/70 align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{r.teamId}</div>
                    <div className="text-xs text-neutral-500">{r.teamName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {card ? (
                      <>
                        <div className="text-neutral-200">
                          {TRACKS[card.track].suit} {card.title}
                        </div>
                        {r.title && <div className="text-xs text-neutral-500">{r.title}</div>}
                      </>
                    ) : (
                      <span className="text-neutral-600">No card</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s ? (
                      <>
                        <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[#ff8a8a] underline">
                          {s.repoUrl.replace('https://github.com/', '')} <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="text-xs text-neutral-500">
                          saved {ist(s.createdAt)}
                          {s.history.length > 1 && ` · changed ${s.history.length - 1}×`}
                        </div>
                        {(s.demoVideoUrl || s.liveUrl) && (
                          <div className="mt-0.5 flex gap-2 text-xs">
                            {s.demoVideoUrl && <a href={s.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-300 underline">video</a>}
                            {s.liveUrl && <a href={s.liveUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-300 underline">live</a>}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-neutral-600">Not submitted</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!c ? (
                      <span className="text-neutral-600">—</span>
                    ) : c.error ? (
                      <span className="text-[#ff8a8a]">{c.error}</span>
                    ) : (
                      <>
                        <div className={cx(c.ok ? 'text-emerald-400' : 'text-amber-300')}>
                          {found(c)}/{REQUIRED_FILES.length} files{c.public === false && ' · private'}
                        </div>
                        {c.files && found(c) < REQUIRED_FILES.length && (
                          <div className="text-xs text-neutral-500">
                            missing {REQUIRED_FILES.filter((f) => !c.files![f.key]).map((f) => f.label).join(', ')}
                          </div>
                        )}
                        {c.warnings?.map((w) => (
                          <div key={w} className="text-xs text-amber-300">
                            {w}
                          </div>
                        ))}
                        <div className="text-xs text-neutral-600">checked {ist(c.at)}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3"><SnapCell s={s?.snapshots?.docs} /></td>
                  <td className="px-4 py-3"><SnapCell s={s?.snapshots?.code} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEdit(r);
                        setRepo(s?.repoUrl ?? '');
                      }}
                    >
                      Set repo
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!edit}
        title={`Set repo · ${edit?.teamId ?? ''}`}
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy === 'set'}
              disabled={!repo.trim()}
              onClick={async () => {
                if (await act({ action: 'set-repo', teamId: edit!.teamId, repoUrl: repo }, 'set', `Repo set for ${edit!.teamId}.`)) setEdit(null);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <p className="mb-3 font-label text-sm text-neutral-400">Works at any time, including after the freezes. The change is written to the audit log.</p>
        <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/owner/repo" className={inputCls()} />
      </Modal>
    </div>
  );
}
