import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { getActiveEvent } from '@/lib/services/registration';
import { getScores, scoresAction, type ScoresInput } from '@/lib/services/judgeScores';

/**
 * GET  /api/admin/scores — the panel teams and every judge's score sheet
 * POST /api/admin/scores — { action: 'save' | 'delete', teamId, judge, ...scores } · { action: 'lock', on }
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await getScores(ev._id) });
  } catch (error) {
    console.error('GET /api/admin/scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as ScoresInput;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const res = await scoresAction(ev._id, body, auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 409 });
    await logAction(auth.name, 'admin', `SCORES_${String(body.action).toUpperCase()}`, body.teamId || ev._id.toHexString(), hashIp(getClientIp(req.headers)), undefined, {
      judge: body.judge,
      on: body.on,
    });
    return NextResponse.json({ ok: true, data: res.view });
  } catch (error) {
    console.error('POST /api/admin/scores error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
