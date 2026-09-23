import React from 'react';

const RULES = [
  {
    suit: '♠',
    red: false,
    title: 'Official tools only',
    desc: 'Work only with the event setup and the product package you are given. Pre-built external analysers or remote proxies mean disqualification.',
    note: 'Standard browser tools and offline reverse-engineering software are allowed.',
  },
  {
    suit: '♥',
    red: true,
    title: 'No outside help',
    desc: 'Work only with your registered teammates — except during Game 3 (♣ The Trading Floor). No outside mentors or non-players.',
    note: 'Copying code or findings from another team outside the Trading Floor scores zero.',
  },
  {
    suit: '♦',
    red: true,
    title: 'Time means time',
    desc: 'When the clock hits zero, submissions close. No extensions, no grace period.',
    note: 'Anything not submitted by the cutoff scores zero for that game.',
  },
  {
    suit: '♣',
    red: false,
    title: 'The Game Masters decide',
    desc: 'All scores, Visa Point changes and rulings by the Game Masters and the dBug Labs team are final.',
    note: 'Argue your case with evidence, not by arguing with the judges.',
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
              <p className="mt-3 text-sm text-neutral-500 leading-relaxed">{rule.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
