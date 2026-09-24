import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getActiveEvent } from '@/lib/services/registration';
import type { EventDoc, EventState, SeatsHint } from '@/lib/types';

/**
 * GET /api/event
 *
 * Returns safe, public event data for the landing page.
 * No PII, no admin-only fields.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 30; // cache for 30s

function computeState(
  event: EventDoc,
  confirmedCount: number,
  underReviewCount: number
): { state: EventState; seatsHint: SeatsHint } {
  const now = new Date();
  const used = confirmedCount + underReviewCount;

  if (event.forceClosed || now > event.registrationClosesAt) {
    return { state: 'CLOSED', seatsHint: 'none' };
  }

  if (now < event.registrationOpensAt) {
    return { state: 'UPCOMING', seatsHint: 'plenty' };
  }

  if (used >= event.capacity) {
    return { state: 'FULL', seatsHint: 'none' };
  }

  if (used / event.capacity > 0.9) {
    return { state: 'ALMOST_FULL', seatsHint: 'few' };
  }

  return { state: 'OPEN', seatsHint: 'plenty' };
}

export async function GET(_req: NextRequest) {
  try {
    const db = await getDb();

    const event = await getActiveEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, code: 'NOT_FOUND', message: 'No event configured' },
        { status: 404 }
      );
    }

    // Count registrations for capacity
    const [confirmedCount, underReviewCount] = await Promise.all([
      db.collection('registrations').countDocuments({
        eventId: event._id,
        status: 'CONFIRMED',
        deletedAt: { $exists: false },
      }),
      db.collection('registrations').countDocuments({
        eventId: event._id,
        status: 'UNDER_REVIEW',
        deletedAt: { $exists: false },
      }),
    ]);

    const { state, seatsHint } = computeState(event, confirmedCount, underReviewCount);

    return NextResponse.json({
      ok: true,
      data: {
        name: event.name,
        tagline: event.tagline,
        venue: event.venue,
        day1Date: event.day1Date,
        day2Date: event.day2Date,
        registrationOpensAt: event.registrationOpensAt,
        registrationClosesAt: event.registrationClosesAt,
        fee: event.fee,
        capacity: event.capacity,
        upiId: event.upiId,
        payeeName: event.payeeName,
        teamSize: event.teamSize,
        faq: event.faq || [],
        contact: event.contact || {},
        state,
        seatsHint,
        confirmedCount,
        underReviewCount,
        whatsappCommunityUrl:
          process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL ||
          process.env.WHATSAPP_COMMUNITY_URL ||
          '',
      },
    });
  } catch (error) {
    console.error('GET /api/event error:', error);
    return NextResponse.json(
      { ok: false, code: 'INTERNAL', message: 'Something went wrong' },
      { status: 500 }
    );
  }
}
