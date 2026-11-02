import mongoose from 'mongoose';

const projectAssignmentSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    thekedarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'TRANSFERRED', 'PAUSED'],
      default: 'ACTIVE',
      index: true,
    },
    wageOverride: {
      type: Number,
      min: 0,
      default: null, // If set, overrides worker default wage for this specific project
    },
    roleInProject: {
      type: String,
      default: 'FURNITURE_FITTER', // e.g., 'CARPENTER', 'EDGE_BANDER_OPERATOR', 'POLISHER'
    },
    scheduleNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find a worker's active project assignments
projectAssignmentSchema.index({ workerId: 1, status: 1 });
projectAssignmentSchema.index({ projectId: 1, status: 1 });

export const ProjectAssignment = mongoose.model('ProjectAssignment', projectAssignmentSchema);
