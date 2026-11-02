import mongoose from 'mongoose';
import { FURNITURE_TASK_TYPES, TASK_STATUS } from '../config/constants.js';

const furnitureTaskSchema = new mongoose.Schema(
  {
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
    furnitureItemName: {
      type: String,
      required: [true, 'Furniture item name is required'],
      trim: true, // e.g. "Overhead Wall Cabinets", "Sliding Door Track", "Island Counter", "Acrylic Finish Wardrobe"
    },
    taskType: {
      type: String,
      enum: Object.values(FURNITURE_TASK_TYPES),
      required: true,
      default: FURNITURE_TASK_TYPES.ASSEMBLY,
      index: true,
    },
    assignedWorkerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.PENDING,
      index: true,
    },
    plannedUnits: {
      type: Number,
      default: 1,
    },
    completedUnits: {
      type: Number,
      default: 0,
    },
    unitMetric: {
      type: String,
      default: 'Units', // 'Sq.Ft', 'Units', 'Running Ft', 'Panels'
    },
    startDate: {
      type: Date,
    },
    targetDate: {
      type: Date,
    },
    actualCompletionDate: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    defectReport: {
      hasDefect: { type: Boolean, default: false },
      description: String,
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reportedAt: Date,
      isResolved: { type: Boolean, default: false },
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

export const FurnitureTask = mongoose.model('FurnitureTask', furnitureTaskSchema);
