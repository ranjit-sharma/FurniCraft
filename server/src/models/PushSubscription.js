import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      default: 'THEKEDAR',
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    alarmEnabled: {
      type: Boolean,
      default: true,
    },
    alarmTime: {
      type: String,
      default: '09:30', // 24hr format HH:mm customized by user
      trim: true,
    },
    alarmSound: {
      type: Boolean,
      default: true,
    },
    ringDuration: {
      type: Number,
      default: 30, // seconds
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    userAgent: {
      type: String,
      default: '',
    },
    lastFiredDate: {
      type: String, // YYYY-MM-DD
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

pushSubscriptionSchema.index({ userId: 1 });
pushSubscriptionSchema.index({ alarmEnabled: 1, alarmTime: 1 });

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
