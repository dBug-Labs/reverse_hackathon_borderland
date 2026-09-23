import React from 'react';
import { Shield, Sparkles, Building2, Terminal, ExternalLink } from 'lucide-react';
import { playHudHover } from '../utils/sound';

export const PartnersSection: React.FC = () => {
  return (
    <section className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Organizers Block */}
        <div className="text-center mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            EVENT ARCHITECTS
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mb-2">
            GAME MASTERS & ORGANIZERS
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono">
            BROUGHT TO YOU BY dBug Labs × SRM IST
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-8">
            <div 
              onMouseEnter={() => playHudHover()}
              className="bg-[#0c0d12] border border-neutral-800 rounded-lg p-6 hud-corner text-left flex items-center gap-4 hover:border-red-900/60 transition-colors"
            >
              <div className="w-12 h-12 bg-red-950/60 border border-red-700/60 rounded flex items-center justify-center font-display font-black text-xl text-red-500 shrink-0">
                dB
              </div>
              <div>
                <div className="font-heading font-bold text-white text-base">
                  dBug Labs
                </div>
                <div className="text-xs text-neutral-400 font-sans">
                  Pioneering technical workshops, code forensics, and builder ecosystems.
                </div>
                <div className="text-[10px] font-mono text-red-400 mt-1 uppercase">
                  Lead Organizing Committee
                </div>
              </div>
            </div>

            <div 
              onMouseEnter={() => playHudHover()}
              className="bg-[#0c0d12] border border-neutral-800 rounded-lg p-6 hud-corner text-left flex items-center gap-4 hover:border-neutral-700 transition-colors"
            >
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-700 rounded flex items-center justify-center font-display font-black text-xl text-neutral-200 shrink-0">
                SRM
              </div>
              <div>
                <div className="font-heading font-bold text-white text-base">
                  SRM Institute of Science and Technology
                </div>
                <div className="text-xs text-neutral-400 font-sans">
                  Host campus & technological incubator for the next generation of engineers.
                </div>
                <div className="text-[10px] font-mono text-neutral-500 mt-1 uppercase">
                  Main Campus Venue Partner
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsor Tier Infrastructure */}
        <div className="pt-12 border-t border-neutral-900">
          <div className="text-center mb-8">
            <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">
              ALLIANCE PROTOCOLS
            </span>
            <h3 className="text-lg font-heading font-bold text-neutral-300 mt-1">
              SUPPORTED BY INDUSTRY PARTNERS
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto font-mono text-xs text-center">
            
            <div className="p-4 bg-neutral-900/30 border border-neutral-800/80 rounded flex flex-col justify-center items-center">
              <span className="text-[10px] text-red-500 font-bold mb-1">TITLE PARTNER</span>
              <span className="text-neutral-400 text-sm font-semibold tracking-wider">
                [ CLEARANCE PENDING ]
              </span>
            </div>

            <div className="p-4 bg-neutral-900/30 border border-neutral-800/80 rounded flex flex-col justify-center items-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-1">POWERED BY</span>
              <span className="text-neutral-400 text-sm font-semibold tracking-wider">
                [ CLEARANCE PENDING ]
              </span>
            </div>

            <div className="p-4 bg-neutral-900/30 border border-neutral-800/80 rounded flex flex-col justify-center items-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-1">TECHNOLOGY PARTNER</span>
              <span className="text-neutral-400 text-sm font-semibold tracking-wider">
                [ CLEARANCE PENDING ]
              </span>
            </div>

            <div className="p-4 bg-neutral-900/30 border border-neutral-800/80 rounded flex flex-col justify-center items-center">
              <span className="text-[10px] text-neutral-400 font-bold mb-1">COMMUNITY PARTNER</span>
              <span className="text-neutral-400 text-sm font-semibold tracking-wider">
                [ CLEARANCE PENDING ]
              </span>
            </div>

          </div>

          <div className="text-center mt-6">
            <span className="text-[11px] font-mono text-neutral-500">
              Interested in partnering or mentoring as a Game Master? Contact <span className="text-neutral-300">partners@dbuglabs.org</span>
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
