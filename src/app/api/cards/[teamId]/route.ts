import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { checkRateLimit, getClientIp, hashIp } from '@/lib/security/rateLimit';
import { getActiveEvent, getTeam } from '@/lib/services/registration';
import { getTeamView, lockTeamChoice, setPrefs } from '@/lib/services/cardDrop';

/**
 * Team side of the Card Drop. Same signed status token as /r/[teamId]?t=...
 *
 * GET  /api/cards/[teamId]?t=  — phase, my choices, my card, rivals on my card
 * POST /api/cards/[teamId]?t=  — { type: "prefs", choices } | { type: "lock", title, risk }
 */

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
    return NextResponse.json(
      { ok: false, code: 'NOT_ELIGIBLE', message: 'Only confirmed teams take part in the Card Drop.' },
      { status: 403 }
    );
  }
  return { event };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const ctx = await authorise(req, teamId);
    if (ctx instanceof NextResponse) return ctx;
    return NextResponse.json({ ok: true, data: await getTeamView(ctx.event._id, teamId) });
  } catch (error) {
    console.error(`GET /api/cards/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  try {
    const ctx = await authorise(req, teamId);
    if (ctx instanceof NextResponse) return ctx;

    const ipHash = hashIp(getClientIp(req.headers));
    if (await checkRateLimit(`cards:${teamId}`, 30, 60)) {
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many tries. Wait a minute.' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const eventId = ctx.event._id;
    let result;
    if (body?.type === 'prefs') {
      result = await setPrefs(eventId, teamId, body.choices, { actor: teamId, scope: 'team', ipHash });
    } else if (body?.type === 'lock') {
      result = await lockTeamChoice(eventId, teamId, body.title, body.risk);
    } else {
      return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Unknown request' }, { status: 400 });
    }

    if (!result.ok) {
      return NextResponse.json(result, { status: result.code === 'VALIDATION' ? 400 : 409 });
    }
    return NextResponse.json({ ok: true, data: await getTeamView(eventId, teamId) });
  } catch (error) {
    console.error(`POST /api/cards/${teamId} error:`, error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
