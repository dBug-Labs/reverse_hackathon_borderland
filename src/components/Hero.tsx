'use client';

import React, { useState } from 'react';
import { Terminal, Clock, MapPin, X, Target, Trophy, ShieldAlert, Lock, ChevronDown, Zap, Crosshair } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';

interface HeroProps {
  onOpenRegister: () => void;
  onScrollToGames: () => void;
  registeredCount: number;
}

interface SuitGame {
  symbol: string;
  name: string;
  role: string;
  gameName: string;
  timeSlot: string;
  duration: string;
  vehicleModel: string;
  vehicleType: string;
  topSpeed: string;
  armorClass: string;
  thrustVector: string;
  objective: string;
  whyItExists: string;
  scoring: string[];
  difficulty: string;
  glowColor: string;
  badgeBg: string;
  neonBorder: string;
  thrusterColor: string;
}

const SUITS: Record<'spades' | 'diamonds' | 'clubs' | 'hearts', SuitGame> = {
  spades: {
    symbol: '♠',
    name: 'SPADES',
    role: 'SPEED + ACTION',
    gameName: 'THE SPRINT',
    timeSlot: 'Day 02 • 10:00 — 11:15',
    duration: '75 Minutes',
    vehicleModel: 'INTERCEPTOR ♠-01',
    vehicleType: 'High-Velocity Pursuit Skimmer',
    topSpeed: '420 KM/H (HOVER VELOCITY)',
    armorClass: 'MATTE REINFORCED CHASSIS',
    thrustVector: 'TWIN ION EXHAUST (BLUE 450nm)',
    objective:
      'A race against the clock. Teams receive their mystery product for the first time and must explore it as fast as possible—clicking through every screen, testing every button, logging console errors, and cataloging anomalies. There is no time to overthink here, only to observe.',
    whyItExists:
      'It forces every team to get hands-on with the product quickly, before they have time to form an ungrounded theory. First impressions under extreme time pressure often reveal the most obvious clues.',
    scoring: [
      'Points for every genuine, verifiable technical observation logged',
      'Speed bonus for the first team to submit an exhaustive exploration checklist',
      'Penalties for fabricating nonexistent bugs or hallucinating features',
    ],
    difficulty: 'High Tempo',
    glowColor: '#38bdf8',
    thrusterColor: '#0ea5e9',
    badgeBg: 'bg-sky-950/70 text-sky-400 border-sky-500/50',
    neonBorder: 'border-sky-500/60 shadow-[0_0_25px_rgba(56,189,248,0.4)]',
  },
  diamonds: {
    symbol: '♦',
    name: 'DIAMONDS',
    role: 'INTELLIGENCE + LOGIC',
    gameName: 'THE DEDUCTION',
    timeSlot: 'Day 02 • 11:30 — 13:00',
    duration: '90 Minutes',
    vehicleModel: 'ANALYSIS CRUISER ♦-02',
    vehicleType: 'Heavy Computational Cruiser',
    topSpeed: '360 KM/H (HOVER VELOCITY)',
    armorClass: 'ALLOY RUST-RESISTANT PLATING',
    thrustVector: 'PLASMA CORE BOOST (AMBER 590nm)',
    objective:
      'This is the intellectual core of the event. Using what they discovered in Game 1, teams dig deep into the product architecture—its design patterns, bundle files, network payloads, API routes, and user flow—to deduce what problem it was built to solve. Each team submits a structured forensic dossier.',
    whyItExists:
      'Anyone can play with a user interface. This round separates surface-level users from true engineers who can deduce system architecture and business motives from raw artifacts.',
    scoring: [
      'Core Accuracy (What problem does it solve?): 40 Points',
      'Technical Depth & Code Analysis: 30 Points',
      'Target User & Persona Identification: 30 Points',
      'High Risk Card Modifier: 1.5× Points if correct; point deduction if incorrect',
    ],
    difficulty: 'Critical Analysis',
    glowColor: '#f59e0b',
    thrusterColor: '#d97706',
    badgeBg: 'bg-amber-950/70 text-amber-400 border-amber-500/50',
    neonBorder: 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
  },
  clubs: {
    symbol: '♣',
    name: 'CLUBS',
    role: 'TEAMWORK + ALLIANCE',
    gameName: 'THE TRADING FLOOR',
    timeSlot: 'Day 02 • 14:00 — 15:15',
    duration: '75 Minutes',
    vehicleModel: 'TACTICAL RECON ♣-03',
    vehicleType: 'Squad Multi-Vector Recon Hauler',
    topSpeed: '340 KM/H (HOVER VELOCITY)',
    armorClass: 'BALLISTIC CORRODED COMPOSITE',
    thrustVector: 'DUAL REPULSOR JETS (LIME 530nm)',
    objective:
      'Teams are permitted to leave their stations and converse with rival groups. Every team holds one proprietary piece of insight the others lack. You may trade intelligence, broker temporary pacts, or guard your findings. It is a live trading floor—and every transaction is a gamble.',
    whyItExists:
      'Real product teams do not operate in silos—they share telemetry, navigate organizational politics, and decide whom to trust. Game 3 injects social tension and counter-espionage into the competition.',
    scoring: [
      'Bonus points for trades that demonstrably improve your final thesis in Game 4',
      'Severe Visa Point deductions if caught disseminating fabricated or sabotage data',
      'Reputation rating tracked by the Game Masters',
    ],
    difficulty: 'Social Espionage',
    glowColor: '#10b981',
    thrusterColor: '#059669',
    badgeBg: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50',
    neonBorder: 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.4)]',
  },
  hearts: {
    symbol: '♥',
    name: 'HEARTS',
    role: 'PSYCHOLOGY + TRUST',
    gameName: 'THE TRIAL',
    timeSlot: 'Day 02 • 15:30 — 16:30',
    duration: '60 Minutes',
    vehicleModel: 'COMMAND SOVEREIGN ♥-04',
    vehicleType: 'High-Risk Sovereign Interceptor',
    topSpeed: '450 KM/H (HOVER VELOCITY)',
    armorClass: 'TITANIUM REINFORCED COCKPIT',
    thrustVector: 'AFTERBURNER JET (CRIMSON 650nm)',
    objective:
      'The supreme ordeal. Each team stands before a tribunal of Game Masters to present their verdict—the problem, the user, the flaws, and their proposed product roadmap. The Game Masters cross-examine without mercy, testing if you can hold your ground under hostile questioning.',
    whyItExists:
      'Anyone can fabricate a pitch deck. This round rewards the teams who truly understand what they uncovered, because superficial understanding shatters immediately under interrogation.',
    scoring: [
      'Clarity and conviction of forensic argument',
      'Resilience and accuracy under direct Game Master cross-examination',
      'Ingenuity and feasibility of proposed product transformation',
      'Crowd reaction trust bonus',
    ],
    difficulty: 'Hostile Interrogation',
    glowColor: '#ef4444',
    thrusterColor: '#dc2626',
    badgeBg: 'bg-red-950/70 text-red-400 border-red-500/50',
    neonBorder: 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.4)]',
  },
};

/* ─── Photorealistic Flying Muscle Car (Rear-Quarter Perspective) ─── */
interface RealisticFlyingCarProps {
  suit: SuitGame;
  angle: number; // degrees tilted towards the inverted city
  delay: string;
  onClick: () => void;
}

const RealisticFlyingCar: React.FC<RealisticFlyingCarProps> = ({
  suit,
  angle,
  delay,
  onClick,
}) => {
  return (
    <div
      onClick={() => {
        playHudClick();
        onClick();
      }}
      onMouseEnter={() => playHudHover()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          playHudClick();
          onClick();
        }
      }}
      className="group relative cursor-pointer select-none focus:outline-none transition-transform duration-300 hover:scale-110 active:scale-95"
      style={{
        transform: `rotate(${angle}deg)`,
      }}
      aria-label={`Open ${suit.name} Flying Car dossier`}
    >
      {/* Floating hover animation wrapper */}
      <div
        className="animate-float flex flex-col items-center"
        style={{ animationDelay: delay }}
      >
        {/* Interactive Hover Reticle Label */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-black/90 border rounded px-2.5 py-1 text-[10px] font-mono tracking-wider flex items-center gap-1.5 shadow-2xl mb-1 -translate-y-1 group-hover:translate-y-0"
          style={{
            borderColor: suit.glowColor,
            color: '#fff',
            boxShadow: `0 0 15px ${suit.glowColor}50`,
          }}
        >
          <Crosshair className="w-3 h-3 text-red-400" />
          <span style={{ color: suit.glowColor }} className="font-bold">
            {suit.symbol} {suit.name}
          </span>
          <span className="text-neutral-400">· CLICK CAR</span>
        </div>

        {/* 3D Realistic Cyberpunk Flying Muscle Car SVG (Rear View) */}
        <div className="relative w-36 sm:w-44 md:w-52 h-24 sm:h-28 flex items-center justify-center">
          <svg
            viewBox="0 0 200 110"
            className="w-full h-full drop-shadow-[0_15px_20px_rgba(0,0,0,0.9)]"
            aria-hidden="true"
          >
            <defs>
              {/* Metallic body gradient */}
              <linearGradient id={`carPaint-${suit.name}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2c2d38" />
                <stop offset="35%" stopColor="#181920" />
                <stop offset="70%" stopColor="#0d0e12" />
                <stop offset="100%" stopColor="#15161c" />
              </linearGradient>

              {/* Rear glass reflection */}
              <linearGradient id={`rearGlass-${suit.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                <stop offset="40%" stopColor="rgba(15,20,30,0.7)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.95)" />
              </linearGradient>

              {/* Thruster Jet Flame Gradient */}
              <linearGradient id={`thrusterFlame-${suit.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor={suit.glowColor} />
                <stop offset="70%" stopColor={suit.thrusterColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={suit.thrusterColor} stopOpacity="0" />
              </linearGradient>

              {/* Neon Glow Filter */}
              <filter id={`carGlow-${suit.name}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ── JET EXHAUST PLUMES (Shooting downwards as car flies upwards) ── */}
            <g className="transition-opacity duration-300 group-hover:opacity-100 opacity-85">
              {/* Left Thruster Plume */}
              <polygon
                points="58,95 48,135 68,135"
                fill={`url(#thrusterFlame-${suit.name})`}
                filter={`url(#carGlow-${suit.name})`}
              />
              <ellipse cx="58" cy="98" rx="8" ry="3" fill="#ffffff" />

              {/* Right Thruster Plume */}
              <polygon
                points="142,95 132,135 152,135"
                fill={`url(#thrusterFlame-${suit.name})`}
                filter={`url(#carGlow-${suit.name})`}
              />
              <ellipse cx="142" cy="98" rx="8" ry="3" fill="#ffffff" />
            </g>

            {/* ── REAR SPOILER / WING (Cyber Aerodynamics) ── */}
            <g>
              {/* Wing struts */}
              <line x1="52" y1="26" x2="55" y2="38" stroke="#111" strokeWidth="3" />
              <line x1="148" y1="26" x2="145" y2="38" stroke="#111" strokeWidth="3" />
              {/* Spoiler Main Blade */}
              <path
                d="M 32 24 Q 100 20, 168 24 L 165 29 Q 100 25, 35 29 Z"
                fill="#15151c"
                stroke={suit.glowColor}
                strokeWidth="0.8"
                strokeOpacity="0.7"
              />
              {/* Spoiler Endplates */}
              <polygon points="30,18 36,22 34,32 28,28" fill={suit.glowColor} opacity="0.8" />
              <polygon points="170,18 164,22 166,32 172,28" fill={suit.glowColor} opacity="0.8" />
            </g>

            {/* ── CAR CABIN ROOF & REAR WINDOW ── */}
            <path
              d="M 64 34 L 136 34 L 148 58 L 52 58 Z"
              fill={`url(#rearGlass-${suit.name})`}
              stroke="#2c2d38"
              strokeWidth="1.2"
            />
            {/* Louver Bars on Rear Glass */}
            <line x1="60" y1="40" x2="140" y2="40" stroke="#0a0a0e" strokeWidth="2" />
            <line x1="56" y1="46" x2="144" y2="46" stroke="#0a0a0e" strokeWidth="2" />
            <line x1="53" y1="52" x2="147" y2="52" stroke="#0a0a0e" strokeWidth="2" />

            {/* ── WIDE REAR BODY / QUARTER PANELS ── */}
            <path
              d="M 40 56 
                 Q 100 52, 160 56 
                 L 182 72 
                 Q 186 86, 178 94 
                 L 22 94 
                 Q 14 86, 18 72 Z"
              fill={`url(#carPaint-${suit.name})`}
              stroke="#3a3b48"
              strokeWidth="1.2"
            />

            {/* Highlight shoulder crease lines */}
            <path d="M 22 72 L 52 58" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
            <path d="M 178 72 L 148 58" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />

            {/* ── REAR DECK EMBLEM (GLOWING SUIT SYMBOL) ── */}
            <rect x="85" y="60" width="30" height="15" rx="3" fill="#08080c" stroke={suit.glowColor} strokeWidth="0.8" />
            <text
              x="100"
              y="71"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="900"
              fontFamily="serif"
              fill={suit.glowColor}
              filter={`url(#carGlow-${suit.name})`}
            >
              {suit.symbol}
            </text>

            {/* ── DUAL REAR CYBER TAILLIGHTS ── */}
            {/* Left Taillight Unit */}
            <g filter={`url(#carGlow-${suit.name})`}>
              <rect x="30" y="70" width="46" height="8" rx="2" fill="#dc2626" />
              <rect x="32" y="72" width="42" height="4" rx="1" fill="#fca5a5" />
            </g>
            {/* Right Taillight Unit */}
            <g filter={`url(#carGlow-${suit.name})`}>
              <rect x="124" y="70" width="46" height="8" rx="2" fill="#dc2626" />
              <rect x="126" y="72" width="42" height="4" rx="1" fill="#fca5a5" />
            </g>

            {/* ── REAR DIFFUSER & HOVER REPULSORS ── */}
            <rect x="32" y="85" width="136" height="10" rx="3" fill="#050508" stroke="#222" strokeWidth="1" />
            {/* Diffuser fins */}
            <line x1="80" y1="85" x2="80" y2="95" stroke="#111" strokeWidth="2" />
            <line x1="100" y1="85" x2="100" y2="95" stroke="#111" strokeWidth="2" />
            <line x1="120" y1="85" x2="120" y2="95" stroke="#111" strokeWidth="2" />

            {/* Left Dual Exhaust Nozzles */}
            <circle cx="53" cy="90" r="4.5" fill="#111" stroke={suit.glowColor} strokeWidth="1" />
            <circle cx="63" cy="90" r="4.5" fill="#111" stroke={suit.glowColor} strokeWidth="1" />

            {/* Right Dual Exhaust Nozzles */}
            <circle cx="137" cy="90" r="4.5" fill="#111" stroke={suit.glowColor} strokeWidth="1" />
            <circle cx="147" cy="90" r="4.5" fill="#111" stroke={suit.glowColor} strokeWidth="1" />

            {/* Neon Accent Underglow Line */}
            <line
              x1="35"
              y1="95"
              x2="165"
              y2="95"
              stroke={suit.glowColor}
              strokeWidth="2"
              strokeLinecap="round"
              filter={`url(#carGlow-${suit.name})`}
            />
          </svg>
        </div>

        {/* Suit Badge Chip */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full border text-[10px] font-mono tracking-widest uppercase transition-all shadow-md group-hover:scale-105 ${suit.badgeBg}`}
        >
          <span className="font-bold">{suit.symbol}</span>
          <span>{suit.name}</span>
          <span className="text-neutral-400">· DOSSIER</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Realistic Car HUD Cockpit Modal ─── */
interface CarModalProps {
  suit: SuitGame;
  onClose: () => void;
  onOpenRegister: () => void;
}

const CarModal: React.FC<CarModalProps> = ({ suit, onClose, onOpenRegister }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-3xl bg-[#0b0b12] border rounded-xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col hud-corner"
        style={{
          borderColor: `${suit.glowColor}80`,
          boxShadow: `0 0 60px -10px ${suit.glowColor}35, inset 0 0 30px rgba(0,0,0,0.85)`,
        }}
      >
        {/* Cockpit Canopy Top Header */}
        <div
          className="relative px-5 py-4 border-b border-neutral-800 flex items-center justify-between"
          style={{
            background: `linear-gradient(90deg, #0e0e16 0%, ${suit.glowColor}18 50%, #0e0e16 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-4xl sm:text-5xl font-display font-black leading-none drop-shadow"
              style={{ color: suit.glowColor }}
            >
              {suit.symbol}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded border"
                  style={{
                    color: suit.glowColor,
                    borderColor: `${suit.glowColor}50`,
                    backgroundColor: `${suit.glowColor}15`,
                  }}
                >
                  SUIT: {suit.name}
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  {suit.vehicleModel}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  INVERTED FLIGHT ACTIVE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white mt-1">
                {suit.gameName} · VEHICLE DOSSIER
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 rounded-lg border border-neutral-700 transition-colors"
            aria-label="Close vehicle dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Dossier Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-sm">
          
          {/* Telemetry Dials Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950/80 p-3.5 rounded-lg border border-neutral-800 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[10px]">TIME WINDOW</span>
              <span className="text-neutral-200 font-semibold">{suit.duration}</span>
              <div className="text-neutral-500 text-[10px]">{suit.timeSlot}</div>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">SUIT DOMAIN</span>
              <span style={{ color: suit.glowColor }} className="font-bold">
                {suit.role}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">PROPULSION</span>
              <span className="text-neutral-300 font-semibold">{suit.topSpeed}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">ARMOR SPEC</span>
              <span className="text-neutral-300 font-semibold">{suit.armorClass}</span>
            </div>
          </div>

          {/* Flying Car Propulsion Spec Banner */}
          <div
            className="p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background: `radial-gradient(ellipse at center, ${suit.glowColor}12 0%, #0d0d16 80%)`,
              borderColor: `${suit.glowColor}35`,
            }}
          >
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-[11px] font-mono tracking-widest text-red-400 uppercase flex items-center gap-1.5 justify-center sm:justify-start">
                <Zap className="w-3.5 h-3.5" />
                <span>FLIGHT STATUS: SOARING TOWARD INVERTED CITY</span>
              </div>
              <div className="text-sm sm:text-base font-heading font-bold text-white">
                {suit.vehicleType}
              </div>
              <div className="text-xs font-mono text-neutral-400">
                Thrust Vector: {suit.thrustVector}
              </div>
            </div>

            <div
              className="w-16 h-16 rounded-full flex items-center justify-center border shrink-0 text-3xl font-display font-black"
              style={{
                borderColor: `${suit.glowColor}60`,
                backgroundColor: `${suit.glowColor}15`,
                color: suit.glowColor,
                boxShadow: `0 0 24px ${suit.glowColor}40`,
              }}
            >
              {suit.symbol}
            </div>
          </div>

          {/* Mission Objective */}
          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-red-500" />
              <span>Primary Mission Protocol</span>
            </h3>
            <p className="text-neutral-200 text-xs sm:text-sm bg-neutral-950/60 p-4 rounded-lg border border-neutral-800/80 leading-relaxed font-sans">
              {suit.objective}
            </p>
          </div>

          {/* Why It Exists in Borderland */}
          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Strategic Purpose & Origins</span>
            </h3>
            <p className="text-neutral-300 text-xs sm:text-sm bg-neutral-950/40 p-3.5 rounded-lg border border-neutral-800/60 leading-relaxed font-sans">
              {suit.whyItExists}
            </p>
          </div>

          {/* Scoring Protocol */}
          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-red-500" />
              <span>Scoring Rules & Visa Rating Impact</span>
            </h3>
            <ul className="space-y-2">
              {suit.scoring.map((rule, idx) => (
                <li
                  key={idx}
                  className="text-xs text-neutral-300 flex items-start gap-2.5 bg-neutral-900/40 p-3 rounded-lg border border-neutral-800/60"
                >
                  <span
                    className="font-mono font-bold shrink-0 text-xs"
                    style={{ color: suit.glowColor }}
                  >
                    [0{idx + 1}]
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security Sealed Notice */}
          <div className="p-3 bg-red-950/25 border border-red-900/50 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-red-400">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>CHASSIS TELEMETRY SEALED UNTIL DAY 02 BRIEFING</span>
            </span>
            <span className="text-neutral-500 text-[11px]">SRM IST ARENA</span>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-[#09090e] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-neutral-400 text-center sm:text-left">
            <span>QUALIFIED FOR DAY 02 · </span>
            <span style={{ color: suit.glowColor }} className="font-semibold">
              4 CAR SUITS IN FLIGHT
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs rounded border border-neutral-700"
            >
              CLOSE
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="flex-1 sm:flex-initial px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded border border-red-400/80 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            >
              ENTER BORDERLAND
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── Main Hero Section ─── */
export const Hero: React.FC<HeroProps> = ({
  onOpenRegister,
  onScrollToGames,
  registeredCount,
}) => {
  const [selectedSuit, setSelectedSuit] = useState<SuitGame | null>(null);

  return (
    <>
      <section className="relative min-h-[96vh] flex flex-col justify-between items-center overflow-hidden bg-[#08080a]">
        
        {/* ══════════════════════════════════════════════════════════════════════
            BACKGROUND: INVERTED DYSTOPIAN CITY
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          {/* Main Photorealistic Inverted City Background Artwork */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/dystopian_city_inverted_hero.jpg')",
              filter: 'brightness(0.92) contrast(1.1)',
            }}
          />

          {/* Vignette gradients to preserve text legibility while keeping city clear */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to top, 
                  #08080a 0%, 
                  rgba(8, 8, 10, 0.88) 18%, 
                  rgba(8, 8, 10, 0.4) 40%, 
                  transparent 70%
                ),
                linear-gradient(to bottom,
                  rgba(8, 8, 10, 0.45) 0%,
                  transparent 25%
                )
              `,
            }}
          />

          {/* Cyber Scanline overlay */}
          <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-30" />

          {/* Atmospheric Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/10 blur-[140px] rounded-full pointer-events-none" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO MAIN: 4 CARS SURROUNDING THE "HACKBACK" HEADLINE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 flex flex-col items-center text-center pt-24 pb-8">
          
          {/* System Status Kicker */}
          <div className="flex items-center gap-3 px-3.5 py-1 bg-black/60 border border-red-500/40 rounded-full text-xs font-mono tracking-widest text-red-400 mb-6 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            <span>INVERTED WORLD GATEWAY ACTIVE</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300">04 CAR SUITS IN FLIGHT</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">SRM IST</span>
          </div>

          {/* ── THE HEADLINE + SURROUNDING 4 CARS SQUADRON ── */}
          <div className="relative w-full max-w-5xl my-4 flex flex-col items-center justify-center">

            {/* TOP ROW CARS: ♠ SPADES (Left) & ♦ DIAMONDS (Right) */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 md:px-14 mb-2 z-20">
              {/* Top-Left: SPADES ♠ */}
              <div className="flex flex-col items-center sm:items-start">
                <RealisticFlyingCar
                  suit={SUITS.spades}
                  angle={-10}
                  delay="0s"
                  onClick={() => setSelectedSuit(SUITS.spades)}
                />
              </div>

              {/* Top-Right: DIAMONDS ♦ */}
              <div className="flex flex-col items-center sm:items-end">
                <RealisticFlyingCar
                  suit={SUITS.diamonds}
                  angle={10}
                  delay="0.6s"
                  onClick={() => setSelectedSuit(SUITS.diamonds)}
                />
              </div>
            </div>

            {/* CENTER HEADLINE: "HACKBACK" */}
            <div className="relative my-2 sm:my-3 z-10 px-4">
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-display font-black tracking-tighter text-white uppercase glow-red leading-none drop-shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
                HACKBACK
              </h1>

              {/* Subheading under HACKBACK */}
              <p className="text-xs sm:text-sm font-mono tracking-[0.35em] uppercase text-red-400 mt-3 drop-shadow-md">
                NAVIGATE THE BORDERLAND
              </p>
              <p className="text-base sm:text-xl font-heading text-neutral-200 tracking-wider font-semibold max-w-2xl mx-auto mt-1 drop-shadow-md">
                A 2-Day Reverse Hackathon
              </p>
            </div>

            {/* BOTTOM ROW CARS: ♣ CLUBS (Left) & ♥ HEARTS (Right) */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 md:px-14 mt-2 z-20">
              {/* Bottom-Left: CLUBS ♣ */}
              <div className="flex flex-col items-center sm:items-start">
                <RealisticFlyingCar
                  suit={SUITS.clubs}
                  angle={-6}
                  delay="1.2s"
                  onClick={() => setSelectedSuit(SUITS.clubs)}
                />
              </div>

              {/* Bottom-Right: HEARTS ♥ */}
              <div className="flex flex-col items-center sm:items-end">
                <RealisticFlyingCar
                  suit={SUITS.hearts}
                  angle={6}
                  delay="1.8s"
                  onClick={() => setSelectedSuit(SUITS.hearts)}
                />
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 mb-10 w-full sm:w-auto z-10">
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
              className="w-full sm:w-auto px-6 py-3.5 bg-black/70 hover:bg-neutral-900 text-neutral-300 hover:text-white font-mono text-xs font-semibold tracking-wider uppercase rounded border border-neutral-700 transition-all flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <span>VIEW THE GAMES</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Core Specs & System Status HUD Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left z-10">
            {/* Card 1: System Status HUD Box */}
            <div className="bg-[#0e0e14]/85 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg backdrop-blur-md">
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
            <div className="bg-[#0e0e14]/85 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg backdrop-blur-md">
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
            <div className="bg-[#0e0e14]/85 border border-neutral-800 rounded p-4 font-mono text-xs hud-corner shadow-lg backdrop-blur-md">
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

      {/* ══════════════════════════════════════════════════════════════════════
          CAR DOSSIER POPUP MODAL (When any car is clicked)
      ══════════════════════════════════════════════ */}
      {selectedSuit && (
        <CarModal
          suit={selectedSuit}
          onClose={() => setSelectedSuit(null)}
          onOpenRegister={onOpenRegister}
        />
      )}
    </>
  );
};
