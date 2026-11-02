import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../config/constants.js';

const projectExpenseSchema = new mongoose.Schema(
  {
    expenseCode: {
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
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORIES),
      required: true,
      default: EXPENSE_CATEGORIES.MATERIALS,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true, // e.g. "Hettich Soft-close Hinges & Tandem Drawers", "Century Ply 18mm Marine Grade", "Site Transport"
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    vendorName: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      default: PAYMENT_METHODS.CASH,
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

projectExpenseSchema.index({ projectId: 1, category: 1 });

export const ProjectExpense = mongoose.model('ProjectExpense', projectExpenseSchema);
