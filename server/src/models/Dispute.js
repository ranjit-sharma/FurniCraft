import mongoose from 'mongoose';
import { DISPUTE_STATUS } from '../config/constants.js';

const disputeSchema = new mongoose.Schema(
  {
    disputeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['ATTENDANCE', 'PAYROLL', 'ADVANCE', 'TOOL', 'WAGE', 'OTHER'],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(DISPUTE_STATUS),
      default: DISPUTE_STATUS.OPEN,
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Dispute = mongoose.model('Dispute', disputeSchema);
