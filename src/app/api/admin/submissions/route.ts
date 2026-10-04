import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getClientIp, hashIp } from '@/lib/security/rateLimit';
import { getActiveEvent } from '@/lib/services/registration';
import { adminCheckAll, adminSetRepo, adminSnapshot, getAdminSubmissions } from '@/lib/services/submission';

/**
 * GET  /api/admin/submissions — every confirmed team with its repo, last check and snapshots
 * POST /api/admin/submissions — { action, ... }
 *   check-all | snapshot { which: "docs" | "code" } | set-repo { teamId, repoUrl }
 */

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;
  try {
    const event = await getActiveEvent();
    if (!event) return NextResponse.json({ ok: false, code: 'NOT_FOUND', message: 'No event configured' }, { status: 404 });
    return NextResponse.json({ ok: true, data: await getAdminSubmissions(event._id) });
  } catch (error) {
    console.error('GET /api/admin/submissions error:', error);
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

    let result: { ok: true } | { ok: false; code: string; message: string };
    switch (body.action) {
      case 'check-all':
        result = await adminCheckAll(event._id, auth.name, ipHash);
        break;
      case 'snapshot':
        if (body.which !== 'docs' && body.which !== 'code') {
          return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'which must be docs or code' }, { status: 400 });
        }
        result = await adminSnapshot(event._id, body.which, auth.name, ipHash);
        break;
      case 'set-repo':
        result = await adminSetRepo(
          event._id,
          String(body.teamId ?? '').trim().toUpperCase(),
          String(body.repoUrl ?? ''),
          auth.name,
          ipHash
        );
        break;
      default:
        return NextResponse.json({ ok: false, code: 'VALIDATION', message: 'Unknown action' }, { status: 400 });
    }

    if (!result.ok) {
      const err = result as { ok: false; code: string; message: string };
      return NextResponse.json(err, { status: err.code === 'VALIDATION' ? 400 : err.code === 'NOT_FOUND' ? 404 : 409 });
    }
    return NextResponse.json({ ok: true, data: await getAdminSubmissions(event._id) });
  } catch (error) {
    console.error('POST /api/admin/submissions error:', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'Something went wrong' }, { status: 500 });
  }
}
