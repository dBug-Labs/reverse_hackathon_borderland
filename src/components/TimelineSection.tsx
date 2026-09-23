import React, { useState } from 'react';
import { playHudClick } from '../utils/sound';

export const TimelineSection: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'day1' | 'day2'>('day1');

  const day1Schedule = [
    {
      time: '09:00 — 10:00',
      title: 'Welcome & Opening Ceremony',
      format: 'Arena Introduction',
      duration: '60 min',
      desc: 'Lights dim and Borderland-style atmospheric soundscape begins. The host unpacks the world of the Borderland, inducts attendees as official "Players", and details the two-day operational protocol.',
    },
    {
      time: '10:00 — 12:30',
      title: 'Session 1 — What Is Reverse Engineering?',
      format: 'Talk + Live Demo',
      duration: '150 min',
      desc: 'Deconstructing software from the inside and outside. How to dissect unknown bundles, trace API routes, leverage browser DevTools, and reverse-engineer real-world software step by step.',
    },
    {
      time: '12:30 — 13:30',
      title: 'Lunch Break & Player Assembly',
      format: 'Recuperation',
      duration: '60 min',
      desc: 'Catered lunch break. Player Groups assemble, calibrate station setups, and discuss tactical division of labor.',
    },
    {
      time: '13:30 — 15:30',
      title: 'Session 2 — Thinking Like a Product Manager',
      format: 'Interactive Workshop',
      duration: '120 min',
      desc: 'Translating raw code into user intent. How to infer target personas, deduce the root market problem, identify architectural blindspots, and think like a venture founder rather than just a developer.',
    },
    {
      time: '15:30 — 15:45',
      title: 'Tactical Break',
      format: 'Intermission',
      duration: '15 min',
      desc: 'Short break prior to the mock trial.',
    },
    {
      time: '15:45 — 16:45',
      title: 'Hands-On Practice Round',
      format: 'Sandbox Teardown',
      duration: '60 min',
      desc: 'Teams receive a sample product for a safe, zero-penalty rehearsal. Apply Session 1 and 2 techniques, identify edge cases, make your early mistakes here, and establish group synchronization.',
    },
    {
      time: '16:45 — 17:00',
      title: 'Day 1 Wrap-Up & Day 2 Preview',
      format: 'Final Briefing',
      duration: '15 min',
      desc: 'Recap of core methodologies. The host unveils the scoring mechanics, Visa Point structure, and provides a classified sneak peek into the four suit trials.',
    },
  ];

  const day2Schedule = [
    {
      time: '09:00 — 09:30',
      title: 'Check-In & Visa Issuance',
      badge: 'VISA: 03 PTS',
      desc: 'Each Player Group checks in and receives their physical and digital Player Visa scorecard. Initial balance: 3 Visa Points. From this moment onward, every result impacts your survival.',
      suit: null,
    },
    {
      time: '09:30 — 10:00',
      title: 'Mission Briefing & Mystery Product Drop',
      badge: 'UNVEILING',
      desc: 'The four suits are formally introduced. Every team receives their mystery product package. The problem it was engineered to solve remains completely unstated.',
      suit: null,
    },
    {
      time: '10:00 — 11:15',
      title: 'Game 1 — ♠ Spades: The Sprint',
      badge: 'SPEED & ACTION',
      desc: '75 Minutes of high-speed cataloging. Explore every UI interaction, trigger edge cases, capture network logs, and document anomalies before preconceptions take root.',
      suit: '♠',
    },
    {
      time: '11:15 — 11:30',
      title: 'Break + Difficulty Card Selection',
      badge: 'CHOOSE YOUR FATE',
      desc: 'Crucial fork in the road: Teams elect Standard (guided, 1.0x points) or High Risk (unguided, 1.5x points, but wrong answer incurs point deductions).',
      suit: null,
    },
    {
      time: '11:30 — 13:00',
      title: 'Game 2 — ♦ Diamonds: The Deduction',
      badge: 'INTELLIGENCE & LOGIC',
      desc: '90 Minutes. The analytical engine of the event. Teams dissect the underlying mechanics and submit an exhaustive forensic report (100 Points Total).',
      suit: '♦',
    },
    {
      time: '13:00 — 14:00',
      title: 'Lunch Break + The Twist Card Drop',
      badge: 'MID-GAME CURVEBALL',
      desc: 'Leaderboard is projected live. Just before the hour concludes, Game Masters unveil a classified Twist Card with a new rule or revelation that reshuffles tactics.',
      suit: null,
    },
    {
      time: '14:00 — 15:15',
      title: 'Game 3 — ♣ Clubs: The Trading Floor',
      badge: 'TEAMWORK & ESPIONAGE',
      desc: '75 Minutes. Floor opens for cross-team negotiation. Trade proprietary clues, forge alliances, or bluff. Severe Visa penalties if caught trading falsified intel.',
      suit: '♣',
    },
    {
      time: '15:15 — 15:30',
      title: 'Re-Grouping Intermission',
      badge: 'PRE-TRIAL',
      desc: 'Teams finalize their presentation dossiers and steel themselves for Game Master cross-examination.',
      suit: null,
    },
    {
      time: '15:30 — 16:30',
      title: 'Game 4 — ♥ Hearts: The Trial',
      badge: 'PSYCHOLOGY & TRUST',
      desc: '60 Minutes. Face the tribunal. Defend your diagnosis and transformation roadmap under hostile interrogation while rival players react in real time.',
      suit: '♥',
    },
    {
      time: '16:30 — 16:45',
      title: 'The Final Duel',
      badge: 'SUDDEN DEATH',
      desc: 'The top two teams with the highest Visa Points battle head-to-head in a live, rapid-fire defense before the entire arena.',
      suit: '⚔',
    },
    {
      time: '16:45 — 17:00',
      title: 'Closing Ceremony — Borderland Survivors',
      badge: 'SURVIVOR CROWNING',
      desc: 'Final scores locked on the grand display. The Ultimate Survivors of the Borderland are crowned, cash bounties & medals conferred.',
      suit: '★',
    },
  ];

  const schedule = activeDay === 'day1' ? day1Schedule : day2Schedule;

  return (
    <section id="timeline" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
              Schedule
            </p>
            <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
              Hour by hour
            </h2>
          </div>

          <div role="tablist" aria-label="Choose a day" className="inline-flex p-1 rounded-lg bg-neutral-900 border border-neutral-800 self-start sm:self-auto">
            {(
              [
                ['day1', 'Day 1 · 5 Oct'],
                ['day2', 'Day 2 · 6 Oct'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeDay === key}
                onClick={() => {
                  playHudClick();
                  setActiveDay(key);
                }}
                className={`px-4 py-2 rounded-md text-sm font-label font-semibold transition-colors ${
                  activeDay === key ? 'bg-[var(--paper)] text-[var(--ink)]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-neutral-400">
          {activeDay === 'day1'
            ? 'Training day — no scores, no pressure. 9 AM to 5 PM.'
            : 'Game day — all four suit games, then the final duel. 9 AM to 5 PM.'}
        </p>

        <ol className="mt-8 border-t border-neutral-800">
          {schedule.map((item, idx) => (
            <li key={idx} className="grid sm:grid-cols-[11rem_1fr] gap-x-8 gap-y-1 py-6 border-b border-neutral-800">
              <div className="font-label">
                <div className="text-neutral-100 font-bold tabular-nums">{item.time.replace(' — ', '–')}</div>
                <div className="text-sm text-neutral-500 lowercase first-letter:uppercase">
                  {'duration' in item && item.duration ? item.duration : item.badge}
                </div>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-100 flex items-center gap-2">
                  {'suit' in item && item.suit && (
                    <span className={item.suit === '♦' || item.suit === '♥' ? 'text-[var(--card-red)]' : 'text-neutral-300'}>
                      {item.suit}
                    </span>
                  )}
                  {item.title}
                </h3>
                <p className="mt-1.5 text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
