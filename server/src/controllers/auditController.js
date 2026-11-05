import { AuditLog } from '../models/index.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, targetId, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (targetId) filter.targetId = targetId;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;
    const totalCount = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('actorId', 'name email role');

    res.status(200).json({
      status: 'success',
      data: {
        totalCount,
        currentPage: safePage,
        totalPages: Math.ceil(totalCount / safeLimit),
        logs,
      },
    });
  } catch (error) {
    next(error);
  }
};
