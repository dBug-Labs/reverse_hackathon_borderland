'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TeamRegistration } from './types/borderland';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ConceptSection } from './components/ConceptSection';
import { EventWorkflow } from './components/EventWorkflow';
import { TimelineSection } from './components/TimelineSection';
import { RulesSection } from './components/RulesSection';
import { FaqSection } from './components/FaqSection';
import { PartnersSection } from './components/PartnersSection';
import { Footer } from './components/Footer';
import { EntryPassModal } from './components/EntryPassModal';
import { playHudClick } from './utils/sound';
import { ShieldCheck } from 'lucide-react';
import { ENTRY_FEE } from '@/lib/fee';

export default function App() {
  const router = useRouter();
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [registeredData, setRegisteredData] = useState<TeamRegistration | null>(null);

  // Check for existing registration in localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('borderland_player_reg');
      if (stored) {
        const parsed = JSON.parse(stored) as TeamRegistration;
        setRegisteredData(parsed);
      }
    } catch {
      // Fallback
    }
  }, []);

  // Registration lives on its own page (/register) — every CTA routes there.
  const openRegister = () => router.push('/register');

  return (
    <div className="min-h-screen bg-[#08080a] text-[#ededed] font-sans relative selection:bg-red-600/30 selection:text-red-200">
      
      {/* Universal Fixed Top Navigation */}
      <Navbar
        onOpenRegister={openRegister}
        onOpenPass={() => setIsPassOpen(true)}
        hasRegistration={Boolean(registeredData)}
      />

      <main>
        {/* 1. Hero (poster) + the four games */}
        <Hero onOpenRegister={openRegister} />

        {/* 2. Reverse Hackathon Core Philosophy & Inquiries */}
        <ConceptSection />

        {/* 3. How The Event Works (Two-Day Workflow Diagram) */}
        <EventWorkflow />

        {/* 4. Day 1 & Day 2 Schedule Timelines */}
        <TimelineSection />

        {/* 5. Rules Section (Borderland Protocol) */}
        <RulesSection />

        {/* 6. FAQ Intel Section */}
        <FaqSection />

        {/* 7. Organizers & Sponsors */}
        <PartnersSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Digital Entry Pass / Visa Pass Modal */}
      <EntryPassModal
        isOpen={isPassOpen}
        onClose={() => setIsPassOpen(false)}
        registration={registeredData}
      />

      {/* Mobile Sticky Quick CTA Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08080a]/95 border-t border-neutral-800 px-4 py-2.5 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="font-label leading-tight">
          <div className="text-sm font-bold text-neutral-100">5 & 6 Oct · TP2 712</div>
          <div className="text-xs text-neutral-400">₹{ENTRY_FEE} per team · 2–4 members</div>
        </div>

        {registeredData ? (
          <button
            onClick={() => {
              playHudClick();
              setIsPassOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-label font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 rounded-md"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>My Visa</span>
          </button>
        ) : (
          <button
            onClick={() => {
              playHudClick();
              openRegister();
            }}
            className="px-5 py-2.5 text-sm font-label font-bold text-white bg-[var(--card-red)] rounded-md"
          >
            Register
          </button>
        )}
      </div>

    </div>
  );
}
