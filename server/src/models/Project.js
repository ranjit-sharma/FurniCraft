import mongoose from 'mongoose';
import { PROJECT_STATUS, PROJECT_PRIORITY, FURNITURE_TYPES } from '../config/constants.js';

const projectSchema = new mongoose.Schema(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    clientPhone: {
      type: String,
      trim: true,
    },
    siteAddress: {
      type: String,
      required: true,
      trim: true,
    },
    projectType: {
      type: String,
      enum: Object.values(FURNITURE_TYPES),
      required: true,
      default: FURNITURE_TYPES.MODULAR_KITCHEN,
    },
    priority: {
      type: String,
      enum: Object.values(PROJECT_PRIORITY),
      default: PROJECT_PRIORITY.MEDIUM,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PLANNED,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    targetCompletionDate: {
      type: Date,
    },
    actualCompletionDate: {
      type: Date,
    },
    estimatedBudget: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMoneyReceived: {
      type: Number,
      default: 0,
    },
    totalLaborCost: {
      type: Number,
      default: 0,
    },
    totalMaterialCost: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
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

export const Project = mongoose.model('Project', projectSchema);
