import React from 'react';
import { Terminal, Search, Target, MessageSquareCode } from 'lucide-react';
import { playHudHover } from '../utils/sound';

export const ArchetypesSection: React.FC = () => {
  const archetypes = [
    {
      role: 'THE ENGINEER',
      suit: '♠ SPADES DOMAIN',
      desc: 'Can inspect systems, code, and runtime behavior.',
      traits: [
        'Fluent with browser DevTools, API payloads, and state trees',
        'Capable of quickly reading unfamiliar codebases under time pressure',
        'Spots invisible technical flaws, latency bottlenecks, and broken hooks',
      ],
      icon: Terminal,
      color: 'text-neutral-100',
      borderHover: 'hover:border-neutral-500',
    },
    {
      role: 'THE DETECTIVE',
      suit: '♦ DIAMONDS DOMAIN',
      desc: 'Can connect scattered evidence and infer the underlying problem.',
      traits: [
        'Transforms isolated features into a cohesive mental model',
        'Deduces who the target customer was without reading a PRD',
        'Extracts the true value proposition masked beneath confusing UI',
      ],
      icon: Search,
      color: 'text-red-500',
      borderHover: 'hover:border-red-600',
    },
    {
      role: 'THE STRATEGIST',
      suit: '♣ CLUBS DOMAIN',
      desc: 'Can evaluate trade-offs and make decisions with incomplete information.',
      traits: [
        'Calculates the mathematical expected value of the High Risk card',
        'Navigates the Trading Floor to swap low-value clues for critical secrets',
        'Detects bluffs and counter-intelligence from rival Player Groups',
      ],
      icon: Target,
      color: 'text-neutral-100',
      borderHover: 'hover:border-neutral-500',
    },
    {
      role: 'THE COMMUNICATOR',
      suit: '♥ HEARTS DOMAIN',
      desc: 'Can defend an idea when the Game Masters push back.',
      traits: [
        'Maintains calm and composure under rapid-fire hostile interrogation',
        'Articulates complex architectural recommendations with conviction',
        'Rallies the spectators to secure vital crowd trust bonuses in The Trial',
      ],
      icon: MessageSquareCode,
      color: 'text-red-500',
      borderHover: 'hover:border-red-600',
    },
  ];

  return (
    <section className="py-20 bg-[#09090d] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            TEAM ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            ARE YOU READY TO ENTER?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl mx-auto">
            The strongest Player Groups aren't just four identical developers. They combine complementary archetypes to survive across all four suits.
          </p>
        </div>

        {/* 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {archetypes.map((arch) => {
            const Icon = arch.icon;
            return (
              <div
                key={arch.role}
                onMouseEnter={() => playHudHover()}
                className={`bg-[#0c0d12] border border-neutral-800 rounded-lg p-6 flex flex-col justify-between transition-all duration-300 ${arch.borderHover} hover:scale-[1.02]`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                      {arch.suit}
                    </span>
                    <Icon className={`w-4 h-4 ${arch.color}`} />
                  </div>

                  <h3 className="text-lg font-heading font-bold text-white mb-2">
                    {arch.role}
                  </h3>
                  <p className="text-xs text-neutral-300 font-sans mb-4">
                    {arch.desc}
                  </p>

                  <ul className="space-y-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-sans">
                    {arch.traits.map((trait, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-500 font-mono text-xs">•</span>
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-3 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 text-center uppercase tracking-widest">
                  IDEAL FOR PLAYER GROUP ASSEMBLY
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
