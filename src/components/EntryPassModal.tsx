import React from 'react';
import { TeamRegistration } from '../types/borderland';
import { X, Printer, ShieldCheck, MapPin, Clock, Calendar, QrCode, Download, Share2 } from 'lucide-react';
import { playHudClick } from '../utils/sound';

interface EntryPassModalProps {
  registration: TeamRegistration | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EntryPassModal: React.FC<EntryPassModalProps> = ({
  registration,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !registration) return null;

  const handlePrint = () => {
    playHudClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="max-w-2xl w-full my-8 relative animate-in fade-in duration-200">
        
        {/* Modal Controls Top Bar */}
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold tracking-wider">OFFICIAL BORDERLAND ENTRY PASS</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 rounded border border-neutral-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT PASS</span>
            </button>
            <button
              onClick={() => {
                playHudClick();
                onClose();
              }}
              className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Pass Container */}
        <div
          id="borderland-entry-ticket"
          className="bg-gradient-to-b from-[#181114] via-[#0f0d11] to-[#08080a] border-2 border-red-600 rounded-xl p-6 sm:p-8 relative glow-red-box text-neutral-100 font-mono shadow-2xl hud-corner"
        >
          {/* Top Stamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-red-900/60 gap-4">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase text-red-500 font-bold mb-1 flex items-center gap-2">
                <span>BORDERLAND ENTRY PASS</span>
                <span className="text-neutral-500">/</span>
                <span>AUTHENTICATED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">
                HACKBACK
              </h2>
              <div className="text-xs text-neutral-400 font-sans mt-0.5">
                2-Day Reverse Hackathon · dBug Labs × SRM IST
              </div>
            </div>

            <div className="bg-red-950/60 border border-red-600/80 rounded px-3 py-2 text-right">
              <div className="text-[10px] text-neutral-400">REGISTRATION ID</div>
              <div className="text-lg font-bold text-red-400 tracking-widest">
                {registration.registrationId}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">STATUS: CONFIRMED</div>
            </div>
          </div>

          {/* Success Banner */}
          <div className="my-6 p-4 bg-red-950/30 border border-red-800/40 rounded-lg flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-red-400 font-bold tracking-wider">
                ACCESS GRANTED · WELCOME, PLAYER.
              </div>
              <div className="text-xs text-neutral-300 font-sans mt-0.5">
                Your entry has been securely registered in the Borderland database.
              </div>
            </div>
            <div className="flex items-center gap-3 text-lg font-display">
              <span className="text-white">♠</span>
              <span className="text-red-500">♦</span>
              <span className="text-white">♣</span>
              <span className="text-red-500">♥</span>
            </div>
          </div>

          {/* Key Event Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs">
            <div className="p-3 bg-neutral-950/60 rounded border border-neutral-800 space-y-1">
              <div className="text-neutral-500 text-[10px]">PLAYER GROUP NAME</div>
              <div className="text-sm font-bold text-white tracking-wide">
                {registration.teamName}
              </div>
              <div className="text-neutral-400 text-[11px]">
                Captain: {registration.captainName}
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded border border-neutral-800 space-y-1">
              <div className="text-neutral-500 text-[10px]">VISA ALLOCATION</div>
              <div className="text-sm font-bold text-red-400">
                03 VISA POINTS
              </div>
              <div className="text-neutral-400 text-[11px]">
                Status: Credited on Day 02 check-in
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded border border-neutral-800 space-y-1">
              <div className="text-neutral-500 text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-400" />
                OPERATIONAL TIMINGS
              </div>
              <div className="text-xs font-semibold text-neutral-200">
                09:00 — 17:00 DAILY
              </div>
              <div className="text-neutral-400 text-[11px]">
                Reporting Time: 09:00 AM Sharp
              </div>
            </div>

            <div className="p-3 bg-neutral-950/60 rounded border border-neutral-800 space-y-1">
              <div className="text-neutral-500 text-[10px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" />
                ARENA VENUE
              </div>
              <div className="text-xs font-semibold text-neutral-200">
                SRM IST Main Campus
              </div>
              <div className="text-neutral-400 text-[11px]">
                Kattankulathur, Chennai
              </div>
            </div>
          </div>

          {/* Roster & QR Code Check-In Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-neutral-800">
            {/* Roster */}
            <div className="space-y-1.5 w-full sm:w-auto">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                REGISTERED ROSTER ({registration.teamSize} PLAYERS)
              </div>
              <div className="space-y-1">
                {registration.players.map((p, i) => (
                  <div key={p.id} className="text-xs flex items-center gap-2">
                    <span className="text-red-500 font-bold text-[11px]">0{i + 1}.</span>
                    <span className="text-neutral-200 font-medium">{p.name}</span>
                    <span className="text-neutral-500 text-[10px]">({p.college})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated High-Tech QR Code */}
            <div className="flex flex-col items-center p-3 bg-white text-black rounded-lg shrink-0">
              <div className="w-24 h-24 bg-white flex flex-col justify-between p-1 relative">
                {/* SVG QR Code Pattern */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-black">
                  <rect x="5" y="5" width="25" height="25" fill="black" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="13" y="13" width="9" height="9" fill="black" />

                  <rect x="70" y="5" width="25" height="25" fill="black" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="78" y="13" width="9" height="9" fill="black" />

                  <rect x="5" y="70" width="25" height="25" fill="black" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <rect x="13" y="78" width="9" height="9" fill="black" />

                  {/* Matrix bits */}
                  <rect x="35" y="10" width="10" height="5" fill="black" />
                  <rect x="50" y="5" width="15" height="5" fill="black" />
                  <rect x="35" y="25" width="5" height="15" fill="black" />
                  <rect x="45" y="20" width="10" height="10" fill="black" />
                  <rect x="60" y="25" width="5" height="10" fill="black" />

                  <rect x="25" y="45" width="10" height="10" fill="black" />
                  <rect x="40" y="40" width="20" height="8" fill="black" />
                  <rect x="45" y="55" width="12" height="12" fill="black" />
                  <rect x="65" y="45" width="10" height="5" fill="black" />
                  <rect x="80" y="50" width="12" height="15" fill="black" />

                  <rect x="35" y="75" width="15" height="8" fill="black" />
                  <rect x="60" y="70" width="10" height="15" fill="black" />
                  <rect x="75" y="75" width="15" height="10" fill="black" />
                </svg>
              </div>
              <div className="text-[9px] font-mono font-bold tracking-wider text-black mt-1">
                CHECK-IN VERIFIED
              </div>
            </div>
          </div>

          {/* Barcode & Security Strip */}
          <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
            <div className="h-5 flex items-center justify-center gap-0.5 opacity-40 mb-1">
              {[...Array(46)].map((_, i) => (
                <div
                  key={i}
                  className="bg-neutral-300 h-full"
                  style={{ width: `${(i % 3) + 1}px` }}
                />
              ))}
            </div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
              HACKBACK · SECURE CLEARANCE LEVEL 04
            </div>
          </div>
        </div>

        {/* Instructions footer */}
        <div className="mt-4 text-center text-xs font-mono text-neutral-500">
          Present this digital or printed pass at the Day 01 & Day 02 check-in terminals.
        </div>

      </div>
    </div>
  );
};
