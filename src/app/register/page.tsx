'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Copy,
  CheckCircle2,
  Users,
  QrCode,
  Lock,
  ExternalLink,
  Info,
  Clock,
} from 'lucide-react';
import { playHudClick, playAccessGranted } from '@/utils/sound';

interface PlayerFormState {
  name: string;
  email: string;
  regNo: string;
  phone: string;
  year: string;
  department: string;
  college: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);

  // Step 1 State
  const [teamName, setTeamName] = useState('');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [players, setPlayers] = useState<PlayerFormState[]>([
    {
      name: '',
      email: '',
      regNo: '',
      phone: '',
      year: '2',
      department: 'CSE',
      college: 'SRM Institute of Science and Technology',
    },
    {
      name: '',
      email: '',
      regNo: '',
      phone: '',
      year: '2',
      department: 'CSE',
      college: 'SRM Institute of Science and Technology',
    },
    {
      name: '',
      email: '',
      regNo: '',
      phone: '',
      year: '2',
      department: 'CSE',
      college: 'SRM Institute of Science and Technology',
    },
  ]);

  // Step 2 & 3 State
  const [teamId, setTeamId] = useState<string>('');
  const [fee, setFee] = useState<number>(300);
  const [upiId, setUpiId] = useState<string>('dbuglabs@upi');
  const [payeeName, setPayeeName] = useState<string>('SRM DBUG Labs');
  const [utr, setUtr] = useState<string>('');
  const [confirmUtr, setConfirmUtr] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [paymentSuccessStatus, setPaymentSuccessStatus] = useState<string>('PAYMENT_SUBMITTED');

  // Handle Team Size change
  const handleTeamSizeChange = (newSize: number) => {
    playHudClick();
    setTeamSize(newSize);
    if (newSize > players.length) {
      const added: PlayerFormState[] = [];
      for (let i = players.length; i < newSize; i++) {
        added.push({
          name: '',
          email: '',
          regNo: '',
          phone: '',
          year: '2',
          department: 'CSE',
          college: 'SRM Institute of Science and Technology',
        });
      }
      setPlayers([...players, ...added]);
    } else if (newSize < players.length) {
      setPlayers(players.slice(0, newSize));
    }
  };

  const updatePlayer = (index: number, field: keyof PlayerFormState, value: string) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);

    // Clear field-specific error if present
    const errKey = `players.${index}.${field}`;
    if (errors[errKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!teamName.trim() || teamName.length < 3 || teamName.length > 30) {
      newErrors.teamName = 'Team name must be between 3 and 30 characters';
    }

    if (!consent) {
      newErrors.consent = 'You must accept the protocol rules to continue';
    }

    const emailRegex = /^[a-z0-9._%+-]+@srmist\.edu\.in$/i;
    const regNoRegex = /^RA\d{13}$/i;
    const phoneRegex = /^[6-9]\d{9}$/;

    const seenEmails = new Set<string>();
    const seenRegNos = new Set<string>();

    players.slice(0, teamSize).forEach((p, idx) => {
      if (!p.name.trim() || p.name.trim().length < 2) {
        newErrors[`players.${idx}.name`] = 'Full name is required';
      }

      const cleanEmail = p.email.trim().toLowerCase();
      if (!emailRegex.test(cleanEmail)) {
        newErrors[`players.${idx}.email`] = 'Must be an official @srmist.edu.in email';
      } else if (seenEmails.has(cleanEmail)) {
        newErrors[`players.${idx}.email`] = 'Duplicate email within the team';
      } else {
        seenEmails.add(cleanEmail);
      }

      const cleanReg = p.regNo.trim().toUpperCase();
      if (!regNoRegex.test(cleanReg)) {
        newErrors[`players.${idx}.regNo`] = 'Enter valid SRM register number (e.g. RA2311003010123)';
      } else if (seenRegNos.has(cleanReg)) {
        newErrors[`players.${idx}.regNo`] = 'Duplicate register number within the team';
      } else {
        seenRegNos.add(cleanReg);
      }

      const cleanPhone = p.phone.replace(/\+91|\s|-/g, '').trim();
      if (idx === 0) {
        if (!phoneRegex.test(cleanPhone)) {
          newErrors[`players.${idx}.phone`] = 'Team leader must provide a 10-digit WhatsApp number';
        }
      } else if (cleanPhone.length > 0 && !phoneRegex.test(cleanPhone)) {
        newErrors[`players.${idx}.phone`] = 'Must be a valid 10-digit mobile number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Step 1
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    playHudClick();
    setGlobalError(null);

    if (!validateStep1()) {
      setGlobalError('Please fix the highlighted errors before continuing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          teamSize,
          players: players.slice(0, teamSize),
          consent,
          website: honeypot, // Honeypot
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.fields) {
          setErrors(data.fields);
        }
        setGlobalError(data.message || 'Registration failed. Please review your entries.');
        setIsSubmitting(false);
        return;
      }

      // Success Step 1
      playAccessGranted();
      setTeamId(data.registrationId);
      setFee(data.fee || 300);
      setUpiId(data.upiId || 'dbuglabs@upi');
      setPayeeName(data.payeeName || 'SRM DBUG Labs');
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setGlobalError('Network communication failure. Please verify your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Step 2 (UTR Proof)
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    playHudClick();
    setGlobalError(null);

    const cleanUtr = utr.trim();
    const cleanConfirm = confirmUtr.trim();

    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrors({ utr: 'UTR must be exactly 12 digits from your payment app' });
      return;
    }

    if (cleanUtr !== cleanConfirm) {
      setErrors({ confirmUtr: 'The two UTR entries do not match' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/registrations/${teamId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          utr: cleanUtr,
          confirmUtr: cleanConfirm,
          amount: fee,
          payerName: payerName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.fields) {
          setErrors(data.fields);
        }
        setGlobalError(data.message || 'Payment submission failed.');
        setIsSubmitting(false);
        return;
      }

      playAccessGranted();
      setPaymentSuccessStatus(data.status || 'PAYMENT_SUBMITTED');
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setGlobalError('Payment submission failed due to network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'upi' | 'teamId') => {
    playHudClick();
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedTeamId(true);
      setTimeout(() => setCopiedTeamId(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#ededed] font-sans selection:bg-red-600/30 selection:text-red-200 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.12)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          <Link
            href="/"
            onClick={() => playHudClick()}
            className="flex items-center gap-2 text-sm font-mono text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" />
            <span>RETURN TO BASE</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-red-500 bg-red-950/40 border border-red-800/60 px-3 py-1 rounded">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            BORDERLAND PROTOCOL REGISTRATION
          </div>
        </div>

        {/* Stepper Header */}
        <div className="mb-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            {/* Step 1 */}
            <div
              className={`p-3 rounded border transition-all ${
                currentStep === 1
                  ? 'bg-neutral-900 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                  : currentStep > 1
                  ? 'bg-neutral-950/60 border-emerald-800/80 text-emerald-400'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1">
                Phase 01 {currentStep > 1 && '✓'}
              </div>
              <div className="text-xs sm:text-sm font-bold truncate">Team Intel</div>
            </div>

            {/* Step 2 */}
            <div
              className={`p-3 rounded border transition-all ${
                currentStep === 2
                  ? 'bg-neutral-900 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                  : currentStep > 2
                  ? 'bg-neutral-950/60 border-emerald-800/80 text-emerald-400'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1">
                Phase 02 {currentStep > 2 && '✓'}
              </div>
              <div className="text-xs sm:text-sm font-bold truncate">UPI Protocol</div>
            </div>

            {/* Step 3 */}
            <div
              className={`p-3 rounded border transition-all ${
                currentStep === 3
                  ? 'bg-neutral-900 border-emerald-600 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-neutral-950/40 border-neutral-800 text-neutral-500'
              }`}
            >
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1">Phase 03</div>
              <div className="text-xs sm:text-sm font-bold truncate">Clearance Pass</div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded bg-red-950/60 border border-red-600 text-red-200 flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm font-mono">{globalError}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: TEAM INTEL FORM */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-8">
            {/* Honeypot field (hidden for spam bots) */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Team Configuration Box */}
            <div className="p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 relative">
              <div className="text-xs font-mono tracking-widest text-red-500 uppercase mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>TEAM SPECIFICATIONS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Team Name */}
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-2">
                    TEAM CALLSIGN / NAME <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CYBER_SHADOWS"
                    value={teamName}
                    onChange={(e) => {
                      setTeamName(e.target.value);
                      if (errors.teamName) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.teamName;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-mono text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 transition-colors ${
                      errors.teamName ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.teamName && (
                    <p className="mt-1 text-xs text-red-400 font-mono">{errors.teamName}</p>
                  )}
                </div>

                {/* Team Size Segmented Control */}
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-2">
                    OPERATIVE CAPACITY (PLAYERS) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleTeamSizeChange(size)}
                        className={`py-2.5 rounded font-mono text-sm font-bold border transition-all ${
                          teamSize === size
                            ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {size} Players
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Players Blocks */}
            <div className="space-y-6">
              {players.slice(0, teamSize).map((player, idx) => {
                const isLeader = idx === 0;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 relative transition-all hover:border-neutral-700"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs font-bold ${
                            isLeader
                              ? 'bg-red-600 text-white'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          P{idx + 1}
                        </span>
                        <span className="font-heading font-bold text-sm tracking-wide text-white">
                          {isLeader ? 'CAPTAIN / LEADER (PRIMARY COMM)' : `OPERATIVE 0${idx + 1}`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase">
                        {isLeader ? 'Lead Coordinator' : 'Team Member'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          FULL NAME <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aarav Sharma"
                          value={player.name}
                          onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 ${
                            errors[`players.${idx}.name`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.name`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-mono">
                            {errors[`players.${idx}.name`]}
                          </p>
                        )}
                      </div>

                      {/* SRM Email */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          SRM EMAIL (@srmist.edu.in) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="as1234@srmist.edu.in"
                          value={player.email}
                          onChange={(e) => updatePlayer(idx, 'email', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 ${
                            errors[`players.${idx}.email`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.email`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-mono">
                            {errors[`players.${idx}.email`]}
                          </p>
                        )}
                      </div>

                      {/* Register Number */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          SRM REGISTER NO. <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="RA2311003010123"
                          value={player.regNo}
                          onChange={(e) => updatePlayer(idx, 'regNo', e.target.value.toUpperCase())}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 ${
                            errors[`players.${idx}.regNo`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.regNo`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-mono">
                            {errors[`players.${idx}.regNo`]}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          WHATSAPP PHONE {isLeader && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="tel"
                          required={isLeader}
                          placeholder={isLeader ? '9876543210 (Required)' : 'Optional'}
                          value={player.phone}
                          onChange={(e) => updatePlayer(idx, 'phone', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 ${
                            errors[`players.${idx}.phone`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.phone`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-mono">
                            {errors[`players.${idx}.phone`]}
                          </p>
                        )}
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          ACADEMIC YEAR
                        </label>
                        <select
                          value={player.year}
                          onChange={(e) => updatePlayer(idx, 'year', e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-mono text-xs text-white focus:outline-none focus:border-red-500"
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="PG">Postgraduate</option>
                        </select>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          DEPARTMENT
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CSE / IT / ECE"
                          value={player.department}
                          onChange={(e) => updatePlayer(idx, 'department', e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consent Checkbox */}
            <div className="p-4 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (errors.consent) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.consent;
                        return n;
                      });
                    }
                  }}
                  className="mt-1 w-4 h-4 rounded border-neutral-700 text-red-600 focus:ring-0 focus:ring-offset-0 bg-neutral-950 cursor-pointer accent-red-600"
                />
                <span className="text-xs text-neutral-300 font-sans leading-relaxed">
                  I accept the{' '}
                  <span className="text-red-400 font-bold">Borderland Protocol Rules</span> and
                  confirm all operatives are current SRM students with legitimate SRM register
                  numbers. I understand that registration entry is secured upon manual UPI payment
                  verification.
                </span>
              </label>
              {errors.consent && (
                <p className="mt-2 text-xs text-red-400 font-mono">{errors.consent}</p>
              )}
            </div>

            {/* Submit Step 1 Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-mono font-bold tracking-wider text-xs sm:text-sm rounded border border-red-500 flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>TRANSMITTING INTEL...</span>
                  </>
                ) : (
                  <>
                    <span>CONTINUE TO PAYMENT PROTOCOL</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: UPI PAYMENT & QR CODE PLACEHOLDER */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Team ID Issued Header */}
            <div className="p-6 rounded-lg bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-red-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-red-400 uppercase">
                  REGISTRATION ALLOCATED
                </div>
                <div className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-3">
                  <span>TEAM ID:</span>
                  <span className="text-red-500 font-mono tracking-wider">{teamId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(teamId, 'teamId')}
                className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs flex items-center gap-2 border border-neutral-700"
              >
                {copiedTeamId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>COPY ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Payment Protocol & QR Placeholder Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: QR Code Display Card */}
              <div className="md:col-span-5 p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 text-center flex flex-col items-center">
                <div className="text-xs font-mono text-neutral-400 mb-3 tracking-widest uppercase flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-red-500" />
                  <span>OFFICIAL UPI QR</span>
                </div>

                {/* QR Code Container */}
                <div className="w-64 h-64 p-2 bg-[#09090c] rounded-xl border border-red-900/60 shadow-[0_0_25px_rgba(220,38,38,0.2)] flex items-center justify-center relative mb-4">
                  <Image
                    src="/qr-placeholder.svg"
                    alt="UPI Payment QR Code Placeholder"
                    width={240}
                    height={240}
                    className="w-full h-full object-contain"
                    priority
                  />
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[9px] font-mono text-neutral-400">
                    SAMPLE QR
                  </div>
                </div>

                <div className="text-[11px] font-mono text-neutral-400">
                  Scan using GPay, PhonePe, Paytm, or BHIM
                </div>
              </div>

              {/* Right Column: Payment Details & Critical Instructions */}
              <div className="md:col-span-7 space-y-4">
                {/* Fee & UPI Card */}
                <div className="p-5 rounded-lg bg-[#0e0e13] border border-neutral-800 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                    <span className="text-xs font-mono text-neutral-400 uppercase">
                      ENTRY PROTOCOL FEE
                    </span>
                    <span className="text-2xl font-bold font-mono text-white">₹{fee}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                      UPI RECIPIENT ID
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-mono text-sm text-red-400 select-all">
                        {upiId}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiId, 'upi')}
                        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-200 font-mono text-xs border border-neutral-700 flex items-center gap-1.5"
                      >
                        {copiedUpi ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>{copiedUpi ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-mono text-neutral-400">
                    Payee Account: <span className="text-neutral-200">{payeeName}</span>
                  </div>
                </div>

                {/* CRITICAL NOTE ALERT */}
                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono leading-relaxed">
                    <strong className="text-amber-300 block mb-1">
                      CRITICAL REQUIREMENT — ADD NOTE:
                    </strong>
                    When completing payment in your UPI app, type{' '}
                    <strong className="text-white underline">{teamId}</strong> in the payment
                    note / remarks. This enables instantaneous matching during manual admin review.
                  </div>
                </div>
              </div>
            </div>

            {/* UTR Submission Form */}
            <form
              onSubmit={handleStep2Submit}
              className="p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 space-y-6"
            >
              <div className="text-xs font-mono tracking-widest text-red-500 uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>SUBMIT PAYMENT VERIFICATION PROOF</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* UTR Input */}
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    12-DIGIT UPI TRANSACTION ID / UTR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 423456789012"
                    value={utr}
                    onChange={(e) => {
                      setUtr(e.target.value.replace(/\D/g, ''));
                      if (errors.utr) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.utr;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-mono text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-red-500 ${
                      errors.utr ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.utr ? (
                    <p className="mt-1 text-xs text-red-400 font-mono">{errors.utr}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-neutral-500 font-mono">
                      GPay: UPI Txn ID · PhonePe: UTR · Paytm: UPI Ref No.
                    </p>
                  )}
                </div>

                {/* Confirm UTR */}
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    CONFIRM 12-DIGIT UTR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Re-enter 12-digit UTR"
                    value={confirmUtr}
                    onChange={(e) => {
                      setConfirmUtr(e.target.value.replace(/\D/g, ''));
                      if (errors.confirmUtr) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.confirmUtr;
                          return n;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-mono text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-red-500 ${
                      errors.confirmUtr ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.confirmUtr && (
                    <p className="mt-1 text-xs text-red-400 font-mono">{errors.confirmUtr}</p>
                  )}
                </div>

                {/* Payer Name / Account */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    PAYER NAME / UPI ID (OPTIONAL — ACCELERATES VERIFICATION)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aarav Sharma / aarav@oksbi"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded font-mono text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Submit Proof Button */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playHudClick();
                    setCurrentStep(1);
                  }}
                  className="px-4 py-2.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
                >
                  ← EDIT INTEL
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-mono font-bold tracking-wider text-xs sm:text-sm rounded border border-red-500 flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>VALIDATING UTR...</span>
                    </>
                  ) : (
                    <>
                      <span>SUBMIT PROOF & COMPLETE</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: CLEARANCE STATUS & CONFIRMATION */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="p-8 rounded-xl bg-[#0e0e13] border border-neutral-800 text-center space-y-6 animate-fadeIn">
            {/* Success Shield Icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono tracking-widest text-emerald-400 uppercase mb-2">
                ENTRY SUBMISSION RECORDED
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
                WELCOME TO THE BORDERLAND
              </h2>
              <p className="text-sm font-sans text-neutral-400 max-w-lg mx-auto">
                Your payment proof has been queued for organizer verification. Save your Team ID
                below for entry and verification status.
              </p>
            </div>

            {/* Team ID Card */}
            <div className="max-w-md mx-auto p-5 rounded-lg bg-neutral-900/80 border border-neutral-700/80">
              <div className="text-[11px] font-mono text-neutral-400 uppercase mb-1">
                TEAM REGISTRATION ID
              </div>
              <div className="text-3xl font-mono font-bold text-red-500 tracking-widest mb-3">
                {teamId}
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-600/70 text-amber-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>STATUS: {paymentSuccessStatus.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Team Summary Info */}
            <div className="max-w-md mx-auto text-left p-4 rounded bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-2">
              <div className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Callsign:</span>
                <span className="text-white font-bold">{teamName}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Operatives:</span>
                <span className="text-neutral-300">{teamSize} Members</span>
              </div>
              <div className="flex justify-between border-b border-neutral-800/80 pb-1.5">
                <span className="text-neutral-500">Submitted UTR:</span>
                <span className="text-neutral-300 tracking-wider">{utr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Review Window:</span>
                <span className="text-emerald-400">Within 2–4 Hours</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => copyToClipboard(teamId, 'teamId')}
                className="w-full sm:w-auto px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold rounded border border-neutral-700 flex items-center justify-center gap-2 transition-colors"
              >
                {copiedTeamId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">COPIED TEAM ID</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPY TEAM ID</span>
                  </>
                )}
              </button>

              <Link
                href="/"
                onClick={() => playHudClick()}
                className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded border border-red-500 flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.35)]"
              >
                <span>RETURN TO PROTOCOL HQ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
