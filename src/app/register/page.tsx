'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Copy,
  Users,
  QrCode,
  Lock,
  Info,
  Clock,
} from 'lucide-react';
import { playHudClick, playAccessGranted } from '@/utils/sound';
import { RegisterShell } from '@/components/RegisterShell';
import { UpiQr } from '@/components/UpiQr';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

// The API names the player field `fullName`; this form calls it `name`.
function toFormErrors(fields: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, msg] of Object.entries(fields)) {
    mapped[key.replace(/\.fullName$/, '.name')] = msg;
  }
  return mapped;
}

interface PlayerFormState {
  name: string;
  email: string;
  regNo: string;
  phone: string;
  year: string;
  department: string;
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
    },
    {
      name: '',
      email: '',
      regNo: '',
      phone: '',
      year: '2',
      department: 'CSE',
    },
    {
      name: '',
      email: '',
      regNo: '',
      phone: '',
      year: '2',
      department: 'CSE',
    },
  ]);

  // Step 2 & 3 State
  const [teamId, setTeamId] = useState<string>('');
  const [fee, setFee] = useState<number>(199);
  const [upiId, setUpiId] = useState<string>('shauryaaojha@oksbi');
  const [payeeName, setPayeeName] = useState<string>('SRM DBUG Labs');
  const [utr, setUtr] = useState<string>('');
  const [confirmUtr, setConfirmUtr] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [paymentSuccessStatus, setPaymentSuccessStatus] = useState<string>('UNDER_REVIEW');

  // API plumbing: idempotency key + time-trap for Step 1, pay token for Step 2
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const formOpenedAt = useRef(Date.now());
  const [resumeToken, setResumeToken] = useState('');
  const [upiQrString, setUpiQrString] = useState('');
  const [registerToken, setRegisterToken] = useState('');
  const [paymentToken, setPaymentToken] = useState('');
  const registerTurnstile = useRef<TurnstileInstance | undefined>(undefined);
  const paymentTurnstile = useRef<TurnstileInstance | undefined>(undefined);

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
          players: players.slice(0, teamSize).map((p, idx) => ({
            slot: idx + 1,
            isLeader: idx === 0,
            fullName: p.name.trim(),
            email: p.email.trim().toLowerCase(),
            regNo: p.regNo.trim().toUpperCase(),
            phone: p.phone.trim() || undefined,
            year: p.year || undefined,
            department: p.department.trim() || undefined,
          })),
          consent,
          website: honeypot, // Honeypot
          _formOpenedAt: formOpenedAt.current,
          turnstileToken: registerToken,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.fields) {
          setErrors(toFormErrors(data.fields));
        }
        setGlobalError(data.message || 'Registration failed. Please review your entries.');
        // Turnstile tokens are single-use — get a fresh one for the retry
        setRegisterToken('');
        registerTurnstile.current?.reset();
        setIsSubmitting(false);
        return;
      }

      // Success Step 1
      const result = data.data;
      playAccessGranted();
      setTeamId(result.teamId);
      setResumeToken(result.resumeToken);
      setFee(result.upi.amount);
      setUpiId(result.upi.id);
      setPayeeName(result.upi.payeeName);
      setUpiQrString(result.upi.qrString);
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
      const response = await fetch(
        `/api/registrations/${encodeURIComponent(teamId)}/payment?t=${encodeURIComponent(resumeToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utr: cleanUtr,
            confirmUtr: cleanConfirm,
            amount: fee,
            payerUpi: payerName.trim() || undefined,
            turnstileToken: paymentToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.fields) {
          setErrors(data.fields);
        }
        setGlobalError(data.message || 'Payment submission failed.');
        setPaymentToken('');
        paymentTurnstile.current?.reset();
        setIsSubmitting(false);
        return;
      }

      playAccessGranted();
      setPaymentSuccessStatus(data.data?.status || 'UNDER_REVIEW');
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
    <RegisterShell
      eyebrow="Registration · ₹199 per team"
      title={currentStep === 3 ? 'You’re in the queue' : 'Register your team'}
      subtitle={
        currentStep === 1
          ? 'Teams of 2–4 SRM students. Add your team, then pay ₹199 by UPI to lock your spot.'
          : undefined
      }
    >
        {/* Steps */}
        <ol className="mb-10 grid grid-cols-3 gap-2 sm:gap-3">
          {['Team details', 'Pay ₹199', 'Done'].map((label, i) => {
            const n = i + 1;
            const state = currentStep > n ? 'done' : currentStep === n ? 'active' : 'todo';
            return (
              <li
                key={label}
                className={`rounded-xl px-3 py-3 sm:px-4 ${
                  state === 'active'
                    ? 'paper-card'
                    : state === 'done'
                    ? 'border border-neutral-700 bg-[#0e0e11] text-neutral-300'
                    : 'border border-neutral-800 text-neutral-500'
                }`}
              >
                <div
                  className={`font-label text-[11px] font-bold uppercase tracking-[0.16em] ${
                    state === 'active' ? 'text-[var(--card-red)]' : ''
                  }`}
                >
                  Step {n}
                  {state === 'done' && ' ✓'}
                </div>
                <div className={`font-heading font-bold text-sm sm:text-base ${state === 'active' ? 'text-[var(--ink)]' : ''}`}>
                  {label}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded bg-red-950/60 border border-red-600 text-red-200 flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm font-label">{globalError}</div>
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
            <div className="p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 relative">
              <div className="text-xs font-label font-bold tracking-[0.16em] text-[var(--card-red)] uppercase mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Your team</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Team Name */}
                <div>
                  <label className="block text-sm font-label font-semibold text-neutral-200 mb-2">
                    Team name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Null Pointers"
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
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-label text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)] transition-colors ${
                      errors.teamName ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.teamName && (
                    <p className="mt-1 text-xs text-red-400 font-label">{errors.teamName}</p>
                  )}
                </div>

                {/* Team Size Segmented Control */}
                <div>
                  <label className="block text-sm font-label font-semibold text-neutral-200 mb-2">
                    Team size <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleTeamSizeChange(size)}
                        className={`py-2.5 rounded font-label text-sm font-bold border transition-all ${
                          teamSize === size
                            ? 'bg-[var(--paper)] border-transparent text-[var(--ink)]'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {size} players
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
                    className="p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 relative transition-all hover:border-neutral-700"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-label text-xs font-bold ${
                            isLeader
                              ? 'bg-[var(--card-red)] text-white'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          P{idx + 1}
                        </span>
                        <span className="font-heading font-bold text-sm tracking-wide text-white">
                          {`Player ${idx + 1}`}
                        </span>
                      </div>
                      <span className="text-xs font-label font-semibold text-neutral-400">
                        {isLeader ? 'Team leader' : 'Member'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          Full name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aarav Sharma"
                          value={player.name}
                          onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)] ${
                            errors[`players.${idx}.name`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.name`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-label">
                            {errors[`players.${idx}.name`]}
                          </p>
                        )}
                      </div>

                      {/* SRM Email */}
                      <div>
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          SRM email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="as1234@srmist.edu.in"
                          value={player.email}
                          onChange={(e) => updatePlayer(idx, 'email', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)] ${
                            errors[`players.${idx}.email`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.email`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-label">
                            {errors[`players.${idx}.email`]}
                          </p>
                        )}
                      </div>

                      {/* Register Number */}
                      <div>
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          SRM register number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="RA2311003010123"
                          value={player.regNo}
                          onChange={(e) => updatePlayer(idx, 'regNo', e.target.value.toUpperCase())}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)] ${
                            errors[`players.${idx}.regNo`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.regNo`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-label">
                            {errors[`players.${idx}.regNo`]}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          WhatsApp number {isLeader && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="tel"
                          required={isLeader}
                          placeholder={isLeader ? '9876543210 (Required)' : 'Optional'}
                          value={player.phone}
                          onChange={(e) => updatePlayer(idx, 'phone', e.target.value)}
                          className={`w-full px-3 py-2 bg-neutral-900 border rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)] ${
                            errors[`players.${idx}.phone`]
                              ? 'border-red-500'
                              : 'border-neutral-700'
                          }`}
                        />
                        {errors[`players.${idx}.phone`] && (
                          <p className="mt-1 text-[10px] text-red-400 font-label">
                            {errors[`players.${idx}.phone`]}
                          </p>
                        )}
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          Year
                        </label>
                        <select
                          value={player.year}
                          onChange={(e) => updatePlayer(idx, 'year', e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-label text-xs text-white focus:outline-none focus:border-[var(--paper)]"
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
                        <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CSE / IT / ECE"
                          value={player.department}
                          onChange={(e) => updatePlayer(idx, 'department', e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)]"
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
                <p className="mt-2 text-xs text-red-400 font-label">{errors.consent}</p>
              )}
            </div>

            {/* Human verification (Cloudflare Turnstile) */}
            <Turnstile
              ref={registerTurnstile}
              siteKey={TURNSTILE_SITE_KEY}
              options={{ action: 'register', theme: 'dark' }}
              onSuccess={setRegisterToken}
              onExpire={() => setRegisterToken('')}
              onError={() => setRegisterToken('')}
            />

            {/* Submit Step 1 Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !registerToken}
                className="w-full sm:w-auto px-8 py-3.5 bg-[var(--card-red)] hover:brightness-110 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-label font-bold tracking-wider text-xs sm:text-sm rounded border border-red-500 flex items-center justify-center gap-3 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving your team…</span>
                  </>
                ) : (
                  <>
                    <span>Continue to payment</span>
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
            {/* Team ID, on a paper card */}
            <div className="paper-card rounded-2xl p-2.5">
              <div className="rounded-xl border border-[var(--card-red)]/45 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                    Your Team ID
                  </div>
                  <div className="font-poster text-5xl uppercase leading-none text-[var(--ink)] mt-1">{teamId}</div>
                  <p className="mt-2 text-sm font-label text-[var(--ink)]/70">
                    Put this in the UPI payment note. We&apos;ve also emailed it to the team leader.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(teamId, 'teamId')}
                  className="px-4 py-2 rounded-md bg-[var(--ink)] hover:bg-black text-[var(--paper)] font-label text-sm font-semibold flex items-center gap-2"
                >
                  {copiedTeamId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedTeamId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Payment Protocol & QR Placeholder Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: QR Code Display Card */}
              <div className="md:col-span-5 p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 text-center flex flex-col items-center">
                <div className="text-xs font-label text-neutral-400 mb-3 tracking-widest uppercase flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-red-500" />
                  <span>Scan to pay</span>
                </div>

                {/* QR Code Container */}
                <div className="w-64 h-64 p-2 bg-[#09090c] rounded-xl border border-red-900/60 flex items-center justify-center relative mb-4">
                  <UpiQr value={upiQrString} teamId={teamId} />
                </div>

                <div className="text-[11px] font-label text-neutral-400">
                  Scan using GPay, PhonePe, Paytm, or BHIM
                </div>
              </div>

              {/* Right Column: Payment Details & Critical Instructions */}
              <div className="md:col-span-7 space-y-4">
                {/* Fee & UPI Card */}
                <div className="p-5 rounded-2xl bg-[#0e0e11] border border-neutral-800 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                    <span className="text-xs font-label text-neutral-400 uppercase">
                      Entry fee
                    </span>
                    <span className="text-2xl font-bold font-label text-white">₹{fee}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                      UPI ID
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded font-label text-sm text-red-400 select-all">
                        {upiId}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(upiId, 'upi')}
                        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-200 font-label text-xs border border-neutral-700 flex items-center gap-1.5"
                      >
                        {copiedUpi ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-label text-neutral-400">
                    Payee Account: <span className="text-neutral-200">{payeeName}</span>
                  </div>
                </div>

                {/* CRITICAL NOTE ALERT */}
                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-label leading-relaxed">
                    <strong className="text-amber-300 block mb-1">
                      Add your Team ID to the payment note
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
              className="p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 space-y-6"
            >
              <div className="text-xs font-label font-bold tracking-[0.16em] text-[var(--card-red)] uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Submit your payment</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* UTR Input */}
                <div>
                  <label className="block text-sm font-label font-semibold text-neutral-200 mb-1">
                    12-digit UPI transaction ID (UTR) <span className="text-red-500">*</span>
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
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-label text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-[var(--paper)] ${
                      errors.utr ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.utr ? (
                    <p className="mt-1 text-xs text-red-400 font-label">{errors.utr}</p>
                  ) : (
                    <p className="mt-1 text-[10px] text-neutral-500 font-label">
                      GPay: UPI Txn ID · PhonePe: UTR · Paytm: UPI Ref No.
                    </p>
                  )}
                </div>

                {/* Confirm UTR */}
                <div>
                  <label className="block text-sm font-label font-semibold text-neutral-200 mb-1">
                    Confirm UTR <span className="text-red-500">*</span>
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
                    className={`w-full px-4 py-2.5 bg-neutral-900 border rounded font-label text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-[var(--paper)] ${
                      errors.confirmUtr ? 'border-red-500' : 'border-neutral-700'
                    }`}
                  />
                  {errors.confirmUtr && (
                    <p className="mt-1 text-xs text-red-400 font-label">{errors.confirmUtr}</p>
                  )}
                </div>

                {/* Payer Name / Account */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                    Paid from (name or UPI ID) — optional, helps us verify faster
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aarav Sharma / aarav@oksbi"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded font-label text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[var(--paper)]"
                  />
                </div>
              </div>

              <Turnstile
                ref={paymentTurnstile}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ action: 'payment', theme: 'dark' }}
                onSuccess={setPaymentToken}
                onExpire={() => setPaymentToken('')}
                onError={() => setPaymentToken('')}
              />

              {/* Submit Proof Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !paymentToken}
                  className="px-8 py-3 bg-[var(--card-red)] hover:brightness-110 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-label font-bold tracking-wider text-xs sm:text-sm rounded border border-red-500 flex items-center gap-3 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting…</span>
                    </>
                  ) : (
                    <>
                      <span>Submit UTR</span>
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
          <div className="paper-card rounded-2xl p-2.5 text-[var(--ink)]">
            <div className="rounded-xl border border-[var(--card-red)]/45 p-6 sm:p-10 text-center space-y-6">
            <div>
              <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                UTR received
              </div>
              <h2 className="font-poster text-4xl sm:text-5xl uppercase leading-none mt-2">Welcome, Player</h2>
              <p className="mt-3 text-base font-label text-[var(--ink)]/75 max-w-lg mx-auto leading-relaxed">
                We&apos;ll check your payment against our bank statement and email the team leader as soon as
                it&apos;s verified. Your Entry Visa comes with that email.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Team ID</div>
              <div className="font-poster text-6xl uppercase leading-none mt-1">{teamId}</div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-label font-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>{paymentSuccessStatus === 'UNDER_REVIEW' ? 'Payment under review' : paymentSuccessStatus}</span>
              </div>
            </div>

            <dl className="max-w-md mx-auto text-left grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-label border-t border-[var(--ink)]/15 pt-5">
              <dt className="text-[var(--ink)]/55">Team</dt>
              <dd className="font-semibold text-right">{teamName}</dd>
              <dt className="text-[var(--ink)]/55">Players</dt>
              <dd className="font-semibold text-right">{teamSize}</dd>
              <dt className="text-[var(--ink)]/55">UTR</dt>
              <dd className="font-semibold text-right tabular-nums">{utr}</dd>
            </dl>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => copyToClipboard(teamId, 'teamId')}
                className="w-full sm:w-auto px-6 py-3 bg-[var(--ink)] hover:bg-black text-[var(--paper)] font-label text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                {copiedTeamId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Team ID</span>
                  </>
                )}
              </button>

              <Link
                href="/"
                onClick={() => playHudClick()}
                className="w-full sm:w-auto px-6 py-3 bg-[var(--card-red)] hover:brightness-110 text-white font-label text-sm font-bold rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                <span>Back to the site</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            </div>
          </div>
        )}
    </RegisterShell>
  );
}
