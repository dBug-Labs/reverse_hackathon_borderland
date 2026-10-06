import { NextRequest, NextResponse } from 'next/server';
import { getActiveEvent } from '@/lib/services/registration';
import { saveCodeScore } from '@/lib/services/codeReview';

/**
 * POST /api/import/code-scores — loads audited code review scores in bulk (from the organisers'
 * machine, when it cannot reach the database directly). Auth: CRON_SECRET in the Authorization header.
 * Body: { reviewer, rows: [{ teamId, parts: { core, kt, imp, docs, eng }, notes, report }] }
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
    const reviewer = String(body.reviewer || 'AI audit').slice(0, 60);
    let n = 0;
    for (const r of rows) {
      if (!r?.teamId) continue;
      const res = await saveCodeScore(ev._id, r, reviewer);
      if (res.ok) n++;
    }
    return NextResponse.json({ ok: true, data: { imported: n } });
  } catch (error) {
    console.error('POST /api/import/code-scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
