import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { playHudClick } from '../utils/sound';

interface FaqItem {
  q: string;
  a: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      q: 'What is a Reverse Hackathon?',
      a: 'Conventional hackathons give you a problem prompt and ask you to write code as fast as possible. A Reverse Hackathon flips the paradigm: every team is given an already built, finished mystery product without any documentation or prompt. Your mission is to reverse-engineer it, deduce what problem it actually solves, identify its intended users, uncover its flaws, and propose a strategic overhaul.',
    },
    {
      q: 'Do we build a new product or write code from scratch?',
      a: 'No. You are not building an app from zero. You are investigating and diagnosing an existing product. However, you will inspect its code, dissect its API responses, analyze client-side state, and craft forensic reports and improvement proofs.',
    },
    {
      q: 'What do we receive on Day 2?',
      a: 'At 09:30 AM during Mission Briefing, every Player Group receives their official Player Visa scorecard (with 3 initial Visa Points) and an encrypted mystery product access kit. What problem the product solves is deliberately withheld.',
    },
    {
      q: 'What is a "mystery product"?',
      a: 'It could be a full-stack web application, an internal enterprise tool, a specialized algorithmic service, or a consumer mobile app bundle created by the organizers. It functions, but its purpose and audience must be deduced through investigative inquiry.',
    },
    {
      q: 'How does scoring and the Leaderboard work?',
      a: 'Every suit game tests a different dimension (♠ Spades: Speed & Action, ♦ Diamonds: Intelligence & Logic, ♣ Clubs: Teamwork & Trading, ♥ Hearts: Psychology & Defense). Scores are fed into the live arena display after each game, and cumulative Visa Points determine survival and final rankings.',
    },
    {
      q: 'What are Visa Points?',
      a: 'In homage to Alice in Borderland, every team begins Day 2 with 3 Visa Points. High performance in games or strategic risks grant additional Visa Points. Severe rule violations, caught trading lies, or failed high-risk bets deduct Visa. If your Visa reaches zero, you risk elimination from the arena.',
    },
    {
      q: 'What is the High Risk difficulty card?',
      a: 'At 11:15 AM before Game 2, your team chooses either Standard or High Risk. Standard provides guided hints and awards normal points (up to 100). High Risk gives zero hints and awards 1.5× points (up to 150), but if your final forensic deduction is fundamentally wrong, you lose points and Visa balance!',
    },
    {
      q: 'What happens during The Trading Floor (♣ Clubs)?',
      a: 'During Game 3, teams are permitted to leave their workstations and interact with rival Player Groups. Each team is given one proprietary piece of insight the others lack. You can negotiate trades, form temporary pacts, or hoard information. But beware: trading fraudulent intel carries severe Visa penalties.',
    },
    {
      q: 'What happens during The Trial (♥ Hearts) and Final Duel?',
      a: 'In Game 4 (The Trial), your team presents its definitive product diagnosis and improvement proposal directly to the Game Masters tribunal, who cross-examine you under intense scrutiny while the spectator crowd reacts. The top two teams with the highest cumulative Visa Points then face off in The Final Duel—a rapid-fire sudden death round.',
    },
    {
      q: 'Who are the Game Masters?',
      a: 'The Game Masters are experienced industry product leads, software architects, security engineers, and organizers from dBug Labs and SRM IST who evaluate your investigative depth, technical veracity, and poise under interrogation.',
    },
    {
      q: 'What is the team size and who is eligible to register?',
      a: 'Teams have 2 to 4 members, and every member must be a current SRM student with an SRM email (@srmist.edu.in) and register number. Any department or year can join. Entry is ₹199 per team, paid by UPI when you register.',
    },
  ];

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
          <p className="mt-4 text-neutral-400 leading-relaxed">
            Still unsure? Mail{' '}
            <a href="mailto:borderland@dbuglabs.org" className="text-neutral-200 underline underline-offset-4">
              borderland@dbuglabs.org
            </a>
            .
          </p>
        </div>

        <div className="lg:col-span-8 border-t border-neutral-800">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-neutral-800">
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
