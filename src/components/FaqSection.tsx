import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { playHudClick } from '../utils/sound';
import { CONTACTS, CONTACT_EMAIL } from './contacts';
import { ENTRY_FEE } from '@/lib/fee';

interface FaqItem {
  q: string;
  a: string;
}

// Answers follow the official "Borderland Protocol" event brief.
const FAQS: FaqItem[] = [
  {
    q: 'What is a Reverse Hackathon?',
    a: 'Most hackathons give you a problem and ask you to build a solution. Here it works the other way around: each team gets a finished product, but no one tells you what problem it was built to solve. You study it and work out what it does, who it’s for, what’s missing or broken, and how it could be better. It rewards whoever understands the deepest, not whoever builds the fastest.',
  },
  {
    q: 'Do we have to build something from scratch?',
    a: 'No. You investigate an existing product — thinking like both a product manager and an engineer. That means real research: reading code you’ve never seen, tracing how the parts connect, and working out why it was built.',
  },
  {
    q: 'What happens on Day 1?',
    a: 'Day 1 is training, with no competition. Two sessions — “What Is Reverse Engineering?” and “Thinking Like a Product Manager” — then a hands-on practice round on a sample product, and a preview of Day 2’s rules, scoring and Games.',
  },
  {
    q: 'What do we get on Day 2?',
    a: 'At check-in (9:00 AM) every team receives a Player Visa — the scorecard used all day — with 3 Visa Points. At the Mission Briefing (9:30 AM) each team gets its mystery product. What problem it solves is not revealed.',
  },
  {
    q: 'What are Visa Points?',
    a: 'Every team starts Day 2 with 3 Visa Points. They go up when your team does well in a Game and down when it doesn’t. A live leaderboard tracks every team’s Visa Points all day.',
  },
  {
    q: 'How does scoring and the leaderboard work?',
    a: 'Each of the four Games is scored separately — ♠ Spades (speed and action), ♦ Diamonds (intelligence and logic), ♣ Clubs (teamwork) and ♥ Hearts (psychology and trust). The live leaderboard shows Rank, Team, each suit’s score, Visa Points and Total, and updates after every Game.',
  },
  {
    q: 'What is the High Risk Difficulty Card?',
    a: 'After Game 1 each team picks a card for Game 2. Standard is a more guided version worth normal points. High Risk is tougher and less guided, worth 1.5× the points — but if your final answer is wrong, you lose points instead.',
  },
  {
    q: 'What is the Twist Card?',
    a: 'Just before lunch ends on Day 2, the Game Masters reveal one new rule or piece of information that changes how teams should approach the rest of the day. It rewards teams who adapt quickly.',
  },
  {
    q: 'What happens in The Trial and the Final Duel?',
    a: 'In The Trial (♥ Hearts) each team presents the problem, the user and its proposed improvement to the Game Masters, then defends it under direct questioning. The other Players watch and react live, which adds a small bonus. After that, the two teams with the most Visa Points face off in the Final Duel — a rapid-fire round of questions about their product.',
  },
  {
    q: 'Who are the Game Masters?',
    a: 'The Game Masters are the judges. They run and score the Games and question teams during The Trial. All decisions by the organising team and Game Masters are final.',
  },
  {
    q: 'Who can register, and how big is a team?',
    a: `Teams have 2 to 4 members, and every member must be a current SRM student with an SRM email (@srmist.edu.in) and register number. Any department or year can join. Entry is ₹${ENTRY_FEE} per team, paid by UPI when you register.`,
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    playHudClick();
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-24 bg-[#08080a] border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <p className="font-caps text-xs sm:text-sm uppercase tracking-[0.3em] text-[var(--card-red)]">FAQ</p>
          <h2 className="font-poster uppercase text-5xl sm:text-6xl text-[#f5eee1] leading-none mt-3">
            Before you play
          </h2>
          <p className="mt-4 text-neutral-400 leading-relaxed">Still unsure? Talk to us.</p>

          <ul className="mt-5 space-y-4">
            {CONTACTS.map((c) => (
              <li key={c.phone}>
                <div className="font-heading font-bold text-neutral-100">{c.name}</div>
                <div className="text-sm text-neutral-500">{c.role}</div>
                <a href={`tel:+91${c.phone}`} className="text-neutral-300 hover:text-white tabular-nums">
                  +91 {c.phone.slice(0, 5)} {c.phone.slice(5)}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-neutral-300 underline underline-offset-4 hover:text-white"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-8 border-t border-neutral-800">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.q} className="border-b border-neutral-800">
                <button
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full py-5 text-left flex items-start justify-between gap-6 font-heading font-bold text-base sm:text-lg text-neutral-100 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 mt-0.5 text-neutral-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && <p className="pb-6 -mt-1 pr-10 text-neutral-400 leading-relaxed">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
