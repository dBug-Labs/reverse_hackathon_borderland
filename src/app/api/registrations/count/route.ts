import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/registrations/count
 *
 * Returns the total number of active (CONFIRMED + UNDER_REVIEW) teams.
 * Used by the urgency banner and popup to compute remaining slots.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();

    const count = await db.collection('registrations').countDocuments({
      status: { $in: ['CONFIRMED', 'UNDER_REVIEW'] },
      deletedAt: { $exists: false },
    });

    return NextResponse.json({ ok: true, data: { count } });
  } catch (error) {
    console.error('GET /api/registrations/count error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
