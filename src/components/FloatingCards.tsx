'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { playHudClick, playHudHover, playAccessGranted } from '../utils/sound';

/**
 * Desktop-only billboard cards floating around the hero, after the
 * "The Borderland" poster: two aged paper cards and two neon-red outline
 * cards, each asking one of the four core questions. Clicking a card flips
 * it and deals a large copy to the centre of the screen with the answer.
 * Hidden below xl; respects prefers-reduced-motion.
 */

type Look = 'paper' | 'neon';

interface FloatCard {
  suit: string;
  question: string;
  look: Look;
  red: boolean;
  style: React.CSSProperties; // position within the hero
  tilt: number; // resting rotation
  delay: string;
  // The answer (follows the official event brief)
  answer: string;
  where: string;
  detail: string;
}

const CARDS: FloatCard[] = [
  {
    suit: '♠',
    question: 'What does it do?',
    look: 'paper',
    red: false,
    style: { left: '2.5%', top: '46%' },
    tilt: -7,
    delay: '0s',
    answer:
      'Every team gets a finished product and no brief. Your first job is to work out what it actually does — and the real problem it was built to solve.',
    where: '♠ The Sprint → ♦ The Deduction',
    detail:
      'In Game 1 you race through every screen and button and write down everything you notice. In Game 2 you dig into its design, code and flow and name the problem. Getting that answer right is worth 40 of the 100 points.',
  },
  {
    suit: '♥',
    question: 'Who is it for?',
    look: 'neon',
    red: true,
    style: { left: '7%', top: '15%' },
    tilt: 5,
    delay: '1.1s',
    answer:
      'A product only makes sense once you know its user. Figure out who it was really made for — their workflow, their world, and why they would care.',
    where: '♦ The Deduction',
    detail:
      'Your written report in Game 2 has to say who the product is built for. Identifying the target user correctly is worth 30 points.',
  },
  {
    suit: '♦',
    question: 'What’s missing?',
    look: 'neon',
    red: true,
    style: { right: '7%', top: '17%' },
    tilt: -5,
    delay: '0.5s',
    answer:
      'Nothing is perfect. Spot what is missing, broken, or could be better — gaps in the flow, confusing screens, edge cases that fall apart.',
    where: '♦ The Deduction',
    detail:
      'It is part of your Game 2 report, and it feeds the improvement you will have to propose and defend in Game 4.',
  },
  {
    suit: '♣',
    question: 'How can you make it better?',
    look: 'paper',
    red: false,
    style: { right: '2.5%', top: '48%' },
    tilt: 7,
    delay: '1.6s',
    answer:
      'Propose a realistic improvement — then defend it. Anyone can guess; only teams who truly understand the product can hold their ground.',
    where: '♥ The Trial',
    detail:
      'In Game 4 you present the problem, the user and your proposed improvement to the Game Masters, who question you directly. You are scored on clarity, how well you defend it, and how creative and realistic the idea is.',
  },
];

/* ── The question-mark glyph shared by the small and large cards ── */
const SuitQ: React.FC<{ card: FloatCard; big?: boolean }> = ({ card, big }) => {
  const neon = card.look === 'neon';
  return (
    <span className="relative leading-none" aria-hidden="true">
      <span
        className={`${big ? 'text-[120px]' : 'text-6xl 2xl:text-7xl'} ${
          neon ? 'text-[#ff4040] neon-glyph' : card.red ? 'text-[var(--card-red)]' : 'text-[var(--ink)]'
        }`}
      >
        {card.suit}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center font-poster -mt-1 ${big ? 'text-5xl' : 'text-2xl'} ${
          neon ? 'text-[#1a0508]' : 'text-[var(--paper)]'
        }`}
      >
        ?
      </span>
    </span>
  );
};

/* ── One floating card: front face + patterned back, flips when picked ── */
const Card: React.FC<{ card: FloatCard; flipped: boolean; onPick: () => void }> = ({ card, flipped, onPick }) => {
  const neon = card.look === 'neon';
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => playHudHover()}
      aria-label={`${card.question} — reveal the answer`}
      aria-haspopup="dialog"
      className="absolute pointer-events-auto group flip-scene"
      style={{ ...card.style, transform: `rotate(${card.tilt}deg)` }}
    >
      <div className="float-card" style={{ animationDelay: card.delay }}>
        <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
          {/* Front */}
          <div
            className={`flip-face relative w-32 2xl:w-36 aspect-[5/7] rounded-xl p-2 transition-transform duration-300 group-hover:scale-[1.06] ${
              neon ? 'neon-card' : 'paper-card'
            }`}
          >
            <div
              className={`h-full rounded-lg flex flex-col items-center justify-between py-3 px-2 border ${
                neon ? 'border-[#ff3b3b]/60' : 'border-[var(--ink)]/25'
              }`}
            >
              <span className={`self-start text-sm leading-none ${neon ? 'text-[#ff5a5a]' : 'text-[var(--ink)]/70'}`} aria-hidden="true">
                {card.suit}
              </span>
              <SuitQ card={card} />
              <span
                className={`font-poster uppercase text-center leading-[1.05] text-[15px] 2xl:text-base ${
                  neon ? 'text-[#ff5a5a] neon-text' : 'text-[var(--ink)]'
                }`}
              >
                {card.question}
              </span>
            </div>
          </div>

          {/* Back */}
          <div className="flip-face flip-back rounded-xl p-2 card-back-pattern border border-[#ff3b3b]/70 shadow-[0_0_24px_rgba(255,40,40,0.35)]">
            <div className="h-full rounded-lg border border-[#ff3b3b]/50 flex items-center justify-center">
              <span className="font-poster text-5xl text-[#ff5a5a] neon-text">?</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};

/* ── The dealt card: the answer, centred ── */
const AnswerCard: React.FC<{ card: FloatCard; onClose: () => void }> = ({ card, onClose }) => {
  const neon = card.look === 'neon';
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ink = neon ? 'text-[#ffd9d9]' : 'text-[var(--ink)]';
  const accent = neon ? 'text-[#ff5a5a]' : 'text-[var(--card-red)]';
  // Corner pips follow the suit colour, like a real card
  const pip = neon ? 'text-[#ff5a5a]' : card.red ? 'text-[var(--card-red)]' : 'text-[var(--ink)]';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm backdrop-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="answer-title"
    >
      <div className={`card-pop relative w-full max-w-md rounded-2xl p-3 ${neon ? 'neon-card' : 'paper-card'}`}>
        <div className={`relative rounded-xl border px-7 pt-7 pb-11 ${neon ? 'border-[#ff3b3b]/60' : 'border-[var(--card-red)]/45'}`}>
          <span aria-hidden="true" className={`absolute top-3 left-4 text-xl ${pip}`}>
            {card.suit}
          </span>
          <span aria-hidden="true" className={`absolute bottom-3 right-4 text-xl rotate-180 ${pip}`}>
            {card.suit}
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className={`absolute top-3 right-3 p-1.5 rounded-full ${neon ? 'text-[#ff9a9a] hover:bg-white/10' : 'text-[var(--ink)]/60 hover:bg-black/5'}`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <SuitQ card={card} big />
            <p className={`mt-4 font-label text-[11px] font-bold uppercase tracking-[0.18em] ${accent}`}>The question</p>
            <h2 id="answer-title" className={`font-poster uppercase text-4xl leading-none mt-1 ${neon ? 'text-[#ff6b6b] neon-text' : ink}`}>
              {card.question}
            </h2>
          </div>

          <div className={`mt-5 pt-5 border-t font-label ${neon ? 'border-[#ff3b3b]/30' : 'border-[var(--ink)]/15'}`}>
            <p className={`text-[17px] leading-relaxed font-semibold ${ink}`}>{card.answer}</p>
            <p className={`mt-3 text-[15px] leading-relaxed ${neon ? 'text-[#f0bcbc]' : 'text-[var(--ink)]/75'}`}>{card.detail}</p>
            <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${neon ? 'bg-[#ff3b3b]/15 text-[#ffb3b3]' : 'bg-[var(--ink)] text-[var(--paper)]'}`}>
              Tested in: {card.where}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <a
              href="#games"
              onClick={onClose}
              className={`text-sm font-label font-semibold ${neon ? 'text-[#ff9a9a] hover:text-white' : 'text-[var(--ink)]/70 hover:text-[var(--ink)]'}`}
            >
              See the four games
            </a>
            <Link
              href="/register"
              onClick={() => playHudClick()}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--card-red)] px-5 py-2.5 font-label text-sm font-bold text-white hover:brightness-110"
            >
              Register your team
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloatingCards: React.FC = () => {
  const [flipped, setFlipped] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pick = (i: number) => {
    playHudClick();
    setFlipped(i);
    // let the card turn over, then deal the big one to the centre
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timer.current = setTimeout(() => {
      setOpen(i);
      playAccessGranted();
    }, reduced ? 0 : 280);
  };

  const close = useCallback(() => {
    setOpen(null);
    setFlipped(null);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <>
      <div className="hidden xl:block absolute inset-0 pointer-events-none z-[3]">
        {CARDS.map((card, i) => (
          <Card key={card.question} card={card} flipped={flipped === i} onPick={() => pick(i)} />
        ))}
      </div>
      {open !== null && <AnswerCard card={CARDS[open]} onClose={close} />}
    </>
  );
};
