'use client';

import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ArrowDown, Clock } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';

interface HeroProps {
  onOpenRegister: () => void;
}

type SuitKey = 'spades' | 'diamonds' | 'clubs' | 'hearts';

interface SuitGame {
  symbol: string;
  name: string;
  cardRank: string;
  rankName: string;
  red: boolean;
  role: string;
  gameName: string;
  timeSlot: string;
  duration: string;
  objective: string;
  whyItExists: string;
  scoring: string[];
}

const GAMES: Record<SuitKey, SuitGame> = {
  spades: {
    symbol: '♠',
    name: 'Spades',
    cardRank: 'K',
    rankName: 'King',
    red: false,
    role: 'Speed + action',
    gameName: 'The Sprint',
    timeSlot: 'Day 2 · 10:00 – 11:15',
    duration: '75 min',
    objective:
      'A race against the clock. Teams receive their mystery product for the first time and must explore it as fast as possible—clicking through every screen, testing every button, logging console errors, and cataloging anomalies. There is no time to overthink here, only to observe.',
    whyItExists:
      'It forces every team to get hands-on with the product quickly, before they have time to form an ungrounded theory. First impressions under extreme time pressure often reveal the most obvious clues.',
    scoring: [
      'Points for every genuine, verifiable technical observation logged',
      'Speed bonus for the first team to submit an exhaustive exploration checklist',
      'Penalties for fabricating nonexistent bugs or hallucinating features',
    ],
  },
  diamonds: {
    symbol: '♦',
    name: 'Diamonds',
    cardRank: 'A',
    rankName: 'Ace',
    red: true,
    role: 'Intelligence + logic',
    gameName: 'The Deduction',
    timeSlot: 'Day 2 · 11:30 – 13:00',
    duration: '90 min',
    objective:
      'This is the intellectual core of the event. Using what they discovered in Game 1, teams dig deep into the product architecture—its design patterns, bundle files, network payloads, API routes, and user flow—to deduce what problem it was built to solve. Each team submits a structured forensic dossier.',
    whyItExists:
      'Anyone can play with a user interface. This round separates surface-level users from true engineers who can deduce system architecture and business motives from raw artifacts.',
    scoring: [
      'Core accuracy (what problem does it solve?): 40 points',
      'Technical depth & code analysis: 30 points',
      'Target user & persona identification: 30 points',
      'High Risk card: 1.5× points if correct, a deduction if wrong',
    ],
  },
  clubs: {
    symbol: '♣',
    name: 'Clubs',
    cardRank: 'J',
    rankName: 'Jack',
    red: false,
    role: 'Teamwork + alliance',
    gameName: 'The Trading Floor',
    timeSlot: 'Day 2 · 14:00 – 15:15',
    duration: '75 min',
    objective:
      'Teams are permitted to leave their stations and converse with rival groups. Every team holds one proprietary piece of insight the others lack. You may trade intelligence, broker temporary pacts, or guard your findings. It is a live trading floor—and every transaction is a gamble.',
    whyItExists:
      'Real product teams do not operate in silos—they share telemetry, navigate organizational politics, and decide whom to trust. Game 3 injects social tension and counter-espionage into the competition.',
    scoring: [
      'Bonus points for trades that demonstrably improve your final thesis in Game 4',
      'Severe Visa Point deductions if caught spreading fabricated or sabotage data',
      'Reputation rating tracked by the Game Masters',
    ],
  },
  hearts: {
    symbol: '♥',
    name: 'Hearts',
    cardRank: 'Q',
    rankName: 'Queen',
    red: true,
    role: 'Psychology + trust',
    gameName: 'The Trial',
    timeSlot: 'Day 2 · 15:30 – 16:30',
    duration: '60 min',
    objective:
      'The final ordeal. Each team stands before a tribunal of Game Masters to present their verdict—the problem, the user, the flaws, and their proposed product roadmap. The Game Masters cross-examine without mercy, testing if you can hold your ground under hostile questioning.',
    whyItExists:
      'Anyone can put together a pitch deck. This round rewards the teams who truly understand what they uncovered, because superficial understanding shatters immediately under questioning.',
    scoring: [
      'Clarity and conviction of your argument',
      'Resilience and accuracy under cross-examination',
      'Ingenuity and feasibility of the proposed product changes',
      'Crowd reaction trust bonus',
    ],
  },
};

const ORDER: SuitKey[] = ['spades', 'diamonds', 'clubs', 'hearts'];

const EVENT_FACTS = [
  { label: 'Date', value: '5 & 6 Oct', sub: '9 AM onwards' },
  { label: 'Venue', value: 'TP2 712', sub: 'SRM IST' },
  { label: 'Team size', value: '2–4', sub: 'members' },
  { label: 'Entry fee', value: '₹199', sub: 'per team' },
];

const suitColor = (red: boolean) => (red ? 'text-[var(--card-red)]' : 'text-[var(--ink)]');

/* ── Corner index (rank over suit), like a real card ── */
const CornerIndex: React.FC<{ game: SuitGame; className?: string; size?: 'sm' | 'lg' }> = ({
  game,
  className = '',
  size = 'sm',
}) => (
  <div className={`flex flex-col items-center leading-none ${suitColor(game.red)} ${className}`}>
    <span className={`font-poster ${size === 'lg' ? 'text-3xl' : 'text-xl sm:text-2xl'}`}>{game.cardRank}</span>
    <span className={size === 'lg' ? 'text-2xl -mt-0.5' : 'text-base sm:text-lg -mt-0.5'}>{game.symbol}</span>
  </div>
);

/* ── One game as a playing card ── */
const GameCard: React.FC<{ game: SuitGame; index: number; onOpen: () => void }> = ({
  game,
  index,
  onOpen,
}) => (
  <button
    type="button"
    onClick={() => {
      playHudClick();
      onOpen();
    }}
    onMouseEnter={() => playHudHover()}
    className="paper-card group relative w-full aspect-[5/7] rounded-xl p-2.5 sm:p-3 text-left transition-transform duration-200 hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--card-red)]"
    aria-label={`${game.gameName}: read how game ${index + 1} works`}
  >
    <div className="relative h-full rounded-lg border border-[var(--card-red)]/40 flex flex-col p-2 sm:p-3">
      <CornerIndex game={game} className="self-start" />

      <div className="flex-1 flex flex-col items-center justify-center text-center -mt-2">
        <span className={`text-4xl sm:text-6xl leading-none ${suitColor(game.red)}`}>{game.symbol}</span>
        <span className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] font-label font-bold uppercase tracking-[0.18em] text-[var(--ink)]/55">
          Game {index + 1}
        </span>
        <span className="font-poster text-lg sm:text-2xl uppercase leading-[1.05] text-[var(--ink)] mt-0.5">
          {game.gameName}
        </span>
        <span className="hidden sm:block text-xs font-label text-[var(--ink)]/65 mt-1">{game.role}</span>
      </div>

      <div className="flex items-end justify-end sm:justify-between">
        <span className="hidden sm:inline text-[11px] font-label font-semibold text-[var(--ink)]/60 group-hover:text-[var(--card-red)] transition-colors">
          How it works →
        </span>
        <CornerIndex game={game} className="rotate-180" />
      </div>
    </div>
  </button>
);

/* ── Game details, styled as the face of the card ── */
const GameDossier: React.FC<{ game: SuitGame; onClose: () => void; onOpenRegister: () => void }> = ({
  game,
  onClose,
  onOpenRegister,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
    >
      <div className="paper-card relative w-full max-w-lg rounded-2xl p-2.5 max-h-[92vh] flex">
        <div className="relative flex-1 rounded-xl border border-[var(--card-red)]/50 p-5 sm:p-7 flex flex-col min-h-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-[var(--ink)]/60 hover:text-[var(--ink)] hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <CornerIndex game={game} size="lg" />
            <div>
              <p className="font-caps text-xs tracking-[0.2em] uppercase text-[var(--card-red)]">
                {game.rankName} of {game.name}
              </p>
              <h2 id="dossier-title" className="font-poster text-4xl uppercase leading-none mt-1">
                {game.gameName}
              </h2>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-label text-[var(--ink)]/70">
                <Clock className="w-3.5 h-3.5" />
                {game.timeSlot} · {game.duration} · {game.role}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-[var(--ink)]/15 space-y-5 overflow-y-auto min-h-0 pr-1 font-label text-sm leading-relaxed">
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">The game</h3>
              <p className="mt-1.5 text-[var(--ink)]/85">{game.objective}</p>
            </section>
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Why it exists</h3>
              <p className="mt-1.5 text-[var(--ink)]/85">{game.whyItExists}</p>
            </section>
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Scoring</h3>
              <ul className="mt-2 space-y-1.5">
                {game.scoring.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[var(--ink)]/85">
                    <span className={`shrink-0 ${suitColor(game.red)}`}>{game.symbol}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--ink)]/15 flex items-center justify-between gap-3">
            <CornerIndex game={game} className="rotate-180" />
            <button
              onClick={() => {
                playHudClick();
                onClose();
                onOpenRegister();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--card-red)] hover:brightness-110 text-white font-label text-sm font-bold"
            >
              Register your team
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Hero ── */
export const Hero: React.FC<HeroProps> = ({ onOpenRegister }) => {
  const [openGame, setOpenGame] = useState<SuitKey | null>(null);

  const scrollToGames = () => {
    playHudClick();
    document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="relative overflow-hidden bg-[#08080a]">
        {/* Inverted city, darkened so the poster type carries the page */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-top"
          style={{ backgroundImage: "url('/images/inverted_city_bg.jpg')" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(8,8,10,0.72) 0%, rgba(8,8,10,0.45) 35%, rgba(8,8,10,0.8) 70%, #08080a 100%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-12 sm:pb-14 text-center">
          <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.35em] text-[var(--paper)]/85">
            dBug Labs presents
          </p>
          <h1 className="font-poster uppercase text-[#f5eee1] leading-[0.85] text-[clamp(4.5rem,17vw,12rem)] mt-3 drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
            Hackback
          </h1>
          <p className="font-caps uppercase tracking-[0.18em] text-sm sm:text-lg text-neutral-100 mt-4">
            Play the reverse. Find the answer.
          </p>
          <p className="max-w-xl mx-auto mt-5 text-neutral-300 text-base sm:text-lg leading-relaxed">
            A two-day reverse hackathon. You get a finished product with no brief — work out what it
            does, who it&apos;s for, and what&apos;s broken.
          </p>

          {/* Poster info card */}
          <div className="paper-card relative max-w-2xl mx-auto mt-10 rounded-2xl p-2.5 text-left">
            <div className="relative rounded-xl border border-[var(--card-red)]/45 px-6 py-6 sm:px-10 sm:py-7">
              <span aria-hidden="true" className="absolute top-2 left-3 text-xl text-[var(--ink)]">♠</span>
              <span aria-hidden="true" className="absolute top-2 right-3 text-xl text-[var(--card-red)]">♥</span>
              <span aria-hidden="true" className="absolute bottom-2 left-3 text-xl text-[var(--card-red)]">♦</span>
              <span aria-hidden="true" className="absolute bottom-2 right-3 text-xl text-[var(--ink)]">♣</span>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
                {EVENT_FACTS.map((fact) => (
                  <div key={fact.label} className="text-center sm:text-left">
                    <dt className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                      {fact.label}
                    </dt>
                    <dd className="font-poster text-3xl uppercase leading-none mt-1.5 text-[var(--ink)]">
                      {fact.value}
                    </dd>
                    <dd className="font-label text-xs font-semibold text-[var(--ink)]/65 mt-1">{fact.sub}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
            <button
              onClick={() => {
                playHudClick();
                onOpenRegister();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-md bg-[var(--card-red)] hover:brightness-110 text-white font-label font-bold text-base shadow-lg shadow-black/40 transition"
            >
              Register your team
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={scrollToGames}
              className="inline-flex items-center gap-2 px-4 py-3 font-label font-semibold text-neutral-200 hover:text-white"
            >
              See the four games
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-4 font-label text-sm text-neutral-400">
            For SRM students · Registrations close 3 October
          </p>
        </div>
      </section>

      {/* The four games */}
      <section id="games" className="relative bg-[#08080a] pt-12 pb-20 sm:pt-16 sm:pb-24 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
              Day 2 · Game day
            </p>
            <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
              Four games. One deck.
            </h2>
            <p className="mt-4 text-neutral-400 text-base sm:text-lg leading-relaxed">
              Each suit is a round that tests something different. Tap a card to see how it&apos;s played
              and scored.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {ORDER.map((key, i) => (
              <GameCard key={key} game={GAMES[key]} index={i} onOpen={() => setOpenGame(key)} />
            ))}
          </div>
        </div>
      </section>

      {openGame && (
        <GameDossier game={GAMES[openGame]} onClose={() => setOpenGame(null)} onOpenRegister={onOpenRegister} />
      )}
    </>
  );
};
