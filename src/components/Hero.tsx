'use client';

import React, { useState } from 'react';
import { Terminal, Clock, MapPin, X, Target, Trophy, ShieldAlert, Lock, ChevronDown, Crosshair, ArrowRight } from 'lucide-react';
import { playHudClick, playHudHover } from '../utils/sound';

interface HeroProps {
  onOpenRegister: () => void;
  onScrollToGames: () => void;
  registeredCount: number;
}

interface SuitCardGame {
  symbol: string;
  name: string;
  cardRank: string;
  role: string;
  gameName: string;
  timeSlot: string;
  duration: string;
  objective: string;
  whyItExists: string;
  scoring: string[];
  difficulty: string;
  glowColor: string;
  badgeBg: string;
  neonBorder: string;
  thrusterColor: string;
  symbolColor: string;
}

const SUITS: Record<'spades' | 'diamonds' | 'clubs' | 'hearts', SuitCardGame> = {
  spades: {
    symbol: '♠',
    name: 'SPADES',
    cardRank: 'K',
    role: 'SPEED + ACTION',
    gameName: 'THE SPRINT',
    timeSlot: 'Day 02 • 10:00 — 11:15',
    duration: '75 Minutes',
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
    symbolColor: 'text-neutral-100',
    badgeBg: 'bg-sky-950/70 text-sky-400 border-sky-500/50',
    neonBorder: 'border-sky-500/60 shadow-[0_0_25px_rgba(56,189,248,0.4)]',
  },
  diamonds: {
    symbol: '♦',
    name: 'DIAMONDS',
    cardRank: 'A',
    role: 'INTELLIGENCE + LOGIC',
    gameName: 'THE DEDUCTION',
    timeSlot: 'Day 02 • 11:30 — 13:00',
    duration: '90 Minutes',
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
    symbolColor: 'text-amber-500',
    badgeBg: 'bg-amber-950/70 text-amber-400 border-amber-500/50',
    neonBorder: 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.4)]',
  },
  clubs: {
    symbol: '♣',
    name: 'CLUBS',
    cardRank: 'J',
    role: 'TEAMWORK + ALLIANCE',
    gameName: 'THE TRADING FLOOR',
    timeSlot: 'Day 02 • 14:00 — 15:15',
    duration: '75 Minutes',
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
    symbolColor: 'text-neutral-100',
    badgeBg: 'bg-emerald-950/70 text-emerald-400 border-emerald-500/50',
    neonBorder: 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.4)]',
  },
  hearts: {
    symbol: '♥',
    name: 'HEARTS',
    cardRank: 'Q',
    role: 'PSYCHOLOGY + TRUST',
    gameName: 'THE TRIAL',
    timeSlot: 'Day 02 • 15:30 — 16:30',
    duration: '60 Minutes',
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
    symbolColor: 'text-red-500',
    badgeBg: 'bg-red-950/70 text-red-400 border-red-500/50',
    neonBorder: 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.4)]',
  },
};

/* ─── Authentic Cyberpunk Playing Card (Borderland Spec) ─── */
interface PlayingCardProps {
  suit: SuitCardGame;
  angle: number;
  delay: string;
  onClick: () => void;
}

const PlayingCard: React.FC<PlayingCardProps> = ({
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
      aria-label={`Open ${suit.cardRank} ${suit.symbol} ${suit.name} Card (${suit.gameName})`}
    >
      {/* Floating hover animation wrapper */}
      <div
        className="animate-float flex flex-col items-center"
        style={{ animationDelay: delay }}
      >
        {/* Interactive Hover Reticle Label */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap bg-black/95 border rounded px-2.5 py-1 text-[10px] font-mono tracking-wider flex items-center gap-1.5 shadow-2xl mb-1.5 -translate-y-1 group-hover:translate-y-0 z-30"
          style={{
            borderColor: suit.glowColor,
            color: '#fff',
            boxShadow: `0 0 15px ${suit.glowColor}50`,
          }}
        >
          <Crosshair className="w-3 h-3 text-red-400" />
          <span style={{ color: suit.glowColor }} className="font-bold">
            {suit.cardRank} {suit.symbol} {suit.name}
          </span>
          <span className="text-neutral-400">· VIEW CARD DOSSIER</span>
        </div>

        {/* ── THE AUTHENTIC PLAYING CARD ── */}
        <div
          className="relative w-28 sm:w-36 md:w-44 aspect-[2.4/3.5] rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_35px_rgba(255,255,255,0.2)]"
          style={{
            background: 'linear-gradient(145deg, #161724 0%, #0d0e15 50%, #07070b 100%)',
            border: `1.5px solid ${suit.glowColor}90`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.85), 0 0 20px ${suit.glowColor}30, inset 0 0 15px rgba(0,0,0,0.9)`,
          }}
        >
          {/* Holographic light diagonal reflection overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity duration-300"
            style={{
              background: `linear-gradient(135deg, transparent 25%, ${suit.glowColor} 45%, transparent 65%)`,
            }}
          />

          {/* Cyber Scanline Grid Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

          {/* Inner hairline border with corner cuts */}
          <div
            className="relative w-full h-full rounded-lg border flex flex-col justify-between p-1.5 sm:p-2 select-none overflow-hidden"
            style={{
              borderColor: `${suit.glowColor}40`,
              backgroundColor: 'rgba(5, 5, 10, 0.45)',
            }}
          >
            {/* ── TOP-LEFT CORNER INDEX ── */}
            <div className="flex flex-col items-center self-start leading-none">
              <span
                className="font-display font-black text-xl sm:text-2xl tracking-tighter"
                style={{
                  color: suit.glowColor,
                  textShadow: `0 0 10px ${suit.glowColor}80`,
                }}
              >
                {suit.cardRank}
              </span>
              <span
                className="font-display font-black text-base sm:text-lg -mt-0.5"
                style={{
                  color: suit.glowColor,
                }}
              >
                {suit.symbol}
              </span>
            </div>

            {/* Top-Right Micro Tech Label */}
            <div className="absolute top-2 right-2 text-right opacity-60">
              <span className="font-mono text-[7px] sm:text-[8px] text-neutral-400 block tracking-widest">
                SYS // {suit.cardRank}
              </span>
            </div>

            {/* ── CARD CENTERPIECE: SUIT SYMBOL & GAME TITLE ── */}
            <div className="relative my-auto flex flex-col items-center justify-center text-center py-1">
              {/* Background glowing watermark symbol */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-6xl sm:text-7xl font-display font-black select-none"
                style={{ color: suit.glowColor }}
              >
                {suit.symbol}
              </div>

              {/* Glowing Center Suit Glyph */}
              <div
                className="text-3xl sm:text-4xl md:text-5xl font-display font-black leading-none drop-shadow-[0_0_15px_currentColor] transition-transform duration-300 group-hover:scale-110 mb-1"
                style={{ color: suit.glowColor }}
              >
                {suit.symbol}
              </div>

              {/* Game Name */}
              <div className="text-[9px] sm:text-[11px] font-display font-black tracking-wider text-white uppercase drop-shadow-md whitespace-nowrap">
                {suit.gameName}
              </div>

              {/* Difficulty / Role Tag */}
              <div className="text-[7px] sm:text-[8px] font-mono tracking-widest uppercase text-neutral-400 mt-0.5">
                {suit.role.split('+')[0].trim()}
              </div>
            </div>

            {/* Bottom-Left Micro Tech Crosshair */}
            <div className="absolute bottom-2 left-2 opacity-40 font-mono text-[8px] text-neutral-500">
              +
            </div>

            {/* ── BOTTOM-RIGHT INVERTED CORNER INDEX (180° Inverted) ── */}
            <div className="flex flex-col items-center self-end leading-none rotate-180">
              <span
                className="font-display font-black text-xl sm:text-2xl tracking-tighter"
                style={{
                  color: suit.glowColor,
                  textShadow: `0 0 10px ${suit.glowColor}80`,
                }}
              >
                {suit.cardRank}
              </span>
              <span
                className="font-display font-black text-base sm:text-lg -mt-0.5"
                style={{
                  color: suit.glowColor,
                }}
              >
                {suit.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Card Suit Pill Chip */}
        <div
          className={`flex items-center gap-1.5 px-3 py-0.5 mt-2 rounded-full border text-[11px] font-mono tracking-widest uppercase transition-all shadow-md group-hover:scale-105 ${suit.badgeBg}`}
        >
          <span className="font-bold">{suit.cardRank}</span>
          <span className="font-black">{suit.symbol}</span>
          <span>{suit.name} CARD</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Authentic Playing Card Dossier Popup Modal ─── */
interface CardDossierModalProps {
  suit: SuitCardGame;
  onClose: () => void;
  onOpenRegister: () => void;
}

const CardDossierModal: React.FC<CardDossierModalProps> = ({ suit, onClose, onOpenRegister }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ── REALISTIC PLAYING CARD FRAME ── */}
      <div
        className="relative w-full max-w-md sm:max-w-lg bg-gradient-to-b from-[#151520] via-[#0d0d14] to-[#07070b] rounded-3xl p-3 sm:p-4 shadow-[0_20px_70px_rgba(0,0,0,0.95)] max-h-[92vh] flex flex-col overflow-hidden"
        style={{
          border: `2px solid ${suit.glowColor}90`,
          boxShadow: `0 0 50px -10px ${suit.glowColor}40, inset 0 0 40px rgba(0,0,0,0.9)`,
        }}
      >
        {/* Subtle holographic diagonal sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            background: `linear-gradient(135deg, transparent 20%, ${suit.glowColor} 45%, transparent 60%)`,
          }}
        />

        {/* Inner Card Double Border with Corner Insets */}
        <div
          className="relative w-full h-full border border-neutral-700/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden bg-[#0a0a0f]/80"
          style={{
            borderColor: `${suit.glowColor}40`,
          }}
        >
          {/* Top-Right Floating X Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-30 p-1.5 text-neutral-400 hover:text-white bg-black/70 hover:bg-neutral-900 rounded-full border border-neutral-700/80 transition-colors"
            aria-label="Close card"
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── TOP-LEFT CARD INDEX (Rank + Suit) ── */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-col items-center leading-none select-none">
              <span
                className="text-3xl sm:text-4xl font-display font-black"
                style={{ color: suit.glowColor }}
              >
                {suit.cardRank}
              </span>
              <span
                className="text-2xl sm:text-3xl font-display font-black -mt-1"
                style={{ color: suit.glowColor }}
              >
                {suit.symbol}
              </span>
            </div>

            {/* Top Card Label */}
            <div className="text-right pr-8">
              <div
                className="text-[10px] font-mono tracking-widest uppercase font-bold"
                style={{ color: suit.glowColor }}
              >
                BORDERLAND PLAYING CARD
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                {suit.timeSlot}
              </div>
            </div>
          </div>

          {/* ── CENTER HOLOGRAPHIC CARD CREST ── */}
          <div className="relative my-2 py-3 px-2 flex flex-col items-center text-center border-y border-neutral-800/80 bg-gradient-to-b from-neutral-950/40 via-neutral-900/20 to-neutral-950/40">
            {/* Massive Glowing Suit Symbol Watermark */}
            <div
              className="text-6xl sm:text-7xl font-display font-black leading-none drop-shadow-[0_0_25px_currentColor] mb-2 select-none animate-pulse"
              style={{ color: suit.glowColor }}
            >
              {suit.symbol}
            </div>

            {/* Card Rank & Title */}
            <div className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-neutral-400 mb-0.5">
              {suit.cardRank === 'K' && 'KING OF '}
              {suit.cardRank === 'A' && 'ACE OF '}
              {suit.cardRank === 'J' && 'JACK OF '}
              {suit.cardRank === 'Q' && 'QUEEN OF '}
              {suit.name}
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-wide">
              {suit.gameName}
            </h2>

            {/* Domain & Time Slot Pill */}
            <div
              className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold border"
              style={{
                borderColor: `${suit.glowColor}50`,
                backgroundColor: `${suit.glowColor}15`,
                color: suit.glowColor,
              }}
            >
              <Clock className="w-3 h-3" />
              <span>{suit.duration}</span>
              <span className="opacity-40">•</span>
              <span>{suit.role}</span>
            </div>
          </div>

          {/* ── SCROLLABLE CARD RULES & DOSSIER PANEL ── */}
          <div className="my-2 space-y-3.5 text-xs overflow-y-auto max-h-[36vh] sm:max-h-[40vh] pr-1 font-sans">
            {/* Objective Box */}
            <div className="bg-black/60 p-3.5 rounded-xl border border-neutral-800">
              <h4 className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                <Target className="w-3.5 h-3.5 text-red-500" />
                <span>Primary Mission Objective</span>
              </h4>
              <p className="text-neutral-200 leading-relaxed text-xs">
                {suit.objective}
              </p>
            </div>

            {/* Strategic Purpose */}
            <div className="bg-black/40 p-3 rounded-xl border border-neutral-800/80">
              <h4 className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Why This Arena Exists</span>
              </h4>
              <p className="text-neutral-300 leading-relaxed text-[11px]">
                {suit.whyItExists}
              </p>
            </div>

            {/* Scoring Breakdown */}
            <div className="bg-black/40 p-3 rounded-xl border border-neutral-800/80">
              <h4 className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-bold">
                <Trophy className="w-3.5 h-3.5 text-red-500" />
                <span>Scoring & Visa Impact</span>
              </h4>
              <ul className="space-y-1.5">
                {suit.scoring.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-[11px] text-neutral-300 flex items-start gap-2 bg-neutral-900/60 p-2 rounded border border-neutral-800/60"
                  >
                    <span
                      className="font-mono font-bold shrink-0 text-[10px]"
                      style={{ color: suit.glowColor }}
                    >
                      [0{idx + 1}]
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Locked Visa Status */}
            <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded-lg flex items-center justify-between text-[10px] font-mono text-red-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                <span>SEALED UNTIL DAY 02 BRIEFING</span>
              </span>
              <span className="text-neutral-500">SRM IST ARENA</span>
            </div>
          </div>

          {/* ── BOTTOM CARD FOOTER (Inverted Corner Index & Actions) ── */}
          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between mt-auto">
            {/* Bottom-Left Inverted Rank & Suit Index (Just like real playing card) */}
            <div className="flex flex-col items-center leading-none select-none rotate-180">
              <span
                className="text-2xl sm:text-3xl font-display font-black"
                style={{ color: suit.glowColor }}
              >
                {suit.cardRank}
              </span>
              <span
                className="text-xl sm:text-2xl font-display font-black -mt-1"
                style={{ color: suit.glowColor }}
              >
                {suit.symbol}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-700 font-mono text-[11px]"
              >
                CLOSE
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-red-400/80 shadow-[0_0_15px_rgba(220,38,38,0.5)] flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <span>ENTER BORDERLAND</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
  const [selectedSuit, setSelectedSuit] = useState<SuitCardGame | null>(null);

  return (
    <>
      <section className="relative min-h-[96vh] flex flex-col justify-between items-center overflow-hidden bg-[#08080a]">
        
        {/* ══════════════════════════════════════════════════════════════════════
            BACKGROUND: ATTACHED DYSTOPIAN INVERTED CITY IMAGE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          {/* Attached Inverted City Artwork with Cloudscape */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-top"
            style={{
              backgroundImage: "url('/images/inverted_city_bg.jpg')",
              filter: 'brightness(0.92) contrast(1.15)',
            }}
          />

          {/* Vignette gradients to keep text readable while city & cars stay clear */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to top, 
                  #08080a 0%, 
                  rgba(8, 8, 10, 0.90) 18%, 
                  rgba(8, 8, 10, 0.40) 42%, 
                  transparent 70%
                ),
                linear-gradient(to bottom,
                  rgba(8, 8, 10, 0.50) 0%,
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
            HERO MAIN: 4 PLAYING CARDS SURROUNDING THE "HACKBACK" HEADLINE
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 flex flex-col items-center text-center pt-24 pb-8">
          
          {/* System Status Kicker */}
          <div className="flex items-center gap-3 px-3.5 py-1 bg-black/60 border border-red-500/40 rounded-full text-xs font-mono tracking-widest text-red-400 mb-6 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            <span>INVERTED WORLD GATEWAY ACTIVE</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-300">04 CARD SUITS ACTIVE</span>
            <span className="text-neutral-600">/</span>
            <span className="text-neutral-400">SRM IST</span>
          </div>

          {/* ── THE HEADLINE + SURROUNDING 4 PLAYING CARDS ── */}
          <div className="relative w-full max-w-5xl my-4 flex flex-col items-center justify-center">

            {/* TOP ROW CARDS: ♠ SPADES (Left) & ♦ DIAMONDS (Right) */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 md:px-14 mb-2 z-20">
              {/* Top-Left: SPADES ♠ */}
              <div className="flex flex-col items-center sm:items-start">
                <PlayingCard
                  suit={SUITS.spades}
                  angle={-8}
                  delay="0s"
                  onClick={() => setSelectedSuit(SUITS.spades)}
                />
              </div>

              {/* Top-Right: DIAMONDS ♦ */}
              <div className="flex flex-col items-center sm:items-end">
                <PlayingCard
                  suit={SUITS.diamonds}
                  angle={8}
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

            {/* BOTTOM ROW CARDS: ♣ CLUBS (Left) & ♥ HEARTS (Right) */}
            <div className="w-full flex items-center justify-between px-2 sm:px-8 md:px-14 mt-2 z-20">
              {/* Bottom-Left: CLUBS ♣ */}
              <div className="flex flex-col items-center sm:items-start">
                <PlayingCard
                  suit={SUITS.clubs}
                  angle={-6}
                  delay="1.2s"
                  onClick={() => setSelectedSuit(SUITS.clubs)}
                />
              </div>

              {/* Bottom-Right: HEARTS ♥ */}
              <div className="flex flex-col items-center sm:items-end">
                <PlayingCard
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
              <span>EXPLORE PROTOCOL</span>
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
          PLAYING CARD DOSSIER POPUP MODAL (When any car is clicked)
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedSuit && (
        <CardDossierModal
          suit={selectedSuit}
          onClose={() => setSelectedSuit(null)}
          onOpenRegister={onOpenRegister}
        />
      )}
    </>
  );
};
