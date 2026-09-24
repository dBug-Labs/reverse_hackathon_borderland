'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
  Copy,
  Check,
  QrCode,
  Lock,
  Info,
  AlertCircle,
} from 'lucide-react';
import { playHudClick, playAccessGranted } from '@/utils/sound';
import { RegisterShell } from '@/components/RegisterShell';
import { UpiQr } from '@/components/UpiQr';
import { WhatsAppCommunityButton } from '@/components/WhatsAppButton';
import { buildUpiIntent } from '@/lib/upi';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const WHATSAPP_COMMUNITY_URL = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ?? '';

export default function ResumePaymentPage() {
  const params = useParams();
  const teamId = (params?.teamId as string) || '';
  // Signed pay token from the email link (/register/pay/DBG-472?t=...)
  const payToken = useSearchParams().get('t') ?? '';

  const [fee, setFee] = useState(199);
  const [upiId, setUpiId] = useState('shauryaaojha@oksbi');
  const [payeeName, setPayeeName] = useState('SRM DBUG Labs');
  const [utr, setUtr] = useState('');
  const [confirmUtr, setConfirmUtr] = useState('');
  const [payerName, setPayerName] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState(WHATSAPP_COMMUNITY_URL);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    payToken ? null : 'This payment link is incomplete. Open the link from your registration email.'
  );
  const [eventLoaded, setEventLoaded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  // Fee + UPI details come from the public event endpoint; the QR is built from them
  useEffect(() => {
    fetch('/api/event')
      .then((res) => res.json())
      .then((json) => {
        if (!json.ok) return;
        const event = json.data;
        setFee(event.fee);
        setUpiId(event.upiId);
        setPayeeName(event.payeeName);
        if (event.whatsappCommunityUrl) {
          setWhatsappUrl(event.whatsappCommunityUrl);
        }
        setEventLoaded(true);
      })
      .catch(() => {
        // Keep the defaults; the UPI ID + note are still shown as text
      });
  }, []);

  // Only show a scannable QR once the real fee / UPI ID have loaded
  const upiQrString = eventLoaded
    ? buildUpiIntent({ upiId, payeeName, amount: fee, note: teamId })
    : '';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playHudClick();
    setErrorMsg(null);

    const cleanUtr = utr.trim();
    const cleanConfirm = confirmUtr.trim();

    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMsg('UTR must be exactly 12 digits from your payment app.');
      return;
    }

    if (cleanUtr !== cleanConfirm) {
      setErrorMsg('The two UTR entries do not match. Please double-check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/registrations/${encodeURIComponent(teamId)}/payment?t=${encodeURIComponent(payToken)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utr: cleanUtr,
            confirmUtr: cleanConfirm,
            amount: fee,
            payerUpi: payerName.trim() || undefined,
            turnstileToken,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Payment submission failed.');
        // Turnstile tokens are single-use — get a fresh one for the retry
        setTurnstileToken('');
        turnstileRef.current?.reset();
        setIsSubmitting(false);
        return;
      }

      playAccessGranted();
      setIsCompleted(true);
    } catch {
      setErrorMsg('Network error while transmitting payment proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RegisterShell
      eyebrow="Registration · Step 2"
      title={isCompleted ? 'UTR received' : 'Complete your payment'}
      subtitle={
        isCompleted
          ? undefined
          : 'Pay ₹' + fee + ' by UPI with your Team ID in the note, then submit the 12-digit UTR from your payment app.'
      }
    >
        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-red-950/60 border border-red-600 text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm font-label">{errorMsg}</div>
          </div>
        )}

        {!isCompleted ? (
          <div className="space-y-8">
            {/* Team ID, on a paper card */}
            <div className="paper-card rounded-2xl p-2.5">
              <div className="rounded-xl border border-[var(--card-red)]/45 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                    Your Team ID
                  </div>
                  <div className="font-poster text-5xl uppercase leading-none text-[var(--ink)] mt-1">{teamId}</div>
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

            {/* QR Placeholder & Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-5 p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 text-center flex flex-col items-center">
                <div className="text-xs font-label text-neutral-400 mb-3 tracking-widest uppercase flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-red-500" />
                  <span>Scan to pay</span>
                </div>

                <div className="w-64 h-64 p-2 bg-[#09090c] rounded-xl border border-red-900/60 flex items-center justify-center relative mb-4">
                  <UpiQr value={upiQrString} teamId={teamId} />
                </div>

                <div className="text-sm font-label text-neutral-400">
                  Scan using GPay, PhonePe, Paytm, or BHIM
                </div>
                {upiQrString && (
                  // On a phone you can't scan your own screen — hand off to the UPI app instead
                  <a
                    href={upiQrString}
                    className="sm:hidden mt-4 w-full inline-flex items-center justify-center rounded-lg bg-[var(--paper)] px-5 py-3 font-label text-sm font-bold text-[var(--ink)]"
                  >
                    Open UPI app →
                  </a>
                )}
              </div>

              <div className="md:col-span-7 space-y-4">
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

                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-label leading-relaxed">
                    <strong className="text-amber-300 block mb-1">
                      Add your Team ID to the payment note
                    </strong>
                    Include <strong className="text-white underline">{teamId}</strong> in the
                    UPI note.
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-6 rounded-2xl bg-[#0e0e11] border border-neutral-800 space-y-6"
            >
              <div className="text-xs font-label tracking-widest text-red-500 uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Submit your payment</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded font-label text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-[var(--paper)]"
                  />
                </div>

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
                    onChange={(e) => setConfirmUtr(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded font-label text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-[var(--paper)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-label font-semibold text-neutral-300 mb-1">
                    Paid from (name or UPI ID) — optional
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
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ action: 'payment', theme: 'dark' }}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
              />

              <button
                type="submit"
                disabled={isSubmitting || !payToken || !turnstileToken}
                className="w-full py-3.5 bg-[var(--card-red)] hover:brightness-110 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-label font-bold tracking-wider text-sm rounded border border-red-500 flex items-center justify-center gap-3 transition-all"
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
            </form>
          </div>
        ) : (
          <div className="paper-card rounded-2xl p-2.5 text-[var(--ink)]">
            <div className="rounded-xl border border-[var(--card-red)]/45 p-6 sm:p-10 text-center">
              <div className="font-label text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--card-red)]">
                Payment under review
              </div>
              <div className="font-poster text-6xl uppercase leading-none mt-2">{teamId}</div>
              <p className="mt-4 text-base font-label text-[var(--ink)]/75 max-w-md mx-auto leading-relaxed">
                We&apos;ll check your UTR against our bank statement and email the team leader as soon as
                it&apos;s verified. Your Entry Visa comes with that email.
              </p>
              {whatsappUrl && (
                <div className="mt-6 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-center max-w-md mx-auto">
                  <p className="font-label text-xs uppercase tracking-widest text-[#15803d] font-bold mb-1">
                    Official Participant Community
                  </p>
                  <p className="text-xs font-label text-[var(--ink)]/80 mb-3">
                    Join the WhatsApp community for schedule announcements and coordinator support.
                  </p>
                  <WhatsAppCommunityButton href={whatsappUrl} className="w-full sm:w-auto" />
                </div>
              )}
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--card-red)] hover:brightness-110 text-white font-label text-sm font-bold rounded-md"
                >
                  Back to the site
                </Link>
              </div>
            </div>
          </div>
        )}
    </RegisterShell>
  );
}
