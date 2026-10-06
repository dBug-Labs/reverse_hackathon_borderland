import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { getActiveEvent } from '@/lib/services/registration';
import { editDocScore, getDocScores } from '@/lib/services/docScores';

/**
 * GET  /api/admin/docs-scores — every team's docs score (the Deduction, out of 150)
 * POST /api/admin/docs-scores — { teamId, accuracy?, completeness?, gaps?, note } corrects a score
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await getDocScores(ev._id) });
  } catch (error) {
    console.error('GET /api/admin/docs-scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const res = await editDocScore(ev._id, body, auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 404 });
    await logAction(auth.name, 'admin', 'DOCS_SCORE_EDIT', String(body.teamId), hashIp(getClientIp(req.headers)), undefined, {
      accuracy: body.accuracy,
      completeness: body.completeness,
      gaps: body.gaps,
      note: body.note,
    });
    return NextResponse.json({ ok: true, data: await getDocScores(ev._id) });
  } catch (error) {
    console.error('POST /api/admin/docs-scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
