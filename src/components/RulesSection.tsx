import React from 'react';
import { ShieldCheck, UserX, Clock, Scale } from 'lucide-react';
import { playHudHover } from '../utils/sound';

export const RulesSection: React.FC = () => {
  const protocols = [
    {
      num: '01',
      title: 'OFFICIAL TOOLS ONLY',
      desc: 'Player Groups must operate strictly within the provided event infrastructure and assigned product packages. Siphoning external pre-built analyzers or unauthorized remote proxies will trigger immediate disqualification.',
      icon: ShieldCheck,
      detail: 'Standard browser tools and offline reverse-engineering software are permitted.',
    },
    {
      num: '02',
      title: 'NO OUTSIDE HELP',
      desc: 'Collaboration is restricted exclusively to your registered Player Group members, except during the sanctioned Game 3 (♣ Clubs) Trading Floor. Consulting external mentors or non-players is considered treason.',
      icon: UserX,
      detail: 'Copying code or insights from rival tables outside the Trading Floor results in zero score.',
    },
    {
      num: '03',
      title: 'TIME MEANS TIME',
      desc: 'When the arena clock zeroes out, the Borderland automated submission gates seal instantaneously. No extensions, grace periods, or second chances exist in this arena.',
      icon: Clock,
      detail: 'Unsubmitted reports at cutoff receive a score of zero for that Game.',
    },
    {
      num: '04',
      title: 'GAME MASTER DECISION IS FINAL',
      desc: 'All evaluations, point allocations, Visa adjustments, and tribunal rulings rendered by the Game Masters and dBug Labs organizing committee are absolute and binding.',
      icon: Scale,
      detail: 'Respect the tribunal. Defend your thesis with intellect, not contention.',
    },
  ];

  return (
    <section id="protocol" className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            GOVERNING LAW
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            BORDERLAND PROTOCOL
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-xl mx-auto">
            These four non-negotiable protocols govern every Player and every Game. Ignorance of the protocol is not an excuse.
          </p>
        </div>

        {/* 4 Protocol Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {protocols.map((proto) => {
            const Icon = proto.icon;
            return (
              <div
                key={proto.num}
                onMouseEnter={() => playHudHover()}
                className="bg-[#0b0c11] border border-neutral-800 rounded-lg p-6 sm:p-8 hud-corner hover:border-red-900/60 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
                    <span className="font-mono text-xs text-red-500 font-bold tracking-widest">
                      PROTOCOL {proto.num}
                    </span>
                    <Icon className="w-5 h-5 text-neutral-400" />
                  </div>

                  <h3 className="text-lg font-heading font-bold text-white mb-2">
                    {proto.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed mb-4">
                    {proto.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 font-mono text-[11px] text-neutral-500">
                  <span className="text-red-400/80 font-semibold mr-1">ENFORCEMENT:</span>
                  <span>{proto.detail}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
