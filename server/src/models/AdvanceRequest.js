import mongoose from 'mongoose';
import { ADVANCE_REQUEST_STATUS } from '../config/constants.js';

const advanceRequestSchema = new mongoose.Schema(
  {
    requestCode: {
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
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Advance amount is required'],
      min: [1, 'Amount must be greater than zero'],
      max: [10000, 'Worker cannot take more than ₹10,000 advance'],
    },
    reason: {
      type: String,
      required: [true, 'Reason for advance is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ADVANCE_REQUEST_STATUS),
      default: ADVANCE_REQUEST_STATUS.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: null,
    },
    disbursedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AdvanceRequest = mongoose.model('AdvanceRequest', advanceRequestSchema);
