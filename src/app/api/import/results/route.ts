import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getActiveEvent } from '@/lib/services/registration';
import { getLeaderboard } from '@/lib/services/leaderboard';

/**
 * GET /api/import/results — the final leaderboard with each team's players (for certificates),
 * for the organisers' machine when it cannot reach the database. Auth: CRON_SECRET.
 */

export const dynamic = 'force-dynamic';

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
