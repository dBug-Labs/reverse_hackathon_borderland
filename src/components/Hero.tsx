'use client';

import React, { useEffect, useState } from 'react';
import { X, ArrowRight, ArrowDown, Clock } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';
import { FloatingCards } from './FloatingCards';
import { ENTRY_FEE } from '@/lib/fee';

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
  scoring: string[];
  scoringNote?: string;
  // Extra titled section (e.g. "Why this round exists")
  extra?: { title: string; text: string };
}

// Game details follow the official "Borderland Protocol" event brief.
const GAMES: Record<SuitKey, SuitGame> = {
  spades: {
    symbol: '♠',
    name: 'Spades',
    cardRank: 'K',
    rankName: 'King',
    red: false,
    role: 'Speed and action',
    gameName: 'The Sprint',
    timeSlot: 'Day 2 · 10:00 – 11:15 AM',
    duration: '75 min',
    objective:
      'A race against the clock. Teams get their mystery product for the first time and have to explore it as fast as they can — clicking through every screen, testing every button, and writing down everything they notice. There is no time to overthink here, only to observe.',
    scoring: [
      'Points for every genuine observation a team writes down and can prove',
      'Bonus points for the first team to finish their exploration checklist',
    ],
    extra: {
      title: 'Why this round exists',
      text: 'It forces every team to get hands-on with the product quickly, before they have time to form a theory. First impressions often reveal the most obvious clues.',
    },
  },
  diamonds: {
    symbol: '♦',
    name: 'Diamonds',
    cardRank: 'A',
    rankName: 'Ace',
    red: true,
    role: 'Intelligence and logic',
    gameName: 'The Deduction',
    timeSlot: 'Day 2 · 11:30 AM – 1:00 PM',
    duration: '90 min',
    objective:
      'The heart of the event. Using what they found in Game 1, teams dig deep into the product — its design, its code, its flow — to work out the real problem it was built to solve. Each team submits a short written report: what problem it solves, who it is built for, and what is missing, broken or could be better.',
    scoring: [
      'How accurate the answer is — 40 points',
      'How deep and well-reasoned the technical analysis is — 30 points',
      'How correctly the target user is identified — 30 points',
    ],
    scoringNote: '100 points in total. High Risk teams earn 1.5× if their report is strong — or lose points if it is way off.',
    extra: {
      title: 'Difficulty Card',
      text: 'Before this Game, each team picks Standard (more guided, normal points) or High Risk (tougher, less guided, 1.5× points — but a wrong final answer loses points).',
    },
  },
  clubs: {
    symbol: '♣',
    name: 'Clubs',
    cardRank: 'J',
    rankName: 'Jack',
    red: false,
    role: 'Teamwork',
    gameName: 'The Trading Floor',
    timeSlot: 'Day 2 · 2:00 – 3:15 PM',
    duration: '75 min',
    objective:
      'Teams are allowed to leave their tables and talk to other teams. Every team is holding one piece of insight the others don’t have. Trade information, form short alliances, or keep your findings to yourself. It’s a live trading floor — and every trade is a gamble.',
    scoring: [
      'Points for trades that genuinely improve a team’s final accuracy in Game 4',
      'Points deducted if a team is caught trading false or misleading information',
    ],
    extra: {
      title: 'Why this round exists',
      text: 'Real product teams don’t work alone — they share information across teams, and they have to decide who to trust. This Game brings that pressure into the event.',
    },
  },
  hearts: {
    symbol: '♥',
    name: 'Hearts',
    cardRank: 'Q',
    rankName: 'Queen',
    red: true,
    role: 'Psychology and trust',
    gameName: 'The Trial',
    timeSlot: 'Day 2 · 3:30 – 4:30 PM',
    duration: '60 min',
    objective:
      'The final test. Each team stands in front of a panel of Game Masters and presents what they discovered — the problem, the user, and their proposed improvement. The Game Masters then question the team directly. The rest of the Players watch and can react live, which adds a small bonus — in the Borderland, the crowd’s trust matters too.',
    scoring: [
      'How clear and well-structured the presentation is',
      'How well the team defends its answer when questioned',
      'How creative and realistic the proposed improvement is',
    ],
    extra: {
      title: 'Why this round exists',
      text: 'Anyone can guess an answer. This round rewards the teams who actually understand what they found, because it’s very hard to fake that under direct questioning.',
    },
  },
};

const ORDER: SuitKey[] = ['spades', 'diamonds', 'clubs', 'hearts'];

const EVENT_FACTS = [
  { label: 'Date', value: '5 & 6 Oct', sub: '9 AM – 5 PM' },
  { label: 'Venue', value: 'TP2 712', sub: 'SRM IST' },
  { label: 'Team size', value: '2–4', sub: 'members' },
  { label: 'Entry fee', value: `₹${ENTRY_FEE}`, sub: 'per team' },
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
              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Scoring</h3>
              <ul className="mt-2 space-y-1.5">
                {game.scoring.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[var(--ink)]/85">
                    <span className={`shrink-0 ${suitColor(game.red)}`}>{game.symbol}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {game.scoringNote && <p className="mt-2 text-[var(--ink)]/70">{game.scoringNote}</p>}
            </section>
            {game.extra && (
              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                  {game.extra.title}
                </h3>
                <p className="mt-1.5 text-[var(--ink)]/85">{game.extra.text}</p>
              </section>
            )}
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

        <FloatingCards />

        <div className="relative z-[2] max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-12 sm:pb-14 text-center">
          <div className="flex items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/dbuglabs-wordmark.png" alt="dBug Labs" className="h-6 sm:h-8 w-auto" />
            <span className="font-caps text-xs sm:text-sm uppercase tracking-[0.35em] text-[var(--paper)]/85">
              presents
            </span>
          </div>
          <h1 className="mt-5 sm:mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/hackback-wordmark-hero.webp"
              alt="HACKBACK — Play the reverse. Find the answer."
              width={1500}
              height={414}
              fetchPriority="high"
              className="mx-auto w-full max-w-[min(92vw,720px)] h-auto drop-shadow-[0_8px_30px_rgba(0,0,0,0.65)]"
            />
          </h1>
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
