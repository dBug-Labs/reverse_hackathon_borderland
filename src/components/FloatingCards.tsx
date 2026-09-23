'use client';

import React from 'react';
import { playHudClick, playHudHover } from '../utils/sound';

/**
 * Desktop-only billboard cards floating around the hero, after the
 * "The Borderland" poster: two aged paper cards and two neon-red outline
 * cards, each asking one of the four core questions. Hidden below xl.
 */

type Look = 'paper' | 'neon';

interface FloatCard {
  suit: string;
  question: string;
  look: Look;
  red: boolean;
  // Position within the hero, and the resting tilt
  style: React.CSSProperties;
  tilt: number;
  delay: string;
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
  },
  {
    suit: '♥',
    question: 'Who is it for?',
    look: 'neon',
    red: true,
    style: { left: '7%', top: '15%' },
    tilt: 5,
    delay: '1.1s',
  },
  {
    suit: '♦',
    question: 'What’s missing?',
    look: 'neon',
    red: true,
    style: { right: '7%', top: '17%' },
    tilt: -5,
    delay: '0.5s',
  },
  {
    suit: '♣',
    question: 'How can you make it better?',
    look: 'paper',
    red: false,
    style: { right: '2.5%', top: '48%' },
    tilt: 7,
    delay: '1.6s',
  },
];

const Card: React.FC<{ card: FloatCard }> = ({ card }) => {
  const neon = card.look === 'neon';
  return (
    <a
      href="#concept"
      onClick={() => playHudClick()}
      onMouseEnter={() => playHudHover()}
      aria-label={`${card.question} — read about the four questions`}
      className="absolute pointer-events-auto group"
      style={{ ...card.style, transform: `rotate(${card.tilt}deg)` }}
    >
      <div className="float-card" style={{ animationDelay: card.delay }}>
        <div
          className={`relative w-32 2xl:w-36 aspect-[5/7] rounded-xl p-2 transition-transform duration-300 group-hover:scale-[1.06] ${
            neon ? 'neon-card' : 'paper-card'
          }`}
        >
          <div
            className={`h-full rounded-lg flex flex-col items-center justify-between py-3 px-2 border ${
              neon ? 'border-[#ff3b3b]/60' : 'border-[var(--ink)]/25'
            }`}
          >
            <span
              className={`self-start text-sm leading-none ${neon ? 'text-[#ff5a5a]' : 'text-[var(--ink)]/70'}`}
              aria-hidden="true"
            >
              {card.suit}
            </span>

            {/* Suit with a question mark punched through it */}
            <span className="relative leading-none" aria-hidden="true">
              <span
                className={`text-6xl 2xl:text-7xl ${
                  neon ? 'text-[#ff4040] neon-glyph' : card.red ? 'text-[var(--card-red)]' : 'text-[var(--ink)]'
                }`}
              >
                {card.suit}
              </span>
              <span
                className={`absolute inset-0 flex items-center justify-center font-poster text-2xl -mt-1 ${
                  neon ? 'text-[#1a0508]' : 'text-[var(--paper)]'
                }`}
              >
                ?
              </span>
            </span>

            <span
              className={`font-poster uppercase text-center leading-[1.05] text-[15px] 2xl:text-base ${
                neon ? 'text-[#ff5a5a] neon-text' : 'text-[var(--ink)]'
              }`}
            >
              {card.question}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
};

export const FloatingCards: React.FC = () => (
  <div className="hidden xl:block absolute inset-0 pointer-events-none z-[3]">
    {CARDS.map((card) => (
      <Card key={card.question} card={card} />
    ))}
  </div>
);
