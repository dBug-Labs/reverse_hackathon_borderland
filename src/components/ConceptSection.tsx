import React from 'react';

const QUESTIONS = [
  {
    q: 'What problem does it actually solve?',
    a: 'Look past the UI and find the real value the product was built to deliver.',
  },
  {
    q: 'Who is it built for?',
    a: 'Work out the target user, their workflow, and the domain it lives in.',
  },
  {
    q: 'What is missing or broken?',
    a: 'Find the architectural bottlenecks, UX traps, edge cases, and outright bugs.',
  },
  {
    q: 'How would you make it better?',
    a: 'Put together a roadmap and defend it in front of the Game Masters.',
  },
];

export const ConceptSection: React.FC = () => {
  return (
    <section id="concept" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
            The idea
          </p>
          <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-[0.95] mt-3">
            Not a normal hackathon.
          </h2>
          <p className="mt-5 text-neutral-400 text-base sm:text-lg leading-relaxed">
            Most hackathons hand you a problem and ask for a prototype. Here you get a finished,
            working product — with no brief, no docs, and no idea why it exists. Your job is to
            reverse it.
          </p>
        </div>

        <ol className="lg:col-span-7 divide-y divide-neutral-800 border-y border-neutral-800">
          {QUESTIONS.map((item, i) => (
            <li key={item.q} className="flex gap-5 sm:gap-7 py-6">
              <span className="font-poster text-4xl sm:text-5xl leading-none text-[var(--card-red)] w-10 shrink-0">
                {i + 1}
              </span>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-neutral-100">{item.q}</h3>
                <p className="mt-1.5 text-neutral-400 leading-relaxed">{item.a}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
