import React from 'react';

// The four "Important Rules" from the official event brief.
const RULES = [
  {
    suit: '♠',
    red: false,
    title: 'Official platform only',
    desc: 'Teams must only use the official event platform and the product kits provided to them.',
  },
  {
    suit: '♥',
    red: true,
    title: 'Your own work',
    desc: 'Copying another team’s work or getting outside help is not allowed. (Talking to other teams is only part of the game during ♣ The Trading Floor.)',
  },
  {
    suit: '♦',
    red: true,
    title: 'Time means time',
    desc: 'When a round’s timer ends, submissions close automatically — no exceptions.',
  },
  {
    suit: '♣',
    red: false,
    title: 'Decisions are final',
    desc: 'All decisions made by the organising team or the Game Masters are final.',
  },
];

export const RulesSection: React.FC = () => {
  return (
    <section id="protocol" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
            Rules
          </p>
          <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
            Four rules. No exceptions.
          </h2>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-px bg-neutral-800 border border-neutral-800 rounded-2xl overflow-hidden">
          {RULES.map((rule) => (
            <div key={rule.title} className="bg-[#0b0b0d] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className={`text-2xl leading-none ${rule.red ? 'text-[var(--card-red)]' : 'text-neutral-200'}`}>
                  {rule.suit}
                </span>
                <h3 className="font-heading text-xl font-bold text-neutral-100">{rule.title}</h3>
              </div>
              <p className="mt-3 text-neutral-300 leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 font-caps uppercase tracking-[0.18em] text-sm text-neutral-400 text-center">
          Good luck, Players. The Borderland awaits your move.
        </p>
      </div>
    </section>
  );
};
