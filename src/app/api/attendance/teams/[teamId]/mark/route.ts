import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { markAttendance } from '@/lib/services/attendance';
import { logAction } from '@/lib/services/audit';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';

/**
 * POST /api/attendance/teams/[teamId]/mark — Mark attendance
 *
 * Body: { day: 1|2, playersPresent: [1,2,3,4] }
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'attendance');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    const body = await req.json();
    const { day, playersPresent } = body;

    if (![1, 2].includes(day)) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Day must be 1 or 2' },
        { status: 400 }
      );
    }

    if (!Array.isArray(playersPresent) || playersPresent.length === 0) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Select at least one present player' },
        { status: 400 }
      );
    }

    const result = await markAttendance(teamId, {
      day,
      playersPresent,
      volunteerName: auth.name,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    await logAction(auth.name, 'attendance', 'MARK_ATTENDANCE', teamId, ipHashed, undefined, {
      day,
      playersPresent,
      alreadyMarked: !!result.alreadyMarked,
    });

    return NextResponse.json({
      ok: true,
      data: {
        alreadyMarked: result.alreadyMarked || null,
      },
    });
  } catch (error) {
    console.error(`POST /api/attendance/teams/${teamId}/mark error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
