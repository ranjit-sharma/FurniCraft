import mongoose from 'mongoose';

const otpRecordSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['PASSWORD_RESET', 'THEKEDAR_REGISTRATION'],
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    otpHash: {
      type: String,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendAfter: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index: automatically deletes document upon expiry
    },
    resetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indices for querying active unconsumed OTPs
otpRecordSchema.index({ email: 1, purpose: 1, isUsed: 1, expiresAt: 1 });
otpRecordSchema.index({ phone: 1, purpose: 1, isUsed: 1, expiresAt: 1 });

export const OtpRecord = mongoose.model('OtpRecord', otpRecordSchema);
