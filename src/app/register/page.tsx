'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { ArrowRight, Check, AlertCircle, Copy, Clock } from 'lucide-react';
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

  // API plumbing: idempotency key + time-trap; Turnstile runs on the final submit
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const formOpenedAt = useRef(Date.now());
  const [upiQrString, setUpiQrString] = useState('');
  const [registerToken, setRegisterToken] = useState('');
  const registerTurnstile = useRef<TurnstileInstance | undefined>(undefined);

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

  const teamPayload = () => ({
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
  });

  // Step 1: check the team (nothing is saved, no Team ID is reserved)
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
      const response = await fetch('/api/registrations/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamPayload()),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        if (data.fields) {
          setErrors(toFormErrors(data.fields));
        }
        setGlobalError(data.message || 'Registration failed. Please review your entries.');
        setIsSubmitting(false);
        return;
      }

      // Details look good — show the payment step with a suggested Team ID
      const result = data.data;
      playAccessGranted();
      setTeamId(result.candidateTeamId);
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
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...teamPayload(),
          candidateTeamId: teamId,
          utr: cleanUtr,
          confirmUtr: cleanConfirm,
          amount: fee,
          payerUpi: payerName.trim() || undefined,
          turnstileToken: registerToken,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        const fields: Record<string, string> = data.fields ? toFormErrors(data.fields) : {};
        setErrors(fields);
        setGlobalError(data.message || 'Submission failed.');
        // Turnstile tokens are single-use — get a fresh one for the retry
        setRegisterToken('');
        registerTurnstile.current?.reset();
        // A problem with the team itself (e.g. a player registered meanwhile) → back to Step 1
        if (Object.keys(fields).some((k) => k.startsWith('players') || k === 'teamName')) {
          setCurrentStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setIsSubmitting(false);
        return;
      }

      setTeamId(data.data.teamId); // final ID (the suggested one unless it was just taken)
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

  const activePlayers = players.slice(0, teamSize);

  return (
    <RegisterShell
      eyebrow="Registration · ₹199 per team"
      title={currentStep === 3 ? 'Submission received' : currentStep === 2 ? 'Pay & submit' : 'Register your team'}
      subtitle={
        currentStep === 1
          ? 'Teams of 2–4 SRM students. Build your hand, then pay ₹199 by UPI.'
          : currentStep === 2
          ? 'Pay ₹199 by UPI with your Team ID in the note, then submit the 12-digit UTR to register.'
          : undefined
      }
      width="xl"
    >
      {/* Steps */}
      <ol className="mb-10 flex items-center gap-2 sm:gap-3 font-label text-sm">
        {['Your team', 'Payment', 'Done'].map((label, i) => {
          const n = i + 1;
          const state = currentStep > n ? 'done' : currentStep === n ? 'active' : 'todo';
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <span
                className={`flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 ${
                  state === 'active'
                    ? 'bg-[var(--paper)] text-[var(--ink)]'
                    : state === 'done'
                    ? 'bg-neutral-800 text-neutral-200'
                    : 'border border-neutral-800 text-neutral-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    state === 'active' ? 'bg-[var(--card-red)] text-white' : state === 'done' ? 'bg-emerald-600 text-white' : 'bg-neutral-900'
                  }`}
                >
                  {state === 'done' ? <Check className="w-3.5 h-3.5" /> : n}
                </span>
                <span className="font-semibold">{label}</span>
              </span>
              {n < 3 && <span className="hidden sm:block w-8 h-px bg-neutral-800" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {globalError && (
        <div role="alert" className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--card-red)]/60 bg-[var(--card-red)]/10 px-4 py-3.5 text-[15px] font-label text-red-200">
          <AlertCircle className="w-5 h-5 text-[#ff6b6b] shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* ─────────────────────────── STEP 1 ─────────────────────────── */}
      {currentStep === 1 && (
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <form onSubmit={handleStep1Submit} className="lg:col-span-7 space-y-14" noValidate>
            {/* Honeypot (hidden from people) */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>

            {/* 01 · Team */}
            <section>
              <SectionTitle n="01" title="Your team" />

              <label htmlFor="teamName" className="mt-6 block text-sm font-label font-semibold text-neutral-300">
                Team name
              </label>
              <input
                id="teamName"
                type="text"
                required
                maxLength={30}
                placeholder="Your team name"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (errors.teamName) setErrors((prev) => { const n = { ...prev }; delete n.teamName; return n; });
                }}
                className={`mt-1 w-full bg-transparent border-0 border-b-2 px-0 py-2 font-poster uppercase text-4xl sm:text-5xl text-[#f5eee1] placeholder:text-neutral-700 outline-none transition-colors focus:border-[var(--paper)] ${
                  errors.teamName ? 'border-[var(--card-red)]' : 'border-neutral-700'
                }`}
              />
              <FieldError msg={errors.teamName} />

              <p className="mt-8 text-sm font-label font-semibold text-neutral-300">How many players?</p>
              <div className="mt-3 grid grid-cols-3 gap-3 max-w-md">
                {[2, 3, 4].map((size) => {
                  const selected = teamSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleTeamSizeChange(size)}
                      aria-pressed={selected}
                      className={`relative aspect-[5/6] rounded-xl p-1.5 transition-transform duration-200 ${
                        selected ? 'paper-card -translate-y-1' : 'border border-neutral-800 bg-[#0e0e11] hover:border-neutral-600 hover:-translate-y-0.5'
                      }`}
                    >
                      <span
                        className={`h-full rounded-lg flex flex-col items-center justify-center border ${
                          selected ? 'border-[var(--card-red)]/45 text-[var(--ink)]' : 'border-transparent text-neutral-300'
                        }`}
                      >
                        <span className="font-poster text-5xl leading-none">{size}</span>
                        <span className="mt-1.5 text-xs font-label font-semibold tracking-widest">
                          {SUITS.slice(0, size).map((s) => s.symbol).join(' ')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 02 · Players */}
            <section>
              <SectionTitle n="02" title="The players" note="Every player needs an SRM email and register number." />

              <div className="mt-6 space-y-5">
                {activePlayers.map((player, idx) => {
                  const suit = SUITS[idx];
                  const isLeader = idx === 0;
                  const err = (f: keyof PlayerFormState) => errors[`players.${idx}.${f}`];
                  return (
                    <div key={idx} className="relative rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5 sm:p-6 overflow-hidden">
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute -right-3 -top-6 text-[110px] leading-none opacity-[0.07] ${suit.red ? 'text-[var(--card-red)]' : 'text-white'}`}
                      >
                        {suit.symbol}
                      </span>

                      <div className="relative flex items-center gap-3">
                        <span className={`text-2xl leading-none ${suit.red ? 'text-[var(--card-red)]' : 'text-[#f5eee1]'}`}>{suit.symbol}</span>
                        <h3 className="font-heading text-lg font-bold text-neutral-100">Player {idx + 1}</h3>
                        {isLeader && (
                          <span className="rounded-full bg-[var(--paper)] text-[var(--ink)] px-2.5 py-0.5 text-xs font-label font-bold">
                            Team leader
                          </span>
                        )}
                      </div>

                      <div className="relative mt-5 grid sm:grid-cols-2 gap-4">
                        <Field label="Full name" error={err('name')} className="sm:col-span-2">
                          <input type="text" required placeholder="Aarav Sharma" value={player.name} onChange={(e) => updatePlayer(idx, 'name', e.target.value)} className={inputClass(err('name'))} />
                        </Field>
                        <Field label="SRM email" error={err('email')}>
                          <input type="email" required placeholder="as1234@srmist.edu.in" value={player.email} onChange={(e) => updatePlayer(idx, 'email', e.target.value)} className={inputClass(err('email'))} />
                        </Field>
                        <Field label="Register number" error={err('regNo')}>
                          <input type="text" required placeholder="RA2311003010123" value={player.regNo} onChange={(e) => updatePlayer(idx, 'regNo', e.target.value.toUpperCase())} className={`${inputClass(err('regNo'))} tracking-wider`} />
                        </Field>
                        <Field label={isLeader ? 'WhatsApp number' : 'WhatsApp number (optional)'} error={err('phone')}>
                          <input type="tel" inputMode="numeric" required={isLeader} placeholder="98765 43210" value={player.phone} onChange={(e) => updatePlayer(idx, 'phone', e.target.value)} className={inputClass(err('phone'))} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Year">
                            <select value={player.year} onChange={(e) => updatePlayer(idx, 'year', e.target.value)} className={inputClass()}>
                              <option value="1">1st</option>
                              <option value="2">2nd</option>
                              <option value="3">3rd</option>
                              <option value="4">4th</option>
                              <option value="PG">PG</option>
                            </select>
                          </Field>
                          <Field label="Dept.">
                            <input type="text" placeholder="CSE" value={player.department} onChange={(e) => updatePlayer(idx, 'department', e.target.value)} className={inputClass()} />
                          </Field>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 03 · Confirm */}
            <section>
              <SectionTitle n="03" title="Confirm" />
              <label className="mt-6 flex items-start gap-3 rounded-xl border border-neutral-800 bg-[#0d0d10] p-4 sm:p-5">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (errors.consent) setErrors((prev) => { const n = { ...prev }; delete n.consent; return n; });
                  }}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-[var(--card-red)]"
                />
                <span className="text-[15px] font-label text-neutral-300 leading-relaxed">
                  Every player is a current SRM student, and we accept the{' '}
                  <Link href="/#protocol" className="text-[#f5eee1] underline underline-offset-4">
                    rules
                  </Link>
                  . Our spot is confirmed only after the ₹199 UPI payment is verified.
                </span>
              </label>
              <FieldError msg={errors.consent} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-lg bg-[var(--card-red)] px-8 py-4 font-poster uppercase text-2xl tracking-wide text-white shadow-lg shadow-black/40 transition hover:brightness-110 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Checking your team…
                  </>
                ) : (
                  <>
                    Deal me in
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <p className="mt-3 text-sm font-label text-neutral-500">
                Nothing is saved yet — your team is registered when you submit the payment UTR.
              </p>
            </section>
          </form>

          {/* Live preview of the team, desktop only */}
          <aside className="hidden lg:block lg:col-span-5 lg:sticky lg:top-8">
            <YourHand teamName={teamName} players={activePlayers} />
          </aside>
        </div>
      )}

      {/* ─────────────────────────── STEP 2 ─────────────────────────── */}
      {currentStep === 2 && (
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* The QR, as a card */}
          <div className="lg:col-span-5">
            <div className="paper-card rounded-2xl p-2.5 text-[var(--ink)]">
              <div className="relative rounded-xl border border-[var(--card-red)]/45 p-6 flex flex-col items-center text-center">
                <span aria-hidden="true" className="absolute top-2 left-3 text-lg">♠</span>
                <span aria-hidden="true" className="absolute top-2 right-3 text-lg text-[var(--card-red)]">♥</span>
                <span aria-hidden="true" className="absolute bottom-2 left-3 text-lg text-[var(--card-red)]">♦</span>
                <span aria-hidden="true" className="absolute bottom-2 right-3 text-lg">♣</span>

                <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Your Team ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-poster text-5xl uppercase leading-none">{teamId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(teamId, 'teamId')}
                    className="p-2 rounded-md hover:bg-black/5"
                    aria-label="Copy Team ID"
                  >
                    {copiedTeamId ? <Check className="w-5 h-5 text-emerald-700" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="mt-5 w-60 h-60 rounded-xl bg-white p-2 shadow-inner">
                  <UpiQr value={upiQrString} teamId={teamId} />
                </div>
                <p className="mt-3 text-sm font-label text-[var(--ink)]/70">Scan with GPay, PhonePe, Paytm or BHIM</p>
                {upiQrString && (
                  // On a phone you can't scan your own screen — hand off to the UPI app instead
                  <a
                    href={upiQrString}
                    className="sm:hidden mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-5 py-3 font-label text-sm font-bold text-[var(--paper)]"
                  >
                    Open UPI app
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}

                <div className="mt-5 w-full border-t border-[var(--ink)]/15 pt-4 grid grid-cols-2 gap-3 text-left">
                  <div>
                    <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Amount</p>
                    <p className="font-poster text-3xl leading-none mt-1">₹{fee}</p>
                  </div>
                  <div>
                    <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">UPI ID</p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId, 'upi')}
                      className="mt-1 inline-flex items-center gap-1.5 font-label font-semibold text-[15px] break-all text-left hover:text-[var(--card-red)]"
                    >
                      {upiId}
                      {copiedUpi ? <Check className="w-4 h-4 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
                    </button>
                  </div>
                </div>
                <p className="mt-3 w-full text-left text-xs font-label text-[var(--ink)]/55">Paying {payeeName}</p>
              </div>
            </div>
          </div>

          {/* Instructions + UTR */}
          <div className="lg:col-span-7">
            <ol className="space-y-5">
              {[
                ['Scan & pay ₹' + fee, 'Scan the QR, pay to the UPI ID on the card, or tap “Open UPI app” on your phone.'],
                ['Add ' + teamId + ' to the note', 'Put your Team ID in the UPI payment note so we can match your payment.'],
                ['Submit your UTR', 'Enter the 12-digit UPI transaction ID from your payment app. Your team is registered the moment you submit.'],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-4">
                  <span className="font-poster text-4xl leading-none text-[var(--card-red)] w-8 shrink-0">{i + 1}</span>
                  <div>
                    <p className="font-heading text-lg font-bold text-neutral-100">{title}</p>
                    <p className="text-neutral-400">{text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <form onSubmit={handleStep2Submit} className="mt-10 rounded-2xl border border-neutral-800 bg-[#0d0d10] p-5 sm:p-7 space-y-5" noValidate>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="UTR (12 digits)" error={errors.utr} hint="GPay: UPI transaction ID · PhonePe: UTR · Paytm: UPI Ref No.">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={12}
                    placeholder="423456789012"
                    value={utr}
                    onChange={(e) => {
                      setUtr(e.target.value.replace(/\D/g, ''));
                      if (errors.utr) setErrors((prev) => { const n = { ...prev }; delete n.utr; return n; });
                    }}
                    className={`${inputClass(errors.utr)} tracking-[0.2em] tabular-nums`}
                  />
                </Field>
                <Field label="Confirm UTR" error={errors.confirmUtr}>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={12}
                    placeholder="Type it again"
                    value={confirmUtr}
                    onChange={(e) => {
                      setConfirmUtr(e.target.value.replace(/\D/g, ''));
                      if (errors.confirmUtr) setErrors((prev) => { const n = { ...prev }; delete n.confirmUtr; return n; });
                    }}
                    className={`${inputClass(errors.confirmUtr)} tracking-[0.2em] tabular-nums`}
                  />
                </Field>
                <Field label="Paid from (optional)" hint="Name or UPI ID — helps us verify faster" className="sm:col-span-2">
                  <input type="text" placeholder="Aarav Sharma / aarav@oksbi" value={payerName} onChange={(e) => setPayerName(e.target.value)} className={inputClass()} />
                </Field>
              </div>

              <Turnstile
                ref={registerTurnstile}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ action: 'register', theme: 'dark' }}
                onSuccess={setRegisterToken}
                onExpire={() => setRegisterToken('')}
                onError={() => setRegisterToken('')}
              />

              <button
                type="submit"
                disabled={isSubmitting || !registerToken}
                className="w-full inline-flex items-center justify-center gap-3 rounded-lg bg-[var(--card-red)] px-8 py-4 font-poster uppercase text-2xl tracking-wide text-white transition hover:brightness-110 disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit registration
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  playHudClick();
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm font-label font-semibold text-neutral-400 hover:text-white"
              >
                ← Edit team details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────── STEP 3 ─────────────────────────── */}
      {currentStep === 3 && (
        <div className="max-w-2xl mx-auto paper-card rounded-2xl p-2.5 text-[var(--ink)]">
          <div className="relative rounded-xl border border-[var(--card-red)]/45 p-6 sm:p-10 text-center">
            <span aria-hidden="true" className="absolute top-3 left-4 text-2xl">♠</span>
            <span aria-hidden="true" className="absolute top-3 right-4 text-2xl text-[var(--card-red)]">♥</span>
            <span aria-hidden="true" className="absolute bottom-3 left-4 text-2xl text-[var(--card-red)]">♦</span>
            <span aria-hidden="true" className="absolute bottom-3 right-4 text-2xl">♣</span>

            <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Awaiting payment verification</p>
            <h2 className="font-poster text-5xl sm:text-6xl uppercase leading-none mt-2">Welcome, Player</h2>
            <p className="mt-4 text-base font-label text-[var(--ink)]/75 max-w-md mx-auto leading-relaxed">
              We&apos;ve emailed the team leader a confirmation. Once we verify your payment against our bank
              statement, you&apos;ll get a second email with your Entry Visa.
            </p>

            <div className="mt-8">
              <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Team ID</p>
              <p className="font-poster text-7xl uppercase leading-none mt-1">{teamId}</p>
              <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ink)] text-[var(--paper)] text-xs font-label font-semibold">
                <Clock className="w-3.5 h-3.5" />
                {paymentSuccessStatus === 'UNDER_REVIEW' ? 'Payment under review' : paymentSuccessStatus}
              </span>
            </div>

            <dl className="mt-8 max-w-sm mx-auto text-left grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-label border-t border-[var(--ink)]/15 pt-5">
              <dt className="text-[var(--ink)]/55">Team</dt>
              <dd className="font-semibold text-right">{teamName}</dd>
              <dt className="text-[var(--ink)]/55">Players</dt>
              <dd className="font-semibold text-right">{teamSize}</dd>
              <dt className="text-[var(--ink)]/55">UTR</dt>
              <dd className="font-semibold text-right tabular-nums">{utr}</dd>
            </dl>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(teamId, 'teamId')}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[var(--ink)] text-[var(--paper)] font-label text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-black"
              >
                {copiedTeamId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedTeamId ? 'Copied' : 'Copy Team ID'}
              </button>
              <Link
                href="/"
                onClick={() => playHudClick()}
                className="w-full sm:w-auto px-6 py-3 rounded-md bg-[var(--card-red)] text-white font-label text-sm font-bold inline-flex items-center justify-center gap-2 hover:brightness-110"
              >
                Back to the site
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </RegisterShell>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────── */

const SUITS = [
  { symbol: '♠', red: false },
  { symbol: '♥', red: true },
  { symbol: '♦', red: true },
  { symbol: '♣', red: false },
];

function inputClass(error?: string) {
  return `w-full rounded-lg bg-[#141417] border px-4 py-3 text-[15px] font-label text-white placeholder:text-neutral-600 outline-none transition focus:border-[var(--paper)] focus:bg-[#18181c] ${
    error ? 'border-[var(--card-red)]' : 'border-neutral-800 hover:border-neutral-700'
  }`;
}

function SectionTitle({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="flex items-end gap-4 border-b border-neutral-800 pb-3">
      <span className="font-poster text-4xl leading-none text-[var(--card-red)]">{n}</span>
      <div>
        <h2 className="font-poster uppercase text-3xl leading-none text-[#f5eee1]">{title}</h2>
        {note && <p className="mt-1.5 text-sm font-label text-neutral-500">{note}</p>}
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-sm font-label text-[#ff6b6b]">{msg}</p>;
}

function Field({
  label,
  error,
  hint,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block mb-1.5 text-sm font-label font-semibold text-neutral-300">{label}</span>
      {children}
      {error ? <FieldError msg={error} /> : hint ? <p className="mt-1.5 text-xs font-label text-neutral-500">{hint}</p> : null}
    </label>
  );
}

/* The team as a fanned hand of playing cards, filled in as you type. */
function YourHand({ teamName, players }: { teamName: string; players: PlayerFormState[] }) {
  const n = players.length;
  return (
    <div className="paper-card rounded-2xl p-2.5 text-[var(--ink)]">
      <div className="rounded-xl border border-[var(--card-red)]/45 p-6">
        <p className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">Your hand</p>
        <p className="font-poster uppercase text-4xl leading-none mt-1 truncate">{teamName.trim() || 'Your team'}</p>

        <div className="relative h-64 mt-6" aria-hidden="true">
          {players.map((p, i) => {
            const suit = SUITS[i];
            const spread = n === 1 ? 0 : (i - (n - 1) / 2) * (n === 4 ? 13 : 16);
            const x = (i - (n - 1) / 2) * (n === 4 ? 62 : 74);
            return (
              <div
                key={i}
                className="absolute left-1/2 top-2 w-32 aspect-[5/7] -ml-16 rounded-xl bg-[#fbf6ec] border border-[var(--ink)]/15 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.5)] p-2 transition-transform duration-300"
                style={{ transform: `translateX(${x}px) rotate(${spread}deg)`, transformOrigin: '50% 120%', zIndex: i }}
              >
                <div className="h-full rounded-lg border border-[var(--card-red)]/35 flex flex-col p-1.5">
                  <span className={`text-sm leading-none ${suit.red ? 'text-[var(--card-red)]' : ''}`}>{suit.symbol}</span>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <span className={`text-3xl leading-none ${suit.red ? 'text-[var(--card-red)]' : ''}`}>{suit.symbol}</span>
                    <span className="mt-2 font-poster uppercase text-sm leading-tight line-clamp-2 break-words">
                      {p.name.trim() || `Player ${i + 1}`}
                    </span>
                    <span className="mt-0.5 max-w-full truncate text-[9px] font-label text-[var(--ink)]/55">
                      {p.regNo.trim() || (i === 0 ? 'Team leader' : '')}
                    </span>
                  </div>
                  <span className={`self-end rotate-180 text-sm leading-none ${suit.red ? 'text-[var(--card-red)]' : ''}`}>{suit.symbol}</span>
                </div>
              </div>
            );
          })}
        </div>

        <dl className="mt-2 grid grid-cols-3 gap-3 border-t border-[var(--ink)]/15 pt-4 text-center">
          <div>
            <dt className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">When</dt>
            <dd className="font-poster text-xl uppercase leading-none mt-1">5–6 Oct</dd>
          </div>
          <div>
            <dt className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Where</dt>
            <dd className="font-poster text-xl uppercase leading-none mt-1">TP2 712</dd>
          </div>
          <div>
            <dt className="font-label text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]/55">Entry</dt>
            <dd className="font-poster text-xl uppercase leading-none mt-1">₹199</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
