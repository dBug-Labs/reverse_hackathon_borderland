import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { searchTeams } from '@/lib/services/attendance';

/**
 * GET /api/attendance/search?q=...
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'attendance');
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || '';

    const results = await searchTeams(query);

    return NextResponse.json({ ok: true, data: results });
  } catch (error) {
    console.error('GET /api/attendance/search error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
