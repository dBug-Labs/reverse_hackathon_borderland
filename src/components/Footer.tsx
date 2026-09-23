import React from 'react';
import { ArrowUp, Instagram, Github } from 'lucide-react';
import { playHudClick } from '../utils/sound';
import { CONTACTS, CONTACT_EMAIL, SOCIALS } from './contacts';

const LINKS = [
  { label: 'The four games', href: '#games' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Schedule', href: '#timeline' },
  { label: 'Rules', href: '#protocol' },
  { label: 'FAQ', href: '#faq' },
];

const SOCIAL_ICONS = { Instagram, GitHub: Github } as const;

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    playHudClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#060607] border-t border-neutral-900 pt-14 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-12 gap-10 pb-10 border-b border-neutral-900">
          <div className="md:col-span-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/hackback-wordmark.png" alt="HACKBACK — Play the reverse. Find the answer." className="w-64 h-auto" />
            <p className="mt-5 text-neutral-400 max-w-sm leading-relaxed">
              5 & 6 October, 9 AM – 5 PM · TP2 712, SRM IST. A two-day reverse hackathon.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/dbuglabs-logo.png" alt="" className="w-8 h-8" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/dbuglabs-wordmark.png" alt="dBug Labs" className="h-7 w-auto" />
            </div>
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

          <div className="md:col-span-4">
            <p className="font-label text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">Contact</p>
            <ul className="mt-3 space-y-3">
              {CONTACTS.map((c) => (
                <li key={c.phone}>
                  <span className="text-neutral-200 font-semibold">{c.name}</span>
                  <span className="text-neutral-500"> · {c.role}</span>
                  <br />
                  <a href={`tel:+91${c.phone}`} className="text-neutral-300 hover:text-white tabular-nums">
                    +91 {c.phone.slice(0, 5)} {c.phone.slice(5)}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-neutral-300 hover:text-white underline underline-offset-4">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>

            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.label as keyof typeof SOCIAL_ICONS];
                return (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 text-sm"
                    aria-label={`dBug Labs on ${s.label}`}
                  >
                    <Icon className="w-4 h-4" />
                    {s.handle}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} dBug Labs, SRM IST · Good luck, Players.</p>
          <button onClick={scrollToTop} className="inline-flex items-center gap-1.5 hover:text-white">
            Back to top
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
