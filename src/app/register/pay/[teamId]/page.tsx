'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  Lock,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { playHudClick, playAccessGranted } from '@/utils/sound';

export default function ResumePaymentPage() {
  const params = useParams();
  const teamId = (params?.teamId as string) || '';

  const [fee, setFee] = useState(300);
  const [upiId, setUpiId] = useState('dbuglabs@upi');
  const [payeeName, setPayeeName] = useState('SRM DBUG Labs');
  const [utr, setUtr] = useState('');
  const [confirmUtr, setConfirmUtr] = useState('');
  const [payerName, setPayerName] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const res = await fetch(`/api/registrations/${teamId}/payment`, {
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

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Payment submission failed.');
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
    <div className="min-h-screen bg-[#08080a] text-[#ededed] font-sans py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.12)_0%,transparent_65%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          <Link
            href="/register"
            onClick={() => playHudClick()}
            className="flex items-center gap-2 text-sm font-mono text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" />
            <span>BACK TO REGISTRATION</span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-red-500 bg-red-950/40 border border-red-800/60 px-3 py-1 rounded">
            UPI PROTOCOL VERIFICATION
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded bg-red-950/60 border border-red-600 text-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm font-mono">{errorMsg}</div>
          </div>
        )}

        {!isCompleted ? (
          <div className="space-y-8">
            {/* Team ID Banner */}
            <div className="p-6 rounded-lg bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border border-red-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono tracking-widest text-red-400 uppercase">
                  RESUMING PAYMENT PROTOCOL
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

            {/* QR Placeholder & Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-5 p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 text-center flex flex-col items-center">
                <div className="text-xs font-mono text-neutral-400 mb-3 tracking-widest uppercase flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-red-500" />
                  <span>OFFICIAL UPI QR</span>
                </div>

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

              <div className="md:col-span-7 space-y-4">
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

                <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-600/70 text-amber-200 flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono leading-relaxed">
                    <strong className="text-amber-300 block mb-1">
                      MANDATORY PAYMENT NOTE:
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
              className="p-6 rounded-lg bg-[#0e0e13] border border-neutral-800 space-y-6"
            >
              <div className="text-xs font-mono tracking-widest text-red-500 uppercase flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>SUBMIT 12-DIGIT TRANSACTION ID</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1">
                    12-DIGIT UTR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 423456789012"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded font-mono text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-red-500"
                  />
                </div>

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
                    onChange={(e) => setConfirmUtr(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded font-mono text-sm text-white placeholder-neutral-600 tracking-wider focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    PAYER NAME / UPI ID (OPTIONAL)
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-mono font-bold tracking-wider text-sm rounded border border-red-500 flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>VALIDATING UTR...</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT PAYMENT PROOF</span>
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#0e0e13] border border-neutral-800 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs font-mono tracking-widest text-emerald-400 uppercase mb-2">
                VERIFICATION QUEUED
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-2">
                PAYMENT PROOF RECEIVED
              </h2>
              <p className="text-sm font-sans text-neutral-400 max-w-md mx-auto">
                Your payment for Team <strong className="text-white font-mono">{teamId}</strong> has
                been recorded and submitted for manual admin verification.
              </p>
            </div>

            <div className="pt-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded border border-red-500"
              >
                <span>RETURN TO BASE</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
