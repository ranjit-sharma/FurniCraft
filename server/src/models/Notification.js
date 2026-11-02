import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['INFO', 'ATTENDANCE', 'PAYROLL', 'TOOL', 'ADVANCE', 'DISPUTE', 'SECURITY'],
      default: 'INFO',
    },
    relatedEntity: {
      entityType: String,
      entityId: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
