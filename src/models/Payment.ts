import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaymentStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface IPayment extends Document {
  registrationId: string; // e.g. DBG-472
  utr: string; // exactly 12 digits, unique
  amount: number;
  payerName?: string;
  paidAt?: Date;
  screenshotUrl?: string;
  status: PaymentStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    registrationId: { type: String, required: true, index: true },
    utr: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    payerName: { type: String, trim: true },
    paidAt: { type: Date, default: Date.now },
    screenshotUrl: { type: String },
    status: {
      type: String,
      enum: ['SUBMITTED', 'APPROVED', 'REJECTED'],
      default: 'SUBMITTED',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    adminNote: { type: String },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
