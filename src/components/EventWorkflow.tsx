import React from 'react';
import { ArrowDown, CheckCircle2, Flame, Award, Shield, AlertTriangle } from 'lucide-react';
import { playHudHover } from '../utils/sound';

export const EventWorkflow: React.FC = () => {
  const day1Flow = [
    { step: '01', title: 'WELCOME', desc: 'Opening Ceremony & Borderland Lore' },
    { step: '02', title: 'REVERSE ENGINEERING', desc: 'Inspection techniques & devtools demo' },
    { step: '03', title: 'PRODUCT THINKING', desc: 'Thinking like a founder, not just a coder' },
    { step: '04', title: 'PRACTICE ROUND', desc: 'Safe sandbox trial on sample product' },
    { step: '05', title: 'DAY 2 BRIEFING', desc: 'Visa system rules & Game reveals' },
  ];

  const day2Flow = [
    { step: '01', title: 'CHECK-IN', desc: '3 Visa Points issued per group' },
    { step: '02', title: 'MYSTERY PRODUCT', desc: 'Sealed product unveiled with no prompt' },
    { step: '03', title: '♠ THE SPRINT', desc: '75 min rapid observation race' },
    { step: '04', title: 'DIFFICULTY CHOICE', desc: 'Standard vs High Risk (1.5× pts)' },
    { step: '05', title: '♦ THE DEDUCTION', desc: '90 min deep architectural dissection' },
    { step: '06', title: 'TWIST CARD', desc: 'Mid-game curveball revealed at lunch' },
    { step: '07', title: '♣ TRADING FLOOR', desc: '75 min alliance & intel exchange' },
    { step: '08', title: '♥ THE TRIAL', desc: '60 min defense before Game Masters' },
    { step: '09', title: 'THE FINAL DUEL', desc: 'Top 2 teams head-to-head rapid-fire' },
    { step: '10', title: 'SURVIVORS', desc: 'Ultimate Survivors crowned & prizes awarded' },
  ];

  return (
    <section id="workflow" className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            TWO-DAY ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            HOW THE EVENT WORKS
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl mx-auto">
            Day 1 sharpens your weapons in a zero-penalty training sandbox. Day 2 drops your Player Group into the live Borderland arena where every decision modifies your Visa score.
          </p>
        </div>

        {/* 2-Day Side-by-Side Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Day 1: Training Day (5 columns) */}
          <div 
            onMouseEnter={() => playHudHover()}
            className="lg:col-span-5 bg-[#0d0d14] border border-neutral-800 rounded-lg p-6 sm:p-8 hud-corner flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-6">
                <div>
                  <span className="text-xs font-mono text-neutral-500 tracking-widest block">PHASE 01</span>
                  <h3 className="text-2xl font-display font-bold text-neutral-100">DAY 01</h3>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-800/40">
                  TRAINING DAY
                </span>
              </div>
              
              <p className="text-xs text-neutral-400 font-sans mb-6">
                Zero competition. Pure capability building. Teams learn modern reverse-engineering methodologies, product teardown tactics, and calibrate their teamwork.
              </p>

              {/* Day 1 Steps */}
              <div className="space-y-3">
                {day1Flow.map((item, idx) => (
                  <div key={item.step} className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded border border-neutral-800/80">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30 shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <div className="font-heading font-semibold text-xs text-white uppercase tracking-wider">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-sans">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-800 text-[11px] font-mono text-neutral-500 flex items-center justify-between">
              <span>STATUS: SAFE HAVEN</span>
              <span>NO VISA RISK</span>
            </div>
          </div>

          {/* Day 2: Game Day (7 columns) */}
          <div 
            onMouseEnter={() => playHudHover()}
            className="lg:col-span-7 bg-gradient-to-b from-[#180d0f] to-[#0d090b] border-2 border-red-600/70 rounded-lg p-6 sm:p-8 hud-corner glow-red-box flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-red-900/50 mb-6">
                <div>
                  <span className="text-xs font-mono text-red-500 tracking-widest block font-bold">PHASE 02</span>
                  <h3 className="text-2xl font-display font-bold text-white">DAY 02</h3>
                </div>
                <span className="text-xs font-mono text-red-400 bg-red-950/60 px-2.5 py-1 rounded border border-red-600/60 font-bold flex items-center gap-1.5 animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-red-500" />
                  GAME DAY
                </span>
              </div>

              <p className="text-xs text-neutral-300 font-sans mb-6">
                The gates seal. All 4 suit games trigger in sequence. Performance directly controls your Visa count. Reach 0 Visa Points, and you face elimination.
              </p>

              {/* Day 2 Steps Flow in 2-column on wider screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {day2Flow.map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-2.5 p-2.5 bg-neutral-950/70 rounded border border-red-900/30 hover:border-red-600/50 transition-colors"
                  >
                    <span className="font-mono text-[11px] font-bold text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-800/40 shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <div className="font-heading font-semibold text-xs text-white uppercase tracking-wider">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-sans line-clamp-1">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-red-900/40 text-[11px] font-mono text-red-400/90 flex items-center justify-between">
              <span>STATUS: HIGH THREAT</span>
              <span>LIVE LEADERBOARD TRACKING</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
