import mongoose from 'mongoose';

const toolMaintenanceSchema = new mongoose.Schema(
  {
    maintenanceCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tool',
      required: true,
      index: true,
    },
    maintenanceType: {
      type: String,
      enum: ['PREVENTIVE', 'BLADE_SHARPENING', 'MOTOR_REPAIR', 'CORD_REPLACEMENT', 'CALIBRATION', 'OTHER'],
      default: 'PREVENTIVE',
    },
    description: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    completionDate: {
      type: Date,
      default: null,
    },
    servicedBy: {
      type: String, // Service vendor name
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'SCRAPPED'],
      default: 'IN_PROGRESS',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ToolMaintenance = mongoose.model('ToolMaintenance', toolMaintenanceSchema);
