import mongoose from 'mongoose';
import { FINANCIAL_CATEGORIES, PAYMENT_METHODS } from '../config/constants.js';

const financialTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(FINANCIAL_CATEGORIES),
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
      default: PAYMENT_METHODS.CASH,
    },
    receiptReference: {
      type: String,
      trim: true,
      default: null, // UPI UTR or Bank Cheque/UTR reference number
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Immutable snapshot fields so transaction vouchers retain worker & contractor details even if profiles are later deleted
    workerName: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    workerCode: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    workerPhone: {
      type: String,
      trim: true,
      default: null,
    },
    thekedarName: {
      type: String,
      trim: true,
      default: null,
    },
    thekedarBusinessName: {
      type: String,
      trim: true,
      default: null,
    },
    thekedarPhone: {
      type: String,
      trim: true,
      default: null,
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
      index: true,
    },
    advanceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdvanceRequest',
      default: null,
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      default: null,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    breakdown: {
      baseEarned: { type: Number, default: 0 },
      totalEarnedBefore: { type: Number, default: 0 },
      remainingWages: { type: Number, default: 0 },
      remainingAdvance: { type: Number, default: 0 },
      remainingBalance: { type: Number, default: 0 },
      advanceDeduction: { type: Number, default: 0 },
      foodDeduction: { type: Number, default: 0 },
      roomRentDeduction: { type: Number, default: 0 },
      additionalWages: { type: Number, default: 0 },
      netPaid: { type: Number, default: 0 },
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
    reversalReason: {
      type: String,
      default: null,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

financialTransactionSchema.index({ workerId: 1, transactionDate: -1 });
financialTransactionSchema.index({ projectId: 1, transactionDate: -1 });
financialTransactionSchema.index({ thekedarId: 1, transactionDate: -1 });
financialTransactionSchema.index({ thekedarId: 1, category: 1 });
financialTransactionSchema.index({ category: 1, transactionDate: -1 });

export const FinancialTransaction = mongoose.model('FinancialTransaction', financialTransactionSchema);
