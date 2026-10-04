'use client';

import React from 'react';
import { motion } from 'motion/react';
import { CARD_BY_CODE, TRACKS, rankLabel, type PsCard } from '@/lib/cardDrop/cards';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

// % of the card's own width / height, so corners stay small and round at any size.
// (cqw cannot be used here: it measures the parent container, not the card.)
const CARD_RADIUS = '6% / 4.3%';

/**
 * A HACKBACK playing card. Text is sized in container units (cqw), so the
 * same card works as a 70px board chip and as a 420px stage reveal.
 */

export function CardFace({ card, className, glow }: { card: PsCard; className?: string; glow?: boolean }) {
  const track = TRACKS[card.track];
  const ink = track.red ? 'var(--card-red)' : 'var(--ink)';
  return (
    <div
      className={cx('paper-card relative aspect-[5/7] w-full overflow-hidden select-none', className)}
      style={{
        containerType: 'inline-size',
        borderRadius: CARD_RADIUS,
        boxShadow: glow
          ? '0 0 0 2px rgba(255,70,70,.9), 0 0 40px rgba(255,40,40,.55), 0 30px 60px -20px rgba(0,0,0,.9)'
          : undefined,
      }}
    >
      <div className="absolute inset-[3.5cqw] rounded-[1.5cqw] border-[0.6cqw]" style={{ borderColor: `color-mix(in srgb, ${ink} 45%, transparent)` }} />
      {/* corners */}
      <div className="absolute left-[7cqw] top-[6cqw] flex flex-col items-center leading-none" style={{ color: ink }}>
        <span className="font-poster" style={{ fontSize: '15cqw' }}>{card.rank}</span>
        <span style={{ fontSize: '11cqw' }}>{track.suit}</span>
      </div>
      <div className="absolute bottom-[6cqw] right-[7cqw] flex rotate-180 flex-col items-center leading-none" style={{ color: ink }}>
        <span className="font-poster" style={{ fontSize: '15cqw' }}>{card.rank}</span>
        <span style={{ fontSize: '11cqw' }}>{track.suit}</span>
      </div>
      {/* big faint suit */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center" style={{ color: ink, opacity: 0.1, fontSize: '78cqw', lineHeight: 1 }}>
        {track.suit}
      </div>
      {/* centre: plain title first, Borderland codename second */}
      <div className="absolute inset-x-[9cqw] top-[29%] flex flex-col items-center text-center">
        <span className="font-label font-bold uppercase tracking-[0.14em]" style={{ fontSize: '5.4cqw', color: ink }}>
          {track.label}
        </span>
        <span className="mt-[2.5cqw] font-poster uppercase leading-[1] text-[var(--ink)]" style={{ fontSize: '11cqw' }}>
          {card.title}
        </span>
        <span className="mt-[3cqw] font-caps uppercase tracking-[0.1em] text-[var(--ink)]/60" style={{ fontSize: '4.8cqw' }}>
          {card.name} · {rankLabel(card.rank)}
        </span>
      </div>
    </div>
  );
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cx('card-back-pattern relative aspect-[5/7] w-full overflow-hidden select-none', className)}
      style={{ containerType: 'inline-size', borderRadius: CARD_RADIUS, boxShadow: '0 0 0 1.5px #ff3b3b, 0 0 24px rgba(255,45,45,.45), inset 0 0 30px rgba(255,40,40,.25)' }}
    >
      <div className="absolute inset-[5cqw] rounded-[1.5cqw] border-[0.8cqw] border-[#ff3b3b]/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="neon-glyph text-[#ff6b6b]" style={{ fontSize: '30cqw', lineHeight: 1 }}>♠</span>
        <span className="neon-text mt-[2cqw] font-poster uppercase tracking-[0.08em] text-[#ffd5d5]" style={{ fontSize: '10cqw' }}>
          Hackback
        </span>
        <span className="mt-[1cqw] font-label text-[#ff9b9b]/70" style={{ fontSize: '4.4cqw', letterSpacing: '0.3em' }}>
          今際のハッカソン
        </span>
      </div>
    </div>
  );
}

/** A card that flips from its back to its face when `flipped` becomes true. */
export function FlipCard({
  code,
  flipped,
  className,
  glow,
  delay = 0,
}: {
  code: string;
  flipped: boolean;
  className?: string;
  glow?: boolean;
  delay?: number;
}) {
  const card = CARD_BY_CODE[code];
  return (
    <div className={cx('relative', className)} style={{ perspective: 1400 }}>
      <motion.div
        className="relative w-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: flipped ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay }}
      >
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          {card ? <CardFace card={card} glow={glow} /> : <CardBack />}
        </div>
        <div className="absolute inset-0" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <CardBack />
        </div>
      </motion.div>
    </div>
  );
}

export function viaLabel(via: 0 | 1 | 2 | 3): string {
  return via === 1 ? '1st choice' : via === 2 ? '2nd choice' : via === 3 ? '3rd choice' : 'The deck chose';
}
