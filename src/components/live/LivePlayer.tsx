'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CARD_BY_CODE, TRACKS } from '@/lib/cardDrop/cards';
import type { GameState, MyExchange, TeamGameView, Ticker } from '@/lib/live/types';
import { sfx } from '@/utils/liveSound';
import { CodeText, Confetti, OPTS, Rolling, Sparkline } from './fx';
import { DealtCard, OrderInput, SortInput, useStable } from './cards';
import { RiddlePlay, RiddlePlayed } from './riddle';
import { clockReady, fmtChips, fmtPct, getJSON, postJSON, usePoll, useServerNow } from './clock';

/** A team's phone during the live games: one link, both games. */
export function LivePlayer({ teamId, token }: { teamId: string; token: string }) {
  const [view, setView] = useState<TeamGameView | null>(null);
  const [error, setError] = useState('');
  const gameRef = useRef<string>(''); // a game picked by hand, if any
  const shownRef = useRef<string>(''); // the game on screen now
  const fullFor = useRef<string>('');
  const now = useServerNow(10);

  const base = `/api/live/${encodeURIComponent(teamId)}?t=${encodeURIComponent(token)}`;
  // Without a manual pick, the server shows the live game (or the next one). The first time
  // we see a game we fetch it in full, which also marks the team as joined.
  const load = useCallback(async () => {
    const pinned = gameRef.current;
    let r = await getJSON<TeamGameView>(`${base}${pinned ? `&g=${pinned}` : ''}`);
    const id = r.data?.game?.id ?? '';
    if (r.ok && id && fullFor.current !== id) {
      r = await getJSON<TeamGameView>(`${base}&g=${id}&full=1`);
      if (r.ok) fullFor.current = id;
    }
    if (!r.ok || !r.data) {
      setError(r.message || 'Could not reach the game.');
      return;
    }
    setError('');
    shownRef.current = r.data.game?.id ?? '';
    setView(r.data);
  }, [base]);

  usePoll(load, 1200, !!teamId && !!token);

  const send = useCallback((payload: Record<string, unknown>) => postJSON<Record<string, unknown>>(base, { gameId: shownRef.current, ...payload }), [base]);

  if (!token) return <Centered>Open this page from the team link in your email.</Centered>;
  if (!view) return <Centered>{error || 'Joining…'}</Centered>;
  const g = view.game;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#060608] text-[#ededed]">
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(179,32,42,.28), transparent 60%)' }} />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-6 pt-4 md:max-w-3xl md:px-8 md:pt-8">
        <div className="mb-3 flex items-center justify-between font-caps text-[11px] uppercase tracking-[0.3em] text-neutral-400">
          <span className="truncate">
            {view.team.teamId} · {view.team.teamName}
          </span>
          {view.games.length > 1 && (
            <select
              className="rounded border border-white/10 bg-black px-1 py-0.5 text-[10px] text-neutral-300"
              value={g?.id ?? ''}
              onChange={(e) => {
                gameRef.current = e.target.value;
                load();
              }}
            >
              {view.games.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.kind === 'detective' ? '♠' : '♣'} {x.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {error && <div className="mb-2 rounded bg-red-950/70 px-3 py-1.5 font-label text-xs text-red-200">{error} · retrying…</div>}
        {!g ? (
          <Waiting title="No game yet" text="Keep this page open. When the Game Master starts a game, it appears here by itself." />
        ) : g.kind === 'detective' ? (
          <DetectivePhone v={view} g={g} now={now} send={send} />
        ) : (
          <ExchangePhone v={view} g={g} now={now} send={send} />
        )}
      </div>
    </div>
  );
}

type Send = (p: Record<string, unknown>) => Promise<{ ok: boolean; data?: Record<string, unknown>; message?: string; code?: string }>;

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#060608] p-6 text-center font-label text-neutral-300">{children}</div>;
}

function Waiting({ title, text, emoji = '♠' }: { title: string; text: string; emoji?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <motion.div animate={{ rotateY: [0, 360] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} className="font-poster text-8xl text-[#ff3b3b]" style={{ textShadow: '0 0 40px rgba(255,59,59,.7)' }}>
        {emoji}
      </motion.div>
      <div className="font-poster text-4xl uppercase leading-none text-[#f2e9d8]">{title}</div>
      <p className="max-w-xs font-label text-sm text-neutral-400">{text}</p>
    </div>
  );
}

const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* no vibration */
  }
};

/* ── Code Detective on the phone ──────────────────────────────────────── */

function DetectivePhone({ v, g, now, send }: { v: TeamGameView; g: GameState; now: number; send: Send }) {
  const phase = g.phase ?? 'lobby';
  const q = g.question;
  const row = v.det?.row;
  const qi = g.qi ?? -1;
  const [mine, setMine] = useState<{ qi: number; choice: number | number[]; ms: number } | null>(null);
  const [bet, setBet] = useState<{ qi: number; pct: number } | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  // What the server already knows about us (after a reload, or a teammate's answer).
  useEffect(() => {
    if (v.det?.answer && v.det.answer.qi === qi) setMine(v.det.answer);
    if (v.det?.wager !== undefined) setBet({ qi, pct: v.det.wager });
  }, [v.det?.answer, v.det?.wager, qi]);
  useEffect(() => {
    setPick(null);
    setMsg('');
  }, [qi, phase]);

  const answered = mine?.qi === qi ? mine : null;
  const items = useStable(q?.items ?? []);
  const buckets = useStable(q?.buckets ?? []);
  const suit = q ? g.rounds?.[q.round]?.suit ?? '♠' : '♠';

  // Laptops: 1–4 answer or bet, ↑/↓ pick a line, Enter locks it in.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => undefined);
  keyRef.current = (e: KeyboardEvent) => {
    const n = Number(e.key);
    if (phase === 'wager' && n >= 1 && n <= 4) wager([0, 25, 50, 100][n - 1]);
    if (phase !== 'question' || !q || answered || now < (g.openAt ?? 0)) return;
    if (q.kind === 'line') {
      const lines = q.code ?? [];
      const step = (d: number) => {
        let i = pick ?? (d > 0 ? -1 : lines.length);
        do i += d;
        while (i >= 0 && i < lines.length && !lines[i].trim());
        if (i >= 0 && i < lines.length) setPick(i);
      };
      if (e.key === 'ArrowDown') step(1);
      else if (e.key === 'ArrowUp') step(-1);
      else if (e.key === 'Enter' && pick !== null) answer(pick);
      else return;
      e.preventDefault();
    } else if (q.kind === 'mcq' && n >= 1 && n <= (q.options?.length ?? 4)) answer(n - 1);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function answer(choice: number | number[]) {
    if (answered) return;
    sfx.lock();
    buzz(30);
    const r = await send({ type: 'answer', qi, choice });
    if (r.ok && r.data?.answer) setMine(r.data.answer as { qi: number; choice: number | number[]; ms: number });
    else setMsg(r.message || 'Could not send. Tap again.');
  }
  async function wager(pct: number) {
    buzz(20);
    const r = await send({ type: 'wager', pct });
    if (r.ok) setBet({ qi, pct });
    else setMsg(r.message || 'Could not place the bet.');
  }

  // Reveal feedback.
  const revealKey = phase === 'reveal' ? `r${qi}` : '';
  const lastReveal = useRef('');
  useEffect(() => {
    if (!revealKey || lastReveal.current === revealKey || !row) return;
    lastReveal.current = revealKey;
    if (row.last === 'right') {
      sfx.correct();
      buzz([40, 40, 40]);
    } else if (row.last === 'wrong') {
      sfx.wrong();
      buzz(400);
    }
  }, [revealKey, row]);

  if (phase === 'lobby' && g.mode === 'riddle') {
    return (
      <Waiting
        emoji="♦"
        title="You're in"
        text="Riddle Deck: your whole track plays together. You all hold the same hand of cards. A riddle comes out one clue at a time; play the card it describes. Clue 1 pays 300, clue 2 pays 200, clue 3 pays 100. A wrong card burns. Any phone of your team can play; the first tap counts."
      />
    );
  }
  if (phase === 'lobby') {
    return (
      <Waiting
        title="You're in"
        text={`Watch the big screen. ${v.team.card ? `Your card: ${CARD_BY_CODE[v.team.card]?.title}.` : ''} Any phone of your team can answer, the first tap counts.`}
      />
    );
  }
  if (phase === 'intro' && q) {
    const round = g.rounds![q.round];
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} className="font-poster text-[9rem] leading-none text-[#ff3b3b]">
          {round.suit}
        </motion.div>
        <div className="font-caps text-xs uppercase tracking-[0.4em] text-neutral-400">{g.mode === 'riddle' ? g.group : `Round ${q.round + 1}`}</div>
        <div className="font-poster text-5xl uppercase text-[#f2e9d8]">{round.title}</div>
        <p className="mt-2 font-label text-neutral-400">{round.subtitle}</p>
      </div>
    );
  }
  if (phase === 'wager') {
    const pts = Math.max(0, row?.pts ?? 0);
    const chosen = bet?.qi === qi ? bet.pct : null;
    return (
      <div className="flex flex-1 flex-col gap-3">
        <TimeBar start={g.openAt!} end={g.closeAt!} now={now} />
        <div className="text-center">
          <div className="font-poster text-5xl uppercase text-[#ff3b3b]">All In?</div>
          <p className="font-label text-sm text-neutral-400">
            You have <b className="text-white">{pts.toLocaleString('en-IN')}</b> points. Right: win the bet. Wrong: lose it.
          </p>
        </div>
        {[0, 25, 50, 100].map((p) => (
          <motion.button
            key={p}
            whileTap={{ scale: 0.95 }}
            onClick={() => wager(p)}
            className={`rounded-2xl border-2 px-4 py-4 text-left font-poster text-3xl uppercase transition ${
              chosen === p ? 'border-[#facc15] bg-[#b3202a] text-white shadow-[0_0_30px_rgba(255,59,59,.6)]' : 'border-white/10 bg-white/5 text-[#f2e9d8]'
            }`}
          >
            {p === 100 ? '💀 All in' : p === 0 ? 'Play safe' : `${p}%`}
            <span className="float-right font-label text-base font-bold text-neutral-300">±{Math.round((pts * p) / 100).toLocaleString('en-IN')}</span>
          </motion.button>
        ))}
        {msg && <p className="text-center font-label text-sm text-red-300">{msg}</p>}
      </div>
    );
  }
  if (phase === 'question' && q) {
    const openAt = g.openAt ?? 0;
    if (now < openAt) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="font-caps text-xs uppercase tracking-[0.4em] text-neutral-400">{q.kind === 'riddle' ? `${q.title ?? 'Riddle'} is coming` : 'Your card is being dealt'}</div>
          <motion.div initial={{ y: -500, rotate: -40 }} animate={{ y: [0, -10, 0], rotate: [0, 4, -4, 0] }} transition={{ y: { duration: 1.2, repeat: Infinity }, rotate: { duration: 0.9, repeat: Infinity } }}>
            <DealtCard faceUp={false} suit={suit} width={170} />
          </motion.div>
          <AnimatePresence mode="popLayout">
            <motion.span key={Math.ceil((openAt - now) / 1000)} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="font-poster text-7xl leading-none text-[#ff3b3b]">
              {Math.max(1, Math.ceil((openAt - now) / 1000))}
            </motion.span>
          </AnimatePresence>
        </div>
      );
    }
    if (answered && q.kind === 'riddle') {
      return <RiddlePlayed c={q.hand?.[answered.choice as number]} ms={answered.ms} clueSecs={q.clueSecs} total={q.clueTotal ?? 3} />;
    }
    if (answered) {
      const c = answered.choice;
      const what = typeof c === 'number' ? (q.kind === 'line' ? `Line ${c + 1}` : `${OPTS[c]?.suit} ${q.options?.[c] ?? ''}`) : q.kind === 'order' ? 'Order locked' : 'Sorted';
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <TimeBar start={openAt} end={g.closeAt!} now={now} />
          <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }} className="font-poster text-7xl uppercase leading-none text-[#f2e9d8]">
            Locked
          </motion.div>
          <div className="font-label text-lg text-neutral-300">
            {what} · ⚡ {(answered.ms / 1000).toFixed(2)}s
          </div>
          <p className="font-label text-sm text-neutral-500">Eyes on the big screen.</p>
        </div>
      );
    }
    // The server is the judge; only show time's up once our clock is trusted.
    const closed = clockReady() && now > (g.closeAt ?? 0) + 800;
    if (q.kind === 'riddle') {
      if (closed) return <Waiting emoji="♦" title="Time's up" text="Eyes on the big screen." />;
      return (
        <div className="flex flex-1 flex-col gap-3">
          <TimeBar start={openAt} end={g.closeAt!} now={now} />
          <RiddlePlay q={q} now={now} openAt={openAt} burned={row?.burned ?? []} onPlay={(i) => answer(i)} />
          {msg && <p className="text-center font-label text-sm text-red-300">{msg}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col gap-3">
        <TimeBar start={openAt} end={g.closeAt!} now={now} />
        {q.allIn && <div className="text-center font-caps text-xs uppercase tracking-[0.35em] text-[#facc15]">💀 All In question</div>}
        <div className="flex items-center gap-3">
          <motion.div initial={{ rotateY: 180, scale: 1.6, y: 40 }} animate={{ rotateY: 0, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 110, damping: 12 }} className="shrink-0">
            <DealtCard faceUp suit={q.card ? TRACKS[CARD_BY_CODE[q.card].track].suit : suit} title={q.title} width={74} />
          </motion.div>
          <div className="min-w-0">
            {q.dealt && <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-[#ff8a8a]">{q.card ? `Your card · ${CARD_BY_CODE[q.card].title}` : 'You drew this card'}</div>}
            <p className="font-label text-[16px] font-bold leading-snug text-white md:text-lg">{q.prompt}</p>
          </div>
        </div>
        {closed ? (
          <p className="mt-6 text-center font-poster text-4xl uppercase text-neutral-500">Time&apos;s up</p>
        ) : q.kind === 'line' ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/70 p-2">
              {q.code!.map((line, i) => (
                <button
                  key={i}
                  disabled={!line.trim()}
                  onClick={() => {
                    setPick(i);
                    sfx.tick();
                  }}
                  className={`flex w-full items-center rounded-md px-1 py-[5px] text-left font-mono text-[12px] leading-snug transition md:text-[15px] ${
                    pick === i ? 'bg-[#b3202a] ring-2 ring-[#ff3b3b]' : 'active:bg-white/10'
                  }`}
                >
                  <span className="w-6 shrink-0 select-none pr-2 text-right text-neutral-600">{i + 1}</span>
                  <span className="whitespace-pre">
                    <CodeText line={line} />
                  </span>
                </button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              disabled={pick === null}
              onClick={() => pick !== null && answer(pick)}
              className="sticky bottom-3 rounded-2xl bg-[#b3202a] py-4 font-poster text-3xl uppercase text-white shadow-[0_0_30px_rgba(255,59,59,.5)] disabled:opacity-30"
            >
              {pick === null ? 'Tap the guilty line' : `Lock in line ${pick + 1}`}
              <span className="hidden font-label text-xs normal-case opacity-70 md:block">Laptop: ↑ ↓ to pick, Enter to lock in</span>
            </motion.button>
          </>
        ) : q.kind === 'order' ? (
          <OrderInput items={items} onLock={(o) => answer(o)} />
        ) : q.kind === 'sort' ? (
          <SortInput items={items} buckets={buckets} onLock={(pl) => answer(pl)} />
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-2.5">
            {(q.options ?? []).map((o, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => answer(i)}
                className="flex items-center gap-3 rounded-2xl px-4 py-4 text-left"
                style={{ background: `linear-gradient(135deg, ${OPTS[i].color}, ${OPTS[i].dark})` }}
              >
                <span className="font-poster text-4xl leading-none text-white/90">{OPTS[i].suit}</span>
                <span className="font-label text-[15px] font-bold leading-snug text-white md:text-lg">{o}</span>
                <span className="ml-auto hidden rounded border border-white/40 px-1.5 font-label text-xs text-white/70 md:inline">{i + 1}</span>
              </motion.button>
            ))}
          </div>
        )}
        {msg && <p className="text-center font-label text-sm text-red-300">{msg}</p>}
      </div>
    );
  }
  if ((phase === 'reveal' || phase === 'board') && row) {
    const right = row.last === 'right';
    const partial = row.last === 'partial';
    const wrong = row.last === 'wrong';
    const key = v.det?.key;
    let answerText = '';
    let answerList: string[] = [];
    if (q && key) {
      if (q.kind === 'line') answerText = `Line ${key.correct.map((c) => c + 1).join(' or ')}`;
      else if (q.kind === 'mcq') answerText = q.options?.[key.correct[0]] ?? '';
      else if (q.kind === 'riddle') answerText = `${q.hand?.[key.correct[0]]?.icon} ${q.hand?.[key.correct[0]]?.name}`;
      else if (q.kind === 'order') answerList = key.correct.map((i, k) => `${k + 1}. ${q.items?.[i]}`);
      else if (q.kind === 'sort') answerList = (q.items ?? []).map((it, i) => `${q.buckets?.[key.correct[i]]} ← ${it}`);
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <motion.div
          initial={{ scale: 0.2, rotate: right ? -15 : 15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 11 }}
          className={`font-poster text-7xl uppercase leading-none ${right ? 'text-[#22e584]' : partial ? 'text-[#facc15]' : wrong ? 'text-[#ff3b3b] live-glitch' : 'text-neutral-400'}`}
          style={{ textShadow: right ? '0 0 50px rgba(34,229,132,.7)' : partial ? '0 0 50px rgba(250,204,21,.6)' : wrong ? '0 0 50px rgba(255,59,59,.7)' : undefined }}
        >
          {right ? (q?.kind === 'riddle' ? 'Right card' : 'Nailed it') : partial ? `${Math.round((row.acc ?? 0) * 100)}% right` : wrong ? (q?.kind === 'riddle' ? 'Burned' : 'Wrong') : q?.kind === 'riddle' ? 'No card' : 'No answer'}
        </motion.div>
        <div className={`font-poster text-5xl ${row.delta > 0 ? 'text-[#22e584]' : row.delta < 0 ? 'text-[#ff4a4a]' : 'text-neutral-500'}`}>
          {row.delta >= 0 ? '+' : ''}
          {row.delta}
        </div>
        {row.stake ? <div className="font-label text-sm text-[#facc15]">Bet: {row.stake.toLocaleString('en-IN')} points</div> : null}
        {g.reveal?.firstBlood === v.team.teamId && <div className="font-label text-lg font-bold text-[#facc15]">⚡ First blood: +50</div>}
        {wrong && q?.kind === 'riddle' && <div className="font-label text-sm text-neutral-400">That card is gone from your hand for the rest of the game.</div>}
        {row.streak >= 3 && q?.kind !== 'riddle' && <div className="font-label text-lg font-bold text-[#ff8a3d]">🔥 {row.streak} in a row: +100 per answer</div>}
        {answerText && <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-label text-sm text-neutral-200">Answer: {answerText}</div>}
        {answerList.length > 0 && (
          <div className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left font-label text-[12px] leading-relaxed text-neutral-200">
            <div className="mb-1 font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">The answer</div>
            {answerList.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-end gap-6">
          <div>
            <div className="font-poster text-6xl leading-none text-[#f2e9d8]">#{row.rank}</div>
            <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">of {g.roster.length}</div>
          </div>
          <div>
            <div className="font-poster text-4xl leading-none text-[#f2e9d8]">
              <Rolling value={row.pts} />
            </div>
            <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-500">points</div>
          </div>
        </div>
        {right && <Confetti fire={revealKey} count={90} />}
      </div>
    );
  }
  if (phase === 'final' && row) {
    const top = row.rank <= 3;
    const final = g.results?.find((x) => x.teamId === v.team.teamId)?.final ?? row.cd;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-7xl">{row.rank === 1 ? '👑' : top ? '🏆' : '🕵️'}</div>
        <div className="font-poster text-7xl leading-none text-[#f2e9d8]">#{row.rank}</div>
        <div className="font-label text-neutral-400">{row.pts.toLocaleString('en-IN')} points · {row.right} right</div>
        <div className="mt-2 rounded-2xl border border-[#facc15]/60 bg-[#facc15]/10 px-6 py-4">
          <div className="font-poster text-6xl leading-none text-[#facc15]">{final}/50</div>
          <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-300">Code Detective points in your final score</div>
        </div>
        {top && <Confetti fire="final" />}
      </div>
    );
  }
  return <Waiting title="Hold on" text="Watch the big screen." />;
}

function TimeBar({ start, end, now }: { start: number; end: number; now: number }) {
  const frac = Math.max(0, Math.min(1, (end - now) / Math.max(1, end - start)));
  const secs = Math.max(0, Math.ceil((end - now) / 1000));
  const hot = secs <= 5;
  return (
    <div className="flex w-full items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-[width] duration-100 ${hot ? 'bg-[#ff3b3b]' : 'bg-[#f2e9d8]'}`} style={{ width: `${frac * 100}%` }} />
      </div>
      <span className={`w-10 text-right font-poster text-2xl ${hot ? 'text-[#ff3b3b]' : 'text-[#f2e9d8]'}`}>{secs}</span>
    </div>
  );
}

/* ── Trading Floor on the phone ───────────────────────────────────────── */

function ExchangePhone({ v, g, now, send }: { v: TeamGameView; g: GameState; now: number; send: Send }) {
  const m = g.market!;
  const [mine, setMine] = useState<{ me: MyExchange; tick: number } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; good: boolean } | null>(null);
  const prices = useMemo(() => Object.fromEntries(m.tickers.map((t) => [t.code, t])), [m.tickers]);

  // The wallet: the latest trade's answer until a newer market tick has counted it.
  const fromPoll = v.ex;
  const me = mine && m.tick <= mine.tick + 1 ? mine.me : fromPoll;
  const holdings = me?.h ?? {};
  const cash = me?.cash ?? m.startCash;
  const worth = cash + Object.entries(holdings).reduce((a, [c, q]) => a + (prices[c]?.price ?? 0) * q, 0);
  const pl = (worth - m.startCash) / m.startCash;
  const myRow = g.exBoard?.find((r) => r.teamId === v.team.teamId);

  const open = g.status === 'LIVE' && !!m.openAt && now < (m.closeAt ?? 0);
  const halted = !!m.haltUntil && now < m.haltUntil;

  // News on the phone: a flash banner and a buzz.
  const lastNews = m.news[m.news.length - 1];
  const seenNews = useRef<string | null>(null);
  const [flash, setFlash] = useState<typeof lastNews | null>(null);
  useEffect(() => {
    if (!lastNews) return;
    if (seenNews.current === null) {
      seenNews.current = lastNews.id;
      return;
    }
    if (seenNews.current === lastNews.id) return;
    seenNews.current = lastNews.id;
    setFlash(lastNews);
    buzz(lastNews.auto ? 60 : [120, 60, 120]);
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [lastNews]);

  async function order(code: string, side: 'buy' | 'sell', qty: number) {
    if (qty <= 0) return;
    const r = await send({ type: 'trade', code, side, qty });
    if (r.ok && r.data?.me) {
      setMine({ me: r.data.me as MyExchange, tick: m.tick });
      const f = r.data.fill as { qty: number; price: number; amount: number };
      sfx.cash();
      buzz(25);
      setToast({ text: `${side === 'buy' ? 'Bought' : 'Sold'} ${f.qty} × ${CARD_BY_CODE[code]?.name.replace('The ', '')} @ ${f.price.toFixed(2)}`, good: true });
    } else {
      sfx.wrong();
      setToast({ text: r.message || 'Order failed.', good: false });
    }
    setTimeout(() => setToast(null), 2200);
  }

  if (g.status === 'LOBBY') {
    const card = v.team.card ? CARD_BY_CODE[v.team.card] : null;
    return (
      <Waiting
        emoji="♣"
        title="Market opens soon"
        text={`You get ${fmtChips(m.startCash)} chips. Every card in play is a stock. Buy low, sell high, react to the news.${card ? ` Insider rule: you cannot trade your own card (${card.name}).` : ''} Best trader: +30 points; every team that trades gets a bonus by rank.`}
      />
    );
  }

  if (g.status === 'ENDED') {
    const row = myRow;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <div className="text-7xl">{row?.rank === 1 ? '💰' : '🔔'}</div>
        <div className="font-poster text-5xl uppercase text-[#f2e9d8]">Market closed</div>
        <div className="font-poster text-7xl leading-none text-[#f2e9d8]">#{row?.rank ?? '–'}</div>
        <div className="font-label text-neutral-300">
          {fmtChips(row?.worth ?? worth)} chips · <span className={pl >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}>{fmtPct(((row?.worth ?? worth) - m.startCash) / m.startCash)}</span>
        </div>
        <div className="mt-2 rounded-2xl border border-[#22e584]/60 bg-[#22e584]/10 px-6 py-4">
          <div className="font-poster text-6xl leading-none text-[#22e584]">+{row?.bonus ?? 0}</div>
          <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-300">Trading bonus in your final score</div>
        </div>
        {(row?.bonus ?? 0) > 0 && <Confetti fire="closed" colors={['#22e584', '#facc15', '#fff']} />}
      </div>
    );
  }

  const left = Math.max(0, (m.closeAt ?? now) - now);
  const selT = sel ? prices[sel] : null;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-caps text-[10px] uppercase tracking-[0.3em] text-neutral-400">Net worth</div>
            <div className="font-poster text-4xl leading-none text-[#f2e9d8]">
              <Rolling value={worth} />
            </div>
            <div className={`font-label text-sm font-bold ${pl >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>{fmtPct(pl)}</div>
          </div>
          <div className="text-right">
            <div className="font-poster text-3xl leading-none tabular-nums text-[#f2e9d8]">
              {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
            </div>
            <div className="font-caps text-[10px] uppercase tracking-[0.25em] text-neutral-500">{halted ? 'halted' : open ? 'to close' : 'closed'}</div>
            {myRow && <div className="mt-1 font-poster text-xl text-[#facc15]">#{myRow.rank}</div>}
          </div>
        </div>
        <div className="mt-1 font-label text-xs text-neutral-400">Cash {fmtChips(cash)}</div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border-2 px-3 py-2 font-label text-sm font-bold ${flash.pct >= 0 ? 'border-[#22e584] bg-[#22e584]/15' : 'border-[#ff3b3b] bg-[#ff3b3b]/15'}`}
          >
            {flash.auto ? '🗞 ' : '🚨 '}
            {flash.headline} <span className={flash.pct >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}>{fmtPct(flash.pct)}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {m.tickers.map((t) => (
          <Row key={t.code} t={t} held={holdings[t.code] ?? 0} insider={t.code === v.team.card} onTap={() => t.code !== v.team.card && setSel(t.code)} />
        ))}
      </div>

      <AnimatePresence>
        {selT && (
          <TradeSheet
            t={selT}
            held={holdings[selT.code] ?? 0}
            cash={cash}
            spread={m.spread}
            maxOrder={m.maxOrder}
            disabled={!open || halted}
            onClose={() => setSel(null)}
            onOrder={(side, qty) => order(selT.code, side, qty)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center font-label text-sm font-bold ${toast.good ? 'bg-[#22e584] text-black' : 'bg-[#ff3b3b] text-white'}`}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {halted && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85">
          <div className="live-hazard absolute inset-x-0 top-0 h-6" />
          <div className="font-poster text-5xl uppercase text-[#facc15]">Trading halted</div>
          <p className="font-label text-neutral-300">Circuit breaker. Hold tight.</p>
        </div>
      )}
    </div>
  );
}

function Row({ t, held, insider, onTap }: { t: Ticker; held: number; insider: boolean; onTap: () => void }) {
  const card = CARD_BY_CODE[t.code];
  const tr = card ? TRACKS[card.track] : null;
  const c = (t.price - t.open) / t.open;
  const prev = useRef(t.price);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (prev.current === t.price) return;
    setFlash(t.price > prev.current ? 'rgba(34,229,132,.25)' : 'rgba(255,59,59,.25)');
    prev.current = t.price;
    const x = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(x);
  }, [t.price]);
  return (
    <motion.button
      whileTap={{ scale: insider ? 1 : 0.97 }}
      onClick={onTap}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${insider ? 'border-white/5 bg-white/[0.02] opacity-50' : 'border-white/10'}`}
      style={{ background: flash ?? undefined }}
    >
      <span className={`w-9 font-poster text-xl leading-none ${tr?.red ? 'text-[#ff4a4a]' : 'text-[#f2e9d8]'}`}>
        {tr?.suit}
        {card?.rank}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-label text-sm font-bold uppercase text-white">{card?.name.replace('The ', '')}</span>
        <span className="block font-label text-[11px] text-neutral-400">{insider ? '🔒 Your card · insider trading banned' : held ? `You hold ${held}` : card?.title}</span>
      </span>
      <span className="w-16">
        <Sparkline data={t.hist.slice(-40)} w={64} h={26} />
      </span>
      <span className="w-16 text-right">
        <span className="block font-poster text-lg leading-none tabular-nums text-[#f2e9d8]">{t.price.toFixed(1)}</span>
        <span className={`font-label text-[11px] font-bold ${c >= 0 ? 'text-[#22e584]' : 'text-[#ff4a4a]'}`}>{fmtPct(c)}</span>
      </span>
    </motion.button>
  );
}

function TradeSheet({
  t,
  held,
  cash,
  spread,
  maxOrder,
  disabled,
  onClose,
  onOrder,
}: {
  t: Ticker;
  held: number;
  cash: number;
  spread: number;
  maxOrder: number;
  disabled: boolean;
  onClose: () => void;
  onOrder: (side: 'buy' | 'sell', qty: number) => void;
}) {
  const card = CARD_BY_CODE[t.code];
  const [qty, setQty] = useState(10);
  const [busy, setBusy] = useState(false);
  const buyPx = t.price * (1 + spread);
  const sellPx = t.price * (1 - spread);
  const maxBuy = Math.min(maxOrder, Math.floor(cash / buyPx));
  const go = async (side: 'buy' | 'sell', q: number) => {
    setBusy(true);
    await onOrder(side, q);
    setBusy(false);
  };
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl md:bottom-8 md:rounded-3xl md:border border-t border-white/10 bg-[#0d0d11] p-5 pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-end justify-between">
          <div>
            <div className="font-poster text-3xl uppercase leading-none text-white">{card?.name.replace('The ', '')}</div>
            <div className="font-label text-xs text-neutral-400">{card?.title}</div>
          </div>
          <div className="font-poster text-4xl leading-none tabular-nums text-[#f2e9d8]">{t.price.toFixed(2)}</div>
        </div>
        <div className="my-3">
          <Sparkline data={t.hist} w={360} h={70} />
        </div>
        <div className="mb-3 font-label text-sm text-neutral-300">
          You hold <b className="text-white">{held}</b> · worth {fmtChips(held * t.price)}
        </div>
        <div className="mb-3 grid grid-cols-5 gap-1.5">
          {[1, 5, 10, 25, 50].map((n) => (
            <button key={n} onClick={() => setQty(n)} className={`rounded-lg py-2 font-poster text-xl ${qty === n ? 'bg-[#f2e9d8] text-black' : 'bg-white/10 text-white'}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={disabled || busy || qty > maxBuy}
            onClick={() => go('buy', qty)}
            className="rounded-2xl bg-[#16a34a] py-4 font-poster text-2xl uppercase text-white disabled:opacity-30"
          >
            Buy {qty}
            <span className="block font-label text-xs font-bold normal-case opacity-80">{fmtChips(buyPx * qty)} chips</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={disabled || busy || qty > held}
            onClick={() => go('sell', qty)}
            className="rounded-2xl bg-[#dc2626] py-4 font-poster text-2xl uppercase text-white disabled:opacity-30"
          >
            Sell {qty}
            <span className="block font-label text-xs font-bold normal-case opacity-80">{fmtChips(sellPx * qty)} chips</span>
          </motion.button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button disabled={disabled || busy || maxBuy < 1} onClick={() => go('buy', maxBuy)} className="rounded-xl border border-[#16a34a] py-2 font-label text-sm font-bold text-[#4ade80] disabled:opacity-30">
            Max buy ({maxBuy})
          </button>
          <button disabled={disabled || busy || held < 1} onClick={() => go('sell', Math.min(held, maxOrder))} className="rounded-xl border border-[#dc2626] py-2 font-label text-sm font-bold text-[#f87171] disabled:opacity-30">
            Sell all ({Math.min(held, maxOrder)})
          </button>
        </div>
        <p className="mt-3 text-center font-label text-[11px] text-neutral-500">Buy at +{(spread * 100).toFixed(0)}%, sell at −{(spread * 100).toFixed(0)}% of the price. Max {maxOrder} shares an order.</p>
      </motion.div>
    </>
  );
}
