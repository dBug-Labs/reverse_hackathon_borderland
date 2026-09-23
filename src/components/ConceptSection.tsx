import React from 'react';

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

        {/* The 4 Core Inquiries */}
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
