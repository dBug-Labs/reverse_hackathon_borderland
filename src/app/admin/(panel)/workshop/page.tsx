'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '@/components/portal/api';
import { fmtTime } from '@/components/portal/theme';
import { Banner, Button, LoadingBlock, PageTitle, Panel, SectionLabel, StatTile } from '@/components/portal/ui';

interface Data {
  submissions: Array<{ teamId: string; teamName: string; repoUrl: string; updatedAt: string; changes: number }>;
  presentTeams: number;
  missing: Array<{ teamId: string; teamName: string }>;
}

export default function WorkshopAdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api<Data>('/api/admin/workshop', {}, 'admin');
    if (r.ok) {
      setData(r.data);
      setError(null);
    } else setError(r.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function copyAll() {
    if (!data) return;
    const lines = data.submissions.map((s) => `${s.teamId}\t${s.teamName}\t${s.repoUrl}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <>
      <PageTitle
        kicker="Day 1"
        title="Workshop submissions"
        subtitle="Teams submit at /workshop with their team ID and a GitHub link."
        actions={
          <div className="flex gap-2">
            <Button onClick={copyAll} disabled={!data?.submissions.length}>
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy all'}
            </Button>
            <Button onClick={load} loading={loading}>
              {!loading && <RefreshCw className="h-3.5 w-3.5" />} Refresh
            </Button>
          </div>
        }
      />
      {error && <Banner>{error}</Banner>}
      {!data && !error && <LoadingBlock />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Submitted" value={data.submissions.length} symbol="♦" />
            <StatTile label="Present teams" value={data.presentTeams} symbol="♣" />
            <StatTile label="Present, not submitted" value={data.missing.length} symbol="♥" />
          </div>
          <Panel>
            <SectionLabel>Submissions</SectionLabel>
            {data.submissions.length === 0 ? (
              <p className="font-label text-sm text-neutral-500">Nothing yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <tbody>
                  {data.submissions.map((s) => (
                    <tr key={s.teamId} className="border-t border-neutral-900">
                      <td className="px-3 py-2.5">
                        <div className="font-poster text-lg uppercase leading-none text-[#f5eee1]">{s.teamId}</div>
                        <div className="text-xs text-neutral-400">{s.teamName}</div>
                      </td>
                      <td className="px-3 py-2.5 font-label">
                        <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-[#ff8a8a] hover:underline">
                          {s.repoUrl.replace('https://github.com/', '')} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                      </td>
                      <td className="px-3 py-2.5 font-label text-sm text-neutral-400">
                        {fmtTime(s.updatedAt)}
                        {s.changes > 0 && ` · changed ${s.changes}×`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
          {data.missing.length > 0 && (
            <Panel>
              <SectionLabel>Present, not submitted</SectionLabel>
              <div className="flex flex-wrap gap-2 font-label text-sm">
                {data.missing.map((m) => (
                  <span key={m.teamId} className="rounded-lg border border-neutral-800 px-2 py-1 text-neutral-300">
                    {m.teamId} · {m.teamName}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
