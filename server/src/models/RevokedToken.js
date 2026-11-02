import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      default: 'LOGOUT', // 'LOGOUT', 'PASSWORD_RESET', 'ACCOUNT_SUSPENSION', 'ADMIN_REVOCATION'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index automatically cleans up expired tokens
    },
  },
  {
    timestamps: true,
  }
);

export const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);
