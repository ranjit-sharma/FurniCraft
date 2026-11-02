import mongoose from 'mongoose';

const attendanceRuleVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    multipliers: {
      P: { type: Number, default: 1.0 },
      HALF: { type: Number, default: 0.5 },
      'P1/5': { type: Number, default: 1.5 },
      PP: { type: Number, default: 2.0 },
      ABSENT: { type: Number, default: 0.0 },
      LEAVE: { type: Number, default: 0.0 },
    },
    description: {
      type: String,
      default: 'Standard Modern Furniture Rule: P=1x, HALF=0.5x, P1/5=1.5x (to 9PM), PP=2.0x (to midnight)',
    },
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isCurrent: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

export const AttendanceRuleVersion = mongoose.model('AttendanceRuleVersion', attendanceRuleVersionSchema);
