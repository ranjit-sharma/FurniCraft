import { AuditLog } from '../models/index.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, targetId, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalCount = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate('actorId', 'name email role');

    res.status(200).json({
      status: 'success',
      data: {
        totalCount,
        currentPage: parseInt(page, 10),
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        logs,
      },
    });
  } catch (error) {
    next(error);
  }
};
