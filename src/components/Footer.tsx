import React from 'react';
import { ArrowUp, Terminal, Shield } from 'lucide-react';
import { playHudClick } from '../utils/sound';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    playHudClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050508] border-t border-neutral-800 text-neutral-400 font-mono text-xs pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-800/80">
          
          {/* Brand & Theme */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white font-display font-bold text-base tracking-widest">
              <span className="text-red-500">♠</span>
              <span>HACKBACK</span>
            </div>
            <div className="text-red-400 text-xs tracking-wider">
              NAVIGATE THE BORDERLAND
            </div>
            <p className="text-neutral-400 text-xs font-sans max-w-sm leading-relaxed">
              A 2-Day Reverse Hackathon challenging Player Groups to uncover the hidden architecture, users, and vulnerabilities of mystery products.
            </p>
            <div className="pt-2 text-neutral-400 text-[11px]">
              Organized by <span className="text-neutral-200">dBug Labs</span> at <span className="text-neutral-200">SRM Institute of Science and Technology</span>
            </div>
          </div>

          {/* Protocol Links */}
          <div className="space-y-2">
            <div className="text-neutral-200 font-bold tracking-wider uppercase mb-2">
              NAVIGATION
            </div>
            <ul className="space-y-1.5 text-neutral-400">
              <li>
                <a href="#concept" className="hover:text-red-400 transition-colors">
                  Reverse Concept
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-red-400 transition-colors">
                  Event Workflow
                </a>
              </li>
              <li>
                <a href="#timeline" className="hover:text-red-400 transition-colors">
                  Game Timeline
                </a>
              </li>
              <li>
                <a href="#protocol" className="hover:text-red-400 transition-colors">
                  HACKBACK Rules
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-red-400 transition-colors">
                  FAQ & Intel
                </a>
              </li>
            </ul>
          </div>

          {/* Comms & Status */}
          <div className="space-y-3">
            <div className="text-neutral-200 font-bold tracking-wider uppercase mb-2">
              TRANSMISSIONS
            </div>
            <div className="space-y-1.5 text-neutral-400">
              <div>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <span>Instagram</span>
                </a>
              </div>
              <div>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <span>LinkedIn</span>
                </a>
              </div>
              <div>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <span>GitHub</span>
                </a>
              </div>
              <div>
                <a href="mailto:borderland@dbuglabs.org" className="hover:text-red-400 transition-colors">
                  Contact Organizers
                </a>
              </div>
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-neutral-900 border border-neutral-800 rounded text-[11px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>STATUS: SYSTEM ONLINE</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-4">
          <div>
            © {new Date().getFullYear()} HACKBACK · dBug Labs · All rights reserved.
          </div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span>RETURN TO SUMMIT</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
