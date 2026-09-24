import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/security/magicLink';
import { getTeam, getActiveEvent } from '@/lib/services/registration';
import { getPaymentHistory } from '@/lib/services/payment';

/**
 * GET /api/registrations/[teamId]/status — Status page data
 *
 * Requires magic token (?t=...).
 * Returns current status, reject reason, payment history, Visa link eligibility.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

  try {
    // Verify magic token
    const url = new URL(req.url);
    const token = url.searchParams.get('t');
    if (!token || !(await verifyMagicToken(token, teamId, 'status'))) {
      return NextResponse.json(
        { ok: false, code: 'INVALID_LINK', message: 'This link is invalid or expired. Request a new one.' },
        { status: 401 }
      );
    }

    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    const payments = await getPaymentHistory(teamId);
    const latestPayment = payments[0];

    // Determine if re-submit is allowed
    const canResubmit =
      team.status === 'REJECTED' && team.rejectCount < 3;

    return NextResponse.json({
      ok: true,
      data: {
        teamId: team.teamId,
        teamName: team.teamName,
        status: team.status,
        players: team.players.map((p) => ({
          fullName: p.fullName,
          regNo: p.regNo,
          isLeader: p.isLeader,
        })),
        rejectReason: latestPayment?.rejectReason,
        rejectCount: team.rejectCount,
        canResubmit,
        hasVisa: team.status === 'CONFIRMED',
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        whatsappCommunityUrl:
          process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
          process.env.WHATSAPP_COMMUNITY_URL ||
          '',
      },
    });
  } catch (error) {
    console.error(`GET /api/registrations/${teamId}/status error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
