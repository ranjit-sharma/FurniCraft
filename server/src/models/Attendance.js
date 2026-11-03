import mongoose from 'mongoose';
import { ATTENDANCE_CODES, ATTENDANCE_STATUS } from '../config/constants.js';

const attendanceSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
      default: null,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String, // Stored as ISO YYYY-MM-DD for exact date querying without timezone drifts
      required: true,
      index: true,
    },
    shift: {
      type: String,
      default: 'GENERAL', // 'GENERAL', 'DAY', 'NIGHT'
    },
    code: {
      type: String,
      enum: Object.values(ATTENDANCE_CODES),
      required: true,
      default: ATTENDANCE_CODES.P,
    },
    submissionStatus: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED'],
      default: 'SUBMITTED',
    },
    approvalStatus: {
      type: String,
      enum: Object.values(ATTENDANCE_STATUS),
      default: ATTENDANCE_STATUS.SUBMITTED,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    checkInTime: {
      type: String, // HH:mm format, e.g. "09:00"
    },
    checkOutTime: {
      type: String, // HH:mm format, e.g. "21:00"
    },
    extraWorkCategory: {
      type: String, // e.g. "Overtime to 9PM", "Overtime to midnight"
      default: null,
    },
    applicableDailyWage: {
      type: Number,
      required: true,
      default: 0,
    },
    ruleVersionApplied: {
      type: Number,
      default: 1,
    },
    wageMultiplier: {
      type: Number,
      default: 1.0,
    },
    calculatedEarnings: {
      type: Number,
      default: 0,
    },
    isPayrollProcessed: {
      type: Boolean,
      default: false,
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      default: null,
    },
    correctionRequest: {
      isRequested: { type: Boolean, default: false },
      requestedCode: { type: String, enum: Object.values(ATTENDANCE_CODES) },
      reason: { type: String },
      requestedAt: { type: Date },
      status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NONE' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      reviewNotes: { type: String },
    },
    history: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        previousCode: String,
        newCode: String,
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring no duplicate attendance for the same worker, project, date, and shift
attendanceSchema.index({ workerId: 1, projectId: 1, date: 1, shift: 1 }, { unique: true });

// Worker date query index for calendar queries
attendanceSchema.index({ workerId: 1, date: 1 });
attendanceSchema.index({ projectId: 1, date: 1 });
attendanceSchema.index({ thekedarId: 1, date: 1 });
attendanceSchema.index({ workerId: 1, isPayrollProcessed: 1 });
attendanceSchema.index({ thekedarId: 1, approvalStatus: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
