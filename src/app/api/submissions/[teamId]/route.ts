import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { getActiveEvent, getTeam } from '@/lib/services/registration';
import { getTeamSubmissionView, recheck, saveTeamSubmission } from '@/lib/services/submission';

/**
 * Team side of submissions. Same signed status token as /r/[teamId]?t=...
 *
 * GET  /api/submissions/[teamId]?t=  — clock, card, saved submission + last GitHub check
 * POST /api/submissions/[teamId]?t=  — { type: "save", repoUrl, demoVideoUrl?, liveUrl?, declaration } | { type: "check" }
 */

export const maxDuration = 30;

const STATUS: Record<string, number> = { VALIDATION: 400, NOT_FOUND: 404, TAKEN: 409, NO_CARD: 422 };

async function authorise(req: NextRequest, teamId: string) {
  const token = new URL(req.url).searchParams.get('t');
  if (!token || !(await verifyMagicToken(token, teamId, 'status'))) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_LINK', message: 'This link is invalid or expired. Open the link from your email.' },
      { status: 401 }
    );
  }
  const [team, event] = await Promise.all([getTeam(teamId), getActiveEvent()]);
  if (!team || !event) {
    return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'Team not found' }, { status: 404 });
  }
  if (team.status !== 'CONFIRMED') {
    return NextResponse.json({ ok: false, code: 'NOT_ELIGIBLE', message: 'Only confirmed teams can submit.' }, { status: 403 });
  }
  return { event };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const ctx = await authorise(req, teamId);
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json({ ok: true, data: await getTeamSubmissionView(ctx.event._id, teamId) });
  } catch (error) {
    console.error(`GET /api/submissions/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const ctx = await authorise(req, teamId);
    if (ctx instanceof NextResponse) return ctx;

    // Each save or check makes 3 GitHub calls, so keep it modest per team.
    if (await checkRateLimit(`submit:${teamId}`, 12, 600)) {
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many checks. Wait a few minutes.' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const result =
      body?.type === 'save'
        ? await saveTeamSubmission(ctx.event._id, teamId, body)
        : body?.type === 'check'
        ? await recheck(ctx.event._id, teamId)
        : ({ ok: false, code: 'VALIDATION', message: 'Unknown request.' } as const);

    if (!result.ok) {
      // tsconfig has strict: false, so `ok` does not narrow the union here
      const err = result as { ok: false; code: string; message: string };
      return NextResponse.json(err, { status: STATUS[err.code] ?? 409 });
    }
    return NextResponse.json({ ok: true, data: await getTeamSubmissionView(ctx.event._id, teamId) });
  } catch (error) {
    console.error(`POST /api/submissions/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
