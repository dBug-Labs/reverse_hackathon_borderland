import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  slug: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  venue?: string;
  feeAmount: number;
  feeCurrency: string;
  upiId: string;
  upiQrImageUrl?: string;
  capacity: number;
  registrationDeadline?: Date;
  registrationOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    venue: { type: String, default: 'SRM University Tech Park' },
    feeAmount: { type: Number, required: true, default: 300 },
    feeCurrency: { type: String, default: 'INR' },
    upiId: { type: String, required: true, default: 'dbuglabs@upi' },
    upiQrImageUrl: { type: String, default: '/qr-placeholder.svg' },
    capacity: { type: Number, default: 200 },
    registrationDeadline: { type: Date },
    registrationOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);

export default Event;
