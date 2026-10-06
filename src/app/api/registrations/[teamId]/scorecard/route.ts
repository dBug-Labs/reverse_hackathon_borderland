import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { getActiveEvent } from '@/lib/services/registration';
import { teamScorecard } from '@/lib/services/leaderboard';

/**
 * GET /api/registrations/[teamId]/scorecard?t=… — the team's own final scorecard (every part, the
 * total and its rank), once the organisers publish scorecards on the leaderboard page.
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const token = new URL(req.url).searchParams.get('t');
  if (!token || !(await verifyMagicToken(token, teamId, 'status'))) {
    return NextResponse.json({ ok: false, code: 'INVALID_LINK', message: 'This link is invalid or expired.' }, { status: 401 });
  }
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await teamScorecard(ev._id, teamId) });
  } catch (error) {
    console.error('GET /api/registrations/[teamId]/scorecard error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
