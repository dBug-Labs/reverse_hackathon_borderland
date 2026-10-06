import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getActiveEvent } from '@/lib/services/registration';
import { getLeaderboard, leaderboardAction, type LeaderInput } from '@/lib/services/leaderboard';

/**
 * GET /api/import/results — the final leaderboard with each team's players (for certificates),
 * for the organisers' machine when it cannot reach the database. Auth: CRON_SECRET.
 * POST /api/import/results — { action: 'team', teamId, adjust, adjustNote } applies an organisers' decision.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid secret' }, { status: 401 });
  }
  const ev = await getActiveEvent();
  if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as LeaderInput;
  if (body.action !== 'team') return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Only team adjustments.' }, { status: 400 });
  const res = await leaderboardAction(ev._id, body, 'organisers');
  if (!res.ok) return NextResponse.json(res, { status: 400 });
  return NextResponse.json({ ok: true, data: res.view.rows.slice(0, 8).map((r) => ({ rank: r.rank, teamId: r.teamId, teamName: r.teamName, total: r.total })) });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: 'Invalid secret' }, { status: 401 });
  }
  try {
    const ev = await getActiveEvent();
    if (!ev) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event' }, { status: 404 });
    const [board, regs] = await Promise.all([
      getLeaderboard(ev._id, true),
      (await getDb())
        .collection('registrations')
        .find({ eventId: ev._id, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamId: 1, 'players.fullName': 1, 'players.isLeader': 1, 'players.regNo': 1, 'players.department': 1, 'players.year': 1 } })
        .toArray(),
    ]);
    const playersOf = new Map(regs.map((r) => [r.teamId as string, r.players]));
    return NextResponse.json({ ok: true, data: { config: board.config, rows: board.rows.map((r) => ({ ...r, players: playersOf.get(r.teamId) ?? [] })) } });
  } catch (error) {
    console.error('GET /api/import/results error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
