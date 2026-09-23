import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireScope } from '@/lib/security/session';
import { hashIp, getClientIp } from '@/lib/security/rateLimit';
import { rejectPayment } from '@/lib/services/payment';
import { getTeam, getActiveEvent } from '@/lib/services/registration';
import { enqueueEmail, processQueue } from '@/lib/services/email';
import { signMagicLink } from '@/lib/security/magicLink';

/**
 * POST /api/admin/registrations/[teamId]/reject — Reject payment
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
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Reason is required' },
        { status: 400 }
      );
    }

    const result = await rejectPayment(teamId, reason, auth.name, ipHashed);

    if (!result.success) {
      const err = result as { success: false; code: string; message: string };
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: 409 }
      );
    }

    // Enqueue REJECTED email
    const team = await getTeam(teamId);
    const event = await getActiveEvent();
    if (team && event) {
      const payExpiry = new Date(event.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);
      const resubmitLink = await signMagicLink(teamId, 'pay', payExpiry);

      await enqueueEmail({
        to: team.leaderEmail,
        template: 'REJECTED',
        templateData: {
          teamId,
          teamName: team.teamName,
          reason,
          resubmitLink,
          contactEmail: event.contact?.email,
        },
        dedupeKey: `REJECTED:${teamId}:${team.currentPaymentId}`,
      });

      after(async () => {
        try { await processQueue(5); } catch {}
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`POST /api/admin/registrations/${teamId}/reject error:`, error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
