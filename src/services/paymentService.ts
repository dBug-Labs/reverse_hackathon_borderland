import connectToDatabase from '../lib/mongodb';
import { Payment, IPayment } from '../models/Payment';
import { Registration } from '../models/Registration';
import { PaymentSubmissionInput } from '../validators/registration';
import { getRegistration } from './registrationService';

const localDevPayments = new Map<string, any>();

export interface PaymentResult {
  ok: boolean;
  status?: string;
  message?: string;
  fields?: Record<string, string>;
}

export async function submitPaymentProof(
  input: PaymentSubmissionInput
): Promise<PaymentResult> {
  const db = await connectToDatabase();
  const utrClean = input.utr.trim();

  // 1. Verify Registration exists
  const reg = await getRegistration(input.teamId);
  if (!reg) {
    return {
      ok: false,
      message: `No registration found for Team ID "${input.teamId}". Please register first.`,
    };
  }

  if (reg.status === 'CONFIRMED' || reg.status === 'PAYMENT_APPROVED') {
    return {
      ok: false,
      message: 'This registration has already been verified and confirmed!',
    };
  }

  if (db) {
    // 2. Check if UTR is already used
    const existingPayment = await Payment.findOne({ utr: utrClean });
    if (existingPayment) {
      return {
        ok: false,
        message: 'This 12-digit UTR has already been submitted for another team.',
        fields: { utr: 'This UTR is already used' },
      };
    }

    // 3. Create payment document
    const payment = new Payment({
      registrationId: input.teamId,
      utr: utrClean,
      amount: input.amount,
      payerName: input.payerName?.trim() || '',
      screenshotUrl: input.screenshotUrl || '',
      status: 'SUBMITTED',
      paidAt: new Date(),
    });

    const savedPayment = await payment.save();

    // 4. Update registration status to PAYMENT_SUBMITTED
    await Registration.updateOne(
      { registrationId: input.teamId },
      {
        status: 'PAYMENT_SUBMITTED',
        currentPaymentId: savedPayment._id.toString(),
      }
    );

    return {
      ok: true,
      status: 'PAYMENT_SUBMITTED',
      message: 'Payment proof submitted successfully. Pending organizer verification.',
    };
  }

  // --- LOCAL DEV IN-MEMORY FALLBACK ---
  if (localDevPayments.has(utrClean)) {
    return {
      ok: false,
      message: 'This 12-digit UTR has already been submitted for another team.',
      fields: { utr: 'This UTR is already used' },
    };
  }

  localDevPayments.set(utrClean, {
    registrationId: input.teamId,
    utr: utrClean,
    amount: input.amount,
    payerName: input.payerName || '',
    status: 'SUBMITTED',
    createdAt: new Date(),
  });

  reg.status = 'PAYMENT_SUBMITTED';

  return {
    ok: true,
    status: 'PAYMENT_SUBMITTED',
    message: 'Payment proof submitted successfully. Pending organizer verification.',
  };
}
