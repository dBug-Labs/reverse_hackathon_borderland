import { isSession } from '@/lib/attendanceSessions';
import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getAttendanceCounter } from '@/lib/services/attendance';

/**
 * GET /api/attendance/counter?day=1
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'attendance');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const day = parseInt(url.searchParams.get('day') || '1', 10);

    if (!isSession(day)) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Day must be 1, 2 or 3' },
        { status: 400 }
      );
    }

    const counter = await getAttendanceCounter(day);

    return NextResponse.json({ ok: true, data: counter });
  } catch (error) {
    console.error('GET /api/attendance/counter error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
