import { buildUpiIntent } from '@/lib/upi';
import { ObjectId } from 'mongodb';
import { getDb, getClient } from '@/lib/db';
import { signMagicToken, signMagicLink } from '@/lib/security/magicLink';
import type { Registration, Player, EventDoc } from '@/lib/types';
import type { TeamInput, TeamDetailsInput, RegistrationSubmitInput } from '@/lib/validation/team';
import { ENTRY_FEE } from '@/lib/fee';

/**
 * Registration service — all business logic for creating and managing teams.
 *
 * Route handlers stay thin and call these functions.
 */

// ── Team ID generation ──────────────────────────────────────────────────────

const MAX_ID_RETRIES = 20;

/**
 * Generate a unique team ID (e.g. "DBG-472").
 * Random 3-digit number 100–999, retries on collision.
 */
export async function generateUniqueTeamId(prefix: string = 'DBG'): Promise<string> {
  const db = await getDb();

  for (let i = 0; i < MAX_ID_RETRIES; i++) {
    const num = 100 + Math.floor(Math.random() * 900);
    const teamId = `${prefix}-${num}`;

    // Check if taken (including soft-deleted — IDs are never reused)
    const existing = await db
      .collection('registrations')
      .findOne({ teamId }, { projection: { _id: 1 } });

    if (!existing) return teamId;
  }

  throw new Error('Could not generate a unique Team ID after 20 retries');
}

// ── Create team (Step 1) ────────────────────────────────────────────────────

export interface CreateTeamResult {
  teamId: string;
  resumeToken: string;
  upi: {
    id: string;
    payeeName: string;
    amount: number;
    note: string;
    qrString: string;
  };
}

export async function createTeam(
  input: TeamInput,
  eventDoc: EventDoc,
  ipHash: string,
  userAgent: string
): Promise<CreateTeamResult> {
  const db = await getDb();

  const prefix = eventDoc.teamIdPrefix || 'DBG';
  const teamId = await generateUniqueTeamId(prefix);

  const leader = input.players.find((p) => p.isLeader)!;

  const players: Player[] = input.players.map((p) => ({
    slot: p.slot as 1 | 2 | 3 | 4,
    isLeader: p.isLeader,
    fullName: p.fullName,
    email: p.email,
    regNo: p.regNo,
    phone: p.phone,
    year: p.year,
    department: p.department,
  }));

  const now = new Date();
  // Teams get 2 extra days past close date to submit payment
  const expiresAt = new Date(eventDoc.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000);

  const registration: Omit<Registration, '_id'> = {
    teamId,
    eventId: eventDoc._id,
    teamName: input.teamName,
    teamNameLower: input.teamName.toLowerCase(),
    players,
    leaderEmail: leader.email,
    leaderPhone: leader.phone!,
    status: 'PAYMENT_PENDING',
    rejectCount: 0,
    attendance: [],
    idempotencyKey: input.idempotencyKey,
    ipHash,
    userAgent,
    consentAt: now,
    source: input.source,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };

  await db.collection('registrations').insertOne(registration as any);

  // Build the resume magic token
  const resumeToken = await signMagicToken(teamId, 'pay', expiresAt);

  // Build UPI info
  const note = teamId;
  const qrString = buildUpiIntent({
    upiId: eventDoc.upiId,
    payeeName: eventDoc.payeeName,
    amount: eventDoc.fee,
    note,
  });

  return {
    teamId,
    resumeToken,
    upi: {
      id: eventDoc.upiId,
      payeeName: eventDoc.payeeName,
      amount: eventDoc.fee,
      note,
      qrString,
    },
  };
}

// ── Get team ────────────────────────────────────────────────────────────────

export async function getTeam(teamId: string): Promise<Registration | null> {
  const db = await getDb();
  return db.collection<Registration>('registrations').findOne({ teamId, deletedAt: { $exists: false } });
}

export async function getTeamIncludeDeleted(teamId: string): Promise<Registration | null> {
  const db = await getDb();
  return db.collection<Registration>('registrations').findOne({ teamId });
}

// ── Edit team (admin) ───────────────────────────────────────────────────────

export interface EditTeamInput {
  teamName?: string;
  players?: Player[];
  adminNotes?: string;
}

export async function editTeam(
  teamId: string,
  updates: EditTeamInput
): Promise<Registration | null> {
  const db = await getDb();

  const $set: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.teamName !== undefined) {
    $set.teamName = updates.teamName;
    $set.teamNameLower = updates.teamName.toLowerCase();
  }

  if (updates.players !== undefined) {
    $set.players = updates.players;
    const leader = updates.players.find((p) => p.isLeader);
    if (leader) {
      $set.leaderEmail = leader.email;
      $set.leaderPhone = leader.phone;
    }
  }

  if (updates.adminNotes !== undefined) {
    $set.adminNotes = updates.adminNotes;
  }

  const result = await db.collection<Registration>('registrations').findOneAndUpdate(
    { teamId, deletedAt: { $exists: false } },
    { $set },
    { returnDocument: 'after' }
  );

  return result;
}

// ── Soft delete / restore ───────────────────────────────────────────────────

export async function softDeleteTeam(teamId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('registrations').updateOne(
    { teamId, deletedAt: { $exists: false } },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );
  return result.modifiedCount === 1;
}

export async function restoreTeam(teamId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection('registrations').updateOne(
    { teamId, deletedAt: { $exists: true } },
    { $unset: { deletedAt: '' }, $set: { updatedAt: new Date() } }
  );
  return result.modifiedCount === 1;
}

// ── Get active event ────────────────────────────────────────────────────────

export async function getActiveEvent(): Promise<EventDoc | null> {
  const db = await getDb();
  const event = await db.collection<EventDoc>('events').findOne({});
  return event && { ...event, fee: ENTRY_FEE }; // fee lives in code, not the DB
}

// ── Capacity check ──────────────────────────────────────────────────────────

export async function getCapacityUsed(eventId: ObjectId): Promise<number> {
  const db = await getDb();
  return db.collection('registrations').countDocuments({
    eventId,
    status: { $in: ['CONFIRMED', 'UNDER_REVIEW'] },
    deletedAt: { $exists: false },
  });
}

// ── Check for idempotency key ───────────────────────────────────────────────

export async function findByIdempotencyKey(key: string): Promise<Registration | null> {
  const db = await getDb();
  return db.collection<Registration>('registrations').findOne({ idempotencyKey: key });
}

// ── Map MongoDB duplicate key errors to field paths ─────────────────────────

export function mapDuplicateKeyError(
  error: any,
  players: Player[]
): { code: string; message: string; fields?: Record<string, string> } | null {
  if (error?.code !== 11000) return null;

  const keyPattern = error.keyPattern || {};
  const keyValue = error.keyValue || {};

  // Team name
  if (keyPattern.teamNameLower) {
    return { code: 'TEAM_NAME_TAKEN', message: 'That team name is taken' };
  }

  // Leader phone
  if (keyPattern.leaderPhone) {
    return {
      code: 'DUPLICATE_PHONE',
      message: 'This phone number is already registered with another team',
    };
  }

  // Player email
  if (keyPattern['players.email']) {
    const dupEmail = keyValue['players.email'];
    const slot = players.findIndex((p) => p.email === dupEmail);
    const path = slot >= 0 ? `players.${slot}.email` : 'players.0.email';
    return {
      code: 'PLAYER_ALREADY_REGISTERED',
      message: `Player ${slot + 1} is already registered in another team`,
      fields: { [path]: `This email is already in another team` },
    };
  }

  // Player register number
  if (keyPattern['players.regNo']) {
    const dupRegNo = keyValue['players.regNo'];
    const slot = players.findIndex((p) => p.regNo === dupRegNo);
    const path = slot >= 0 ? `players.${slot}.regNo` : 'players.0.regNo';
    return {
      code: 'PLAYER_ALREADY_REGISTERED',
      message: `Player ${slot + 1} is already registered in another team`,
      fields: { [path]: `This register number is already in another team` },
    };
  }

  // Idempotency key (double-click)
  if (keyPattern.idempotencyKey) {
    return null; // handled separately by returning the first result
  }

  // Fallback
  return {
    code: 'DUPLICATE',
    message: 'A registration with these details already exists',
  };
}

// ── One-pass registration: check → pay → submit ─────────────────────────────
//
// Nothing is written until the team submits its UTR. Step 1 only checks for
// conflicts and suggests a Team ID; the ID is not reserved, so an abandoned
// form leaves nothing behind.

type TeamLike = Pick<TeamDetailsInput, 'teamName' | 'players'>;

/**
 * Check a team against existing registrations without writing anything.
 * Returns the first conflict in the same shape as mapDuplicateKeyError.
 */
export async function findTeamConflicts(
  input: TeamLike
): Promise<{ code: string; message: string; fields?: Record<string, string> } | null> {
  const db = await getDb();
  const col = db.collection<Registration>('registrations');
  const emails = input.players.map((p) => p.email);
  const regNos = input.players.map((p) => p.regNo);
  const leader = input.players.find((p) => p.isLeader);

  // Soft-deleted teams still hold their emails / reg nos (same as the unique indexes)
  const clash = await col.findOne(
    {
      $or: [
        { 'players.email': { $in: emails } },
        { 'players.regNo': { $in: regNos } },
        { teamNameLower: input.teamName.toLowerCase() },
        ...(leader?.phone ? [{ leaderPhone: leader.phone }] : []),
      ],
    },
    { projection: { players: 1, teamNameLower: 1, leaderPhone: 1 } }
  );
  if (!clash) return null;

  const takenEmails = new Set(clash.players.map((p) => p.email));
  const takenRegNos = new Set(clash.players.map((p) => p.regNo));
  const emailSlot = input.players.findIndex((p) => takenEmails.has(p.email));
  if (emailSlot >= 0) {
    return {
      code: 'PLAYER_ALREADY_REGISTERED',
      message: `Player ${emailSlot + 1} is already registered in another team`,
      fields: { [`players.${emailSlot}.email`]: 'This email is already in another team' },
    };
  }
  const regSlot = input.players.findIndex((p) => takenRegNos.has(p.regNo));
  if (regSlot >= 0) {
    return {
      code: 'PLAYER_ALREADY_REGISTERED',
      message: `Player ${regSlot + 1} is already registered in another team`,
      fields: { [`players.${regSlot}.regNo`]: 'This register number is already in another team' },
    };
  }
  if (clash.teamNameLower === input.teamName.toLowerCase()) {
    return { code: 'TEAM_NAME_TAKEN', message: 'That team name is taken', fields: { teamName: 'That team name is taken' } };
  }
  const leaderIdx = input.players.findIndex((p) => p.isLeader);
  return {
    code: 'DUPLICATE_PHONE',
    message: 'This phone number is already registered with another team',
    fields: { [`players.${leaderIdx}.phone`]: 'This number is already registered with another team' },
  };
}

/** A currently-free Team ID to show on the payment step. Not reserved. */
export async function pickCandidateTeamId(eventDoc: EventDoc): Promise<string> {
  return generateUniqueTeamId(eventDoc.teamIdPrefix || 'DBG');
}

export function upiDetails(eventDoc: EventDoc, note: string) {
  return {
    id: eventDoc.upiId,
    payeeName: eventDoc.payeeName,
    amount: eventDoc.fee,
    note,
    qrString: buildUpiIntent({ upiId: eventDoc.upiId, payeeName: eventDoc.payeeName, amount: eventDoc.fee, note }),
  };
}

/**
 * Save the team and its first payment attempt together (UNDER_REVIEW).
 * Uses the candidate Team ID if it is still free, otherwise a new one.
 * Duplicate players / team name / UTR surface as MongoDB 11000 errors.
 */
export async function createTeamWithPayment(
  input: RegistrationSubmitInput,
  eventDoc: EventDoc,
  ipHash: string,
  userAgent: string
): Promise<{ teamId: string }> {
  const db = await getDb();
  const client = await getClient();
  const prefix = eventDoc.teamIdPrefix || 'DBG';

  let teamId =
    input.candidateTeamId && input.candidateTeamId.startsWith(`${prefix}-`)
      ? input.candidateTeamId
      : await generateUniqueTeamId(prefix);

  const leader = input.players.find((p) => p.isLeader)!;
  const players: Player[] = input.players.map((p) => ({
    slot: p.slot as 1 | 2 | 3 | 4,
    isLeader: p.isLeader,
    fullName: p.fullName,
    email: p.email,
    regNo: p.regNo,
    phone: p.phone,
    year: p.year,
    department: p.department,
  }));

  for (let attempt = 0; attempt < 3; attempt++) {
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const reg = await db.collection('registrations').insertOne(
          {
            teamId,
            eventId: eventDoc._id,
            teamName: input.teamName,
            teamNameLower: input.teamName.toLowerCase(),
            players,
            leaderEmail: leader.email,
            leaderPhone: leader.phone!,
            status: 'UNDER_REVIEW',
            rejectCount: 0,
            attendance: [],
            idempotencyKey: input.idempotencyKey,
            ipHash,
            userAgent,
            consentAt: now,
            source: input.source,
            createdAt: now,
            updatedAt: now,
            expiresAt: new Date(eventDoc.registrationClosesAt.getTime() + 2 * 24 * 60 * 60 * 1000),
          } as any,
          { session }
        );
        const payment = await db.collection('payments').insertOne(
          {
            registrationId: reg.insertedId,
            teamId,
            utr: input.utr,
            amount: input.amount,
            payerUpi: input.payerUpi,
            status: 'SUBMITTED',
            createdAt: now,
          } as any,
          { session }
        );
        await db
          .collection('registrations')
          .updateOne({ _id: reg.insertedId }, { $set: { currentPaymentId: payment.insertedId } }, { session });
      });
      return { teamId };
    } catch (error: any) {
      // Someone saved the same candidate ID a moment ago — take a fresh one and retry
      if (error?.code === 11000 && error?.keyPattern?.teamId) {
        teamId = await generateUniqueTeamId(prefix);
        continue;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
  throw new Error('Could not save the team after 3 attempts');
}
