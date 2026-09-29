'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { TOTAL_SLOTS, URGENCY_THRESHOLD, CRITICAL_SLOTS } from '@/lib/slots';
import type { RegistrationData } from '@/lib/registrationData';

/**
 * "Few slots left" urgency banner for the registration page.
 *
 * • Shows only when remaining slots fall below URGENCY_THRESHOLD (20 % of total).
 * • Uses a stronger red state when remaining < CRITICAL_SLOTS.
 * • Includes a progress bar of slots filled.
 * • When slots reach 0 it signals via `onFull` so the parent can swap the CTA.
 */

interface SlotsBannerProps {
  data: RegistrationData | null;
  loading?: boolean;
}

export const SlotsBanner: React.FC<SlotsBannerProps> = ({ data, loading }) => {
  if (loading || !data) return null;

  const remaining = Math.max(0, TOTAL_SLOTS - data.count);
  const threshold = Math.ceil(TOTAL_SLOTS * URGENCY_THRESHOLD);

  // Don't show if there are plenty of slots left
  if (remaining > threshold) return null;

  const isCritical = remaining <= CRITICAL_SLOTS;
  const isFull = remaining <= 0;
  const filledPct = Math.min(100, Math.round((data.count / TOTAL_SLOTS) * 100));

  if (isFull) {
    return (
      <div
        role="alert"
        className="mb-8 rounded-xl border border-neutral-700 bg-neutral-900/80 px-5 py-4 text-center"
      >
        <p className="font-poster text-2xl uppercase text-neutral-300">
          Registrations closed
        </p>
        <p className="mt-1.5 font-label text-sm text-neutral-500">
          All {TOTAL_SLOTS} slots have been filled. Check back for a waitlist.
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`mb-8 rounded-xl border px-5 py-4 ${
        isCritical
          ? 'border-[var(--card-red)]/60 bg-[var(--card-red)]/10'
          : 'border-amber-500/40 bg-amber-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            isCritical ? 'text-[#ff6b6b]' : 'text-amber-400'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`font-label text-[15px] font-semibold ${
              isCritical ? 'text-red-200' : 'text-amber-200'
            }`}
          >
            Only {remaining} slot{remaining !== 1 ? 's' : ''} left — register
            soon!
          </p>

          {/* Progress bar */}
          <div className="mt-3 w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isCritical
                  ? 'bg-gradient-to-r from-[var(--card-red)] to-red-500'
                  : 'bg-gradient-to-r from-amber-600 to-amber-400'
              }`}
              style={{ width: `${filledPct}%` }}
            />
          </div>
          <p className="mt-1.5 font-label text-xs text-neutral-500">
            {data.count} of {TOTAL_SLOTS} slots filled ({filledPct}%)
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Returns true when remaining slots hit 0, so the register page
 * can swap its CTA to a closed/waitlist state.
 */
export function isSoldOut(data: RegistrationData | null): boolean {
  if (!data) return false;
  return data.count >= TOTAL_SLOTS;
}
