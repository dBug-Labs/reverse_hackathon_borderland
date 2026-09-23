import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getDashboardStats } from '@/lib/services/stats';
import { getActiveEvent } from '@/lib/services/registration';

/**
 * GET /api/admin/stats — Dashboard KPIs
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'No event configured' },
        { status: 404 }
      );
    }

    const stats = await getDashboardStats(event.fee, event.capacity);

    return NextResponse.json({ ok: true, data: stats });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
