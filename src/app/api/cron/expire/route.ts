import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * GET /api/cron/expire — Expire PAYMENT_PENDING registrations past deadline
 *
 * Runs every 15 min. Changes PAYMENT_PENDING → EXPIRED if expiresAt < now.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, code: 'UNAUTHORIZED', message: 'Invalid cron secret' },
      { status: 401 }
    );
  }

  try {
    const db = await getDb();
    const now = new Date();

    const result = await db.collection('registrations').updateMany(
      {
        status: 'PAYMENT_PENDING',
        expiresAt: { $lte: now },
        deletedAt: { $exists: false },
      },
      {
        $set: {
          status: 'EXPIRED',
          updatedAt: now,
        },
      }
    );

    return NextResponse.json({
      ok: true,
      data: { expired: result.modifiedCount },
    });
  } catch (error) {
    console.error('GET /api/cron/expire error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Expiration failed' },
      { status: 500 }
    );
  }
}
