'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { playHudClick } from '@/utils/sound';

export default function RegistrationStatusPage() {
  const params = useParams();
  const registrationId = (params?.registrationId as string) || '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registrationId) return;

    fetch(`/api/registrations?id=${encodeURIComponent(registrationId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setData(json.registration);
        } else {
          setError(json.message || 'Registration not found');
        }
      })
      .catch(() => setError('Failed to retrieve registration status'))
      .finally(() => setLoading(false));
  }, [registrationId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'PAYMENT_APPROVED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-mono text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>CONFIRMED & CLEARED</span>
          </div>
        );
      case 'PAYMENT_SUBMITTED':
      case 'UNDER_REVIEW':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-950/80 border border-amber-500 text-amber-300 font-mono text-xs">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>PAYMENT SUBMITTED · PENDING VERIFICATION</span>
          </div>
        );
      case 'PAYMENT_REJECTED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/80 border border-red-500 text-red-300 font-mono text-xs">
            <XCircle className="w-4 h-4 text-red-400" />
            <span>PAYMENT REJECTED</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>PAYMENT PENDING</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-[#ededed] font-sans py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            onClick={() => playHudClick()}
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 text-red-500" />
            <span>RETURN TO BASE</span>
          </Link>
        </div>

        <div className="p-8 rounded-xl bg-[#0e0e13] border border-neutral-800 text-center space-y-6">
          <div className="text-xs font-mono tracking-widest text-red-500 uppercase">
            CLEARANCE PROTOCOL STATUS
          </div>

          <div className="text-2xl font-mono font-bold text-white tracking-wider">
            {registrationId}
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <span className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-neutral-400">QUERYING PROTOCOL DB...</span>
            </div>
          ) : error ? (
            <div className="py-6 text-sm font-mono text-red-400 bg-red-950/40 rounded border border-red-800 p-4">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div>{getStatusBadge(data.status)}</div>

              <div className="text-left p-4 rounded bg-neutral-900/60 border border-neutral-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500">Team Name:</span>
                  <span className="text-white font-bold">{data.teamName}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500">Leader:</span>
                  <span className="text-neutral-200">{data.fullName}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-neutral-500">Team Size:</span>
                  <span className="text-neutral-200">{data.teamSize} Players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registered:</span>
                  <span className="text-neutral-400">
                    {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {data.status === 'PAYMENT_PENDING' && (
                <Link
                  href={`/register/pay/${registrationId}`}
                  className="block w-full py-3 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded border border-red-500"
                >
                  COMPLETE PAYMENT NOW
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
