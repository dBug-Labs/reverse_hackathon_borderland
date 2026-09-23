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
    { label: 'Concept', href: '#concept' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Timeline', href: '#timeline' },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark in display face */}
        <a
          href="#"
          className="text-lg sm:text-xl font-display font-bold tracking-widest text-neutral-100 hover:text-red-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <span className="text-red-600 select-none">♠</span>
          <span>HACKBACK</span>
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs font-mono tracking-wider uppercase text-neutral-400">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => playHudClick()}
              className="hover:text-red-400 transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-red-500 hover:after:w-full after:transition-all"
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
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 border border-neutral-800 rounded transition-colors"
            title={soundOn ? 'Sound FX: ON' : 'Sound FX: MUTED'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-red-500" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          {hasRegistration ? (
            <button
              onClick={() => {
                playHudClick();
                onOpenPass();
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/40 rounded hover:bg-emerald-900/50 hover:border-emerald-400 transition-all whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>MY VISA PASS</span>
            </button>
          ) : (
            <Link
              href="/register"
              onClick={() => {
                playHudClick();
              }}
              className="relative group px-4 py-2 text-xs font-mono font-semibold tracking-wider text-white bg-red-600 hover:bg-red-500 rounded border border-red-500/80 transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] whitespace-nowrap active:scale-95 inline-block text-center"
            >
              <span>ENTER THE BORDERLAND</span>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-400 hover:text-white border border-neutral-800 rounded hover:bg-neutral-900"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0a0a0e] border-b border-neutral-800 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  playHudClick();
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-sm font-mono text-neutral-300 hover:text-red-400 hover:bg-neutral-900/60 rounded border border-transparent hover:border-neutral-800 transition-colors"
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
              className="block w-full py-2.5 text-xs font-mono font-bold tracking-wider text-center text-white bg-red-600 hover:bg-red-500 rounded border border-red-500"
            >
              ENTER THE BORDERLAND
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
