import mongoose from 'mongoose';
import { PAYMENT_METHODS } from '../config/constants.js';

const projectMoneyReceivedSchema = new mongoose.Schema(
  {
    receiptCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Received amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.BANK_TRANSFER,
    },
    receiptReference: {
      type: String,
      trim: true,
      default: null, // UPI UTR or Bank Cheque/UTR reference number
    },
    payerName: {
      type: String,
      trim: true,
    },
    stage: {
      type: String,
      trim: true,
      default: 'Advance Booking', // e.g., "Advance Booking", "Carcass Installation", "Shutter Fitting", "Final Handover"
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

projectMoneyReceivedSchema.index({ projectId: 1, receivedDate: -1 });
projectMoneyReceivedSchema.index({ thekedarId: 1, receivedDate: -1 });

export const ProjectMoneyReceived = mongoose.model('ProjectMoneyReceived', projectMoneyReceivedSchema);
