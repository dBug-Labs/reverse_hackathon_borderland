import React from 'react';
import { ArrowRight, Search, ShieldAlert, Cpu, Eye, Lightbulb, Users } from 'lucide-react';
import { playHudHover } from '../utils/sound';

export const ConceptSection: React.FC = () => {
  return (
    <section id="concept" className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block text-xs font-mono tracking-widest text-red-500 uppercase px-3 py-1 bg-red-950/20 border border-red-900/40 rounded mb-3">
            Core Philosophy
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            THIS IS NOT A NORMAL HACKATHON.
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 font-sans leading-relaxed">
            Most hackathons give you a problem and ask you to rush a prototype. In the Borderland,
            you are handed a finished product—without being told why it was created.
          </p>
        </div>

        {/* Visual Paradigm Comparison: Normal vs Reverse */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* Normal Hackathon Card */}
          <div className="bg-[#0c0c11] border border-neutral-800/80 rounded-lg p-6 sm:p-8 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-6">
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                  CONVENTIONAL PROTOCOL
                </span>
                <span className="text-xs font-mono text-neutral-600">Standard Hackathon</span>
              </div>
              <h3 className="text-xl font-heading font-bold text-neutral-300 mb-2">
                The Speed Race
              </h3>
              <p className="text-xs text-neutral-400 mb-8 font-sans">
                Teams receive an artificial prompt, stay up all night churning out boilerplate, and pitch half-baked features to a passive panel.
              </p>
            </div>

            {/* Sequence flow */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">
                  <span className="block text-[10px] text-neutral-500 mb-1">01</span>
                  PROBLEM
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">
                  <span className="block text-[10px] text-neutral-500 mb-1">02</span>
                  BUILD
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">
                  <span className="block text-[10px] text-neutral-500 mb-1">03</span>
                  SOLUTION
                </div>
              </div>
              <div className="text-center font-mono text-xs text-neutral-500 italic">
                Outcome: Whoever hacks the fastest takes the prize.
              </div>
            </div>
          </div>

          {/* Reverse Hackathon Card (Borderland Mode) */}
          <div 
            onMouseEnter={() => playHudHover()}
            className="bg-gradient-to-b from-[#160d0e] to-[#0d090a] border-2 border-red-600/70 rounded-lg p-6 sm:p-8 relative glow-red-box flex flex-col justify-between"
          >
            <div className="absolute -top-3 -right-3 bg-red-600 text-white font-mono text-[10px] uppercase font-bold px-3 py-0.5 rounded shadow">
              THE BORDERLAND WAY
            </div>

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-red-900/40 mb-6">
                <span className="font-mono text-xs uppercase tracking-widest text-red-400 font-bold">
                  REVERSE HACKATHON
                </span>
                <span className="text-xs font-mono text-red-500/80">Understanding Over Speed</span>
              </div>
              <h3 className="text-xl font-heading font-bold text-white mb-2">
                Deep Cognitive Dissection
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 mb-8 font-sans leading-relaxed">
                You receive a working mystery product with zero documentation. You must inspect the code, analyze network calls, deduce the founder's intentions, find what is broken, and defend your conclusions.
              </p>
            </div>

            {/* Sequence flow */}
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="p-2 sm:p-3 bg-red-950/40 border border-red-700/50 rounded text-white font-bold">
                  <span className="block text-[10px] text-red-400 mb-1">01</span>
                  PRODUCT
                </div>
                <div className="p-2 sm:p-3 bg-red-950/40 border border-red-700/50 rounded text-white font-bold">
                  <span className="block text-[10px] text-red-400 mb-1">02</span>
                  INVESTIGATE
                </div>
                <div className="p-2 sm:p-3 bg-red-950/40 border border-red-700/50 rounded text-white font-bold">
                  <span className="block text-[10px] text-red-400 mb-1">03</span>
                  DEDUCE
                </div>
                <div className="p-2 sm:p-3 bg-red-950/40 border border-red-700/50 rounded text-white font-bold">
                  <span className="block text-[10px] text-red-400 mb-1">04</span>
                  DEFEND
                </div>
              </div>
              <div className="text-center font-mono text-xs text-red-300 font-medium">
                Outcome: Whoever understands the deepest survives.
              </div>
            </div>
          </div>

        </div>

        {/* The 4 Mystery Inquiries */}
        <div className="bg-[#0b0b10] border border-neutral-800 rounded-lg p-6 sm:p-8">
          <div className="text-xs font-mono text-neutral-500 uppercase tracking-widest mb-4">
            THE FOUR CORE INQUIRIES
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded hover:border-red-900 transition-colors">
              <div className="text-red-500 font-mono text-xs mb-2">QUERY 01</div>
              <div className="font-heading font-semibold text-neutral-100 text-sm mb-1">
                What problem does this actually solve?
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Look past flashy UI components and extract the root value proposition.
              </p>
            </div>

            <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded hover:border-red-900 transition-colors">
              <div className="text-red-500 font-mono text-xs mb-2">QUERY 02</div>
              <div className="font-heading font-semibold text-neutral-100 text-sm mb-1">
                Who is it truly engineered for?
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Identify the target persona, user workflows, and hidden domain contexts.
              </p>
            </div>

            <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded hover:border-red-900 transition-colors">
              <div className="text-red-500 font-mono text-xs mb-2">QUERY 03</div>
              <div className="font-heading font-semibold text-neutral-100 text-sm mb-1">
                What is missing or broken in it?
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Uncover architectural bottlenecks, UX traps, edge cases, and fatal bugs.
              </p>
            </div>

            <div className="p-4 bg-neutral-900/60 border border-neutral-800/80 rounded hover:border-red-900 transition-colors">
              <div className="text-red-500 font-mono text-xs mb-2">QUERY 04</div>
              <div className="font-heading font-semibold text-neutral-100 text-sm mb-1">
                How could it be made better?
              </div>
              <p className="text-neutral-400 text-xs font-sans">
                Formulate a rigorous strategic roadmap and defend it before the Game Masters.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
