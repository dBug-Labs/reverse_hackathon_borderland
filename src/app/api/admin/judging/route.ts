import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { getActiveEvent } from '@/lib/services/registration';
import { getJudging, judgingAction, presentCounts, type JudgingInput } from '@/lib/services/judging';

/**
 * GET  /api/admin/judging?counts=1 — the panels (and, with counts, how many teams each attendance session has)
 * POST /api/admin/judging          — { action, ... } see judgingAction
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const withCounts = new URL(req.url).searchParams.get('counts') === '1';
    const [state, counts] = await Promise.all([getJudging(ev._id), withCounts ? presentCounts(ev._id) : Promise.resolve(undefined)]);
    return NextResponse.json({ ok: true, data: { ...state, counts } });
  } catch (error) {
    console.error('GET /api/admin/judging error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

const LOGGED = new Set(['draw', 'announce', 'add', 'remove', 'finish', 'reset']);

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as JudgingInput;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const res = await judgingAction(ev._id, body);
    if (!res.ok) return NextResponse.json(res, { status: 409 });
    if (LOGGED.has(body.action)) {
      await logAction(auth.name, 'admin', `JUDGING_${body.action.toUpperCase()}`, ev._id.toHexString(), hashIp(getClientIp(req.headers)), undefined, res.log);
    }
    return NextResponse.json({ ok: true, data: res.state });
  } catch (error) {
    console.error('POST /api/admin/judging error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
