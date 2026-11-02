import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorName: {
      type: String,
    },
    actorRole: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      index: true, // e.g., 'User', 'Attendance', 'Payroll', 'Tool', 'Transaction'
    },
    targetId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    oldValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
    correlationId: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only, no updates
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
