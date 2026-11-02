import { Dispute, WorkerProfile } from '../models/index.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';
import { ROLES, DISPUTE_STATUS } from '../config/constants.js';

export const listDisputes = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const disputes = await Dispute.find(filter)
      .populate('workerId', 'name phone email')
      .populate('thekedarId', 'name phone')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { disputes },
    });
  } catch (error) {
    next(error);
  }
};

export const createDispute = async (req, res, next) => {
  try {
    const workerProfile = await WorkerProfile.findOne({ userId: req.user._id });
    const thekedarId = workerProfile?.thekedarId || req.body.thekedarId || req.user._id;

    const count = await Dispute.countDocuments();
    const disputeCode = `DISP-${Date.now().toString().slice(-4)}-${String(count + 1).padStart(3, '0')}`;

    const dispute = await Dispute.create({
      disputeCode,
      workerId: req.user._id,
      thekedarId,
      category: req.body.category,
      subject: req.body.subject,
      description: req.body.description,
      status: DISPUTE_STATUS.OPEN,
    });

    await recordAuditLog({
      req,
      action: 'DISPUTE_FILED',
      targetType: 'Dispute',
      targetId: dispute._id,
      newValues: { disputeCode, category: dispute.category, subject: dispute.subject },
    });

    res.status(201).json({
      status: 'success',
      message: 'Grievance / Dispute submitted successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveDispute = async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.disputeId);
    if (!dispute) throw new NotFoundError('Dispute not found');

    if (req.user.role === ROLES.WORKER) {
      throw new ForbiddenError('Workers cannot resolve disputes');
    }

    dispute.status = req.body.status;
    dispute.resolutionNotes = req.body.resolutionNotes;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    await recordAuditLog({
      req,
      action: 'DISPUTE_RESOLVED',
      targetType: 'Dispute',
      targetId: dispute._id,
      newValues: { status: dispute.status, resolutionNotes: dispute.resolutionNotes },
    });

    res.status(200).json({
      status: 'success',
      message: 'Dispute updated successfully',
      data: { dispute },
    });
  } catch (error) {
    next(error);
  }
};
