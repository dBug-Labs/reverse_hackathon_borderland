import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { getActiveEvent } from '@/lib/services/registration';
import { getLeaderboard, leaderboardAction, type LeaderInput } from '@/lib/services/leaderboard';

/**
 * GET  /api/admin/leaderboard — every team's parts and total (polled by the projector)
 * POST /api/admin/leaderboard — { action: 'config', config } · { action: 'team', teamId, visas?, docTest?, adjust?, adjustNote? }
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await getLeaderboard(ev._id) });
  } catch (error) {
    console.error('GET /api/admin/leaderboard error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as LeaderInput;
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const res = await leaderboardAction(ev._id, body, auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    await logAction(auth.name, 'admin', `LEADERBOARD_${String(body.action).toUpperCase()}`, body.teamId || ev._id.toHexString(), hashIp(getClientIp(req.headers)), undefined, {
      config: body.config,
      visas: body.visas,
      docTest: body.docTest,
      adjust: body.adjust,
      adjustNote: body.adjustNote,
    });
    return NextResponse.json({ ok: true, data: res.view });
  } catch (error) {
    console.error('POST /api/admin/leaderboard error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
