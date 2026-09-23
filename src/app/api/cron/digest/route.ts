import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { enqueueEmail } from '@/lib/services/email';
import { getEnv } from '@/lib/env';

/**
 * GET /api/cron/digest — Send admin digest if there are pending reviews
 *
 * Runs every hour (4 times within the 15-min cron cycle).
 * Only sends if pendingCount > 0.
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
    const env = getEnv();

    const pendingCount = await db.collection('registrations').countDocuments({
      status: 'UNDER_REVIEW',
      deletedAt: { $exists: false },
    });

    if (pendingCount === 0) {
      return NextResponse.json({ ok: true, data: { message: 'No pending reviews' } });
    }

    const adminEmail = env.ADMIN_NOTIFY_EMAIL || env.SMTP_USER;

    await enqueueEmail({
      to: adminEmail,
      template: 'DIGEST',
      templateData: {
        pendingCount,
        adminUrl: `${env.APP_URL}/admin`,
      },
      dedupeKey: `DIGEST:${new Date().toISOString().split('T')[0]}:${new Date().getHours()}`,
    });

    return NextResponse.json({
      ok: true,
      data: { pendingCount, sent: true },
    });
  } catch (error) {
    console.error('GET /api/cron/digest error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Digest failed' },
      { status: 500 }
    );
  }
}
