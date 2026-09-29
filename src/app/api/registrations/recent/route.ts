import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/registrations/recent
 *
 * Returns the 15 most recent non-deleted registrations with only the
 * privacy-safe fields needed by the live ticker: first name, last initial,
 * and createdAt timestamp.
 *
 * No PII (email, phone, regNo, full name) is ever sent to the client.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();

    const docs = await db
      .collection('registrations')
      .find(
        {
          status: { $in: ['CONFIRMED', 'UNDER_REVIEW'] },
          deletedAt: { $exists: false },
        },
        {
          projection: {
            _id: 0,
            'players.fullName': 1,
            'players.isLeader': 1,
            createdAt: 1,
          },
          sort: { createdAt: -1 },
          limit: 15,
        }
      )
      .toArray();

    // Privacy: expose only first name + last initial of the team leader
    const recent = docs.map((doc) => {
      const leader =
        doc.players?.find((p: any) => p.isLeader) ?? doc.players?.[0];
      const fullName: string = leader?.fullName ?? '';
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] || 'A team';
      const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] + '.' : '';

      return {
        name: `${firstName} ${lastInitial}`.trim(),
        createdAt: doc.createdAt,
      };
    });

    return NextResponse.json({ ok: true, data: recent });
  } catch (error) {
    console.error('GET /api/registrations/recent error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
