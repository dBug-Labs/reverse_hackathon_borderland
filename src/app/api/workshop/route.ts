import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/security/rateLimit';
import { getActiveEvent } from '@/lib/services/registration';
import { parseRepoUrl } from '@/lib/submission/config';

/**
 * POST /api/workshop — { teamId, repoUrl }
 * Day 1 workshop submission: one GitHub link per team. Re-submitting replaces it.
 * Public on purpose (the link goes out by email); only confirmed team IDs are accepted.
 */
export async function POST(req: NextRequest) {
  const ipHash = hashIp(getClientIp(req.headers));
  try {
    if (await checkRateLimit(`workshop:${ipHash}`, 20, 600)) {
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many tries. Wait a few minutes.' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as { teamId?: unknown; repoUrl?: unknown } | null;
    const teamId = String(body?.teamId ?? '').trim().toUpperCase();
    const parsed = parseRepoUrl(String(body?.repoUrl ?? ''));
    const fields: Record<string, string> = {};
    if (!/^DBG-\d{1,6}$/.test(teamId)) fields.teamId = 'Team ID looks like DBG-123.';
    if (!parsed) fields.repoUrl = 'Paste a GitHub repo link, like https://github.com/you/repo.';
    if (Object.keys(fields).length) {
      return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Check the highlighted fields.', fields }, { status: 400 });
    }

    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });

    const db = await getDb();
    const reg = await db
      .collection('registrations')
      .findOne({ eventId: event._id, teamId, status: 'CONFIRMED', deletedAt: { $exists: false } }, { projection: { teamName: 1 } });
    if (!reg) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'No confirmed team with that ID.', fields: { teamId: 'Not found. Check the ID on your Entry Visa email.' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const prev = await db.collection('workshopSubmissions').findOneAndUpdate(
      { eventId: event._id, teamId },
      {
        $set: { teamName: reg.teamName, repoUrl: parsed!.url, owner: parsed!.owner, repo: parsed!.repo, updatedAt: now, ipHash },
        $setOnInsert: { createdAt: now },
        $push: { history: { at: now, repoUrl: parsed!.url } } as never,
      },
      { upsert: true, returnDocument: 'before' }
    );

    return NextResponse.json({ ok: true, data: { teamId, teamName: reg.teamName, repoUrl: parsed!.url, updated: !!prev } });
  } catch (error) {
    console.error('POST /api/workshop error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
