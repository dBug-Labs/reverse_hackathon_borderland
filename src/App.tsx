'use client';

import React, { useState, useEffect } from 'react';
import { TeamRegistration } from './types/borderland';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ConceptSection } from './components/ConceptSection';
import { FourGamesSection } from './components/FourGamesSection';
import { EventWorkflow } from './components/EventWorkflow';
import { TimelineSection } from './components/TimelineSection';
import { VisaSection } from './components/VisaSection';
import { RiskRewardSection } from './components/RiskRewardSection';
import { LeaderboardSection } from './components/LeaderboardSection';
import { ArchetypesSection } from './components/ArchetypesSection';
import { RulesSection } from './components/RulesSection';
import { FaqSection } from './components/FaqSection';
import { PartnersSection } from './components/PartnersSection';
import { Footer } from './components/Footer';
import { RegistrationModal } from './components/RegistrationModal';
import { EntryPassModal } from './components/EntryPassModal';
import { playHudClick } from './utils/sound';
import { ShieldCheck, Flame } from 'lucide-react';

export default function App() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [registeredData, setRegisteredData] = useState<TeamRegistration | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(164);

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

  const handleRegistrationSuccess = (reg: TeamRegistration) => {
    setRegisteredData(reg);
    setIsRegisterOpen(false);
    setRegisteredCount((prev) => prev + 1);
    setIsPassOpen(true);
  };

  const scrollToGames = () => {
    const el = document.getElementById('games');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#ededed] font-sans relative selection:bg-red-600/30 selection:text-red-200">
      
      {/* Universal Fixed Top Navigation */}
      <Navbar
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenPass={() => setIsPassOpen(true)}
        hasRegistration={Boolean(registeredData)}
      />

      <main>
        {/* 1. Hero Section */}
        <Hero
          onOpenRegister={() => setIsRegisterOpen(true)}
          onScrollToGames={scrollToGames}
          registeredCount={registeredCount}
        />

        {/* 2. "What Is This?" Reverse Hackathon Concept */}
        <ConceptSection />

        {/* 3. The Four Games Section (♠, ♦, ♣, ♥) */}
        <FourGamesSection />

        {/* 4. How The Event Works (Two-Day Workflow Diagram) */}
        <EventWorkflow />

        {/* 5. Day 1 & Day 2 Schedule Timelines */}
        <TimelineSection />

        {/* 6. Player Visa System & Interactive Simulator */}
        <VisaSection />

        {/* 7. Risk & Reward (Standard vs High Risk) */}
        <RiskRewardSection />

        {/* 8. Live Borderland Leaderboard Preview */}
        <LeaderboardSection />

        {/* 9. "Who Should Enter?" Team Archetypes */}
        <ArchetypesSection />

        {/* 10. Rules Section (Borderland Protocol) */}
        <RulesSection />

        {/* 11. FAQ Intel Section */}
        <FaqSection />

        {/* 12. Organizers & Sponsors */}
        <PartnersSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Multi-Step Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Digital Entry Pass / Visa Pass Modal */}
      <EntryPassModal
        isOpen={isPassOpen}
        onClose={() => setIsPassOpen(false)}
        registration={registeredData}
      />

      {/* Mobile Sticky Quick CTA Bar (strictly within the 15% mobile viewport cap) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08080a]/95 border-t border-neutral-800 p-2.5 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 pl-2">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span className="text-[11px] font-mono text-neutral-300">
            {registeredData ? 'VISA ISSUED' : 'GATE OPEN'}
          </span>
        </div>

        {registeredData ? (
          <button
            onClick={() => {
              playHudClick();
              setIsPassOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 rounded"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MY VISA PASS</span>
          </button>
        ) : (
          <button
            onClick={() => {
              playHudClick();
              setIsRegisterOpen(true);
            }}
            className="px-5 py-2 text-xs font-mono font-bold text-white bg-red-600 rounded border border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.5)]"
          >
            ENTER THE BORDERLAND
          </button>
        )}
      </div>

    </div>
  );
}
