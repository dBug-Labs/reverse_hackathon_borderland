import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireScope } from '@/lib/security/session';
import { getActiveEvent } from '@/lib/services/registration';

/** GET /api/admin/workshop — every Day 1 workshop submission, plus which present teams have not submitted. */
export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    const db = await getDb();
    const [subs, present] = await Promise.all([
      db.collection('workshopSubmissions').find({ eventId: event._id }).sort({ teamId: 1 }).toArray(),
      db
        .collection('registrations')
        .find(
          { eventId: event._id, status: 'CONFIRMED', deletedAt: { $exists: false }, 'attendance.day': { $in: [1, 3] } },
          { projection: { teamId: 1, teamName: 1 } }
        )
        .sort({ teamId: 1 })
        .toArray(),
    ]);
    const done = new Set(subs.map((s) => s.teamId));
    return NextResponse.json({
      ok: true,
      data: {
        submissions: subs.map((s) => ({
          teamId: s.teamId,
          teamName: s.teamName,
          repoUrl: s.repoUrl,
          updatedAt: s.updatedAt,
          changes: (s.history?.length ?? 1) - 1,
        })),
        presentTeams: present.length,
        missing: present.filter((r) => !done.has(r.teamId)).map((r) => ({ teamId: r.teamId, teamName: r.teamName })),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/workshop error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
