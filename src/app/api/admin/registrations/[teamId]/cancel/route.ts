import { NextRequest, NextResponse } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';
import { cancelTeam } from '@/lib/services/payment';

/**
 * POST /api/admin/registrations/[teamId]/cancel
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
    const body = await req.json();
    const reason = body.reason?.trim() || 'Cancelled by admin';

    const result = await cancelTeam(teamId, reason, auth.name, ipHashed);

    if (!result.success) {
      const err = result as { success: false; code: string; message: string };
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`POST /api/admin/registrations/${teamId}/cancel error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
