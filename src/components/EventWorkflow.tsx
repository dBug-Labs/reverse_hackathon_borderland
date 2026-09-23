import React from 'react';

const DAY_1 = [
  { title: 'Welcome & opening ceremony', desc: 'The story of the Borderland and the two-day plan' },
  { title: 'What is reverse engineering?', desc: 'Talk + live demo on studying an unknown product' },
  { title: 'Thinking like a product manager', desc: 'From what the code does to why it was built' },
  { title: 'Hands-on practice round', desc: 'A safe trial run on a sample product' },
  { title: 'Wrap-up & Day 2 preview', desc: 'Rules, scoring, and a first look at the Games' },
];

const DAY_2 = [
  { title: 'Check-in & Visa issuance', desc: 'Each team starts with 3 Visa Points' },
  { title: 'Mission briefing', desc: 'Your mystery product, with no brief' },
  { title: '♠ The Sprint', desc: '75 min · speed and action' },
  { title: 'Difficulty Card', desc: 'Standard, or High Risk for 1.5× points' },
  { title: '♦ The Deduction', desc: '90 min · intelligence and logic' },
  { title: 'Twist Card', desc: 'A new rule revealed at lunch' },
  { title: '♣ The Trading Floor', desc: '75 min · teamwork' },
  { title: '♥ The Trial', desc: '60 min · psychology and trust' },
  { title: 'The Final Duel', desc: 'Top 2 teams, rapid-fire questions' },
  { title: 'Closing ceremony', desc: 'Winners crowned, prizes given out' },
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
            Two back-to-back days, 9 AM to 5 PM. Day 1 teaches you how to take a product apart. Day 2
            puts it to the test in four Games.
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
                Four Games, one for each suit. Every result moves your Visa Points and the live
                leaderboard.
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
