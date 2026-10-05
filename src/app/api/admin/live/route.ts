import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { getActiveEvent } from '@/lib/services/registration';
import { createGame, deleteGame, listGames, liveScores, type CreateInput } from '@/lib/services/live';

/**
 * GET  /api/admin/live — the live games of the event, plus the scores they feed into the final total
 * POST /api/admin/live — { action: 'create', ...CreateInput } | { action: 'delete', id }
 */

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    const [games, scores] = await Promise.all([listGames(event._id), liveScores(event._id)]);
    return NextResponse.json({ ok: true, data: { games, scores: scores.rows } });
  } catch (error) {
    console.error('GET /api/admin/live error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as CreateInput & { action?: string; id?: string };
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    const ip = hashIp(getClientIp(req.headers));
    if (body.action === 'delete' && body.id) {
      await deleteGame(body.id);
      await logAction(auth.name, 'admin', 'LIVE_DELETE', body.id, ip);
      return NextResponse.json({ ok: true, data: { games: await listGames(event._id) } });
    }
    const res = await createGame(event._id, body, auth.name);
    if (!res.ok) return NextResponse.json(res, { status: 400 });
    await logAction(auth.name, 'admin', 'LIVE_CREATE', res.id, ip, undefined, { kind: body.kind, group: body.group });
    return NextResponse.json({ ok: true, data: { id: res.id, games: await listGames(event._id) } });
  } catch (error) {
    console.error('POST /api/admin/live error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
