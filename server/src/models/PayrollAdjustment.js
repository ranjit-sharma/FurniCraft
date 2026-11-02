import mongoose from 'mongoose';

const payrollAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
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
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorizedAt: {
      type: Date,
      default: Date.now,
    },
    linkedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialTransaction',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PayrollAdjustment = mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
