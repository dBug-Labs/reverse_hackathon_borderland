'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { EVIDENCE_FORMAT, SOLO_LAB, STAGES, STAGE_GUIDE } from '@/lib/playbook/prompts';

/**
 * /playbook — the HACKBACK guide and prompt pack. Public and phone-friendly.
 * Written so a team can follow it on its own: what each stage is for, who does
 * what, how to check the answer, and what it feeds tonight. Nothing secret here.
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

function Section({ id, kicker, title, children, hot }: { id: string; kicker: string; title: string; children: React.ReactNode; hot?: boolean }) {
  return (
    <section
      id={id}
      className={cx(
        'mt-6 scroll-mt-20 rounded-2xl border p-5 font-label text-[15px] leading-relaxed text-neutral-300',
        hot ? 'border-[var(--card-red)]/50 bg-[var(--card-red)]/10' : 'border-neutral-800 bg-[#0d0d10]'
      )}
    >
      <div className="font-caps text-xs uppercase tracking-[0.25em] text-[var(--card-red)]">{kicker}</div>
      <h2 className="mt-1 font-poster text-3xl uppercase leading-none text-[#f2e9d8]">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

const B = ({ children }: { children: React.ReactNode }) => <b className="text-white">{children}</b>;
const C = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[13px] text-neutral-100">{children}</code>
);

const TOC = [
  ['start', 'Start here'],
  ['setup', 'Set up'],
  ['rule', 'The rule'],
  ['map', 'The map'],
  ['stage-0', 'Stages 0–9'],
  ['lab', 'Solo lab'],
  ['tonight', 'Tonight'],
  ['help', 'When it goes wrong'],
  ['words', 'Words'],
] as const;

const REQUIRED = [
  ['README.md', 'what you built and how to run it'],
  ['SUBMISSION.md', 'the template from the prerequisites PDF'],
  ['deck.pdf', 'your slides, in the repo root'],
  ['.env.example', 'every env variable name, no real values'],
  ['docs/OBSERVATIONS.md', 'verified claims about the original'],
  ['docs/PRD.md', 'problem, user, core flow, MoSCoW, acceptance criteria'],
  ['docs/ARCHITECTURE.md', 'your rebuild’s components + Mermaid'],
  ['docs/DATA_MODEL.md', 'entities, fields, constraints + erDiagram'],
  ['docs/API.md', 'every route: input, output, who, errors'],
  ['docs/GAPS.md', 'what the original gets wrong + your 2 improvements'],
  ['docs/AGENT_LOG.md', 'key prompts and what you corrected'],
] as const;

export default function PlaybookPage() {
  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-24 pt-10 text-[#f2e9d8] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-caps text-xs uppercase tracking-[0.3em] text-[var(--card-red)]">
          HACKBACK · dBug Labs
        </Link>
        <h1 className="mt-2 font-poster text-5xl uppercase leading-none sm:text-6xl">The Playbook</h1>
        <p className="mt-3 font-label text-[15px] text-neutral-300">
          Everything you need to take a codebase apart with an AI agent, write the docs, and rebuild it. Read this page top to bottom once. After that,
          use it as your checklist: every prompt has a copy button.
        </p>

        <nav className="sticky top-0 z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-[#0b0a09]/95 px-4 py-3 font-label text-sm backdrop-blur sm:mx-0 sm:flex-wrap sm:px-0">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-md border border-neutral-800 px-2.5 py-1 text-neutral-300 hover:border-neutral-600 hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        {/* ── Start here ─────────────────────────────────────────────── */}
        <Section id="start" kicker="Read this first" title="What you are doing">
          <p>
            HACKBACK is a <B>reverse</B> hackathon. You do not start by building. You start by understanding a real product, then you write it down so
            clearly that someone else could build it, then you build a better version from your own notes.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <B>Reverse it.</B> Point an AI agent at the original code and ask it 9 questions (stages 0–8). Check every answer yourself.
            </li>
            <li>
              <B>Spec it.</B> Turn what you verified into 7 docs: OBSERVATIONS, PRD, ARCHITECTURE, DATA_MODEL, API, GAPS, AGENT_LOG (stage 9).
            </li>
            <li>
              <B>Rebuild it.</B> In an empty repo, build the core of the product from your docs, plus 2 improvements from your gaps list.
            </li>
          </ol>
          <p>
            This morning you practise on <B>espionage-event</B> with the speakers, then alone on <B>accountill</B>. At 3 PM your team gets its own
            product in the Card Drop, and you do all three steps on it tonight.
          </p>
          <p className="rounded-lg border border-neutral-800 bg-black/40 p-3">
            The skill being tested is not typing speed. It is <B>understanding a system, explaining it clearly, and catching the AI when it is wrong.</B>
          </p>
        </Section>

        {/* ── Setup ──────────────────────────────────────────────────── */}
        <Section id="setup" kicker="Before stage 0" title="Set up and roles">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open the <B>Antigravity IDE</B> → <B>Open Folder</B> → the original repo (this morning: <C>espionage-event</C>).
            </li>
            <li>
              Open the <B>agent panel</B>. Use <B>one chat</B> for stages 0–8, in order, so the agent remembers its earlier answers.
            </li>
            <li>
              Copy a prompt from this page, paste it into the agent, and send. Replace anything in <C>[square brackets]</C> first.
            </li>
            <li>
              <B>Never let the agent change the original repo.</B> The prompts tell it not to. If it offers to “fix” something, say no.
            </li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
              <div className="font-poster text-xl uppercase text-white">♠ Driver (1 person)</div>
              Pastes the prompts and reads the answer out. That is all. Swap the driver at the solo lab.
            </div>
            <div className="rounded-lg border border-neutral-800 bg-black/40 p-3">
              <div className="font-poster text-xl uppercase text-white">♣ Checkers (everyone else)</div>
              When the agent cites a file and line, open it and check it says that. Never just say “looks right”.
            </div>
          </div>
        </Section>

        {/* ── The rule ───────────────────────────────────────────────── */}
        <Section id="rule" kicker="The one rule" title="Every claim needs evidence" hot>
          <p>
            The AI is a <B>very fast intern who is sometimes confidently wrong</B>. It invents line numbers, trusts the README, and fills gaps with what
            apps “usually” do. So every claim you keep must be written like this:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-black/60 p-3 font-mono text-sm text-neutral-100">{EVIDENCE_FORMAT}</pre>
          <div className="grid gap-2 sm:grid-cols-3">
            <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3">
              <b className="text-emerald-400">Confirmed</b>: you opened that line yourself and it proves the claim.
            </p>
            <p className="rounded-lg border border-amber-600/40 bg-amber-900/10 p-3">
              <b className="text-amber-300">Likely</b>: strong signs, but no single line proves it, or nobody opened it yet.
            </p>
            <p className="rounded-lg border border-neutral-700 bg-black/40 p-3">
              <b className="text-neutral-200">Guess</b>: no evidence. Never goes into your docs as fact.
            </p>
          </div>
          <div>
            <B>How to check a claim in 20 seconds</B>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                <C>Ctrl+P</C> (Mac: <C>Cmd+P</C>) and type the file name to open it.
              </li>
              <li>
                <C>Ctrl+G</C> and type the line number to jump to it.
              </li>
              <li>Read the line and the few around it. Does it really say what the agent claimed?</li>
              <li>
                Need to find where something is used? <C>Ctrl+Shift+F</C> searches the whole repo.
              </li>
            </ol>
          </div>
          <p className="text-sm text-neutral-400">
            The README is a claim too. When the README and the code disagree, the code is the truth, and the difference is worth writing down.
          </p>
        </Section>

        {/* ── Map ────────────────────────────────────────────────────── */}
        <Section id="map" kicker="The whole path" title="The map">
          <p>Each stage answers one question. Each answer feeds one of tonight’s docs, so nothing you do this morning is wasted.</p>
          <ol className="space-y-2">
            {STAGES.map((s) => (
              <li key={s.n}>
                <a href={`#stage-${s.n}`} className="block rounded-lg border border-neutral-800 bg-black/40 p-3 hover:border-neutral-600">
                  <div className="font-semibold text-white">
                    {s.n} · {s.title.split(' (')[0]}
                  </div>
                  <div className="mt-0.5">{STAGE_GUIDE[s.n]?.question}</div>
                  <div className="mt-0.5 text-sm text-neutral-500">Feeds: {STAGE_GUIDE[s.n]?.feeds}</div>
                </a>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── Stages ─────────────────────────────────────────────────── */}
        <div className="mt-6 space-y-5">
          {STAGES.map((s) => {
            const g = STAGE_GUIDE[s.n];
            return (
              <section key={s.n} id={`stage-${s.n}`} className="scroll-mt-20 rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-caps text-xs uppercase tracking-[0.25em] text-[var(--card-red)]">
                      Stage {s.n}
                      {g && ` · ${g.time}`}
                      {s.n === 9 && ' · tonight'}
                    </div>
                    <h2 className="mt-1 font-poster text-3xl uppercase leading-none">{s.title}</h2>
                  </div>
                  <CopyButton text={s.prompt} />
                </div>

                {g && (
                  <div className="mt-4 space-y-3 font-label text-[15px] leading-relaxed text-neutral-300">
                    <p className="text-lg text-white">{g.question}</p>
                    <p>
                      <B>Why: </B>
                      {g.why}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <p className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                        <B>♠ Driver: </B>
                        {g.driver}
                      </p>
                      <p className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                        <B>♣ Checkers: </B>
                        {g.checkers}
                      </p>
                    </div>
                  </div>
                )}

                <details className="group mt-4" open={s.n === 0}>
                  <summary className="cursor-pointer select-none font-label text-sm font-semibold text-neutral-400 hover:text-white">
                    <span className="group-open:hidden">Show the prompt</span>
                    <span className="hidden group-open:inline">Hide the prompt</span>
                  </summary>
                  <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-black/50 p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
                    {s.prompt}
                  </pre>
                </details>

                {(s.good || s.watch) && (
                  <div className="mt-3 grid gap-2 font-label text-sm sm:grid-cols-2">
                    {s.good && (
                      <p className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3 text-neutral-300">
                        <b className="text-emerald-400">A good answer has: </b>
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
                {g && (
                  <p className="mt-3 font-label text-sm text-neutral-400">
                    <span className="text-neutral-500">Feeds tonight: </span>
                    <span className="text-neutral-200">{g.feeds}</span>
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {/* ── Solo lab ───────────────────────────────────────────────── */}
        <section id="lab" className="mt-6 scroll-mt-20 rounded-2xl border border-[var(--card-red)]/60 bg-[#0d0d10] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-caps text-xs uppercase tracking-[0.25em] text-[var(--card-red)]">12:02 · 20 minutes · no help</div>
              <h2 className="mt-1 font-poster text-3xl uppercase leading-none">Solo lab: Accountill</h2>
            </div>
            <CopyButton text={SOLO_LAB} label="Copy lab card" />
          </div>
          <p className="mt-3 font-label text-[15px] text-neutral-300">
            Same prompts, new repo, no speaker. This is a rehearsal for tonight: if your team can do this in 20 minutes, it can do your card. Open{' '}
            <C>accountill</C> as a new folder and start a <B>new chat</B>.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-neutral-800 bg-black/50 p-4 font-label text-[14px] leading-relaxed text-neutral-200">
            {SOLO_LAB}
          </pre>
        </section>

        {/* ── Tonight ────────────────────────────────────────────────── */}
        <Section id="tonight" kicker="After the Card Drop" title="Tonight, step by step">
          <p>
            At 3 PM your team gets one card: a real open-source product. Your card page shows the original repo, the Rebuild Brief and the 3 Killer
            Tests. Then, from home:
          </p>
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <B>Reverse it.</B> Clone the original repo from your card, open it in Antigravity, and run stages 0–8 in one chat. Focus on the{' '}
              <B>hard core</B> the Brief describes, not every page. Stage 5: trace the flow your Killer Tests are about.
            </li>
            <li>
              <B>Make your own repo</B> on GitHub: new, empty, public. No commits before <B>4 PM</B>. Never fork or copy the original.
            </li>
            <li>
              <B>Spec it.</B> Run stage 9 with the path to your repo and your card’s Brief and Killer Tests. Read every doc, fix what is wrong, and{' '}
              <B>push docs/ before any code</B>.
            </li>
            <li>
              <B>By 11 PM:</B> on your team page, tap <B>Submit your repo</B>, paste the link, tick the declaration. First docs must be pushed. Missing
              this checkpoint costs a Visa.
            </li>
            <li>
              <B>Rebuild it.</B> Start a <B>new chat</B> in your own repo and build only from your docs/. If the agent needs something your docs do not
              say, fix the docs first, then build. That is exactly what tomorrow’s Doc Test will do.
            </li>
            <li>
              Build the core so the <B>3 Killer Tests pass</B>, then your <B>2 improvements</B> from GAPS.md. It only needs to run on your laptop: no
              deploy.
            </li>
            <li>
              Add README.md, SUBMISSION.md, deck.pdf and .env.example. Press <B>Check again</B> on your submit page until every file shows ✓.
            </li>
          </ol>

          <div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  ['Mon 4:00 PM', 'Clock starts. First commit allowed.'],
                  ['Mon 11:00 PM', 'Checkpoint: repo link saved + first docs pushed (else −1 Visa).'],
                  ['Tue 8:30 AM', 'Docs freeze. docs/ is scored as of the last push before 8:30. Repo link locks.'],
                  ['Tue 12:30 PM', 'Code freeze. Code is judged as of the last push before 12:30.'],
                ].map(([t, d]) => (
                  <tr key={t} className="border-b border-neutral-900 align-top">
                    <td className="whitespace-nowrap py-2 pr-4 font-semibold text-white">{t}</td>
                    <td className="py-2">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <B>Your repo must have</B>
            <ul className="mt-1 space-y-1">
              {REQUIRED.map(([f, d]) => (
                <li key={f}>
                  <C>{f}</C> <span className="text-neutral-400">· {d}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-[var(--card-red)]/50 bg-[var(--card-red)]/10 p-3">
            <B>Clean-room rules.</B> Empty repo after 4 PM · docs before code · no original code and no original packages (general libraries are
            fine) · no secrets in git · nothing written to steer the AI scorer. Breaking the clean-room rule is Game Over.
          </div>
          <p className="text-sm text-neutral-400">
            Stuck on rules or scope? Ask your track’s Dealer on WhatsApp. Dealers unblock you; they never write code for you.
          </p>
        </Section>

        {/* ── Troubleshooting ────────────────────────────────────────── */}
        <Section id="help" kicker="Troubleshooting" title="When the agent goes wrong">
          <dl className="space-y-3">
            {[
              ['It wants to install, run or edit files.', 'Say no. Reply: “Do not change or run anything. Only read and answer.” This morning you read code, you do not run it.'],
              ['A file:line does not exist or says something else.', 'That claim is a Guess. Tell the agent: “Line X of file Y does not say that. Find the real line or drop the claim.”'],
              ['It answers from the README or from what apps “usually” do.', 'Ask: “Show me the code that does this, not the README.” No code line means no claim.'],
              ['The chat gets slow or starts forgetting.', 'Start a new chat. Paste your Stage 1 summary first, then continue from the next stage.'],
              ['The repo is huge.', 'Name the folder: “Only look at src/server/ for this question.” Tell it to ignore build output, node_modules and vendor folders.'],
              ['The Mermaid diagram does not render.', 'Copy the code block into mermaid.live. If it errors, paste the error back to the agent and ask it to fix the diagram.'],
              ['You run out of agent quota.', 'Switch the model in the agent panel, or move to a teammate’s laptop and paste the summary so far.'],
              ['Two teammates got different answers.', 'Good. Open the cited lines and decide who is right. That disagreement is the checking working.'],
            ].map(([q, a]) => (
              <div key={q} className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <dt className="font-semibold text-white">{q}</dt>
                <dd className="mt-1">{a}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* ── Glossary ───────────────────────────────────────────────── */}
        <Section id="words" kicker="Glossary" title="Words on this page">
          <dl className="grid gap-2 sm:grid-cols-2">
            {[
              ['file:line', 'A path and a line number, like src/app/api/login/route.ts:12. Your evidence.'],
              ['Route', 'A door into the app: an API path or a page URL that runs code when called.'],
              ['Mermaid', 'A text format for diagrams. The agent writes it; the IDE or mermaid.live draws it.'],
              ['ER diagram', 'Entity-relationship diagram: what the app stores and how those things link.'],
              ['Sequence diagram', 'Who calls whom, in order, for one feature.'],
              ['State', 'Data the app remembers: database, cache, browser storage, files, server memory.'],
              ['PRD', 'Product requirements document: problem, user, core flow, what is in and out of scope.'],
              ['MoSCoW', 'Must have, Should have, Could have, Won’t have. A way to rank features.'],
              ['Given / When / Then', 'Acceptance criteria: given this setup, when the user does X, then Y must happen.'],
              ['Killer Test', 'One of 3 live tests on your card. Tomorrow your rebuild must pass them.'],
              ['Doc Test', 'A fresh AI agent gets only your docs/ and tries to build. Tests how complete your docs are.'],
              ['Clean room', 'You rebuild from your own docs only, never from the original code.'],
              ['Visa', 'One of your team’s 3 lives. Each one left at the end is worth +10 points.'],
              ['Dealer', 'Your track’s helper on WhatsApp tonight. Answers rules and scope questions.'],
            ].map(([w, d]) => (
              <div key={w} className="rounded-lg border border-neutral-800 bg-black/40 p-3">
                <dt className="font-semibold text-white">{w}</dt>
                <dd className="mt-0.5 text-sm">{d}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <p className="mt-8 text-center font-label text-sm text-neutral-500">
          Describe gaps the way a code reviewer does: what, where, how to fix. Never write attack steps.
        </p>
      </div>
    </main>
  );
}
