'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ExternalLink, X } from 'lucide-react';
import { playAccessGranted, playHudClick } from '@/utils/sound';
import { CARDS, CARD_BY_CODE, TRACKS, TRACK_ORDER, rankLabel, rankMultiplier, type PsCard, type TrackId } from '@/lib/cardDrop/cards';
import { CardBack, FlipCard, viaLabel } from './PlayingCard';
import type { TeamViewDTO } from './types';

/**
 * The Card Drop for a team. Same signed status token as /r/[teamId]?t=...
 *
 * - CardDropSummary: a short block on the status page that links onwards.
 * - CardDropPage:    the full page at /r/[teamId]/cards — choose the top 3
 *                    before the draw, then see the card and lock in a title.
 */

const ORDINAL = ['1st', '2nd', '3rd'];
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

function useTeamView(teamId: string, token: string, pollMs: number) {
  const [view, setView] = useState<TeamViewDTO | null>(null);
  const [error, setError] = useState('');
  const url = `/api/cards/${encodeURIComponent(teamId)}?t=${encodeURIComponent(token)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setView(json.data);
        setError('');
      } else setError(json.message || 'Could not load the Card Drop.');
    } catch {
      setError('Network error. Check your connection.');
    }
  }, [url]);

  useEffect(() => {
    if (!teamId || !token) return;
    load();
    const iv = setInterval(load, pollMs);
    return () => clearInterval(iv);
  }, [load, pollMs, teamId, token]);

  async function send(body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) return json.message || 'That did not work.';
      setView(json.data);
      return null;
    } catch {
      return 'Network error. Try again.';
    }
  }

  return { view, error, send };
}

const cardsHref = (teamId: string, token: string) => `/r/${encodeURIComponent(teamId)}/cards?t=${encodeURIComponent(token)}`;

/* ── On the status page ───────────────────────────────────────────────── */

export function CardDropSummary({ teamId, token }: { teamId: string; token: string }) {
  const { view } = useTeamView(teamId, token, 15000);
  if (!view) return null;
  const drawn = (view.phase === 'DRAWN' || view.phase === 'LOCKED') && view.assignment;
  const card = drawn ? CARD_BY_CODE[view.assignment!.card] : null;

  return (
    <section className="mt-6 rounded-2xl border border-neutral-800 bg-black/50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 shrink-0">
          <CardBack />
        </div>
        <div className="min-w-0 flex-1 font-label">
          <div className="font-poster text-2xl uppercase leading-none text-[#f2e9d8]">
            The Card <span className="text-[var(--card-red)]">Drop</span>
          </div>
          {view.phase === 'CLOSED' && (
            <p className="mt-1.5 text-[15px] text-neutral-300">
              Your problem statement is picked here on Monday at 3 PM: 12 problem statements in 4 tracks, you rank your top 3, and a
              live draw gives each team one.
            </p>
          )}
          {view.phase === 'PREFS_OPEN' && (
            <>
              <p className="mt-1.5 text-[15px] text-neutral-300">
                {view.choices.length
                  ? `Your choices are saved: ${view.choices.map((c, i) => `${i + 1}. ${CARD_BY_CODE[c]?.title}`).join(' · ')}`
                  : 'It is open. Read the 12 problem statements and choose your top 3 before the draw.'}
              </p>
              <Link
                href={cardsHref(teamId, token)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--card-red)] px-5 py-2.5 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110"
              >
                {view.choices.length ? 'Change my choices' : 'Choose problem statements'} →
              </Link>
            </>
          )}
          {drawn && card && (
            <>
              <p className="mt-1.5 text-[15px] text-neutral-300">
                Your team drew <span className="font-semibold text-white">{card.title}</span> ({TRACKS[card.track].label}).
              </p>
              <Link
                href={cardsHref(teamId, token)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--card-red)] px-5 py-2.5 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110"
              >
                {view.phase === 'LOCKED' ? 'See your card' : 'See your card and lock in'} →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── The full page ────────────────────────────────────────────────────── */

export function CardDropPage({ teamId, token }: { teamId: string; token: string }) {
  const { view, error, send } = useTeamView(teamId, token, 10000);

  if (!token) return <Notice>This link is incomplete. Open the link from your registration email.</Notice>;
  if (!view) return error ? <Notice>{error}</Notice> : <Notice>Loading the cards…</Notice>;

  if (view.phase === 'CLOSED') {
    return <Notice>The Card Drop opens on Monday at 3 PM. Keep this page open; the cards appear here.</Notice>;
  }
  if (view.phase === 'PREFS_OPEN') {
    return <Picker saved={view.choices} onSave={(choices) => send({ type: 'prefs', choices })} />;
  }
  if (!view.assignment) return <Notice>Your team was not part of the draw. Find a Game Master at the help desk.</Notice>;
  return <Result teamId={teamId} view={view} onLock={(title, risk) => send({ type: 'lock', title, risk })} />;
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-neutral-800 bg-black/50 p-6 text-center font-label text-[15px] text-neutral-300">{children}</div>;
}

function DifficultyChip({ card }: { card: PsCard }) {
  const level = rankLabel(card.rank);
  return (
    <span
      className={cx(
        'rounded-full border px-2.5 py-0.5 font-label text-xs font-bold uppercase tracking-wide',
        level === 'Brutal' ? 'border-[var(--card-red)] text-[#ff7b7b]' : level === 'Hard' ? 'border-amber-500/70 text-amber-300' : 'border-emerald-600/70 text-emerald-300'
      )}
    >
      {level} · ×{rankMultiplier(card.rank)}
    </span>
  );
}

function TrackChip({ track }: { track: TrackId }) {
  const t = TRACKS[track];
  return (
    <span className="font-label text-xs font-bold uppercase tracking-wide text-neutral-300">
      <span className={t.red ? 'text-[#ff5a5a]' : 'text-neutral-100'}>{t.suit}</span> {t.label}
    </span>
  );
}

function Picker({ saved, onSave }: { saved: string[]; onSave: (choices: string[]) => Promise<string | null> }) {
  const [choices, setChoices] = useState<string[]>(saved);
  const [filter, setFilter] = useState<'all' | TrackId>('all');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = choices.join() !== saved.join();

  // Sync only when the saved value itself changes. Polling hands us a new array every few
  // seconds; keying on the array reference wiped picks the team had not saved yet.
  const savedKey = saved.join();
  useEffect(() => setChoices(savedKey ? savedKey.split(',') : []), [savedKey]);

  const toggle = (code: string) => {
    playHudClick();
    setMsg(null);
    setChoices((c) => (c.includes(code) ? c.filter((x) => x !== code) : c.length < 3 ? [...c, code] : c));
  };
  const move = (i: number, d: -1 | 1) =>
    setChoices((c) => {
      const n = [...c];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  async function save() {
    setBusy(true);
    const err = await onSave(choices);
    setBusy(false);
    if (err) setMsg({ ok: false, text: err });
    else {
      playAccessGranted();
      setMsg({ ok: true, text: 'Saved. You can still change your choices until the draw.' });
    }
  }

  const tracks = filter === 'all' ? TRACK_ORDER : [filter];

  return (
    <div className="pb-44">
      {/* How it works */}
      <ol className="grid gap-2 font-label text-sm text-neutral-300 sm:grid-cols-3">
        {['Read the 12 problem statements below.', 'Tap “Choose” on your top 3, best first.', 'Press Save. You can change until the draw.'].map((t, i) => (
          <li key={t} className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-black/40 px-4 py-3">
            <span className="font-poster text-2xl leading-none text-[var(--card-red)]">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      {/* Track filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(['all', ...TRACK_ORDER] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              'rounded-full border px-4 py-2 font-label text-sm font-semibold transition',
              filter === f ? 'border-[var(--paper)] bg-[var(--paper)] text-[var(--ink)]' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'
            )}
          >
            {f === 'all' ? `All ${CARDS.length}` : `${TRACKS[f].suit} ${TRACKS[f].label}`}
          </button>
        ))}
      </div>

      {tracks.map((t) => (
        <section key={t} className="mt-7">
          <div className="mb-3">
            <h2 className="font-poster text-3xl uppercase leading-none text-[#f2e9d8]">
              <span className={TRACKS[t].red ? 'text-[#ff5a5a]' : ''}>{TRACKS[t].suit}</span> {TRACKS[t].label}
              <span className="ml-2 font-caps text-base normal-case tracking-[0.1em] text-neutral-500">{TRACKS[t].name}</span>
            </h2>
            <p className="mt-1 font-label text-[15px] text-neutral-400">{TRACKS[t].explain}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CARDS.filter((c) => c.track === t).map((c, i) => (
              <PsTile key={c.code} card={c} index={i} position={choices.indexOf(c.code)} full={choices.length >= 3} onToggle={() => toggle(c.code)} />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky picks bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-[#08080a]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map((i) => {
              const card = choices[i] ? CARD_BY_CODE[choices[i]] : null;
              return (
                <div
                  key={i}
                  className={cx(
                    'flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2',
                    card ? 'border-[var(--card-red)]/70 bg-[var(--card-red)]/10' : 'border-dashed border-neutral-700'
                  )}
                >
                  <span className="font-poster text-xl leading-none text-[var(--card-red)]">{ORDINAL[i]}</span>
                  {card ? (
                    <>
                      <span className="min-w-0 flex-1 truncate font-label text-sm font-semibold text-white">{card.title}</span>
                      <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-neutral-400 hover:text-white disabled:opacity-25">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button aria-label="Move down" disabled={i === choices.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-neutral-400 hover:text-white disabled:opacity-25">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button aria-label="Remove" onClick={() => toggle(card.code)} className="rounded p-1 text-neutral-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <span className="font-label text-sm text-neutral-500">Not chosen</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col items-stretch gap-1 lg:w-56">
            <button
              onClick={save}
              disabled={busy || !choices.length || !dirty}
              className="rounded-lg border border-[var(--card-red)] bg-[var(--card-red)] px-5 py-3 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-500"
            >
              {busy ? 'Saving…' : dirty ? 'Save choices' : saved.length ? 'Saved ✓' : 'Choose a card'}
            </button>
            {msg && <span className={cx('text-center font-label text-xs', msg.ok ? 'text-emerald-400' : 'text-[#ff8a8a]')}>{msg.text}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PsTile({ card, index, position, full, onToggle }: { card: PsCard; index: number; position: number; full: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const chosen = position >= 0;
  return (
    <motion.article
      className={cx(
        'relative flex flex-col rounded-2xl border bg-black/50 p-5 transition-colors',
        chosen ? 'border-[var(--card-red)] shadow-[0_0_30px_rgba(179,32,42,.35)]' : 'border-neutral-800 hover:border-neutral-600'
      )}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 140, damping: 18 }}
    >
      <AnimatePresence>
        {chosen && (
          <motion.span
            className="absolute -right-2 -top-3 rounded-full bg-[var(--card-red)] px-3 py-1 font-poster text-lg leading-none text-white shadow-lg"
            initial={{ scale: 2, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -6 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {ORDINAL[position]}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <TrackChip track={card.track} />
        <DifficultyChip card={card} />
      </div>
      <h3 className="mt-3 font-poster text-[26px] uppercase leading-[1.05] text-[#f2e9d8]">{card.title}</h3>
      <div className="mt-1 font-caps text-xs uppercase tracking-[0.15em] text-neutral-500">
        {card.name} · built on {card.source.name}
      </div>
      <p className="mt-3 flex-1 font-label text-[15px] leading-relaxed text-neutral-300">{card.problem}</p>

      <button onClick={() => setOpen((v) => !v)} className="mt-3 flex items-center gap-1 self-start font-label text-sm font-semibold text-neutral-400 hover:text-white">
        Killer Tests and source <ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-2 rounded-xl border border-neutral-800 bg-[#0d0d10] p-3 font-label text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Tested live on Tuesday</div>
              <ol className="list-decimal space-y-1 pl-5 text-neutral-200">
                {card.killerTests.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ol>
              <a href={card.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#ff8a8a] underline">
                {card.source.name} on GitHub <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={onToggle}
        disabled={!chosen && full}
        whileTap={{ scale: 0.97 }}
        className={cx(
          'mt-4 flex items-center justify-center gap-2 rounded-lg border py-3 font-label text-[15px] font-bold transition',
          chosen
            ? 'border-[var(--card-red)] bg-[var(--card-red)] text-white hover:brightness-110'
            : 'border-neutral-600 text-white hover:border-[var(--card-red)] hover:bg-[var(--card-red)]/10',
          'disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:hover:bg-transparent'
        )}
      >
        {chosen ? (
          <>
            <Check className="h-4 w-4" /> Your {ORDINAL[position]} choice · tap to remove
          </>
        ) : full ? (
          'You already have 3 choices'
        ) : (
          'Choose'
        )}
      </motion.button>
    </motion.article>
  );
}

function Result({
  teamId,
  view,
  onLock,
}: {
  teamId: string;
  view: TeamViewDTO;
  onLock: (title: string, risk: 'STANDARD' | 'HIGH') => Promise<string | null>;
}) {
  const a = view.assignment!;
  const card = CARD_BY_CODE[a.card];
  const seenKey = `cd_seen_${teamId}_${a.card}`;
  const [flipped, setFlipped] = useState(false);
  const [title, setTitle] = useState(a.title ?? '');
  const [risk, setRisk] = useState<'STANDARD' | 'HIGH'>(a.risk ?? 'STANDARD');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const locked = view.phase === 'LOCKED';

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey) === '1';
    } catch {
      /* storage unavailable */
    }
    const t = setTimeout(
      () => {
        setFlipped(true);
        if (!seen) playAccessGranted();
        try {
          localStorage.setItem(seenKey, '1');
        } catch {
          /* ignore */
        }
      },
      seen ? 0 : 900
    );
    return () => clearTimeout(t);
  }, [seenKey]);

  async function lock() {
    setBusy(true);
    const err = await onLock(title, risk);
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Locked in. You can still change it until the Game Masters lock the Card Drop.' });
  }

  if (!card) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div>
        <motion.div initial={{ y: 80, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 15 }} className="mx-auto w-56 lg:w-full">
          <FlipCard code={a.card} flipped={flipped} glow={flipped} />
        </motion.div>
        <div className="mt-4 text-center font-caps text-xs uppercase tracking-[0.3em] text-[#ff6b6b]">
          Pick #{String(a.pick).padStart(2, '0')} · {viaLabel(a.via)}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TrackChip track={card.track} />
            <DifficultyChip card={card} />
          </div>
          <h2 className="mt-3 font-poster text-4xl uppercase leading-none text-[#f2e9d8]">{card.title}</h2>
          <div className="mt-1 font-caps text-xs uppercase tracking-[0.15em] text-neutral-500">
            {card.name} · built on {card.source.name}
          </div>
          <p className="mt-3 font-label text-[15px] leading-relaxed text-neutral-200">{card.problem}</p>
          <div className="mt-4 font-label text-xs font-semibold uppercase tracking-wider text-neutral-500">Killer Tests, run live on Tuesday</div>
          <ol className="mt-1 list-decimal space-y-1 pl-5 font-label text-[15px] text-neutral-200">
            {card.killerTests.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ol>
          <a href={card.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-label text-sm text-[#ff8a8a] underline">
            Source: {card.source.name} on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {view.rivals.length > 0 && (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-[#0d0d10] p-3 font-label text-sm text-neutral-300">
              Also on this card:{' '}
              {view.rivals.map((r, i) => (
                <span key={r.teamId}>
                  {i > 0 && ', '}
                  <span className="font-semibold text-white">{r.teamId}</span> ({r.teamName})
                </span>
              ))}
              <div className="text-xs text-neutral-500">Your partners, and rivals, on Tuesday’s ♣ Trading Floor.</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-black/50 p-5 font-label">
          <div className="font-poster text-2xl uppercase text-[#f2e9d8]">Lock in</div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500">Your solution title (60 characters max)</span>
            <input
              value={title}
              maxLength={60}
              disabled={locked}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FestPass: rush-proof passes"
              className="w-full rounded-lg border border-neutral-700 bg-[#141417] px-3 py-2.5 text-white placeholder:text-neutral-600 focus:border-[var(--card-red)] focus:outline-none disabled:opacity-60"
            />
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(['STANDARD', 'HIGH'] as const).map((r) => (
              <button
                key={r}
                disabled={locked}
                onClick={() => setRisk(r)}
                className={cx(
                  'rounded-xl border p-3 text-left transition disabled:opacity-60',
                  risk === r ? (r === 'HIGH' ? 'border-[var(--card-red)] bg-[var(--card-red)]/15' : 'border-[var(--paper)] bg-white/5') : 'border-neutral-800'
                )}
              >
                <div className={cx('font-poster text-xl uppercase', r === 'HIGH' ? 'text-[#ff6b6b]' : 'text-[#f2e9d8]')}>{r === 'HIGH' ? 'High Risk' : 'Standard'}</div>
                <div className="text-sm text-neutral-400">
                  {r === 'HIGH' ? 'Doc Test ×1.5 if it scores 30+, but under 20 costs a Visa.' : 'Doc Test counted as it is.'}
                </div>
              </button>
            ))}
          </div>
          {!locked && (
            <button
              onClick={lock}
              disabled={busy || title.trim().length < 3}
              className="mt-4 w-full rounded-lg border border-[var(--card-red)] bg-[var(--card-red)] py-3 font-poster text-xl uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-600"
            >
              {busy ? 'Saving…' : a.title ? 'Update' : 'Lock it in'}
            </button>
          )}
          {locked && <p className="mt-3 text-sm text-neutral-400">The Card Drop is locked. See a Game Master to change anything.</p>}
          {msg && <p className={cx('mt-2 text-center text-sm', msg.ok ? 'text-emerald-400' : 'text-[#ff8a8a]')}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
