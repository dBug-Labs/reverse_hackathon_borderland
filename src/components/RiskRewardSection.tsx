import React, { useState } from 'react';
import { ShieldCheck, Flame, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import { playHudClick, playRiskAlarm } from '../utils/sound';

export const RiskRewardSection: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<'standard' | 'high_risk'>('high_risk');

  return (
    <section className="py-20 bg-[#09090d] relative border-t border-neutral-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            THE STRATEGIC FORK
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            CHOOSE YOUR FATE
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl mx-auto">
            At 11:15 AM on Day 2, right before Game 2 (♦ Diamonds), your Player Group must elect your Difficulty Card. Will you protect your initial Visa, or gamble for ultimate supremacy?
          </p>
        </div>

        {/* The Two Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          {/* Card 1: STANDARD */}
          <div
            onClick={() => {
              playHudClick();
              setSelectedTier('standard');
            }}
            className={`cursor-pointer rounded-xl p-6 sm:p-8 transition-all duration-300 relative border-2 ${
              selectedTier === 'standard'
                ? 'bg-[#0f1118] border-neutral-400 shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-[1.02]'
                : 'bg-[#0b0c10] border-neutral-800 opacity-70 hover:opacity-100'
            }`}
          >
            {selectedTier === 'standard' && (
              <div className="absolute -top-3 left-6 bg-neutral-200 text-neutral-900 font-mono text-[10px] uppercase font-bold px-3 py-0.5 rounded shadow">
                CURRENT SELECTION
              </div>
            )}

            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-6">
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
                PROTOCOL A
              </span>
              <ShieldCheck className="w-5 h-5 text-neutral-400" />
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-1">
              STANDARD
            </h3>
            <div className="text-sm font-mono text-neutral-400 mb-6 font-semibold">
              1.0× NORMAL POINTS
            </div>

            <ul className="space-y-3 font-sans text-xs text-neutral-300 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-neutral-500 font-mono">•</span>
                <span>Includes guided hint prompts and structured forensic scaffolding.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-500 font-mono">•</span>
                <span>Protected downside: Inaccurate conclusions receive 0 points, but no Visa deduction.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-neutral-500 font-mono">•</span>
                <span>Ideal for conservative teams looking to secure steady points.</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-neutral-800/80 font-mono text-xs text-neutral-500 flex justify-between">
              <span>RISK RATING: LOW</span>
              <span>REWARD CEILING: 100 PTS</span>
            </div>
          </div>

          {/* Card 2: HIGH RISK */}
          <div
            onClick={() => {
              playRiskAlarm();
              setSelectedTier('high_risk');
            }}
            className={`cursor-pointer rounded-xl p-6 sm:p-8 transition-all duration-300 relative border-2 ${
              selectedTier === 'high_risk'
                ? 'bg-gradient-to-b from-[#1c0d10] via-[#120a0c] to-[#0a080a] border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)] scale-[1.02] glow-red-box'
                : 'bg-[#0e090b] border-red-950/80 opacity-70 hover:opacity-100 hover:border-red-800'
            }`}
          >
            {selectedTier === 'high_risk' && (
              <div className="absolute -top-3 left-6 bg-red-600 text-white font-mono text-[10px] uppercase font-bold px-3 py-0.5 rounded shadow flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>CHOSEN DESTINY</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-4 border-b border-red-900/60 mb-6">
              <span className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold">
                PROTOCOL B
              </span>
              <Flame className="w-5 h-5 text-red-500 animate-pulse" />
            </div>

            <h3 className="text-2xl font-display font-bold text-white mb-1">
              HIGH RISK
            </h3>
            <div className="text-sm font-mono text-red-400 mb-6 font-bold flex items-center gap-2">
              <span>1.5× ACCELERATED POINTS</span>
              <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800">
                HIGH THREAT
              </span>
            </div>

            <ul className="space-y-3 font-sans text-xs text-neutral-200 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-mono">•</span>
                <span>Zero hints. Teams receive raw uncompiled code & telemetry files only.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-mono">•</span>
                <span>150 max points awarded if your architectural thesis is accepted.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-mono">•</span>
                <span className="text-red-300 font-semibold">
                  Catastrophic penalty: If your final thesis is wrong, your team loses Visa Points!
                </span>
              </li>
            </ul>

            <div className="pt-4 border-t border-red-900/60 font-mono text-xs text-red-400 flex justify-between">
              <span>RISK RATING: CRITICAL</span>
              <span>REWARD CEILING: 150 PTS</span>
            </div>
          </div>

        </div>

        {/* Mathematical Impact Comparison */}
        <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-xs">
          <div className="text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            <span>PROJECTED OUTCOME FOR {selectedTier === 'standard' ? 'STANDARD PROTOCOL' : 'HIGH RISK PROTOCOL'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-neutral-300">
            <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[11px] mb-1">SUCCESSFUL DEDUCTION</span>
              <span className="text-emerald-400 font-bold text-sm">
                {selectedTier === 'standard' ? '+100 Points / +1 Visa' : '+150 Points / +2 Visa'}
              </span>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[11px] mb-1">PARTIAL ACCURACY</span>
              <span className="text-amber-400 font-bold text-sm">
                {selectedTier === 'standard' ? '+50 Points / +0 Visa' : '+75 Points / +0 Visa'}
              </span>
            </div>

            <div className="p-3 bg-neutral-900/60 rounded border border-neutral-800">
              <span className="text-neutral-500 block text-[11px] mb-1">REJECTED / FAILED ANSWER</span>
              <span className="text-red-400 font-bold text-sm">
                {selectedTier === 'standard' ? '0 Points / 0 Visa' : '-50 Points / -2 Visa'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
