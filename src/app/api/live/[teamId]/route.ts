import { NextRequest, NextResponse } from 'next/server';
import type { ObjectId } from 'mongodb';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { getActiveEvent } from '@/lib/services/registration';
import { submitAnswer, submitWager, teamView, trade } from '@/lib/services/live';
import { teamJudging } from '@/lib/services/judging';

/**
 * A team's phone during the live games. Same signed status token as /r/[teamId]?t=...
 *
 * GET  /api/live/[teamId]?t=&g=&full=1 — the game this team is in, and its own answers or wallet
 * POST /api/live/[teamId]?t=           — { type: 'answer', gameId, qi, choice }
 *                                        { type: 'wager', gameId, pct }
 *                                        { type: 'trade', gameId, code, side, qty }
 */

let eventCache: { id: ObjectId; at: number } | null = null;
async function eventId(): Promise<ObjectId | null> {
  if (eventCache && Date.now() - eventCache.at < 60_000) return eventCache.id;
  const ev = await getActiveEvent();
  if (!ev) return null;
  eventCache = { id: ev._id, at: Date.now() };
  return ev._id;
}

async function authorise(req: NextRequest, teamId: string) {
  const token = new URL(req.url).searchParams.get('t');
  if (!token || !(await verifyMagicToken(token, teamId, 'status'))) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_LINK', message: 'This link is invalid or expired. Open the team link from your email.' },
      { status: 401 }
    );
  }
  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const denied = await authorise(req, teamId);
    if (denied) return denied;
    const ev = await eventId();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const sp = new URL(req.url).searchParams;
    const [data, judging] = await Promise.all([teamView(ev, teamId, { gameId: sp.get('g') || undefined, full: sp.get('full') === '1' }), teamJudging(ev, teamId)]);
    if (judging && data.team.teamName === teamId) data.team.teamName = judging.teamName;
    return NextResponse.json({ ok: true, data: { ...data, judging } });
  } catch (error) {
    console.error(`GET /api/live/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const denied = await authorise(req, teamId);
    if (denied) return denied;
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const gameId = String(b?.gameId ?? '');
    let res;
    if (b?.type === 'answer') res = await submitAnswer(gameId, teamId, Number(b.qi), Array.isArray(b.choice) ? b.choice.map(Number) : Number(b.choice));
    else if (b?.type === 'wager') res = await submitWager(gameId, teamId, Number(b.pct));
    else if (b?.type === 'trade') res = await trade(gameId, teamId, String(b.code), b.side as 'buy' | 'sell', Number(b.qty));
    else return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Unknown request' }, { status: 400 });
    if (!res.ok) return NextResponse.json(res, { status: 409 });
    return NextResponse.json({ ok: true, data: { ...res, now: Date.now() } });
  } catch (error) {
    console.error(`POST /api/live/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
