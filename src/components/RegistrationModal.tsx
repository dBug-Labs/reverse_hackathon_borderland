import React, { useState } from 'react';
import { PlayerData, TeamRegistration } from '../types/borderland';
import { X, ArrowRight, ArrowLeft, Check, Shield, AlertCircle, Sparkles, User, Users, Lock, QrCode } from 'lucide-react';
import { playHudClick, playAccessGranted } from '../utils/sound';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (registration: TeamRegistration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submittingState, setSubmittingState] = useState<
    'idle' | 'verifying' | 'issuing' | 'granted'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [teamSize, setTeamSize] = useState<number>(3);
  
  const [players, setPlayers] = useState<PlayerData[]>([
    {
      id: '1',
      name: '',
      email: '',
      phone: '',
      college: '',
      courseYear: '3rd Year B.Tech CSE',
      githubLinkedIn: '',
      role: 'Captain',
    },
    {
      id: '2',
      name: '',
      email: '',
      phone: '',
      college: '',
      courseYear: '3rd Year B.Tech CSE',
      githubLinkedIn: '',
      role: 'Investigator',
    },
    {
      id: '3',
      name: '',
      email: '',
      phone: '',
      college: '',
      courseYear: '2nd Year B.Tech IT',
      githubLinkedIn: '',
      role: 'Specialist',
    },
  ]);

  const [specialization, setSpecialization] = useState('Full-Stack Web & Systems');
  const [priorExperience, setPriorExperience] = useState('1-2 Hackathons');
  const [survivalThesis, setSurvivalThesis] = useState('');

  if (!isOpen) return null;

  // Sync teamSize with players array length
  const handleSizeChange = (newSize: number) => {
    playHudClick();
    setTeamSize(newSize);
    if (newSize > players.length) {
      const added: PlayerData[] = [];
      for (let i = players.length; i < newSize; i++) {
        added.push({
          id: String(i + 1),
          name: '',
          email: '',
          phone: '',
          college: players[0]?.college || '',
          courseYear: '3rd Year B.Tech',
          githubLinkedIn: '',
          role: i === 1 ? 'Investigator' : i === 2 ? 'Specialist' : 'Strategist',
        });
      }
      setPlayers([...players, ...added]);
    } else if (newSize < players.length) {
      setPlayers(players.slice(0, newSize));
    }
  };

  const updatePlayer = (index: number, field: keyof PlayerData, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    // If updating captain name, also sync with captainName state
    if (index === 0 && field === 'name') {
      setCaptainName(value);
    }
    setPlayers(updated);
  };

  // Step Validations
  const validateStep1 = () => {
    if (!teamName.trim()) {
      setErrorMsg('Player Group name is required to initialize registration.');
      return false;
    }
    if (!captainName.trim()) {
      setErrorMsg('Team Captain identification is required.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.name.trim()) {
        setErrorMsg(`Player ${i + 1} Name is required.`);
        return false;
      }
      if (!p.email.trim() || !p.email.includes('@')) {
        setErrorMsg(`Player ${i + 1} valid Email is required.`);
        return false;
      }
      if (!p.phone.trim() || p.phone.length < 8) {
        setErrorMsg(`Player ${i + 1} valid Contact Phone is required.`);
        return false;
      }
      if (!p.college.trim()) {
        setErrorMsg(`Player ${i + 1} College/Institution is required.`);
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  const validateStep3 = () => {
    if (!survivalThesis.trim() || survivalThesis.length < 15) {
      setErrorMsg('Please articulate a brief survival thesis (at least 15 characters).');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    playHudClick();
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    playHudClick();
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinalSubmit = () => {
    playHudClick();
    setSubmittingState('verifying');

    setTimeout(() => {
      setSubmittingState('issuing');
      setTimeout(() => {
        setSubmittingState('granted');
        playAccessGranted();

        // Create completed registration record
        const regId = `BDL-${Math.floor(100000 + Math.random() * 900000)}`;
        const record: TeamRegistration = {
          registrationId: regId,
          teamName: teamName.trim(),
          captainName: captainName.trim(),
          teamSize,
          players,
          specialization,
          priorExperience,
          survivalThesis: survivalThesis.trim(),
          initialVisaPoints: 3,
          registeredAt: new Date().toISOString(),
          status: 'CONFIRMED',
        };

        // Save to localStorage for instant persistence
        localStorage.setItem('borderland_player_reg', JSON.stringify(record));

        setTimeout(() => {
          onSuccess(record);
        }, 1200);
      }, 1000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0c12] border-2 border-red-600/70 rounded-xl max-w-3xl w-full p-5 sm:p-8 relative shadow-[0_0_60px_rgba(220,38,38,0.35)] hud-corner my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={() => {
            playHudClick();
            onClose();
          }}
          disabled={submittingState !== 'idle'}
          className="absolute top-5 right-5 p-1.5 text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-700 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pb-4 border-b border-neutral-800">
          <div className="text-[11px] font-mono tracking-widest text-red-500 uppercase flex items-center gap-2">
            <span>TERMINAL ENROLLMENT GATEWAY</span>
            <span>·</span>
            <span className="text-neutral-400">SRM IST</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
            FORM YOUR PLAYER GROUP
          </h2>
          <p className="text-xs text-neutral-400 font-sans mt-1">
            Assemble your team of 2–4 players. Complete the 4 clearance protocols to be issued your Borderland Visa.
          </p>
        </div>

        {/* Progress HUD Steps */}
        <div className="grid grid-cols-4 gap-2 mb-8 font-mono text-[11px]">
          {[
            { step: 1, label: '01 TEAM' },
            { step: 2, label: '02 PLAYERS' },
            { step: 3, label: '03 TACTICS' },
            { step: 4, label: '04 REVIEW' },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-2 rounded border text-center transition-colors ${
                currentStep === s.step
                  ? 'bg-red-950/60 text-white border-red-500 font-bold'
                  : currentStep > s.step
                  ? 'bg-neutral-900 text-neutral-300 border-neutral-700'
                  : 'bg-neutral-950 text-neutral-600 border-neutral-800'
              }`}
            >
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-800/80 rounded font-mono text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Processing Transitions */}
        {submittingState !== 'idle' ? (
          <div className="py-16 text-center space-y-4 font-mono">
            <div className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin mx-auto" />
            
            {submittingState === 'verifying' && (
              <div className="text-sm text-neutral-200 tracking-wider">
                VERIFYING PLAYER DOSSIERS...
              </div>
            )}
            {submittingState === 'issuing' && (
              <div className="text-sm text-amber-400 tracking-wider">
                SYNCHRONIZING VISA CORES (03 INITIAL POINTS)...
              </div>
            )}
            {submittingState === 'granted' && (
              <div className="text-base text-emerald-400 font-bold tracking-widest flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                <span>ACCESS GRANTED · WELCOME TO THE BORDERLAND</span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* STEP 1: TEAM */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Player Group Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Chishiya Logic Unit"
                    className="w-full bg-[#12131a] border border-neutral-700 focus:border-red-500 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none font-sans"
                  />
                  <span className="text-[11px] text-neutral-500 font-mono mt-1 block">
                    This moniker will represent your squad on the Live Borderland Arena Leaderboard.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Team Captain / Primary Lead *
                  </label>
                  <input
                    type="text"
                    value={captainName}
                    onChange={(e) => {
                      setCaptainName(e.target.value);
                      updatePlayer(0, 'name', e.target.value);
                    }}
                    placeholder="Full Name of Group Leader"
                    className="w-full bg-[#12131a] border border-neutral-700 focus:border-red-500 rounded px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-2">
                    Squad Size Selection (2 to 4 Players) *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[2, 3, 4].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleSizeChange(size)}
                        className={`p-3 rounded border text-center transition-all ${
                          teamSize === size
                            ? 'bg-red-950/60 border-red-500 text-white font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-base font-display">{size} PLAYERS</div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {size === 2 ? 'Duo Strike' : size === 3 ? 'Standard Trio' : 'Full Quad Squad'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PLAYERS */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="text-xs font-mono text-neutral-400">
                  Configure profiles for all <span className="text-red-400 font-bold">{teamSize} Players</span> in your group:
                </div>

                <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                  {players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-mono">
                        <span className="text-red-400 font-bold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          PLAYER {idx + 1} {idx === 0 && '(CAPTAIN)'}
                        </span>
                        <span className="text-neutral-500">{player.role}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">Full Name *</label>
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                            placeholder="Player Name"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">Email Address *</label>
                          <input
                            type="email"
                            value={player.email}
                            onChange={(e) => updatePlayer(idx, 'email', e.target.value)}
                            placeholder="player@university.edu"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">Mobile Contact *</label>
                          <input
                            type="tel"
                            value={player.phone}
                            onChange={(e) => updatePlayer(idx, 'phone', e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">College / Institution *</label>
                          <input
                            type="text"
                            value={player.college}
                            onChange={(e) => updatePlayer(idx, 'college', e.target.value)}
                            placeholder="e.g. SRM IST Kattankulathur"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">Department & Year</label>
                          <input
                            type="text"
                            value={player.courseYear}
                            onChange={(e) => updatePlayer(idx, 'courseYear', e.target.value)}
                            placeholder="e.g. 3rd Year B.Tech CSE"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-neutral-400 block mb-1 font-mono">GitHub / Portfolio URL</label>
                          <input
                            type="text"
                            value={player.githubLinkedIn}
                            onChange={(e) => updatePlayer(idx, 'githubLinkedIn', e.target.value)}
                            placeholder="github.com/username"
                            className="w-full bg-[#14151e] border border-neutral-700 rounded px-3 py-2 text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: TACTICS & DETAILS */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Primary Squad Specialization *
                  </label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-[#12131a] border border-neutral-700 rounded px-3.5 py-2.5 text-sm text-white outline-none font-sans"
                  >
                    <option value="Full-Stack Web & Systems">Full-Stack Web & Systems</option>
                    <option value="Software Reverse Engineering & DevTools">Software Reverse Engineering & DevTools</option>
                    <option value="Product Architecture & UX Heuristics">Product Architecture & UX Heuristics</option>
                    <option value="Security, Network Analysis & Forensics">Security, Network Analysis & Forensics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Prior Hackathon or CTF Experience
                  </label>
                  <select
                    value={priorExperience}
                    onChange={(e) => setPriorExperience(e.target.value)}
                    className="w-full bg-[#12131a] border border-neutral-700 rounded px-3.5 py-2.5 text-sm text-white outline-none font-sans"
                  >
                    <option value="First-Time Competitors">First-Time Competitors (Fresh into the arena)</option>
                    <option value="1-2 Hackathons">1-2 Hackathons / Competitions</option>
                    <option value="3+ Hackathons or CTF Finalists">3+ Hackathons or CTF Finalists</option>
                    <option value="Seasoned Product Builders">Seasoned Product Builders</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300 mb-1.5">
                    Why will your Player Group survive the Borderland? *
                  </label>
                  <textarea
                    rows={4}
                    value={survivalThesis}
                    onChange={(e) => setSurvivalThesis(e.target.value)}
                    placeholder="Briefly describe your squad's investigative approach when confronted with an unknown, undocumented codebase..."
                    className="w-full bg-[#12131a] border border-neutral-700 focus:border-red-500 rounded px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 outline-none font-sans"
                  />
                  <span className="text-[11px] text-neutral-500 font-mono mt-1 block">
                    Assists Game Masters in calibrating arena seedings and product allocations.
                  </span>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & CONFIRM */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-[#101018] border border-neutral-800 rounded-lg p-5 font-mono text-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-neutral-500">PLAYER GROUP:</span>
                    <span className="text-white font-bold text-sm tracking-wide">{teamName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-neutral-500">CAPTAIN:</span>
                    <span className="text-neutral-200">{captainName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-neutral-500">SQUAD STRENGTH:</span>
                    <span className="text-neutral-200">{teamSize} Registered Players</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-neutral-500">SPECIALIZATION:</span>
                    <span className="text-neutral-200">{specialization}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                    <span className="text-neutral-500">INITIAL VISA CREDIT:</span>
                    <span className="text-red-400 font-bold">03 VISA POINTS (ISSUED ON ENTRY)</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block mb-1">ROSTER:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-300">
                      {players.map((p, i) => (
                        <div key={p.id} className="p-2 bg-neutral-900/80 rounded border border-neutral-800">
                          <span className="text-red-500 font-bold mr-1">#{i + 1}</span>
                          <span className="font-semibold text-white">{p.name}</span>
                          <span className="text-neutral-400 block text-[10px]">{p.college}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-950/30 border border-red-900/50 rounded text-xs font-mono text-red-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-500 shrink-0" />
                  <span>By submitting, you pledge adherence to the 4 HACKBACK Protocols.</span>
                </div>
              </div>
            )}

            {/* Action Buttons Footer */}
            <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white bg-neutral-900 rounded border border-neutral-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>PREVIOUS STEP</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-mono font-bold tracking-wider text-white bg-red-600 hover:bg-red-500 rounded border border-red-500 transition-all hover:scale-[1.02]"
                >
                  <span>PROCEED TO STEP 0{currentStep + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="flex items-center gap-2 px-8 py-3 text-xs font-mono font-black tracking-widest text-white bg-red-600 hover:bg-red-500 rounded border border-red-400 shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span>ENTER THE BORDERLAND</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
