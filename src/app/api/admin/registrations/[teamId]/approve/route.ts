import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';
import { approvePayment } from '@/lib/services/payment';
import { getTeam, getActiveEvent } from '@/lib/services/registration';
import { enqueueEmail, processQueue } from '@/lib/services/email';
import { signMagicLink } from '@/lib/security/magicLink';

/**
 * POST /api/admin/registrations/[teamId]/approve — Approve payment
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
    const result = await approvePayment(teamId, auth.name, ipHashed);

    if (!result.success) {
      const err = result as { success: false; code: string; message: string };
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: 409 }
      );
    }

    // Enqueue CONFIRMED email
    const team = await getTeam(teamId);
    const event = await getActiveEvent();
    if (team && event) {
      const visaLink = await signMagicLink(teamId, 'visa', event.day2Date);
      const statusLink = await signMagicLink(teamId, 'status', event.day2Date);

      const allEmails = team.players.map((p) => p.email);

      await enqueueEmail({
        to: team.leaderEmail,
        cc: allEmails.filter((e) => e !== team.leaderEmail),
        template: 'CONFIRMED',
        templateData: {
          teamId,
          teamName: team.teamName,
          players: team.players.map((p) => ({
            fullName: p.fullName,
            regNo: p.regNo,
            isLeader: p.isLeader,
          })),
          venue: event.venue,
          day1Date: event.day1Date.toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          }),
          day2Date: event.day2Date.toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          }),
          visaLink,
          statusLink,
        },
        dedupeKey: `CONFIRMED:${teamId}:${team.currentPaymentId}`,
      });

      after(async () => {
        try { await processQueue(5); } catch {}
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`POST /api/admin/registrations/${teamId}/approve error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
