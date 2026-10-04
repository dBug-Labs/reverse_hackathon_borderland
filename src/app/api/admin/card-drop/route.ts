import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { getActiveEvent } from '@/lib/services/registration';
import {
  getAdminView,
  lockCardDrop,
  moveTeam,
  openCardDrop,
  resetCardDrop,
  runDraw,
  setPrefs,
  swapTeams,
} from '@/lib/services/cardDrop';

/**
 * GET  /api/admin/card-drop — full Card Drop state for the console and the stage
 * POST /api/admin/card-drop — { action, ... }
 *   open | draw { presentOnly } | prefs { teamId, choices } | move { teamId, card }
 *   swap { teamA, teamB } | lock | reset { confirm: "RESET" }
 */

const STATUS: Record<string, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  NOT_ELIGIBLE: 422,
  NO_TEAMS: 422,
};

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await getAdminView(event._id) });
  } catch (error) {
    console.error('GET /api/admin/card-drop error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Missing action' }, { status: 400 });
  }
  const ipHash = hashIp(getClientIp(req.headers));

  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    const eventId = event._id;
    const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim().toUpperCase() : '');

    let result: { ok: true } | { ok: false; code: string; message: string };
    switch (body.action) {
      case 'open':
        result = await openCardDrop(eventId, auth.name, ipHash);
        break;
      case 'draw':
        result = await runDraw(eventId, auth.name, body.presentOnly === true, ipHash);
        break;
      case 'prefs':
        result = await setPrefs(eventId, str('teamId'), body.choices, { actor: auth.name, scope: 'admin', ipHash });
        break;
      case 'move':
        result = await moveTeam(eventId, str('teamId'), String(body.card ?? ''), auth.name, ipHash);
        break;
      case 'swap':
        result = await swapTeams(eventId, str('teamA'), str('teamB'), auth.name, ipHash);
        break;
      case 'lock':
        result = await lockCardDrop(eventId, auth.name, ipHash);
        break;
      case 'reset':
        if (body.confirm !== 'RESET') {
          return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Type RESET to confirm.' }, { status: 400 });
        }
        result = await resetCardDrop(eventId, auth.name, ipHash);
        break;
      default:
        return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Unknown action' }, { status: 400 });
    }

    if (!result.ok) {
      // tsconfig has strict: false, so `ok` does not narrow the union here
      const err = result as { ok: false; code: string; message: string };
      return NextResponse.json(err, { status: STATUS[err.code] ?? 409 });
    }
    return NextResponse.json({ ok: true, data: await getAdminView(eventId) });
  } catch (error) {
    console.error('POST /api/admin/card-drop error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
