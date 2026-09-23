import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';
import { restoreTeam } from '@/lib/services/registration';
import { logAction } from '@/lib/services/audit';

/**
 * POST /api/admin/registrations/[teamId]/restore — Undo soft delete
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireScope(req, 'admin');
  if (auth instanceof NextResponse) return auth;

  const { teamId } = await params;
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    const restored = await restoreTeam(teamId);

    if (!restored) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found or not deleted' },
        { status: 404 }
      );
    }

    await logAction(auth.name, 'admin', 'RESTORE', teamId, ipHashed);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`POST /api/admin/registrations/${teamId}/restore error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
