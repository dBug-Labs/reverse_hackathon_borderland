import React, { useState } from 'react';
import { Shield, Sparkles, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { playHudClick, playRiskAlarm } from '../utils/sound';

export const VisaSection: React.FC = () => {
  const [simulatedVisa, setSimulatedVisa] = useState<number>(3);
  const [eventLog, setEventLog] = useState<string>('Initial Visa balance credited upon arena entry.');

  const handleSimulate = (change: number, message: string) => {
    playHudClick();
    if (change < 0) {
      playRiskAlarm();
    }
    setSimulatedVisa((prev) => Math.max(0, prev + change));
    setEventLog(message);
  };

  const resetSimulator = () => {
    playHudClick();
    setSimulatedVisa(3);
    setEventLog('Initial Visa balance reset to 03 Points.');
  };

  return (
    <section id="visa" className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-2">
            SURVIVAL METRIC
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white tracking-tight mb-4">
            THE PLAYER VISA SYSTEM
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed">
            In the Borderland, your Visa is your lifeline. Every Player Group enters with 3 Visa Points.
            Superior deductions expand your Visa; fatal mistakes or reckless bluffs deplete it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Visual Digital Player Visa Card (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#181114] via-[#100d11] to-[#0a080a] border-2 border-red-600/70 rounded-xl p-6 relative glow-red-box text-neutral-100 font-mono shadow-2xl">
              
              {/* Corner Watermarks */}
              <div className="absolute top-2 left-2 text-[10px] text-red-500/40 select-none">BDL-SYS</div>
              <div className="absolute top-2 right-2 text-[10px] text-red-500/40 select-none">AUTH-01</div>

              {/* Visa Header */}
              <div className="text-center pb-4 border-b border-red-900/50 mb-6">
                <div className="text-[11px] tracking-[0.3em] uppercase text-red-400 font-bold mb-1">
                  PLAYER VISA
                </div>
                <div className="text-[10px] text-neutral-500 tracking-wider">
                  BORDERLAND PROTOCOL PASSPORT
                </div>
              </div>

              {/* ID & Team Fields */}
              <div className="space-y-3 mb-6 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">PLAYER ID:</span>
                  <span className="text-neutral-200 font-bold tracking-widest">BDL-79402X</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">PLAYER GROUP:</span>
                  <span className="text-neutral-200 font-bold">ARISU REVERSE LABS</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800">
                  <span className="text-neutral-500">SECURITY TIER:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE SURVIVOR</span>
                </div>
              </div>

              {/* Visa Points Visual Gauge */}
              <div className="bg-neutral-950/80 border border-red-900/60 rounded-lg p-4 text-center mb-6 relative overflow-hidden">
                <div className="text-[11px] text-neutral-400 tracking-widest uppercase mb-1">
                  CURRENT VISA BALANCE
                </div>
                <div className={`text-6xl font-display font-black tracking-tight ${simulatedVisa === 0 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                  {String(simulatedVisa).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-red-400 tracking-widest uppercase mt-1">
                  {simulatedVisa === 0 ? 'VISA EXPIRED · ELIMINATION' : 'DAYS OF RESIDENCE'}
                </div>
              </div>

              {/* 4 Suits Insignia Barcode */}
              <div className="flex items-center justify-between text-2xl px-2 py-3 bg-neutral-950/50 rounded border border-neutral-800/80 mb-6">
                <span className="text-white hover:text-red-500 transition-colors">♠</span>
                <span className="text-red-500 hover:text-red-400 transition-colors">♦</span>
                <span className="text-white hover:text-red-500 transition-colors">♣</span>
                <span className="text-red-500 hover:text-red-400 transition-colors">♥</span>
              </div>

              {/* Barcode & Security Strip */}
              <div className="text-center pt-2">
                <div className="h-6 flex items-center justify-center gap-0.5 opacity-60 mb-2">
                  {[...Array(38)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-neutral-300 h-full"
                      style={{ width: `${(i % 3) + 1}px` }}
                    />
                  ))}
                </div>
                <div className="text-[9px] tracking-widest text-neutral-500 uppercase">
                  BORDERLAND PROTOCOL · AUTHENTICATED
                </div>
              </div>

            </div>
          </div>

          {/* Explanation & Interactive Test Simulator (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0c0c12] border border-neutral-800 rounded-lg p-6 sm:p-8">
              <h3 className="text-xl font-heading font-bold text-white mb-3">
                How Visa Points Control Your Fate
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 font-sans leading-relaxed mb-6">
                Unlike ordinary hackathons where a poor round just lowers your aggregate percentage, in the Borderland your Visa represents active residency. Performance in each suit game awards or deducts points. If your Visa count drops to zero, your team is flagged for elimination.
              </p>

              {/* Simulator Controls */}
              <div className="pt-4 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    Interactive Visa Fluctuation Simulator
                  </span>
                  <button
                    onClick={resetSimulator}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 hover:text-white px-2 py-1 bg-neutral-900 border border-neutral-800 rounded transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset to 03</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 font-mono text-xs">
                  <button
                    onClick={() => handleSimulate(2, '♠ The Sprint: Finished 1st in speed checklist! (+2 Visa Points)')}
                    className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500 rounded text-left text-neutral-200 transition-colors"
                  >
                    <span className="text-emerald-400 font-bold block mb-0.5">+2 VISA</span>
                    Win ♠ Spades Speed Checklist
                  </button>

                  <button
                    onClick={() => handleSimulate(3, '♦ High Risk Card: Successfully defended forensic diagnosis! (+3 Visa Points)')}
                    className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500 rounded text-left text-neutral-200 transition-colors"
                  >
                    <span className="text-emerald-400 font-bold block mb-0.5">+3 VISA</span>
                    High Risk ♦ Deduction Succeeded
                  </button>

                  <button
                    onClick={() => handleSimulate(-2, '♣ Trading Floor: Caught disseminating falsified intel! (-2 Visa Points Penalty)')}
                    className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-red-500 rounded text-left text-neutral-200 transition-colors"
                  >
                    <span className="text-red-400 font-bold block mb-0.5">-2 VISA</span>
                    Caught Sabotaging ♣ Trading Floor
                  </button>

                  <button
                    onClick={() => handleSimulate(-2, '♦ High Risk Failure: Theoretical diagnosis rejected by Game Masters! (-2 Visa Points)')}
                    className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-red-500 rounded text-left text-neutral-200 transition-colors"
                  >
                    <span className="text-red-400 font-bold block mb-0.5">-2 VISA</span>
                    High Risk ♦ Deduction Failed
                  </button>
                </div>

                {/* Event Feedback Banner */}
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded font-mono text-xs text-neutral-300 flex items-center gap-2">
                  <span className="text-red-500 font-bold">LOG:</span>
                  <span className="truncate">{eventLog}</span>
                </div>
              </div>
            </div>

            {/* Crucial Visa Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
                <span className="text-neutral-500 block mb-1">RULE 01</span>
                <span className="text-neutral-200">Start with 3 Visa Points at 09:00 Check-In</span>
              </div>
              <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
                <span className="text-neutral-500 block mb-1">RULE 02</span>
                <span className="text-neutral-200">Scores sync to Live Arena Display in real time</span>
              </div>
              <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
                <span className="text-neutral-500 block mb-1">RULE 03</span>
                <span className="text-red-400 font-bold">Top 2 Visa totals advance to Final Duel</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
