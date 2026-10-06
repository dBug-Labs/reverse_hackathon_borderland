'use client';

import React, { use, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, GridBackdrop, Panel, Wordmark } from '@/components/portal/ui';

/**
 * /cr/[code] — what the judge opens on a participant's laptop: this team's clone commands and
 * review prompt, nothing else. The link comes from the code review kit and expires in 30 minutes.
 */

interface Shared {
  teamId: string;
  teamName: string;
  cardTitle: string;
  setup: string;
  prompt: string;
  expiresAt: number;
}

export default function SharedReviewPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [d, setD] = useState<Shared | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch(`/api/cr/${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((b) => (b.ok ? setD(b.data) : setErr(b.message || 'That link is not valid.')))
      .catch(() => setErr('Network error. Refresh to try again.'));
  }, [code]);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      window.prompt('Copy this:', text);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#08080a] text-neutral-200">
      <GridBackdrop />
      <div className="relative mx-auto max-w-4xl px-4 py-6">
        <Wordmark href={`/cr/${code}`} suffix="Code review" />
        {err && <p className="mt-16 text-center font-label text-neutral-400">{err}</p>}
        {!d && !err && <p className="mt-16 text-center font-label text-neutral-500">Loading…</p>}
        {d && (
          <div className="mt-6 space-y-4">
            <Panel>
              <div className="font-label text-xs uppercase tracking-[0.2em] text-[var(--card-red)]">Judge&apos;s run · {d.teamId}</div>
              <h1 className="font-poster text-4xl uppercase leading-tight text-[#f5eee1]">{d.teamName}</h1>
              <p className="font-label text-sm text-neutral-400">{d.cardTitle}</p>
              <ol className="mt-4 list-decimal space-y-1.5 pl-5 font-label text-sm text-neutral-300">
                <li>Open a terminal in an empty folder (not inside the team&apos;s working copy) and run the commands below.</li>
                <li>Open the new folder in the team&apos;s AI agent, paste the prompt and let it finish.</li>
                <li>It pushes CODE_REVIEW.md to the team&apos;s repo. The judge loads it from there.</li>
              </ol>
            </Panel>
            <Panel>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label text-sm font-semibold text-neutral-200">1 · Commands</span>
                <Button size="sm" onClick={() => copy('cmd', d.setup)}>
                  {copied === 'cmd' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                </Button>
              </div>
              <pre className="overflow-auto rounded-lg border border-neutral-800 bg-[#0a0a0c] p-3 font-mono text-xs text-neutral-300">{d.setup}</pre>
            </Panel>
            <Panel>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label text-sm font-semibold text-neutral-200">2 · Prompt</span>
                <Button size="sm" variant="paper" onClick={() => copy('p', d.prompt)}>
                  {copied === 'p' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy prompt
                </Button>
              </div>
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-[#0a0a0c] p-3 font-mono text-xs leading-relaxed text-neutral-300">{d.prompt}</pre>
            </Panel>
            <p className="text-center font-label text-xs text-neutral-600">This link stops working at {new Date(d.expiresAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.</p>
          </div>
        )}
      </div>
    </div>
  );
}
