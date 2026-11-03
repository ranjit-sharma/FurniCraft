import mongoose from 'mongoose';
import { TOOL_CONDITION } from '../config/constants.js';

const toolIssueSchema = new mongoose.Schema(
  {
    issueCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tool',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedReturnDate: {
      type: Date,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    returnedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualReturnDate: {
      type: Date,
      default: null,
    },
    conditionAtIssue: {
      type: String,
      enum: Object.values(TOOL_CONDITION),
      default: TOOL_CONDITION.GOOD,
    },
    conditionAtReturn: {
      type: String,
      enum: Object.values(TOOL_CONDITION),
      default: null,
    },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED', 'PARTIALLY_RETURNED', 'REPORTED_DAMAGED', 'REPORTED_MISSING', 'TRANSFERRED'],
      default: 'ISSUED',
      index: true,
    },
    acknowledgedByWorker: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    returnAcknowledgedByThekedar: {
      type: Boolean,
      default: false,
    },
    damageNotes: {
      type: String,
      default: null,
    },
    damageReportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    transfers: [
      {
        fromProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        toProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        transferredAt: { type: Date, default: Date.now },
        reason: String,
        acknowledgedByDestWorker: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const ToolIssue = mongoose.model('ToolIssue', toolIssueSchema);
