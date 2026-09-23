import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getTeamCard } from '@/lib/services/attendance';

/**
 * GET /api/attendance/teams/[teamId] — Get team card for attendance
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'attendance');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;

  try {
    const card = await getTeamCard(teamId);

    if (!card) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    if (card.status !== 'CONFIRMED') {
      return NextResponse.json(
        { ok: false, code: 'NOT_CONFIRMED', message: `Team status is ${card.status} — not confirmed` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, data: card });
  } catch (error) {
    console.error(`GET /api/attendance/teams/${teamId} error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
