import React from 'react';
import { ArrowUp } from 'lucide-react';
import { playHudClick } from '../utils/sound';

const LINKS = [
  { label: 'The four games', href: '#games' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Schedule', href: '#timeline' },
  { label: 'Rules', href: '#protocol' },
  { label: 'FAQ', href: '#faq' },
];

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    playHudClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#060607] border-t border-neutral-900 pt-14 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-12 gap-10 pb-10 border-b border-neutral-900">
          <div className="md:col-span-6">
            <div className="font-poster uppercase text-4xl text-[#f5eee1] flex items-center gap-2">
              <span className="text-[var(--card-red)] text-3xl">♠</span>
              Hackback
            </div>
            <p className="mt-2 font-caps uppercase tracking-[0.18em] text-sm text-neutral-300">
              Play the reverse. Find the answer.
            </p>
            <p className="mt-4 text-neutral-400 max-w-sm leading-relaxed">
              5 & 6 October · TP2 712, SRM IST. A two-day reverse hackathon by dBug Labs.
            </p>
          </div>

          <nav className="md:col-span-3" aria-label="Footer">
            <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">On this page</p>
            <ul className="mt-3 space-y-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-neutral-300 hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Questions?</p>
            <a
              href="mailto:borderland@dbuglabs.org"
              className="mt-3 inline-block text-neutral-300 hover:text-white underline underline-offset-4"
            >
              borderland@dbuglabs.org
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} dBug Labs, SRM IST</p>
          <button onClick={scrollToTop} className="inline-flex items-center gap-1.5 hover:text-white">
            Back to top
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
