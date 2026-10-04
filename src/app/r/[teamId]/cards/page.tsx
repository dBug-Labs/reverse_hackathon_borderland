'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { RegisterShell } from '@/components/RegisterShell';
import { CardDropPage } from '@/components/carddrop/TeamCardDrop';

/** /r/[teamId]/cards?t=... — a team chooses its problem statements, then sees its card. */
export default function TeamCardsPage() {
  const params = useParams();
  const teamId = (params?.teamId as string) || '';
  const token = useSearchParams().get('t') ?? '';

  return (
    <RegisterShell
      eyebrow={`The Card Drop · ${teamId}`}
      title="Your problem statement"
      subtitle={
        <>
          Twelve problem statements in four tracks. Choose your top 3; a live draw gives each team one.{' '}
          {token && (
            <Link href={`/r/${encodeURIComponent(teamId)}?t=${encodeURIComponent(token)}`} className="text-[#ff8a8a] underline">
              Back to team status
            </Link>
          )}
        </>
      }
      width="xl"
    >
      <CardDropPage teamId={teamId} token={token} />
    </RegisterShell>
  );
}
