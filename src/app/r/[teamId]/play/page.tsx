'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { LivePlayer } from '@/components/live/LivePlayer';

/** /r/[teamId]/play?t=... — the team's phone for Code Detective and the Trading Floor. */
export default function PlayPage() {
  const teamId = (useParams()?.teamId as string) || '';
  const token = useSearchParams().get('t') ?? '';
  return <LivePlayer teamId={teamId} token={token} />;
}
