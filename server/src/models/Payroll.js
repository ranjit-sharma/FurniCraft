import mongoose from 'mongoose';
import { PAYROLL_STATUS } from '../config/constants.js';

const payrollSchema = new mongoose.Schema(
  {
    payrollCode: {
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
    periodMonth: {
      type: Number, // 1 - 12
      required: true,
    },
    periodYear: {
      type: Number, // e.g., 2026
      required: true,
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYROLL_STATUS),
      default: PAYROLL_STATUS.DRAFT,
      index: true,
    },
    // Breakdowns
    totalApprovedDays: {
      type: Number,
      default: 0,
    },
    attendanceBreakdown: {
      P: { count: { type: Number, default: 0 }, earnings: { type: Number, default: 0 } },
      HALF: { count: { type: Number, default: 0 }, earnings: { type: Number, default: 0 } },
      'P1/5': { count: { type: Number, default: 0 }, earnings: { type: Number, default: 0 } },
      PP: { count: { type: Number, default: 0 }, earnings: { type: Number, default: 0 } },
      ABSENT: { count: { type: Number, default: 0 } },
      LEAVE: { count: { type: Number, default: 0 } },
    },
    grossEarnings: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAllowances: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    advancesRecovered: {
      type: Number,
      default: 0,
    },
    netPayable: {
      type: Number,
      required: true,
      default: 0,
    },
    salaryPaymentsAllocated: {
      type: Number,
      default: 0,
    },
    balanceRemaining: {
      type: Number,
      default: 0,
    },
    // Line items preservation for immutable audit
    lineItems: [
      {
        date: String,
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        attendanceCode: String,
        dailyWage: Number,
        multiplier: Number,
        earnedAmount: Number,
        shift: String,
      },
    ],
    allocatedPaymentTransactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinancialTransaction',
      },
    ],
    ruleVersionApplied: {
      type: Number,
      default: 1,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    isImmutable: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payroll for same worker, month, and year
payrollSchema.index({ workerId: 1, periodMonth: 1, periodYear: 1 }, { unique: true });

export const Payroll = mongoose.model('Payroll', payrollSchema);
