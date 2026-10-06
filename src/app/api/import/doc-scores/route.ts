import { NextRequest, NextResponse } from 'next/server';
import { getActiveEvent } from '@/lib/services/registration';
import { importDocScore } from '@/lib/services/docScores';

/**
 * POST /api/import/doc-scores — loads reviewed docs scores in bulk (from the organisers' machine,
 * when it cannot reach the database directly). Auth: CRON_SECRET in the Authorization header.
 * Body: { rows: [...] } in the shape importDocScore takes.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid secret' }, { status: 401 });
  }
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
    for (const r of rows) {
      if (!r?.teamId) continue;
      await importDocScore(ev._id, r);
    }
    return NextResponse.json({ ok: true, data: { imported: rows.length } });
  } catch (error) {
    console.error('POST /api/import/doc-scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
