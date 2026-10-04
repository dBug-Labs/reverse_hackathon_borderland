'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { EVIDENCE_FORMAT, SOLO_LAB, STAGES } from '@/lib/playbook/prompts';

/**
 * /playbook — the Session 1 prompt pack. Public, phone-friendly, one copy
 * button per prompt. Nothing secret here: teams use it all day.
 */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

function CopyButton({ text, label = 'Copy prompt' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: select-and-copy fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }
  return (
    <button
      onClick={copy}
      className={cx(
        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 font-label text-sm font-semibold transition active:scale-[0.98]',
        done ? 'border-emerald-600 bg-emerald-700 text-white' : 'border-[var(--card-red)] bg-[var(--card-red)] text-white hover:brightness-110'
      )}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {done ? 'Copied' : label}
    </button>
  );
}

export default function PlaybookPage() {
  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-24 pt-10 text-[#f2e9d8] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-caps text-xs uppercase tracking-[0.3em] text-[var(--card-red)]">
          HACKBACK · dBug Labs
        </Link>
        <h1 className="mt-2 font-poster text-5xl uppercase leading-none sm:text-6xl">The Playbook</h1>
        <p className="mt-3 font-label text-[15px] text-neutral-300">
          Ten prompts that take any codebase apart. Run stages 0–8 <b className="text-white">in one chat, in order</b>. Replace anything in
          [square brackets]. The driver pastes; the checkers open every cited file:line.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2 font-label text-sm">
          {STAGES.map((s) => (
            <a key={s.n} href={`#stage-${s.n}`} className="rounded-md border border-neutral-800 px-2.5 py-1 text-neutral-300 hover:border-neutral-600 hover:text-white">
              {s.n} · {s.title.split(' (')[0]}
            </a>
          ))}
          <a href="#lab" className="rounded-md border border-[var(--card-red)]/60 px-2.5 py-1 text-[#ff8a8a]">Solo lab</a>
        </nav>

        <section className="mt-6 rounded-2xl border border-[var(--card-red)]/50 bg-[var(--card-red)]/10 p-5 font-label">
          <div className="font-poster text-2xl uppercase">The rule</div>
          <p className="mt-1 text-[15px] text-neutral-200">
            The AI is a fast intern who sometimes lies confidently. Every claim needs evidence, in exactly this format:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/60 p-3 font-mono text-sm text-neutral-100">{EVIDENCE_FORMAT}</pre>
          <p className="mt-2 text-sm text-neutral-400">
            <b className="text-white">Confirmed</b>: you opened the line and it proves it. <b className="text-white">Likely</b>: strong signs, not
            checked line by line. <b className="text-white">Guess</b>: no evidence yet.
          </p>
        </section>

        <div className="mt-6 space-y-5">
          {STAGES.map((s) => (
            <section key={s.n} id={`stage-${s.n}`} className="scroll-mt-6 rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-caps text-xs uppercase tracking-[0.25em] text-[var(--card-red)]">
                    Stage {s.n}
                    {s.n === 9 && ' · tonight'}
                  </div>
                  <h2 className="mt-1 font-poster text-3xl uppercase leading-none">{s.title}</h2>
                </div>
                <CopyButton text={s.prompt} />
              </div>
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-black/50 p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
                {s.prompt}
              </pre>
              {(s.good || s.watch) && (
                <div className="mt-3 grid gap-2 font-label text-sm sm:grid-cols-2">
                  {s.good && (
                    <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3 text-neutral-300">
                      <b className="text-emerald-400">A good answer: </b>
                      {s.good}
                    </p>
                  )}
                  {s.watch && (
                    <p className="rounded-lg border border-amber-600/40 bg-amber-900/10 p-3 text-neutral-300">
                      <b className="text-amber-300">Watch for: </b>
                      {s.watch}
                    </p>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>

        <section id="lab" className="mt-6 scroll-mt-6 rounded-2xl border border-[var(--card-red)]/60 bg-[#0d0d10] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-caps text-xs uppercase tracking-[0.25em] text-[var(--card-red)]">12:02 · 20 minutes · no help</div>
              <h2 className="mt-1 font-poster text-3xl uppercase leading-none">Solo lab: Accountill</h2>
            </div>
            <CopyButton text={SOLO_LAB} label="Copy lab card" />
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-neutral-800 bg-black/50 p-4 font-label text-[14px] leading-relaxed text-neutral-200">
            {SOLO_LAB}
          </pre>
        </section>

        <p className="mt-8 text-center font-label text-sm text-neutral-500">
          Describe gaps the way a code reviewer does: what, where, how to fix. Never write attack steps.
        </p>
      </div>
    </main>
  );
}
