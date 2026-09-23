import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { getTeamIncludeDeleted, editTeam, mapDuplicateKeyError } from '@/lib/services/registration';
import { softDeleteTeam, restoreTeam } from '@/lib/services/registration';
import { getPaymentHistory } from '@/lib/services/payment';
import { logAction } from '@/lib/services/audit';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';

/**
 * GET /api/admin/registrations/[teamId] — Full registration detail
 * PATCH /api/admin/registrations/[teamId] — Edit team details
 * DELETE /api/admin/registrations/[teamId] — Soft delete
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;

  try {
    const team = await getTeamIncludeDeleted(teamId);
    if (!team) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    const payments = await getPaymentHistory(teamId);

    return NextResponse.json({
      ok: true,
      data: { registration: team, payments },
    });
  } catch (error) {
    console.error(`GET /api/admin/registrations/${teamId} error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;
  const ipHashed = hashIp(getClientIp(req.headers));
  let body: any;

  try {
    const before = await getTeamIncludeDeleted(teamId);
    if (!before) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    body = await req.json();
    const updated = await editTeam(teamId, {
      teamName: body.teamName,
      players: body.players,
      adminNotes: body.adminNotes,
    });

    if (!updated) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    await logAction(auth.name, 'admin', 'EDIT', teamId, ipHashed,
      { teamName: before.teamName, adminNotes: before.adminNotes },
      { teamName: updated.teamName, adminNotes: updated.adminNotes }
    );

    return NextResponse.json({ ok: true, data: { registration: updated } });
  } catch (error: any) {
    const dup = mapDuplicateKeyError(error, (body?.players || []) as any);
    if (dup) {
      return NextResponse.json({ ok: false, ...dup }, { status: 409 });
    }
    console.error(`PATCH /api/admin/registrations/${teamId} error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    const deleted = await softDeleteTeam(teamId);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found or already deleted' },
        { status: 404 }
      );
    }

    await logAction(auth.name, 'admin', 'SOFT_DELETE', teamId, ipHashed);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`DELETE /api/admin/registrations/${teamId} error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
