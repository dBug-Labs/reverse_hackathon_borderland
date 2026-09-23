import { getDb } from '@/lib/db';
import type { Registration, AttendanceEntry } from '@/lib/types';

/**
 * Attendance service — mark attendance, search teams, get counter.
 *
 * The attendance area sees only minimal team data (no emails, phones, payment info).
 */

// ── Minimal team card (safe for attendance volunteers) ──────────────────────

export interface AttendanceTeamCard {
  teamId: string;
  teamName: string;
  status: string;
  players: Array<{
    slot: number;
    fullName: string;
    regNo: string;
    isLeader: boolean;
  }>;
  attendance: AttendanceEntry[];
}

function toTeamCard(reg: Registration): AttendanceTeamCard {
  return {
    teamId: reg.teamId,
    teamName: reg.teamName,
    status: reg.status,
    players: reg.players.map((p) => ({
      slot: p.slot,
      fullName: p.fullName,
      regNo: p.regNo,
      isLeader: p.isLeader,
    })),
    attendance: reg.attendance || [],
  };
}

// ── Get team card by Team ID ────────────────────────────────────────────────

export async function getTeamCard(teamId: string): Promise<AttendanceTeamCard | null> {
  const db = await getDb();
  const reg = await db.collection<Registration>('registrations').findOne(
    { teamId, deletedAt: { $exists: false } },
    {
      projection: {
        teamId: 1,
        teamName: 1,
        status: 1,
        players: { slot: 1, fullName: 1, regNo: 1, isLeader: 1 },
        attendance: 1,
      },
    }
  );

  if (!reg) return null;
  return toTeamCard(reg);
}

// ── Search teams ────────────────────────────────────────────────────────────

export async function searchTeams(query: string): Promise<AttendanceTeamCard[]> {
  if (!query || query.length < 4) return [];

  const db = await getDb();
  const q = query.trim();

  // Try Team ID first (exact match)
  const byTeamId = await db.collection<Registration>('registrations').findOne(
    { teamId: q.toUpperCase(), deletedAt: { $exists: false } }
  );
  if (byTeamId) return [toTeamCard(byTeamId)];

  // Search by leader phone or any player's register number
  const results = await db.collection<Registration>('registrations')
    .find({
      deletedAt: { $exists: false },
      $or: [
        { leaderPhone: q },
        { 'players.regNo': q.toUpperCase() },
      ],
    })
    .limit(10)
    .toArray();

  return results.map(toTeamCard);
}

// ── Mark attendance ─────────────────────────────────────────────────────────

export interface MarkAttendanceInput {
  day: 1 | 2;
  playersPresent: number[]; // slot numbers
  volunteerName: string;
}

export interface MarkAttendanceResult {
  success: boolean;
  code?: string;
  message?: string;
  alreadyMarked?: {
    markedAt: Date;
    markedBy: string;
    playersPresent: number[];
  };
}

export async function markAttendance(
  teamId: string,
  input: MarkAttendanceInput
): Promise<MarkAttendanceResult> {
  const db = await getDb();

  // Find team and check status
  const reg = await db.collection<Registration>('registrations').findOne(
    { teamId, deletedAt: { $exists: false } },
    { projection: { status: 1, attendance: 1 } }
  );

  if (!reg) {
    return { success: false, code: 'NOT_FOUND', message: 'Team not found' };
  }

  if (reg.status !== 'CONFIRMED') {
    return {
      success: false,
      code: 'NOT_CONFIRMED',
      message: `Team status is ${reg.status} — only CONFIRMED teams can be marked present`,
    };
  }

  // Check if already marked for this day
  const dayEntry = reg.attendance?.find((a) => a.day === input.day);
  if (dayEntry) {
    // Already marked — allow add-only edit (for late arrivals)
    const mergedPresent = Array.from(
      new Set([...dayEntry.playersPresent, ...input.playersPresent])
    ).sort();

    await db.collection('registrations').updateOne(
      { teamId, 'attendance.day': input.day },
      {
        $set: {
          'attendance.$.playersPresent': mergedPresent,
          'attendance.$.markedAt': new Date(),
          'attendance.$.markedBy': input.volunteerName,
          updatedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      alreadyMarked: {
        markedAt: dayEntry.markedAt,
        markedBy: dayEntry.markedBy,
        playersPresent: dayEntry.playersPresent,
      },
    };
  }

  // First time marking for this day
  const entry: AttendanceEntry = {
    day: input.day,
    markedAt: new Date(),
    markedBy: input.volunteerName,
    playersPresent: input.playersPresent,
  };

  const result = await db.collection('registrations').updateOne(
    { teamId, deletedAt: { $exists: false } },
    {
      $push: { attendance: entry },
      $set: { updatedAt: new Date() },
    } as any
  );

  if (result.modifiedCount === 0) {
    return { success: false, code: 'INTERNAL', message: 'Failed to record attendance' };
  }

  return { success: true };
}

// ── Live counter ────────────────────────────────────────────────────────────

export async function getAttendanceCounter(day: 1 | 2): Promise<{
  teamsPresent: number;
  totalConfirmed: number;
}> {
  const db = await getDb();

  const [teamsPresent, totalConfirmed] = await Promise.all([
    db.collection('registrations').countDocuments({
      status: 'CONFIRMED',
      deletedAt: { $exists: false },
      'attendance.day': day,
    }),
    db.collection('registrations').countDocuments({
      status: 'CONFIRMED',
      deletedAt: { $exists: false },
    }),
  ]);

  return { teamsPresent, totalConfirmed };
}
