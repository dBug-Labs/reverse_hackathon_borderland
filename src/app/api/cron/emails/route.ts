import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/services/email';

/**
 * GET /api/cron/emails — Process email queue
 *
 * Called by GitHub Actions every 15 min.
 * Auth: CRON_SECRET in Authorization header.
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
    const result = await processQueue(20);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('GET /api/cron/emails error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Email processing failed' },
      { status: 500 }
    );
  }
}
