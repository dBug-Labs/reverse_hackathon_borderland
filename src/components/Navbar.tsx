import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX, Menu, X, ShieldCheck } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playHudClick } from '../utils/sound';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenPass: () => void;
  hasRegistration: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRegister,
  onOpenPass,
  hasRegistration,
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playHudClick();
  };

  const navLinks = [
    { label: 'Games', href: '#games' },
    { label: 'How it works', href: '#workflow' },
    { label: 'Schedule', href: '#timeline' },
    { label: 'Rules', href: '#protocol' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#08080a]/90 backdrop-blur-md border-b border-neutral-800/80 shadow-lg shadow-black/40'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark in display face */}
        <a
          href="#"
          className="font-poster text-2xl uppercase tracking-wide text-[#f5eee1] flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span className="text-[var(--card-red)] select-none text-xl">♠</span>
          <span>Hackback</span>
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-label font-medium text-neutral-300">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => playHudClick()}
              className="hover:text-white transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            className="p-2 text-neutral-400 hover:text-neutral-100 rounded-md transition-colors"
            title={soundOn ? 'Sound effects on' : 'Sound effects off'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {hasRegistration ? (
            <button
              onClick={() => {
                playHudClick();
                onOpenPass();
              }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-label font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 rounded-md hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>My Visa</span>
            </button>
          ) : (
            <Link
              href="/register"
              onClick={() => {
                playHudClick();
              }}
              className="hidden sm:inline-block px-5 py-2 text-sm font-label font-bold text-white bg-[var(--card-red)] hover:brightness-110 rounded-md transition whitespace-nowrap"
            >
              <span>Register</span>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-300 hover:text-white rounded-md hover:bg-neutral-900"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0b0b0d] border-b border-neutral-800 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  playHudClick();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 text-base font-label font-medium text-neutral-200 hover:bg-neutral-900 rounded-md transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-neutral-800">
            <Link
              href="/register"
              onClick={() => {
                playHudClick();
                setMobileMenuOpen(false);
              }}
              className="block w-full py-3 text-base font-label font-bold text-center text-white bg-[var(--card-red)] rounded-md"
            >
              Register your team
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
