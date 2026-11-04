import mongoose from 'mongoose';

const workerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    defaultDailyWage: {
      type: Number,
      required: true,
      min: 0,
      default: 700, // INR
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    aadhaarNumberMasked: {
      type: String,
      trim: true,
    },
    bankDetails: {
      upiId: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
    },
    address: {
      type: String,
      trim: true,
    },
    dateOfJoining: {
      type: Date,
      default: Date.now,
    },
    totalAdvancesDisbursed: {
      type: Number,
      default: 0,
    },
    totalAdvancesRecovered: {
      type: Number,
      default: 0,
    },
    outstandingAdvanceBalance: {
      type: Number,
      default: 0,
      min: [0, 'Outstanding advance balance cannot be negative'],
      max: [25000, 'Worker cannot take more than ₹25,000 advance'],
    },
    totalSalaryPaid: {
      type: Number,
      default: 0,
    },
    outstandingSalaryBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const WorkerProfile = mongoose.model('WorkerProfile', workerProfileSchema);
