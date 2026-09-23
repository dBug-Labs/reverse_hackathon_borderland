import React, { useState } from 'react';
import { GameInfo, Suit } from '../types/borderland';
import { Lock, Eye, AlertCircle, X, Clock, Target, Trophy, ShieldAlert } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';

export const gamesData: GameInfo[] = [
  {
    id: 'spades',
    suitSymbol: '♠',
    suitName: 'SPADES',
    gameName: 'THE SPRINT',
    skill: 'SPEED + ACTION',
    timeSlot: 'Day 02 • 10:00 — 11:15',
    duration: '75 Minutes',
    objective:
      'A race against the clock. Teams receive their mystery product for the first time and must explore it as fast as possible—clicking through every screen, testing every button, logging console errors, and cataloging anomalies. There is no time to overthink here, only to observe.',
    whyItExists:
      'It forces every team to get hands-on with the product quickly, before they have time to form an ungrounded theory. First impressions under extreme time pressure often reveal the most obvious clues.',
    scoring: [
      'Points for every genuine, verifiable technical observation logged',
      'Speed bonus for the first team to submit an exhaustive exploration checklist',
      'Penalties for fabricating nonexistent bugs or hallucinating features',
    ],
    difficulty: 'High Tempo',
    color: 'text-neutral-100',
    accentBg: 'from-neutral-900 via-neutral-950 to-[#08080a] border-neutral-700',
  },
  {
    id: 'diamonds',
    suitSymbol: '♦',
    suitName: 'DIAMONDS',
    gameName: 'THE DEDUCTION',
    skill: 'INTELLIGENCE + LOGIC',
    timeSlot: 'Day 02 • 11:30 — 13:00',
    duration: '90 Minutes',
    objective:
      'This is the intellectual core of the event. Using what they discovered in Game 1, teams dig deep into the product architecture—its design patterns, bundle files, network payloads, API routes, and user flow—to deduce what problem it was built to solve. Each team submits a structured forensic dossier.',
    whyItExists:
      'Anyone can play with a user interface. This round separates surface-level users from true engineers who can deduce system architecture and business motives from raw artifacts.',
    scoring: [
      'Core Accuracy (What problem does it solve?): 40 Points',
      'Technical Depth & Code Analysis: 30 Points',
      'Target User & Persona Identification: 30 Points',
      'High Risk Card Modifier: 1.5× Points if correct; point deduction if incorrect',
    ],
    difficulty: 'Critical Analysis',
    color: 'text-red-500',
    accentBg: 'from-red-950/40 via-neutral-950 to-[#08080a] border-red-800/80',
  },
  {
    id: 'clubs',
    suitSymbol: '♣',
    suitName: 'CLUBS',
    gameName: 'THE TRADING FLOOR',
    skill: 'TEAMWORK + ALLIANCE',
    timeSlot: 'Day 02 • 14:00 — 15:15',
    duration: '75 Minutes',
    objective:
      'Teams are permitted to leave their stations and converse with rival groups. Every team holds one proprietary piece of insight the others lack. You may trade intelligence, broker temporary pacts, or guard your findings. It is a live trading floor—and every transaction is a gamble.',
    whyItExists:
      'Real product teams do not operate in silos—they share telemetry, navigate organizational politics, and decide whom to trust. Game 3 injects social tension and counter-espionage into the competition.',
    scoring: [
      'Bonus points for trades that demonstrably improve your final thesis in Game 4',
      'Severe Visa Point deductions if caught disseminating fabricated or sabotage data',
      'Reputation rating tracked by the Game Masters',
    ],
    difficulty: 'Social Espionage',
    color: 'text-neutral-100',
    accentBg: 'from-neutral-900 via-neutral-950 to-[#08080a] border-neutral-700',
  },
  {
    id: 'hearts',
    suitSymbol: '♥',
    suitName: 'HEARTS',
    gameName: 'THE TRIAL',
    skill: 'PSYCHOLOGY + TRUST',
    timeSlot: 'Day 02 • 15:30 — 16:30',
    duration: '60 Minutes',
    objective:
      'The supreme ordeal. Each team stands before a tribunal of Game Masters (the judges) to present their verdict—the problem, the user, the flaws, and their proposed product roadmap. The Game Masters cross-examine without mercy, testing if you can hold your ground under hostile questioning. The crowd reacts live, affecting crowd trust multipliers.',
    whyItExists:
      'Anyone can fabricate a pitch deck. This round rewards the teams who truly understand what they uncovered, because superficial understanding shatters immediately under interrogation.',
    scoring: [
      'Clarity and conviction of forensic argument',
      'Resilience and accuracy under direct Game Master cross-examination',
      'Ingenuity and feasibility of proposed product transformation',
      'Crowd reaction trust bonus',
    ],
    difficulty: 'Hostile Interrogation',
    color: 'text-red-500',
    accentBg: 'from-red-950/40 via-neutral-950 to-[#08080a] border-red-800/80',
  },
];

export const FourGamesSection: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);

  return (
    <section id="games" className="py-20 bg-[#09090d] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 pb-4 border-b border-neutral-800">
          <div>
            <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-1">
              THE FOUR ARENAS
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              THE FOUR GAMES
            </h2>
          </div>
          <div className="mt-3 sm:mt-0 text-xs font-mono text-neutral-400">
            DAY 02 PROTOCOL · ONE SUIT PER TRIAL
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {gamesData.map((game) => (
            <div
              key={game.id}
              onClick={() => {
                playHudClick();
                setSelectedGame(game);
              }}
              onMouseEnter={() => playHudHover()}
              className={`bg-gradient-to-b ${game.accentBg} border rounded-lg p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(220,38,38,0.25)] relative group`}
            >
              {/* Lock Indicator */}
              <div className="flex items-center justify-between text-xs font-mono mb-6">
                <span className="text-neutral-500">{game.suitName}</span>
                <span className="flex items-center gap-1.5 text-[11px] text-amber-500/80 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-800/30">
                  <Lock className="w-3 h-3" />
                  <span>LOCKED</span>
                </span>
              </div>

              {/* Large Suit Symbol */}
              <div className="my-4 text-center">
                <span
                  className={`text-6xl sm:text-7xl font-display font-bold ${game.color} transition-transform duration-300 group-hover:scale-110 inline-block`}
                >
                  {game.suitSymbol}
                </span>
                <h3 className="text-lg font-heading font-bold text-white mt-3 tracking-wide">
                  {game.gameName}
                </h3>
                <div className="text-xs font-mono text-red-400 tracking-wider mt-1">
                  {game.skill}
                </div>
              </div>

              {/* Brief Objective Snippet */}
              <div className="pt-4 border-t border-neutral-800/80 text-xs text-neutral-400 font-sans line-clamp-3 mb-4">
                {game.objective}
              </div>

              {/* Action prompt */}
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 group-hover:text-red-400 transition-colors pt-2">
                <span>INSPECT DOSSIER</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Informational Subtext */}
        <div className="mt-8 p-4 bg-neutral-900/40 border border-neutral-800/60 rounded text-xs font-mono text-neutral-400 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>Click any Game card above to inspect scoring rules, duration, and tribunal requirements.</span>
          </div>
          <div className="text-neutral-500 text-[11px]">
            GATE LEVEL: CLASSIFIED UNTIL 09:30 MISSION BRIEFING
          </div>
        </div>

      </div>

      {/* Expanded Game Dossier Modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0f0f16] border border-red-700/60 rounded-lg max-w-2xl w-full p-6 sm:p-8 relative shadow-[0_0_50px_rgba(220,38,38,0.3)] hud-corner max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedGame(null)}
              className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-700"
              aria-label="Close dossier"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Dossier Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-neutral-800">
              <span className={`text-5xl font-display font-black ${selectedGame.color}`}>
                {selectedGame.suitSymbol}
              </span>
              <div>
                <div className="text-xs font-mono tracking-widest text-red-500 uppercase">
                  GAME DOSSIER · {selectedGame.suitName}
                </div>
                <h3 className="text-2xl font-display font-bold text-white">
                  {selectedGame.gameName}
                </h3>
                <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    {selectedGame.duration} ({selectedGame.timeSlot})
                  </span>
                  <span>·</span>
                  <span className="text-neutral-300 font-semibold">{selectedGame.skill}</span>
                </div>
              </div>
            </div>

            {/* Objective */}
            <div className="space-y-6 text-xs sm:text-sm font-sans">
              <div>
                <h4 className="font-mono text-xs text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-red-500" />
                  Primary Mission Objective
                </h4>
                <p className="text-neutral-200 bg-neutral-950/60 p-4 rounded border border-neutral-800/80 leading-relaxed">
                  {selectedGame.objective}
                </p>
              </div>

              {/* Why This Round Exists */}
              <div>
                <h4 className="font-mono text-xs text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  Why This Arena Exists
                </h4>
                <p className="text-neutral-300 bg-neutral-950/40 p-3.5 rounded border border-neutral-800/60 leading-relaxed text-xs">
                  {selectedGame.whyItExists}
                </p>
              </div>

              {/* Scoring Protocol */}
              <div>
                <h4 className="font-mono text-xs text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-red-500" />
                  Scoring & Visa Impact
                </h4>
                <ul className="space-y-2">
                  {selectedGame.scoring.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-neutral-300 flex items-start gap-2 bg-neutral-900/40 p-2.5 rounded border border-neutral-800/50"
                    >
                      <span className="text-red-500 font-mono font-bold shrink-0">{`[${idx + 1}]`}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Locked Badge */}
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded flex items-center justify-between text-xs font-mono text-red-400">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  STATUS: SEALED UNTIL DAY 02 BRIEFING
                </span>
                <span className="text-neutral-500 text-[11px]">ALL PLAYERS COMPETE CONCURRENTLY</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
