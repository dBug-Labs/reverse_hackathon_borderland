import React, { useState } from 'react';
import { Clock, Shield, Sparkles, AlertCircle, ChevronRight, Award } from 'lucide-react';
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

  return (
    <section id="timeline" className="py-20 bg-[#09090d] relative border-t border-neutral-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-neutral-800">
          <div>
            <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-1">
              CHRONOLOGY
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              GAME TIMELINE
            </h2>
          </div>

          {/* Interactive Day Switcher Buttons */}
          <div className="mt-4 sm:mt-0 flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
            <button
              onClick={() => {
                playHudClick();
                setActiveDay('day1');
              }}
              className={`px-4 py-2 text-xs font-mono font-semibold rounded transition-colors ${
                activeDay === 'day1'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              DAY 01 · TRAINING DAY
            </button>
            <button
              onClick={() => {
                playHudClick();
                setActiveDay('day2');
              }}
              className={`px-4 py-2 text-xs font-mono font-semibold rounded transition-colors ${
                activeDay === 'day2'
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.5)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              DAY 02 · GAME DAY
            </button>
          </div>
        </div>

        {/* Schedule Presentation */}
        {activeDay === 'day1' ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded text-xs font-mono text-cyan-400 flex items-center justify-between">
              <span>DAY 01 OBJECTIVE: ZERO-COMPETITION SANDBOX & TECHNIQUE MASTERY</span>
              <span>09:00 — 17:00</span>
            </div>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-neutral-800 space-y-6 my-6">
              {day1Schedule.map((item, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full bg-neutral-900 border-2 border-neutral-600 group-hover:border-cyan-400 group-hover:scale-125 transition-all" />
                  
                  <div className="bg-[#0e0e15] border border-neutral-800/80 rounded-lg p-5 group-hover:border-neutral-700 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                          {item.time}
                        </span>
                        <span className="text-xs font-mono text-neutral-400">({item.duration})</span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">
                        {item.format}
                      </span>
                    </div>

                    <h4 className="text-base font-heading font-bold text-white mb-2">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-3 bg-red-950/30 border border-red-800/40 rounded text-xs font-mono text-red-400 flex items-center justify-between">
              <span>DAY 02 OBJECTIVE: BORDERLAND ARENA · ALL 4 SUITS LIVE</span>
              <span>09:00 — 17:00</span>
            </div>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-red-900/60 space-y-6 my-6">
              {day2Schedule.map((item, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline node */}
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full bg-neutral-950 border-2 border-red-500 group-hover:bg-red-600 group-hover:scale-125 transition-all shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  
                  <div className="bg-[#120c0e] border border-neutral-800/80 rounded-lg p-5 group-hover:border-red-600/50 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800/40">
                          {item.time}
                        </span>
                        {item.suit && (
                          <span className="text-lg font-display text-red-500 font-black">
                            {item.suit}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-red-400 font-semibold bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded">
                        {item.badge}
                      </span>
                    </div>

                    <h4 className="text-base font-heading font-bold text-white mb-2">
                      {item.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
