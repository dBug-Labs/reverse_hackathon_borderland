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
      a: 'Player Groups must consist of 2 to 4 Players. Students across all colleges, departments, and years are eligible. We recommend assembling a balanced squad featuring an Engineer, Detective, Strategist, and Communicator.',
    },
  ];

  const toggle = (idx: number) => {
    playHudClick();
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-[#09090d] relative border-t border-neutral-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            INTELLIGENCE CLEARANCE
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight mb-3">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans">
            Everything you need to know before entering the Borderland gates.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#0c0d13] border border-neutral-800 rounded-lg overflow-hidden transition-colors hover:border-neutral-700"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-heading font-semibold text-sm sm:text-base text-neutral-200 hover:text-white"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-red-500 font-bold shrink-0">
                      {`Q${String(idx + 1).padStart(2, '0')}`}
                    </span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-red-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed border-t border-neutral-800/60 bg-neutral-950/40 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
