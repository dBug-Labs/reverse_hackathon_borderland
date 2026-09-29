'use client';

import React from 'react';
import type { RegistrationData } from '@/lib/registrationData';

/**
 * Live registration ticker — an infinitely scrolling horizontal strip
 * showing recent registrations with a pulsing "LIVE" dot.
 *
 * • CSS transform-based animation (GPU-composited, no JS timers).
 * • Duplicates items for seamless loop.
 * • Pauses on hover.
 * • Respects prefers-reduced-motion (static scrollable list).
 * • Hides itself when there are too few registrations or data is null.
 */

interface TickerProps {
  data: RegistrationData | null;
}

const MIN_ITEMS = 3;

export const RegistrationTicker: React.FC<TickerProps> = ({ data }) => {
  if (!data || data.recent.length < MIN_ITEMS) return null;

  const items = data.recent;

  return (
    <section
      className="ticker-strip relative overflow-hidden border-y border-neutral-800/60 bg-[#0a0a0d]"
      aria-label="Recent registrations"
    >
      {/* Live dot + label — fixed at the left edge */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 flex items-center pl-3 sm:pl-5 bg-gradient-to-r from-[#0a0a0d] via-[#0a0a0d] to-transparent pr-8">
        <span className="flex items-center gap-1.5">
          <span className="ticker-live-dot relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-label text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-emerald-400">
            Live
          </span>
        </span>
      </div>

      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#0a0a0d] to-transparent" />

      {/* Scrolling track — duplicated for seamless loop */}
      <div className="ticker-track flex items-center py-2.5 sm:py-3 pl-20 sm:pl-24">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex items-center shrink-0"
            aria-hidden={copy === 1 ? 'true' : undefined}
          >
            {items.map((item, i) => (
              <span
                key={`${copy}-${i}`}
                className="flex items-center gap-1.5 whitespace-nowrap px-4 sm:px-5 font-label text-xs sm:text-sm text-neutral-400"
              >
                <span className="text-neutral-200 font-medium">{item.name}</span>
                <span className="text-neutral-600">registered</span>
                <span className="text-neutral-500">{item.relativeTime}</span>
                <span className="text-neutral-700 mx-1" aria-hidden="true">·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};
