import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { logAction } from '@/lib/services/audit';
import { adminAction, getAdminState, type ActionInput } from '@/lib/services/live';

/**
 * GET  /api/admin/live/[gameId] — full state for the projector and the Game Master (answers included)
 * POST /api/admin/live/[gameId] — { action, v?, ... } moves the game on (see adminAction)
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const { gameId } = await params;
  try {
    const state = await getAdminState(gameId);
    if (!state) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Game not found' }, { status: 404 });
    return NextResponse.json({ ok: true, data: state });
  } catch (error) {
    console.error(`GET /api/admin/live/${gameId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

const LOGGED = new Set(['start', 'end', 'news', 'halt', 'close', 'restart-question']);

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  const { gameId } = await params;
  const body = (await req.json().catch(() => ({}))) as ActionInput;
  try {
    const res = await adminAction(gameId, body);
    if (!res.ok) return NextResponse.json(res, { status: (res as { code: string }).code === 'NOT_FOUND' ? 404 : 409 });
    if (LOGGED.has(body.action)) {
      await logAction(auth.name, 'admin', `LIVE_${body.action.toUpperCase()}`, gameId, hashIp(getClientIp(req.headers)), undefined, {
        target: body.target,
        pct: body.pct,
        headline: body.headline,
      });
    }
    return NextResponse.json({ ok: true, data: (res as { state: unknown }).state });
  } catch (error) {
    console.error(`POST /api/admin/live/${gameId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
