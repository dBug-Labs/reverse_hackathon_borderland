import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, ChevronDown, Terminal, Clock, MapPin, Users } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';

interface HeroProps {
  onOpenRegister: () => void;
  onScrollToGames: () => void;
  registeredCount: number;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenRegister,
  onScrollToGames,
  registeredCount,
}) => {
  // Simulated countdown for event readiness
  const [seconds, setSeconds] = useState(48);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 59));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const suits = [
    { symbol: '♠', name: 'SPADES', role: 'SPEED + ACTION', color: 'text-neutral-100 hover:text-red-500' },
    { symbol: '♦', name: 'DIAMONDS', role: 'INTELLIGENCE + LOGIC', color: 'text-red-500 hover:text-red-400' },
    { symbol: '♣', name: 'CLUBS', role: 'TEAMWORK', color: 'text-neutral-100 hover:text-red-500' },
    { symbol: '♥', name: 'HEARTS', role: 'PSYCHOLOGY + TRUST', color: 'text-red-500 hover:text-red-400' },
  ];

  return (
    <section className="relative min-h-[92vh] pt-24 pb-16 flex flex-col justify-center items-center overflow-hidden cyber-grid">
      {/* Background ambient lighting and scanlines */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 flex flex-col items-center text-center">
        
        {/* Subtle System Status Kicker */}
        <div className="flex items-center gap-3 px-3 py-1 bg-red-950/30 border border-red-500/30 rounded text-xs font-mono tracking-widest text-red-400 mb-6">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
          <span>SYSTEM ONLINE</span>
          <span className="text-neutral-600">/</span>
          <span>GATE IS OPEN</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-400">SRM IST</span>
        </div>

        {/* Orbiting Suit Glyphs */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 mb-4 select-none">
          {suits.map((suit) => (
            <div
              key={suit.name}
              onMouseEnter={() => playHudHover()}
              className={`text-2xl sm:text-4xl transition-all duration-300 transform hover:scale-125 cursor-default ${suit.color} drop-shadow-[0_0_12px_rgba(220,38,38,0.5)]`}
              title={`${suit.name}: ${suit.role}`}
            >
              {suit.symbol}
            </div>
          ))}
        </div>

        {/* Large Centered Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight text-white uppercase glow-red max-w-5xl leading-none mb-3">
          BORDERLAND PROTOCOL
        </h1>

        {/* Subheadings */}
        <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-red-400 mb-2">
          ALICE IN BORDERLAND — FOR NOW
        </p>
        <p className="text-base sm:text-xl font-heading text-neutral-300 tracking-wider font-semibold max-w-2xl mb-8">
          A 2-Day Reverse Hackathon
        </p>

        {/* Primary and Secondary Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12 w-full sm:w-auto">
          <button
            onClick={() => {
              playHudClick();
              onOpenRegister();
            }}
            className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-mono text-sm font-bold tracking-widest uppercase rounded border border-red-400/80 shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02] active:scale-95 group flex items-center justify-center gap-2"
          >
            <span>ENTER THE BORDERLAND</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => {
              playHudClick();
              onScrollToGames();
            }}
            className="w-full sm:w-auto px-6 py-3.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-mono text-xs font-semibold tracking-wider uppercase rounded border border-neutral-700 transition-all flex items-center justify-center gap-2"
          >
            <span>VIEW THE GAMES</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Card & Core Specs (Grid Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left">
          
          {/* Card 1: System Status HUD Box */}
          <div className="bg-[#0e0e14]/90 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-red-500 font-bold tracking-wider">
              <span>BORDERLAND STATUS</span>
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div className="pt-2 space-y-1 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">SYSTEM:</span>
                <span className="text-emerald-400 font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">GATE:</span>
                <span className="text-red-400 font-bold">OPEN</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">PLAYERS:</span>
                <span className="text-neutral-100 tabular-nums font-semibold">
                  {registeredCount} / 200 SLOTS
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">GAMES:</span>
                <span className="text-neutral-100">04 SUITS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">DAYS:</span>
                <span className="text-neutral-100">02 DAYS</span>
              </div>
            </div>
          </div>

          {/* Card 2: Time & Schedule Structure */}
          <div className="bg-[#0e0e14]/90 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-neutral-300 font-bold tracking-wider">
              <span>TEMPORAL MATRIX</span>
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="pt-2 space-y-1.5 text-neutral-300">
              <div>
                <span className="text-neutral-500">SCHEDULE: </span>
                <span className="text-neutral-200">09:00 — 17:00 DAILY</span>
              </div>
              <div>
                <span className="text-neutral-500">DAY 01: </span>
                <span className="text-neutral-300">Training & Reverse Eng.</span>
              </div>
              <div>
                <span className="text-neutral-500">DAY 02: </span>
                <span className="text-red-400 font-semibold">Game Day & 4 Suits</span>
              </div>
              <div className="text-neutral-500 text-[11px] pt-1">
                Dates: Announced upon qualification
              </div>
            </div>
          </div>

          {/* Card 3: Arena & Protocol Venue */}
          <div className="bg-[#0e0e14]/90 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-neutral-300 font-bold tracking-wider">
              <span>ARENA LOCATION</span>
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="pt-2 space-y-1.5 text-neutral-300">
              <div>
                <span className="text-neutral-500">HOST: </span>
                <span className="text-neutral-200 font-semibold">dBug Labs</span>
              </div>
              <div>
                <span className="text-neutral-500">CAMPUS: </span>
                <span className="text-neutral-300">SRM IST, Kattankulathur</span>
              </div>
              <div>
                <span className="text-neutral-500">ACCESS: </span>
                <span className="text-neutral-300">Player Groups (2–4 Players)</span>
              </div>
              <div className="text-neutral-500 text-[11px] pt-1">
                Entry requires verified Player Visa
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
