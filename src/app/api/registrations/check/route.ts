import { NextRequest, NextResponse } from 'next/server';
import { teamDetailsSchema } from '@/lib/validation/team';
import { checkRateLimit, hashIp, getClientIp, logAbuse } from '@/lib/security/rateLimit';
import {
  getActiveEvent,
  getCapacityUsed,
  findTeamConflicts,
  pickCandidateTeamId,
  upiDetails,
} from '@/lib/services/registration';

/**
 * POST /api/registrations/check — Step 1 (team details)
 *
 * Validates the team and checks it against existing registrations, then
 * returns a suggested Team ID and the UPI payment details.
 * NOTHING is written: the Team ID is not reserved, so an abandoned form
 * leaves no trace. The team is saved only when the UTR is submitted
 * (POST /api/registrations).
 */

export async function POST(req: NextRequest) {
  const ipHashed = hashIp(getClientIp(req.headers));

  try {
    if (await checkRateLimit(`regcheck:${ipHashed}`, 20, 10 * 60)) {
      await logAbuse(ipHashed, 'POST /api/registrations/check', 'rate_limit_10m');
      return NextResponse.json(
        { ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Honeypot — pretend all is well, reveal nothing
    if (body.website && body.website.length > 0) {
      await logAbuse(ipHashed, 'POST /api/registrations/check', 'honeypot');
      return NextResponse.json({ ok: true, data: { candidateTeamId: 'DBG-000', fake: true } });
    }

    const parsed = teamDetailsSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fields[path]) fields[path] = issue.message;
      }
      return NextResponse.json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'Please fix the errors below.', fields },
        { status: 400 }
      );
    }

    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json({ ok: false, code: 'INTERNAL', message: 'No event configured' }, { status: 500 });
    }
    const now = new Date();
    if (event.forceClosed || now > event.registrationClosesAt || now < event.registrationOpensAt) {
      return NextResponse.json(
        { ok: false, code: 'REGISTRATION_CLOSED', message: 'Registrations are closed.' },
        { status: 409 }
      );
    }
    if ((await getCapacityUsed(event._id)) >= event.capacity) {
      return NextResponse.json({ ok: false, code: 'EVENT_FULL', message: 'All seats are taken.' }, { status: 409 });
    }

    const conflict = await findTeamConflicts(parsed.data);
    if (conflict) {
      return NextResponse.json({ ok: false, ...conflict }, { status: 409 });
    }

    const candidateTeamId = await pickCandidateTeamId(event);
    return NextResponse.json({
      ok: true,
      data: {
        candidateTeamId,
        upi: upiDetails(event, candidateTeamId),
        whatsappCommunityUrl:
          process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
          process.env.WHATSAPP_COMMUNITY_URL ||
          '',
      },
    });
  } catch (error) {
    console.error('POST /api/registrations/check error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something broke on our side. Please try again.' },
      { status: 500 }
    );
  }
}
