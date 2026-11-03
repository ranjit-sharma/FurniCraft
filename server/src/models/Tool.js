import mongoose from 'mongoose';
import { TOOL_CATEGORIES, TOOL_CONDITION, TOOL_STATUS } from '../config/constants.js';

const movementEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'REGISTERED',
        'ISSUED',
        'TRANSFERRED',
        'RETURNED',
        'PARTIALLY_RETURNED',
        'REPORTED_MISSING',
        'REPORTED_DAMAGED',
        'FOUND_RESOLVED',
        'REPAIRED_USABLE',
        'STATUS_UPDATED',
        'RETIRED',
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      trim: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    workerName: {
      type: String,
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    projectName: {
      type: String,
      trim: true,
    },
    fromProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    fromProjectName: {
      type: String,
      trim: true,
    },
    toProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    toProjectName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    condition: {
      type: String,
      trim: true,
    },
    damageType: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    resolutionStatus: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

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
      default: TOOL_CATEGORIES.DRILLING_TOOLS,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    modelNumber: {
      type: String,
      trim: true,
      default: '',
    },
    serialNumber: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    issuedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    initialCondition: {
      type: String,
      enum: Object.values(TOOL_CONDITION),
      default: TOOL_CONDITION.NEW,
    },
    condition: {
      type: String,
      enum: Object.values(TOOL_CONDITION),
      default: TOOL_CONDITION.GOOD,
    },
    status: {
      type: String,
      enum: Object.values(TOOL_STATUS),
      default: TOOL_STATUS.AVAILABLE,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    purchaseDate: {
      type: Date,
    },
    purchaseCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    qrCode: {
      type: String,
      trim: true,
    },
    currentAssignment: {
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
      projectName: { type: String, default: '' },
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      workerName: { type: String, default: '' },
      issueDate: { type: Date, default: null },
      expectedReturnDate: { type: Date, default: null },
      quantity: { type: Number, default: 1 },
      toolIssueId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToolIssue', default: null },
    },
    missingReport: {
      isMissing: { type: Boolean, default: false },
      reportedDate: { type: Date, default: null },
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      workerName: { type: String, default: '' },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
      projectName: { type: String, default: '' },
      conditionLastSeen: { type: String, default: '' },
      reason: { type: String, default: '' },
      resolutionStatus: {
        type: String,
        enum: ['REPORTED', 'UNDER_INVESTIGATION', 'FOUND', 'CLOSED'],
        default: 'REPORTED',
      },
      resolutionDate: { type: Date, default: null },
      resolutionNotes: { type: String, default: '' },
    },
    damageReport: {
      isDamaged: { type: Boolean, default: false },
      reportedDate: { type: Date, default: null },
      workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      workerName: { type: String, default: '' },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
      projectName: { type: String, default: '' },
      damageType: { type: String, default: '' },
      description: { type: String, default: '' },
      resolutionStatus: {
        type: String,
        enum: ['REPORTED', 'UNDER_INSPECTION', 'REPAIR_REQUIRED', 'USABLE_AGAIN', 'RETIRED'],
        default: 'REPORTED',
      },
      resolutionDate: { type: Date, default: null },
      resolutionNotes: { type: String, default: '' },
    },
    movementHistory: [movementEventSchema],
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Tool = mongoose.model('Tool', toolSchema);
