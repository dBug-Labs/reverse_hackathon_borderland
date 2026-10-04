'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { RegisterShell } from '@/components/RegisterShell';
import { SubmissionPage } from '@/components/submission/TeamSubmission';

/** /r/[teamId]/submit?t=... — a team saves its GitHub repo and sees the repo check. */
export default function TeamSubmitPage() {
  const params = useParams();
  const teamId = (params?.teamId as string) || '';
  const token = useSearchParams().get('t') ?? '';

  return (
    <RegisterShell
      eyebrow={`Submission · ${teamId}`}
      title="Your submission"
      subtitle={
        <>
          One public GitHub repo with your docs, your rebuild and your deck.{' '}
          {token && (
            <Link href={`/r/${encodeURIComponent(teamId)}?t=${encodeURIComponent(token)}`} className="text-[#ff8a8a] underline">
              Back to team status
            </Link>
          )}
        </>
      }
      width="xl"
    >
      <SubmissionPage teamId={teamId} token={token} />
    </RegisterShell>
  );
}
