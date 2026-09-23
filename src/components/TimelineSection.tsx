import React, { useState } from 'react';
import { playHudClick } from '../utils/sound';

export const TimelineSection: React.FC = () => {
  const [activeDay, setActiveDay] = useState<'day1' | 'day2'>('day1');

  // Source: "Borderland Protocol" event brief (official schedule)
  const day1Schedule = [
    {
      time: '9:00 – 10:00 AM',
      title: 'Welcome & Opening Ceremony',
      duration: '60 min',
      desc: 'Lights dim and Borderland-style music plays. The host tells the story of the Borderland, welcomes everyone as a "Player", and explains the two-day plan.',
    },
    {
      time: '10:00 AM – 12:30 PM',
      title: 'Session 1 — What Is Reverse Engineering?',
      duration: '150 min · Talk + live demo',
      desc: 'How to study a product from the outside (what it does) and the inside (how it’s built), read code you have never seen, and use browser dev tools, API testers and debuggers — ending with a full live teardown of a sample product.',
    },
    {
      time: '12:30 – 1:30 PM',
      title: 'Lunch Break',
      duration: '60 min',
      desc: 'Lunch.',
    },
    {
      time: '1:30 – 3:30 PM',
      title: 'Session 2 — Thinking Like a Product Manager',
      duration: '120 min · Interactive workshop',
      desc: 'Going from "what the code does" to "why it was built": who a product is really for, how each feature maps to a real problem, and spotting what is missing or broken. Think like a founder, not just a coder.',
    },
    {
      time: '3:30 – 3:45 PM',
      title: 'Short Break',
      duration: '15 min',
      desc: 'A short break before the practice round.',
    },
    {
      time: '3:45 – 4:45 PM',
      title: 'Hands-On Practice Round',
      duration: '60 min',
      desc: 'Teams get a sample product and practise everything from Sessions 1 and 2 on it — its purpose, its users and its flaws. A safe trial run to make your early mistakes before Day 2.',
    },
    {
      time: '4:45 – 5:00 PM',
      title: 'Day 1 Wrap-Up & Day 2 Preview',
      duration: '15 min',
      desc: 'A quick recap, then the rules, scoring and leaderboard for Day 2 — and a first look at the four Games.',
    },
  ];

  const day2Schedule = [
    {
      time: '9:00 – 9:30 AM',
      title: 'Check-In & Visa Issuance',
      badge: 'Start with 3 Visa Points',
      desc: 'Every team checks in and receives a Player Visa — the scorecard used all day. Each team starts with 3 Visa Points; they go up when you do well in a Game and down when you don’t.',
      suit: null,
    },
    {
      time: '9:30 – 10:00 AM',
      title: 'Mission Briefing',
      badge: 'Mystery product handed out',
      desc: 'How the day works and how Visa Points are earned. The four suits are introduced, and each team receives its mystery product — without being told what problem it solves.',
      suit: null,
    },
    {
      time: '10:00 – 11:15 AM',
      title: 'Game 1 — Spades: The Sprint',
      badge: '75 min · Speed and action',
      desc: 'A race against the clock: explore the product as fast as you can, click through every screen, test every button and write down everything you notice.',
      suit: '♠',
    },
    {
      time: '11:15 – 11:30 AM',
      title: 'Break + Difficulty Card',
      badge: 'Standard or High Risk',
      desc: 'Each team picks a Difficulty Card for Game 2. Standard is more guided and worth normal points. High Risk is tougher and worth 1.5× — but a wrong final answer loses points.',
      suit: null,
    },
    {
      time: '11:30 AM – 1:00 PM',
      title: 'Game 2 — Diamonds: The Deduction',
      badge: '90 min · Intelligence and logic',
      desc: 'The heart of the event. Dig into the product’s design, code and flow and submit a short written report: what problem it solves, who it’s for, and what’s missing or broken. 100 points.',
      suit: '♦',
    },
    {
      time: '1:00 – 2:00 PM',
      title: 'Lunch Break + Twist Card',
      badge: 'Leaderboard on screen',
      desc: 'The leaderboard is shown while teams eat. Just before lunch ends, the Game Masters reveal a Twist Card — a new rule or piece of information that changes the rest of the day.',
      suit: null,
    },
    {
      time: '2:00 – 3:15 PM',
      title: 'Game 3 — Clubs: The Trading Floor',
      badge: '75 min · Teamwork',
      desc: 'Teams can leave their tables and talk to other teams. Everyone holds one insight the others don’t. Trade information, form short alliances, or keep your findings to yourself.',
      suit: '♣',
    },
    {
      time: '3:15 – 3:30 PM',
      title: 'Break',
      badge: '15 min',
      desc: 'A short break before the final Game.',
      suit: null,
    },
    {
      time: '3:30 – 4:30 PM',
      title: 'Game 4 — Hearts: The Trial',
      badge: '60 min · Psychology and trust',
      desc: 'Present your findings — the problem, the user and your proposed improvement — to a panel of Game Masters, then defend them under direct questioning while the other Players watch and react.',
      suit: '♥',
    },
    {
      time: '4:30 – 4:45 PM',
      title: 'The Final Duel',
      badge: 'Top 2 teams',
      desc: 'The two teams with the most Visa Points face off in a rapid-fire round of questions about their product. The faster, sharper team wins the title of Final Survivor.',
      suit: null,
    },
    {
      time: '4:45 – 5:00 PM',
      title: 'Closing Ceremony — Borderland Survivors',
      badge: 'Winners announced',
      desc: 'The final leaderboard is locked, winners are announced and prizes are given out. The top team is crowned the "Ultimate Survivors" of the Borderland — then a group photo.',
      suit: null,
    },
  ];

  const schedule = activeDay === 'day1' ? day1Schedule : day2Schedule;

  return (
    <section id="timeline" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">
              Schedule
            </p>
            <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
              Hour by hour
            </h2>
          </div>

          <div role="tablist" aria-label="Choose a day" className="inline-flex p-1 rounded-lg bg-neutral-900 border border-neutral-800 self-start sm:self-auto">
            {(
              [
                ['day1', 'Day 1 · 5 Oct'],
                ['day2', 'Day 2 · 6 Oct'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeDay === key}
                onClick={() => {
                  playHudClick();
                  setActiveDay(key);
                }}
                className={`px-4 py-2 rounded-md text-sm font-label font-semibold transition-colors ${
                  activeDay === key ? 'bg-[var(--paper)] text-[var(--ink)]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-neutral-400">
          {activeDay === 'day1'
            ? 'Training day — no scores, no pressure. 9 AM to 5 PM.'
            : 'Game day — all four suit games, then the final duel. 9 AM to 5 PM.'}
        </p>

        <ol className="mt-8 border-t border-neutral-800">
          {schedule.map((item, idx) => (
            <li key={idx} className="grid sm:grid-cols-[11rem_1fr] gap-x-8 gap-y-1 py-6 border-b border-neutral-800">
              <div className="font-label">
                <div className="text-neutral-100 font-bold tabular-nums">{item.time}</div>
                <div className="text-sm text-neutral-500">
                  {'duration' in item && item.duration ? item.duration : item.badge}
                </div>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-neutral-100 flex items-center gap-2">
                  {'suit' in item && item.suit && (
                    <span className={item.suit === '♦' || item.suit === '♥' ? 'text-[var(--card-red)]' : 'text-neutral-300'}>
                      {item.suit}
                    </span>
                  )}
                  {item.title}
                </h3>
                <p className="mt-1.5 text-neutral-400 leading-relaxed">{item.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
