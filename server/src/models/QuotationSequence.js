import mongoose from 'mongoose';

const quotationSequenceSchema = new mongoose.Schema(
  {
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    thekedarCode: {
      type: String,
      required: true,
      index: true,
    },
    lastSequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const QuotationSequence = mongoose.model('QuotationSequence', quotationSequenceSchema);
