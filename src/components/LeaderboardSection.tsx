import React, { useState } from 'react';
import { LeaderboardEntry } from '../types/borderland';
import { Trophy, AlertOctagon, Flame, RefreshCw } from 'lucide-react';
import { playHudClick } from '../utils/sound';

const mockTeams: LeaderboardEntry[] = [
  {
    rank: 1,
    team: 'CHISHIYA LOGIC UNIT',
    spades: 88,
    diamonds: 94,
    clubs: '--',
    hearts: '--',
    visa: 5,
    total: 182,
    status: 'HIGH RISK CHOSEN',
  },
  {
    rank: 2,
    team: 'ARISU REVERSE LABS',
    spades: 92,
    diamonds: 86,
    clubs: '--',
    hearts: '--',
    visa: 4,
    total: 178,
    status: 'ACTIVE',
  },
  {
    rank: 3,
    team: 'KUZURYU EQUILIBRIUM',
    spades: 78,
    diamonds: 90,
    clubs: '--',
    hearts: '--',
    visa: 4,
    total: 168,
    status: 'ACTIVE',
  },
  {
    rank: 4,
    team: 'AGUNI STRIKE FORCE',
    spades: 95,
    diamonds: 65,
    clubs: '--',
    hearts: '--',
    visa: 3,
    total: 160,
    status: 'ACTIVE',
  },
  {
    rank: 5,
    team: 'USAGI CLIMBERS',
    spades: 82,
    diamonds: 70,
    clubs: '--',
    hearts: '--',
    visa: 3,
    total: 152,
    status: 'ACTIVE',
  },
  {
    rank: 6,
    team: 'SHIBUYA SHADOWS',
    spades: 60,
    diamonds: 45,
    clubs: '--',
    hearts: '--',
    visa: 1,
    total: 105,
    status: 'WARNING',
  },
];

export const LeaderboardSection: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'high_risk' | 'warning'>('all');

  const filteredTeams = mockTeams.filter((t) => {
    if (filter === 'high_risk') return t.status === 'HIGH RISK CHOSEN';
    if (filter === 'warning') return t.status === 'WARNING';
    return true;
  });

  return (
    <section className="py-20 bg-[#08080a] relative border-t border-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-neutral-800">
          <div>
            <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-1">
              DAY 02 LIVE TELEMETRY PREVIEW
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              <span>LIVE BORDERLAND LEADERBOARD</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            </h2>
          </div>

          {/* Filter tabs */}
          <div className="mt-4 sm:mt-0 flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono">
            <button
              onClick={() => {
                playHudClick();
                setFilter('all');
              }}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              ALL GROUPS ({mockTeams.length})
            </button>
            <button
              onClick={() => {
                playHudClick();
                setFilter('high_risk');
              }}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'high_risk'
                  ? 'bg-red-950/60 text-red-300 border border-red-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              HIGH RISK CARD
            </button>
            <button
              onClick={() => {
                playHudClick();
                setFilter('warning');
              }}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === 'warning'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              VISA IN JEOPARDY
            </button>
          </div>
        </div>

        {/* Leaderboard Table Container */}
        <div className="bg-[#0b0c11] border border-neutral-800 rounded-lg overflow-x-auto shadow-2xl">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                <th className="py-3 px-4 w-16">RANK</th>
                <th className="py-3 px-4">PLAYER GROUP</th>
                <th className="py-3 px-3 text-center">♠ SPADES</th>
                <th className="py-3 px-3 text-center">♦ DIAMONDS</th>
                <th className="py-3 px-3 text-center">♣ CLUBS</th>
                <th className="py-3 px-3 text-center">♥ HEARTS</th>
                <th className="py-3 px-4 text-center">VISA PTS</th>
                <th className="py-3 px-4 text-right">TOTAL</th>
                <th className="py-3 px-4 text-center">ARENA STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300 tabular-nums">
              {filteredTeams.map((team) => (
                <tr
                  key={team.rank}
                  className={`hover:bg-neutral-900/50 transition-colors ${
                    team.rank === 1 ? 'bg-red-950/20' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold">
                    {team.rank === 1 ? (
                      <span className="text-red-500 flex items-center gap-1 font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        01
                      </span>
                    ) : (
                      <span className="text-neutral-500">
                        {String(team.rank).padStart(2, '0')}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-white tracking-wide">
                    {team.team}
                  </td>
                  <td className="py-3.5 px-3 text-center text-neutral-200">{team.spades}</td>
                  <td className="py-3.5 px-3 text-center text-red-400 font-semibold">
                    {team.diamonds}
                  </td>
                  <td className="py-3.5 px-3 text-center text-neutral-600">{team.clubs}</td>
                  <td className="py-3.5 px-3 text-center text-neutral-600">{team.hearts}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-bold ${
                        team.visa <= 1
                          ? 'text-red-400 bg-red-950 border border-red-800'
                          : 'text-neutral-100 bg-neutral-900 border border-neutral-700'
                      }`}
                    >
                      {String(team.visa).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white text-sm">
                    {team.total}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {team.status === 'HIGH RISK CHOSEN' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800 font-bold">
                        <Flame className="w-3 h-3 text-red-500" />
                        HIGH RISK
                      </span>
                    )}
                    {team.status === 'ACTIVE' && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                        NORMAL POINTS
                      </span>
                    )}
                    {team.status === 'WARNING' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800 font-bold animate-pulse">
                        <AlertOctagon className="w-3 h-3 text-amber-500" />
                        CRITICAL VISA
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Note on live updates */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-neutral-500 gap-2">
          <span>Display mirrors live arena projector during Day 02 games.</span>
          <span>Rank 01 & 02 qualify for The Final Duel at 16:30.</span>
        </div>

      </div>
    </section>
  );
};
