'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { TOTAL_SLOTS, URGENCY_THRESHOLD } from '@/lib/slots';
import type { RegistrationData } from '@/lib/registrationData';

/**
 * Urgency popup — dismissible modal reinforcing the low-slots message.
 *
 * Trigger priority:
 *   1. After ~8 s on the landing page, OR when the user scrolls past the ticker.
 *   2. On desktop exit intent (mouse leaving top of viewport). Skipped on mobile.
 *   3. Never on the registration page; never if already registered.
 *
 * Shown at most once per session (sessionStorage).
 * Only shown when the low-slots condition is true.
 *
 * Accessible: focus trap, Esc / overlay click, aria-modal, visible close.
 */

interface UrgencyPopupProps {
  data: RegistrationData | null;
  /** ID of the ticker element (for scroll-past detection) */
  tickerElementId?: string;
}

const STORAGE_KEY = 'borderland_urgency_dismissed';
const TIMER_DELAY_MS = 8000;

function isSessionDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Private browsing — swallow
  }
}

function hasExistingRegistration(): boolean {
  try {
    return !!localStorage.getItem('borderland_player_reg');
  } catch {
    return false;
  }
}

function isLowSlots(data: RegistrationData | null): boolean {
  if (!data) return false;
  const remaining = TOTAL_SLOTS - data.count;
  return remaining > 0 && remaining <= Math.ceil(TOTAL_SLOTS * URGENCY_THRESHOLD);
}

export const UrgencyPopup: React.FC<UrgencyPopupProps> = ({
  data,
  tickerElementId = 'registration-ticker',
}) => {
  const [visible, setVisible] = useState(false);
  const hasTriggered = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const show = useCallback(() => {
    if (hasTriggered.current) return;
    if (isSessionDismissed() || hasExistingRegistration()) return;
    if (!isLowSlots(data)) return;

    hasTriggered.current = true;
    setVisible(true);
  }, [data]);

  const dismiss = useCallback(() => {
    setVisible(false);
    markDismissed();
  }, []);

  // 1a. Timer (8 s)
  useEffect(() => {
    if (hasTriggered.current || !isLowSlots(data)) return;
    const timer = setTimeout(show, TIMER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, show]);

  // 1b. Scroll past the ticker
  useEffect(() => {
    if (hasTriggered.current || !isLowSlots(data)) return;
    const ticker = document.getElementById(tickerElementId);
    if (!ticker) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Trigger when the ticker has scrolled out of view (above viewport)
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          show();
        }
      },
      { threshold: 0 }
    );

    observer.observe(ticker);
    return () => observer.disconnect();
  }, [data, show, tickerElementId]);

  // 2. Desktop exit intent
  useEffect(() => {
    if (hasTriggered.current || !isLowSlots(data)) return;

    // Skip on touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };

    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, [data, show]);

  // Focus trap + Esc
  useEffect(() => {
    if (!visible) return;

    // Focus close button on open
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss();
        return;
      }

      // Simple focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  if (!visible || !data) return null;

  const remaining = Math.max(0, TOTAL_SLOTS - data.count);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm backdrop-in"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="urgency-title"
        className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-[#0d0d10] p-6 sm:p-8 shadow-2xl card-pop"
      >
        {/* Close button */}
        <button
          ref={closeRef}
          onClick={dismiss}
          className="absolute top-3 right-3 p-2 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-[var(--card-red)] shrink-0 mt-0.5" />
          <div>
            <h2
              id="urgency-title"
              className="font-poster text-2xl sm:text-3xl uppercase text-[#f5eee1] leading-tight"
            >
              Only {remaining} slot{remaining !== 1 ? 's' : ''} left
            </h2>
            <p className="mt-2 font-label text-sm text-neutral-400 leading-relaxed">
              Teams are filling up fast. Secure your spot before registrations
              close.
            </p>
          </div>
        </div>

        <a
          href="/register"
          onClick={dismiss}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[var(--card-red)] hover:brightness-110 text-white font-label font-bold text-base shadow-lg shadow-black/40 transition"
        >
          Register now
          <ArrowRight className="w-4 h-4" />
        </a>

        <button
          onClick={dismiss}
          className="mt-3 w-full text-center font-label text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};
