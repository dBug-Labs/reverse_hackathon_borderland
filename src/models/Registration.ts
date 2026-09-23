import mongoose, { Schema, Document, Model } from 'mongoose';

export type RegistrationStatus =
  | 'REGISTERED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PAYMENT_APPROVED'
  | 'CONFIRMED'
  | 'PAYMENT_REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface IPlayer {
  name: string;
  email: string;
  regNo: string;
  phone?: string;
  year?: string;
  department?: string;
  college?: string;
}

export interface IRegistration extends Document {
  registrationId: string; // e.g. DBG-472
  eventId?: mongoose.Types.ObjectId;
  teamName: string;
  teamNameLower: string;
  teamSize: number;
  fullName: string; // Leader name
  email: string; // Leader email
  phone: string; // Leader phone
  college: string;
  department: string;
  year: string;
  players: IPlayer[];
  consent: boolean;
  status: RegistrationStatus;
  currentPaymentId?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const PlayerSubSchema = new Schema<IPlayer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    regNo: { type: String, required: true, uppercase: true, trim: true },
    phone: { type: String, trim: true },
    year: { type: String, default: '2' },
    department: { type: String, default: 'CSE' },
    college: { type: String, default: 'SRM Institute of Science and Technology' },
  },
  { _id: false }
);

const RegistrationSchema = new Schema<IRegistration>(
  {
    registrationId: { type: String, required: true, unique: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    teamName: { type: String, required: true },
    teamNameLower: { type: String, required: true, index: true },
    teamSize: { type: Number, required: true, min: 2, max: 4 },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String, required: true, index: true },
    college: { type: String, default: 'SRM Institute of Science and Technology' },
    department: { type: String, default: 'CSE' },
    year: { type: String, default: '2' },
    players: { type: [PlayerSubSchema], required: true },
    consent: { type: Boolean, required: true },
    status: {
      type: String,
      enum: [
        'REGISTERED',
        'PAYMENT_PENDING',
        'PAYMENT_SUBMITTED',
        'UNDER_REVIEW',
        'PAYMENT_APPROVED',
        'CONFIRMED',
        'PAYMENT_REJECTED',
        'EXPIRED',
        'CANCELLED',
      ],
      default: 'PAYMENT_PENDING',
      index: true,
    },
    currentPaymentId: { type: String },
    rejectionReason: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Multikey indexes to ensure uniqueness across teams per event
RegistrationSchema.index({ 'players.email': 1 });
RegistrationSchema.index({ 'players.regNo': 1 });

export const Registration: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>('Registration', RegistrationSchema);

export default Registration;
