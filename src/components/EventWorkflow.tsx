import React from 'react';

const DAY_1 = [
  { title: 'Welcome', desc: 'Opening ceremony and how the two days work' },
  { title: 'Reverse engineering', desc: 'Inspection techniques and a DevTools demo' },
  { title: 'Product thinking', desc: 'Thinking like a founder, not just a coder' },
  { title: 'Practice round', desc: 'A no-stakes trial on a sample product' },
  { title: 'Day 2 briefing', desc: 'Visa rules and the game reveal' },
];

const DAY_2 = [
  { title: 'Check-in', desc: 'Each team starts with 3 Visa Points' },
  { title: 'Mystery product', desc: 'The sealed product is unveiled, no brief' },
  { title: '♠ The Sprint', desc: '75 min rapid observation race' },
  { title: 'Difficulty choice', desc: 'Standard or High Risk (1.5× points)' },
  { title: '♦ The Deduction', desc: '90 min deep dive into the architecture' },
  { title: 'Twist card', desc: 'A mid-game curveball, revealed at lunch' },
  { title: '♣ The Trading Floor', desc: '75 min of alliances and trading intel' },
  { title: '♥ The Trial', desc: '60 min defence before the Game Masters' },
  { title: 'The final duel', desc: 'Top 2 teams, head-to-head rapid fire' },
  { title: 'Survivors', desc: 'Winners crowned and prizes awarded' },
];

const suitRed = (title: string) => title.startsWith('♦') || title.startsWith('♥');

export const EventWorkflow: React.FC = () => {
  return (
    <section id="workflow" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
            Format
          </p>
          <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
            How the two days work
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg leading-relaxed">
            Day 1 is training with nothing at stake. Day 2 is the game: four rounds, one mystery
            product, and every decision moves your Visa Points.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-12 gap-6 items-start">
          {/* Day 1 */}
          <div className="lg:col-span-5 rounded-2xl border border-neutral-800 bg-[#0e0e11] p-6 sm:p-8">
            <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Day 1 · 5 Oct</p>
            <h3 className="font-poster uppercase text-3xl text-neutral-100 mt-1">Training day</h3>
            <p className="mt-3 text-neutral-400 leading-relaxed">
              No competition. Learn how to take a product apart, think about who it&apos;s for, and
              get your team working together.
            </p>
            <ol className="mt-6 space-y-4">
              {DAY_1.map((item, i) => (
                <li key={item.title} className="flex gap-4">
                  <span className="font-label text-sm font-bold text-neutral-500 w-5 shrink-0 pt-0.5">{i + 1}</span>
                  <div>
                    <div className="font-heading font-bold text-neutral-100">{item.title}</div>
                    <div className="text-sm text-neutral-400">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Day 2 — the poster card */}
          <div className="lg:col-span-7 paper-card rounded-2xl p-2.5">
            <div className="rounded-xl border border-[var(--card-red)]/45 p-6 sm:p-8">
              <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                Day 2 · 6 Oct
              </p>
              <h3 className="font-poster uppercase text-3xl mt-1">Game day</h3>
              <p className="mt-3 text-[var(--ink)]/75 leading-relaxed">
                The four suit games run back to back. Your score decides your Visa Points — hit zero
                and you&apos;re out.
              </p>
              <ol className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {DAY_2.map((item, i) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="font-label text-sm font-bold text-[var(--ink)]/45 w-5 shrink-0 pt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <div
                        className={`font-heading font-bold ${suitRed(item.title) ? 'text-[var(--card-red)]' : 'text-[var(--ink)]'}`}
                      >
                        {item.title}
                      </div>
                      <div className="text-sm text-[var(--ink)]/65">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
