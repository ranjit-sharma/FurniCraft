import mongoose from 'mongoose';
import { TOOL_CATEGORIES, TOOL_CONDITION, TOOL_STATUS } from '../config/constants.js';

const toolSchema = new mongoose.Schema(
  {
    toolCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tool name is required'],
      trim: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TOOL_CATEGORIES),
      required: true,
      default: TOOL_CATEGORIES.DRILL,
    },
    brand: {
      type: String,
      trim: true,
    },
    modelNumber: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    condition: {
      type: String,
      enum: Object.values(TOOL_CONDITION),
      default: TOOL_CONDITION.EXCELLENT,
    },
    status: {
      type: String,
      enum: Object.values(TOOL_STATUS),
      default: TOOL_STATUS.AVAILABLE,
      index: true,
    },
    purchaseDate: {
      type: Date,
    },
    purchaseCost: {
      type: Number,
      min: 0,
    },
    qrCode: {
      type: String,
      trim: true,
    },
    currentAssignment: {
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      issueDate: { type: Date, default: null },
      toolIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToolIssue', default: null },
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

export const Tool = mongoose.model('Tool', toolSchema);
