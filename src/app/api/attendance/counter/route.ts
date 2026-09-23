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
    const day = parseInt(url.searchParams.get('day') || '1', 10) as 1 | 2;

    if (![1, 2].includes(day)) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Day must be 1 or 2' },
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
