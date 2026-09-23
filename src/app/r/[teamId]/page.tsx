'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { RegisterShell } from '@/components/RegisterShell';

interface StatusData {
  teamId: string;
  teamName: string;
  status: string;
  players: { fullName: string; regNo: string; isLeader: boolean }[];
  rejectReason?: string;
  rejectCount: number;
  canResubmit: boolean;
  hasVisa: boolean;
  createdAt?: string;
}

export default function RegistrationStatusPage() {
  const params = useParams();
  const teamId = (params?.teamId as string) || '';
  // Signed status token from the email link (/r/DBG-472?t=...)
  const token = useSearchParams().get('t') ?? '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    if (!token) {
      setError('This status link is incomplete. Open the link from your registration email.');
      setLoading(false);
      return;
    }

    fetch(`/api/registrations/${encodeURIComponent(teamId)}/status?t=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setData(json.data);
        } else {
          setError(json.message || 'Registration not found');
        }
      })
      .catch(() => setError('Failed to retrieve registration status'))
      .finally(() => setLoading(false));
  }, [teamId, token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-label text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Confirmed — see you on 5 Oct</span>
          </div>
        );
      case 'UNDER_REVIEW':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-amber-950/80 border border-amber-500 text-amber-300 font-label text-xs">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Payment under review</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/80 border border-red-500 text-red-300 font-label text-xs">
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Payment not verified</span>
          </div>
        );
      case 'CANCELLED':
      case 'EXPIRED':
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-label text-xs">
            <XCircle className="w-4 h-4 text-[var(--ink)]/70" />
            <span>{status}</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-label text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Waiting for payment</span>
          </div>
        );
    }
  };

  const leader = data?.players.find((p) => p.isLeader);

  return (
    <RegisterShell eyebrow="Registration status" title={teamId || 'Your team'} width="narrow">
        <div className="paper-card rounded-2xl p-2.5 text-[var(--ink)]">
          <div className="rounded-xl border border-[var(--card-red)]/45 p-6 sm:p-8 text-center space-y-6">
          {loading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <span className="w-6 h-6 border-2 border-[var(--card-red)] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-label text-[var(--ink)]/70">Loading your status…</span>
            </div>
          ) : error ? (
            <div className="py-2 text-base font-label font-semibold text-[var(--card-red)]">
              {error}
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div>{getStatusBadge(data.status)}</div>

              <div className="text-left pt-5 border-t border-[var(--ink)]/15 space-y-2 text-sm font-label">
                <div className="flex justify-between pb-1.5">
                  <span className="text-[var(--ink)]/55">Team Name:</span>
                  <span className="font-bold">{data.teamName}</span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span className="text-[var(--ink)]/55">Leader:</span>
                  <span className="font-semibold">{leader?.fullName ?? '—'}</span>
                </div>
                <div className="flex justify-between pb-1.5">
                  <span className="text-[var(--ink)]/55">Team Size:</span>
                  <span className="font-semibold">{data.players.length} players</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink)]/55">Registered:</span>
                  <span className="text-[var(--ink)]/70">
                    {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {data.status === 'REJECTED' && data.rejectReason && (
                <div className="text-left p-4 rounded bg-red-950/40 border border-red-800 text-xs font-label text-red-300">
                  Reason: {data.rejectReason}
                </div>
              )}

              {(data.status === 'PAYMENT_PENDING' || data.canResubmit) && (
                <p className="text-sm font-label text-[var(--ink)]/70">
                  Use the payment link in your registration email to submit your UTR.
                </p>
              )}
            </div>
          ) : null}
          </div>
        </div>
    </RegisterShell>
  );
}
