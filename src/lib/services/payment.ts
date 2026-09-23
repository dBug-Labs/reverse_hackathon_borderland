import { ObjectId } from 'mongodb';
import { getDb, getClient } from '@/lib/db';
import { logAction } from './audit';
import type { Payment, Registration } from '@/lib/types';

/**
 * Payment service — UTR submission, approve, reject, undo, cancel.
 *
 * All state transitions are transactional (payment + registration atomically).
 * The `payments` collection stores every UTR attempt — rejected UTRs stay
 * forever so the same UTR can never be reused by another team.
 */

// ── Submit UTR (Step 2) ─────────────────────────────────────────────────────

export interface SubmitUTRInput {
  utr: string;
  amount: number;
  payerUpi?: string;
  paidAt?: string;
}

export async function submitUTR(
  teamId: string,
  input: SubmitUTRInput
): Promise<{ success: true } | { success: false; code: string; message: string }> {
  const db = await getDb();
  const client = await getClient();
  const session = client.startSession();

  try {
    let result: { success: true } | { success: false; code: string; message: string } = {
      success: false,
      code: 'INTERNAL',
      message: 'Transaction failed',
    };

    await session.withTransaction(async () => {
      // Find the registration — must be PAYMENT_PENDING or REJECTED
      const reg = await db.collection<Registration>('registrations').findOne(
        {
          teamId,
          status: { $in: ['PAYMENT_PENDING', 'REJECTED'] },
          deletedAt: { $exists: false },
        },
        { session }
      );

      if (!reg) {
        result = { success: false, code: 'STALE_STATE', message: 'Registration not in a valid state for payment' };
        return;
      }

      // Check reject count — after 3 rejections, block further attempts
      if (reg.rejectCount >= 3) {
        result = {
          success: false,
          code: 'MAX_REJECTIONS',
          message: 'Too many rejected attempts. Please contact the club.',
        };
        return;
      }

      // Insert the payment attempt
      const paymentDoc: Omit<Payment, '_id'> = {
        registrationId: reg._id,
        teamId,
        utr: input.utr,
        amount: input.amount,
        payerUpi: input.payerUpi,
        paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
        status: 'SUBMITTED',
        createdAt: new Date(),
      };

      const paymentResult = await db.collection('payments').insertOne(paymentDoc as any, { session });

      // Update registration to UNDER_REVIEW
      await db.collection('registrations').updateOne(
        { _id: reg._id },
        {
          $set: {
            status: 'UNDER_REVIEW',
            currentPaymentId: paymentResult.insertedId,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      result = { success: true };
    });

    return result;
  } catch (error: any) {
    // Unique index on utr → UTR already used
    if (error?.code === 11000 && error?.keyPattern?.utr) {
      return {
        success: false,
        code: 'UTR_ALREADY_USED',
        message: 'This UTR is already linked to a registration.',
      };
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

// ── Approve payment (admin) ─────────────────────────────────────────────────

export async function approvePayment(
  teamId: string,
  actorName: string,
  ipHash: string
): Promise<{ success: true } | { success: false; code: string; message: string }> {
  const db = await getDb();
  const client = await getClient();
  const session = client.startSession();

  try {
    let result: { success: true } | { success: false; code: string; message: string } = {
      success: false,
      code: 'INTERNAL',
      message: 'Transaction failed',
    };

    await session.withTransaction(async () => {
      // Registration must still be UNDER_REVIEW
      const reg = await db.collection<Registration>('registrations').findOneAndUpdate(
        { teamId, status: 'UNDER_REVIEW', deletedAt: { $exists: false } },
        {
          $set: {
            status: 'CONFIRMED',
            verifiedAt: new Date(),
            verifiedBy: actorName,
            updatedAt: new Date(),
            'visa.issuedAt': new Date(),
            'visa.status': 'VALID',
          },
        },
        { session, returnDocument: 'after' }
      );

      if (!reg) {
        result = { success: false, code: 'STALE_STATE', message: 'Already handled — refresh.' };
        return;
      }

      // Approve the linked payment
      if (reg.currentPaymentId) {
        await db.collection('payments').updateOne(
          { _id: reg.currentPaymentId },
          {
            $set: {
              status: 'APPROVED',
              reviewedBy: actorName,
              reviewedAt: new Date(),
            },
          },
          { session }
        );
      }

      // Audit log
      await db.collection('auditLogs').insertOne(
        {
          actorName,
          scope: 'admin',
          action: 'APPROVE',
          targetId: teamId,
          ipHash,
          createdAt: new Date(),
        },
        { session }
      );

      result = { success: true };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

// ── Reject payment (admin) ──────────────────────────────────────────────────

export async function rejectPayment(
  teamId: string,
  reason: string,
  actorName: string,
  ipHash: string
): Promise<{ success: true } | { success: false; code: string; message: string }> {
  const db = await getDb();
  const client = await getClient();
  const session = client.startSession();

  try {
    let result: { success: true } | { success: false; code: string; message: string } = {
      success: false,
      code: 'INTERNAL',
      message: 'Transaction failed',
    };

    await session.withTransaction(async () => {
      const reg = await db.collection<Registration>('registrations').findOneAndUpdate(
        { teamId, status: 'UNDER_REVIEW', deletedAt: { $exists: false } },
        {
          $set: {
            status: 'REJECTED',
            updatedAt: new Date(),
          },
          $inc: { rejectCount: 1 },
        },
        { session, returnDocument: 'after' }
      );

      if (!reg) {
        result = { success: false, code: 'STALE_STATE', message: 'Already handled — refresh.' };
        return;
      }

      // Reject the linked payment
      if (reg.currentPaymentId) {
        await db.collection('payments').updateOne(
          { _id: reg.currentPaymentId },
          {
            $set: {
              status: 'REJECTED',
              reviewedBy: actorName,
              reviewedAt: new Date(),
              rejectReason: reason,
            },
          },
          { session }
        );
      }

      await db.collection('auditLogs').insertOne(
        {
          actorName,
          scope: 'admin',
          action: 'REJECT',
          targetId: teamId,
          after: { reason },
          ipHash,
          createdAt: new Date(),
        },
        { session }
      );

      result = { success: true };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

// ── Undo reject (admin mis-click) ───────────────────────────────────────────

export async function undoReject(
  teamId: string,
  actorName: string,
  ipHash: string
): Promise<{ success: true } | { success: false; code: string; message: string }> {
  const db = await getDb();
  const client = await getClient();
  const session = client.startSession();

  try {
    let result: { success: true } | { success: false; code: string; message: string } = {
      success: false,
      code: 'INTERNAL',
      message: 'Transaction failed',
    };

    await session.withTransaction(async () => {
      const reg = await db.collection<Registration>('registrations').findOneAndUpdate(
        { teamId, status: 'REJECTED', deletedAt: { $exists: false } },
        {
          $set: {
            status: 'UNDER_REVIEW',
            updatedAt: new Date(),
          },
        },
        { session, returnDocument: 'after' }
      );

      if (!reg) {
        result = { success: false, code: 'STALE_STATE', message: 'Not in REJECTED state.' };
        return;
      }

      // Revert the payment to SUBMITTED
      if (reg.currentPaymentId) {
        await db.collection('payments').updateOne(
          { _id: reg.currentPaymentId },
          {
            $set: { status: 'SUBMITTED' },
            $unset: { reviewedBy: '', reviewedAt: '', rejectReason: '' },
          },
          { session }
        );
      }

      await db.collection('auditLogs').insertOne(
        {
          actorName,
          scope: 'admin',
          action: 'UNDO_REJECT',
          targetId: teamId,
          ipHash,
          createdAt: new Date(),
        },
        { session }
      );

      result = { success: true };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

// ── Cancel team (admin) ─────────────────────────────────────────────────────

export async function cancelTeam(
  teamId: string,
  reason: string,
  actorName: string,
  ipHash: string
): Promise<{ success: true } | { success: false; code: string; message: string }> {
  const db = await getDb();

  const reg = await db.collection<Registration>('registrations').findOneAndUpdate(
    { teamId, deletedAt: { $exists: false } },
    {
      $set: {
        status: 'CANCELLED',
        cancelReason: reason,
        updatedAt: new Date(),
        'visa.status': 'REVOKED',
      },
    },
    { returnDocument: 'after' }
  );

  if (!reg) {
    return { success: false, code: 'NOT_FOUND', message: 'Team not found' };
  }

  await logAction(actorName, 'admin', 'CANCEL', teamId, ipHash, undefined, { reason });

  return { success: true };
}

// ── Get payment history for a team ──────────────────────────────────────────

export async function getPaymentHistory(teamId: string): Promise<Payment[]> {
  const db = await getDb();
  return db
    .collection<Payment>('payments')
    .find({ teamId })
    .sort({ createdAt: -1 })
    .toArray();
}

// ── Get single payment by ID ────────────────────────────────────────────────

export async function getPaymentById(paymentId: ObjectId): Promise<Payment | null> {
  const db = await getDb();
  return db.collection<Payment>('payments').findOne({ _id: paymentId });
}
