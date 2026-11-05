import {
  User,
  WorkerProfile,
  WageAgreement,
  ProjectAssignment,
  Project,
  Attendance,
  FinancialTransaction,
  AdvanceRequest,
  Payroll,
} from '../models/index.js';
import { ROLES, USER_STATUS, ATTENDANCE_STATUS, ADVANCE_REQUEST_STATUS } from '../config/constants.js';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';
import { generateUniqueWorkerCode, withDuplicateRetry } from '../utils/codeGenerator.js';

export const listUsers = async (req, res, next) => {
  try {
    const { role, status } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;

    if (req.user.role === ROLES.WORKER) {
      filter._id = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      // Thekedars can only view Workers assigned to them
      filter.role = ROLES.WORKER;
      filter.assignedThekedar = req.user._id;
    }

    const safeLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const users = await User.find(filter).select('-password').limit(safeLimit);
    res.status(200).json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const listWorkers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === ROLES.WORKER) {
      filter.userId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const safeLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
    const workerProfiles = await WorkerProfile.find(filter)
      .populate('userId', 'name email phone status')
      .populate('thekedarId', 'name phone')
      .limit(safeLimit);

    // Aggregate unpaid approved attendance earnings for each worker
    const workerUserIds = workerProfiles.map((w) => w.userId?._id).filter(Boolean);
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          workerId: { $in: workerUserIds },
          approvalStatus: ATTENDANCE_STATUS.APPROVED,
          isPayrollProcessed: false,
        },
      },
      {
        $group: {
          _id: '$workerId',
          totalEarned: { $sum: '$calculatedEarnings' },
          approvedDaysCount: { $sum: 1 },
        },
      },
    ]);

    const earnedMap = new Map();
    attendanceAgg.forEach((a) => {
      earnedMap.set(a._id.toString(), {
        totalEarned: a.totalEarned,
        approvedDaysCount: a.approvedDaysCount,
      });
    });

    // Aggregate THIS MONTH'S worked days and earnings for each worker
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const currentMonthAgg = await Attendance.aggregate([
      {
        $match: {
          workerId: { $in: workerUserIds },
          date: { $gte: currentMonthStart, $lt: currentMonthEnd },
          approvalStatus: ATTENDANCE_STATUS.APPROVED,
        },
      },
      {
        $group: {
          _id: '$workerId',
          monthWorkedDays: { $sum: 1 },
          monthDehadi: { $sum: '$wageMultiplier' },
          monthEarnings: { $sum: '$calculatedEarnings' },
        },
      },
    ]);

    const monthStatsMap = new Map();
    currentMonthAgg.forEach((m) => {
      monthStatsMap.set(m._id.toString(), {
        monthWorkedDays: m.monthWorkedDays,
        monthDehadi: m.monthDehadi,
        monthEarnings: m.monthEarnings,
      });
    });

    // Compute pending advance requests for each worker
    const pendingAdvanceAgg = await AdvanceRequest.aggregate([
      {
        $match: {
          workerId: { $in: workerUserIds },
          status: ADVANCE_REQUEST_STATUS.PENDING,
        },
      },
      {
        $group: {
          _id: '$workerId',
          totalRequested: { $sum: '$amount' },
          count: { $sum: 1 },
          latestAmount: { $last: '$amount' },
          latestReason: { $last: '$reason' },
          latestRequestId: { $last: '$_id' },
          latestRequestCode: { $last: '$requestCode' },
        },
      },
    ]);

    const pendingAdvMap = new Map();
    pendingAdvanceAgg.forEach((pa) => {
      pendingAdvMap.set(pa._id.toString(), {
        totalRequested: pa.totalRequested,
        count: pa.count,
        latestAmount: pa.latestAmount,
        latestReason: pa.latestReason,
        latestRequestId: pa.latestRequestId,
        latestRequestCode: pa.latestRequestCode,
      });
    });

    const enrichedProfiles = workerProfiles.map((w) => {
      const wObj = w.toObject();
      const earnedStats = earnedMap.get(w.userId?._id?.toString()) || { totalEarned: 0, approvedDaysCount: 0 };
      const mStats = monthStatsMap.get(w.userId?._id?.toString()) || { monthWorkedDays: 0, monthDehadi: 0, monthEarnings: 0 };
      const totalEarned = (earnedStats.totalEarned || 0) + (w.outstandingSalaryBalance || 0);
      const advance = w.outstandingAdvanceBalance || 0;
      const netBalance = totalEarned - advance;
      const pendingAdv = pendingAdvMap.get(w.userId?._id?.toString()) || null;

      wObj.totalEarned = totalEarned;
      wObj.totalIncome = totalEarned;
      wObj.approvedDaysCount = earnedStats.approvedDaysCount;
      wObj.monthWorkedDays = mStats.monthWorkedDays;
      wObj.monthDehadi = mStats.monthDehadi;
      wObj.monthEarnings = mStats.monthEarnings;
      wObj.netBalance = netBalance;
      wObj.netPayable = netBalance;
      wObj.isOnLeave = !!w.isOnLeave;
      wObj.pendingAdvance = pendingAdv;
      wObj.hasPendingAdvance = !!pendingAdv;
      wObj.requestedAdvanceAmount = pendingAdv ? pendingAdv.totalRequested : 0;

      return wObj;
    });

    res.status(200).json({
      status: 'success',
      data: { workers: enrichedProfiles },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.user._id;

    // Authorization check
    if (req.user.role === ROLES.WORKER && targetUserId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Workers can only view their own profile');
    }

    const profile = await WorkerProfile.findOne({ userId: targetUserId })
      .populate('userId', 'name email phone status')
      .populate('thekedarId', 'name phone email');

    if (!profile) throw new NotFoundError('Worker profile not found');

    // Strict Scope: Thekedar can ONLY view worker profiles under their direct management
    if (req.user.role === ROLES.THEKEDAR) {
      const thekedarIdStr = profile.thekedarId?._id?.toString() || profile.thekedarId?.toString();
      if (thekedarIdStr !== req.user._id.toString()) {
        throw new ForbiddenError('You can only view profiles for workers under your direct management');
      }
    }

    const [
      wageAgreements,
      attendanceHistory,
      transactions,
      advanceRequests,
      payrolls,
    ] = await Promise.all([
      // 2. Wage Agreements
      WageAgreement.find({ workerId: targetUserId })
        .populate('thekedarId', 'name')
        .sort({ effectiveFrom: -1 }),

      // 4. Attendance History (last 30 entries)
      Attendance.find({ workerId: targetUserId })
        .populate('projectId', 'name projectCode')
        .sort({ date: -1 })
        .limit(30),

      // 5. Financial Ledger / Payments (last 30 transactions)
      FinancialTransaction.find({ workerId: targetUserId, isReversed: false })
        .populate('projectId', 'name projectCode')
        .populate('recordedBy', 'name')
        .sort({ transactionDate: -1 })
        .limit(30),

      // 6. Advance Requests
      AdvanceRequest.find({ workerId: targetUserId })
        .populate('projectId', 'name projectCode')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 }),

      // 7. Finalized Payrolls
      Payroll.find({ workerId: targetUserId })
        .sort({ periodYear: -1, periodMonth: -1 }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        profile,
        wageAgreements,
        attendanceHistory,
        transactions,
        advanceRequests,
        payrolls,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkerWage = async (req, res, next) => {
  try {
    // Only Thekedar or Owner can update wages
    if (req.user.role === ROLES.WORKER) {
      throw new ForbiddenError('Workers cannot update wage rates');
    }

    const { targetUserId } = req.params;
    const { dailyWage, notes } = req.body;

    if (!dailyWage || dailyWage <= 0) {
      throw new BadRequestError('Valid daily wage is required');
    }

    const profile = await WorkerProfile.findOne({ userId: targetUserId });
    if (!profile) throw new NotFoundError('Worker profile not found');

    // Strict Scope: Thekedar can ONLY view worker profiles under their direct management
    if (req.user.role === ROLES.THEKEDAR) {
      const thekedarIdStr = profile.thekedarId?._id?.toString() || profile.thekedarId?.toString();
      if (thekedarIdStr !== req.user._id.toString()) {
        throw new ForbiddenError('You can only view profiles for workers under your direct management');
      }
    }

    if (req.user.role === ROLES.THEKEDAR && profile.thekedarId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update wages for workers under your management');
    }

    const oldWage = profile.defaultDailyWage;
    profile.defaultDailyWage = dailyWage;
    await profile.save();

    // Create a new WageAgreement version
    const wageAgreement = await WageAgreement.create({
      workerId: targetUserId,
      thekedarId: req.user._id,
      dailyWage,
      effectiveFrom: new Date(),
      createdBy: req.user._id,
      notes: notes || 'Wage updated by Thekedar/Admin',
    });

    // Synchronize active project assignments to clear any stale overrides
    await ProjectAssignment.updateMany(
      { workerId: targetUserId, status: 'ACTIVE' },
      { $set: { wageOverride: null } }
    );

    await recordAuditLog({
      req,
      action: 'WORKER_WAGE_UPDATED',
      targetType: 'WorkerProfile',
      targetId: profile._id,
      oldValues: { dailyWage: oldWage },
      newValues: { dailyWage },
      reason: notes,
    });

    res.status(200).json({
      status: 'success',
      message: 'Worker wage updated successfully',
      data: { profile, wageAgreement },
    });
  } catch (error) {
    next(error);
  }
};

export const listThekedars = async (req, res, next) => {
  try {
    const thekedars = await User.find({ role: ROLES.THEKEDAR }).select('-password').sort({ createdAt: -1 });

    const thekedarRecords = await Promise.all(
      thekedars.map(async (th) => {
        const [projects, workerProfiles] = await Promise.all([
          Project.find({ thekedarId: th._id }).select('name projectCode projectType status siteAddress'),
          WorkerProfile.find({ thekedarId: th._id })
            .populate('userId', 'name phone email status')
            .select('workerCode defaultDailyWage skills userId status'),
        ]);

        const workers = workerProfiles.map((wp) => ({
          _id: wp._id,
          workerCode: wp.workerCode,
          name: wp.userId?.name || 'Unknown Worker',
          phone: wp.userId?.phone || 'Not provided',
          email: wp.userId?.email || '',
          status: wp.userId?.status || 'ACTIVE',
          defaultDailyWage: wp.defaultDailyWage || 0,
          skills: wp.skills || [],
        }));

        return {
          ...th.toObject(),
          assignedProjects: projects,
          totalProjects: projects.length,
          activeProjectsCount: projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING').length,
          workerCount: workers.length,
          workers,
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: { thekedars: thekedarRecords },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!Object.values(USER_STATUS).includes(status)) {
      throw new BadRequestError('Invalid user status');
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // STRICT ROLE ACCESS CONTROL:
    // 1. Owner can ONLY manage Thekedar accounts
    // 2. Thekedar can ONLY manage Worker accounts under their supervision
    if (req.user.role === ROLES.OWNER) {
      if (user.role !== ROLES.THEKEDAR) {
        throw new ForbiddenError('The Owner can only manage Thekedar accounts. Workers are managed by Thekedars.');
      }
    } else if (req.user.role === ROLES.THEKEDAR) {
      if (user.role !== ROLES.WORKER) {
        throw new ForbiddenError('Thekedars can only manage Worker accounts');
      }
      const profile = await WorkerProfile.findOne({ userId });
      if (!profile || profile.thekedarId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('You can only manage status for workers under your direct supervision');
      }
    } else {
      throw new ForbiddenError('Access forbidden');
    }

    const oldStatus = user.status;
    user.status = status;
    if (status === USER_STATUS.SUSPENDED) {
      user.tokenVersion += 1; // Immediately invalidate all active sessions
    }
    await user.save();

    await recordAuditLog({
      req,
      action: user.role === ROLES.THEKEDAR
        ? (status === USER_STATUS.ACTIVE ? 'THEKEDAR_ACCOUNT_ACTIVATED' : 'THEKEDAR_ACCOUNT_SUSPENDED')
        : (status === USER_STATUS.ACTIVE ? 'WORKER_ACCOUNT_ACTIVATED' : 'WORKER_ACCOUNT_SUSPENDED'),
      targetType: 'User',
      targetId: user._id,
      oldValues: { status: oldStatus },
      newValues: { status },
      reason: req.body.reason || `${user.role} account status updated to ${status} by ${req.user.role}`,
    });

    res.status(200).json({
      status: 'success',
      message: `${user.role === ROLES.THEKEDAR ? 'Thekedar' : 'Worker'} account ${status === USER_STATUS.ACTIVE ? 'activated' : 'deactivated/suspended'} successfully`,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWorkerLeave = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profile = await WorkerProfile.findOne({ userId });
    if (!profile) {
      throw new NotFoundError('Worker profile not found');
    }

    if (req.user.role === ROLES.THEKEDAR) {
      const thekedarIdStr = profile.thekedarId?.toString();
      if (thekedarIdStr !== req.user._id.toString()) {
        throw new ForbiddenError('You can only manage leave for workers under your supervision');
      }
    }

    const newLeaveState = typeof req.body.isOnLeave === 'boolean' ? req.body.isOnLeave : !profile.isOnLeave;
    profile.isOnLeave = newLeaveState;
    profile.leaveUpdatedAt = new Date();
    await profile.save();

    await recordAuditLog({
      req,
      action: newLeaveState ? 'WORKER_MARKED_ON_LEAVE' : 'WORKER_RETURNED_FROM_LEAVE',
      targetType: 'WorkerProfile',
      targetId: profile._id,
      newValues: { isOnLeave: newLeaveState, leaveUpdatedAt: profile.leaveUpdatedAt },
      reason: req.body.reason || (newLeaveState ? 'Worker placed on standing leave' : 'Worker returned from leave'),
    });

    res.status(200).json({
      status: 'success',
      message: `Worker ${newLeaveState ? 'marked on leave' : 'returned from leave'} successfully`,
      data: {
        isOnLeave: profile.isOnLeave,
        leaveUpdatedAt: profile.leaveUpdatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteThekedar = async (req, res, next) => {
  try {
    // Owner only
    const { userId } = req.params;

    const thekedar = await User.findById(userId);
    if (!thekedar || thekedar.role !== ROLES.THEKEDAR) {
      throw new NotFoundError('Thekedar account not found');
    }

    // Check if the Thekedar is assigned to any projects
    const assignedProjectsCount = await Project.countDocuments({ thekedarId: userId });
    if (assignedProjectsCount > 0) {
      throw new BadRequestError(
        `Cannot delete Thekedar with ${assignedProjectsCount} assigned project(s). Reassign or archive the projects first, or deactivate the account.`
      );
    }

    // Check if any workers are supervised by this Thekedar
    const supervisedWorkersCount = await WorkerProfile.countDocuments({ thekedarId: userId });
    if (supervisedWorkersCount > 0) {
      throw new BadRequestError(
        `Cannot delete Thekedar supervising ${supervisedWorkersCount} worker(s). Reassign the workforce first, or deactivate the account.`
      );
    }

    await User.findByIdAndDelete(userId);

    await recordAuditLog({
      req,
      action: 'THEKEDAR_ACCOUNT_DELETED',
      targetType: 'User',
      targetId: thekedar._id,
      oldValues: { name: thekedar.name, email: thekedar.email, role: thekedar.role },
      reason: req.body.reason || 'Thekedar account deleted by Owner',
    });

    res.status(200).json({
      status: 'success',
      message: `Thekedar account for ${thekedar.name} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const workerUser = await User.findById(userId);
    if (!workerUser || workerUser.role !== ROLES.WORKER) {
      throw new NotFoundError('Worker not found');
    }

    const profile = await WorkerProfile.findOne({ userId });

    if (req.user.role === ROLES.THEKEDAR) {
      if (profile && profile.thekedarId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('You can only delete workers under your management');
      }
    }

    // STRICT BUSINESS RULE: Worker can ONLY be deleted if their net balance is exactly 0
    const attendanceAgg = await Attendance.aggregate([
      {
        $match: {
          workerId: workerUser._id,
          approvalStatus: ATTENDANCE_STATUS.APPROVED,
          isPayrollProcessed: false,
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$calculatedEarnings' },
        },
      },
    ]);

    const totalEarned = (attendanceAgg[0]?.totalEarned || 0) + (profile?.outstandingSalaryBalance || 0);
    const advance = profile?.outstandingAdvanceBalance || 0;
    const netBalance = totalEarned - advance;

    if (netBalance !== 0) {
      if (netBalance > 0) {
        throw new BadRequestError(
          `Cannot delete worker: Net balance must be exactly ₹0. Worker ${workerUser.name} has ₹${netBalance.toLocaleString('en-IN')} in unpaid earned wages. Please settle and pay the net amount before deleting.`
        );
      } else {
        throw new BadRequestError(
          `Cannot delete worker: Net balance must be exactly ₹0. Worker ${workerUser.name} has an outstanding advance of ₹${Math.abs(netBalance).toLocaleString('en-IN')} exceeding earned wages (Net Balance: -₹${Math.abs(netBalance).toLocaleString('en-IN')}). Please settle the advance before deleting.`
        );
      }
    }

    // Unassign from active projects
    await ProjectAssignment.updateMany(
      { workerId: userId, status: 'ACTIVE' },
      { status: 'REMOVED', endDate: new Date(), notes: 'Worker deleted from workforce' }
    );

    // Delete WorkerProfile and User
    if (profile) {
      await WorkerProfile.deleteOne({ userId });
    }
    await User.findByIdAndDelete(userId);

    await recordAuditLog({
      req,
      action: 'WORKER_DELETED',
      targetType: 'User',
      targetId: userId,
      oldValues: {
        name: workerUser.name,
        email: workerUser.email,
        phone: workerUser.phone,
        workerCode: profile?.workerCode,
        outstandingAdvance: profile?.outstandingAdvanceBalance || 0,
      },
    });

    res.status(200).json({
      status: 'success',
      message: `Worker ${workerUser.name} (${profile?.workerCode || 'WRK'}) deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLanguagePreference = async (req, res, next) => {
  try {
    const { preferredLanguage } = req.body;
    if (!['en', 'hi', 'hinglish'].includes(preferredLanguage)) {
      throw new BadRequestError('Invalid language option. Supported: en, hi, hinglish');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { preferredLanguage },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Language preference updated',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (req, res, next) => {
  let workerUser = null;
  try {
    const {
      name,
      phone,
      email,
      trade,
      skills,
      defaultDailyWage = 750,
      thekedarId: targetThekedarId,
      address,
      emergencyContact,
      bankDetails,
    } = req.body;

    if (!name || !name.trim()) throw new BadRequestError('Worker name is required');
    if (!phone || !phone.trim()) throw new BadRequestError('Worker phone number is required');

    // Scoped strictly to Thekedar (or Owner assigning to a Thekedar)
    let thekedarId;
    if (req.user.role === ROLES.THEKEDAR) {
      thekedarId = req.user._id;
    } else if (req.user.role === ROLES.OWNER) {
      if (targetThekedarId) {
        const thekedarUser = await User.findOne({ _id: targetThekedarId, role: ROLES.THEKEDAR });
        if (!thekedarUser) {
          throw new BadRequestError('The selected Thekedar is invalid or does not exist');
        }
        thekedarId = thekedarUser._id;
      } else {
        const defaultThekedar = await User.findOne({ role: ROLES.THEKEDAR, status: USER_STATUS.ACTIVE }).sort({ createdAt: 1 });
        if (!defaultThekedar) {
          throw new BadRequestError('No active Thekedar found. Please register a Thekedar before creating workers.');
        }
        thekedarId = defaultThekedar._id;
      }
    } else {
      throw new ForbiddenError('Only Thekedars or Owners can create workers');
    }

    return await withDuplicateRetry(async () => {
      let createdUser = null;
      try {
        // Auto-generate strictly unique, gap-safe sequential Worker ID
        const workerCode = await generateUniqueWorkerCode('FC-WRK');

        // Auto-generate safe managed internal email if not provided
        const internalEmail = email && email.trim()
          ? email.trim().toLowerCase()
          : `worker.${Date.now()}.${Math.floor(1000 + Math.random() * 9000)}@furnicraft.local`;

        // Unusable password hash since workers cannot log in
        const workerSecuredPassword = `WorkerSecured_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        createdUser = await User.create({
          name: name.trim(),
          email: internalEmail,
          phone: phone.trim(),
          password: workerSecuredPassword,
          role: ROLES.WORKER,
          assignedThekedar: thekedarId,
          status: USER_STATUS.ACTIVE,
        });

        const wage = parseFloat(defaultDailyWage) || 750;
        const skillsList = trade ? [trade] : (Array.isArray(skills) && skills.length > 0 ? skills : ['Mistry']);
        const primaryTrade = trade || skillsList[0] || 'Mistry';

        const profile = await WorkerProfile.create({
          userId: createdUser._id,
          thekedarId,
          workerCode,
          trade: primaryTrade,
          skills: skillsList,
          defaultDailyWage: wage,
          address: address || '',
          emergencyContact: emergencyContact || {},
          bankDetails: bankDetails || {},
        });

        await WageAgreement.create({
          workerId: createdUser._id,
          thekedarId,
          dailyWage: wage,
          effectiveFrom: new Date(),
          createdBy: req.user._id,
          notes: 'Initial standard wage agreement on worker registration',
        });

        await recordAuditLog({
          req,
          action: 'WORKER_CREATED_MANUALLY',
          targetType: 'User',
          targetId: createdUser._id,
          newValues: { name: createdUser.name, workerCode, wage, thekedarId },
        });

        return res.status(201).json({
          status: 'success',
          message: `Worker ${name} created successfully with ID ${workerCode}`,
          data: {
            worker: {
              _id: createdUser._id,
              name: createdUser.name,
              phone: createdUser.phone,
              email: createdUser.email,
              status: createdUser.status,
              profile,
            },
          },
        });
      } catch (innerErr) {
        if (createdUser && createdUser._id) {
          await User.deleteOne({ _id: createdUser._id }).catch(() => {});
        }
        throw innerErr;
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      name,
      phone,
      trade,
      skills,
      defaultDailyWage,
      address,
      emergencyContact,
      bankDetails,
    } = req.body;

    const workerUser = await User.findById(userId);
    if (!workerUser || workerUser.role !== ROLES.WORKER) {
      throw new NotFoundError('Worker not found');
    }

    const profile = await WorkerProfile.findOne({ userId });
    if (!profile) throw new NotFoundError('Worker profile not found');

    // Strict Scope: Thekedar can ONLY edit their own workers
    if (req.user.role === ROLES.THEKEDAR) {
      const thekedarIdStr = profile.thekedarId?._id?.toString() || profile.thekedarId?.toString();
      if (thekedarIdStr !== req.user._id.toString()) {
        throw new ForbiddenError('You can only modify workers under your direct management');
      }
    }

    // Update User fields
    if (name && name.trim()) workerUser.name = name.trim();
    if (phone && phone.trim()) workerUser.phone = phone.trim();
    await workerUser.save();

    // Update Profile fields
    if (trade) {
      profile.trade = trade;
      profile.skills = [trade];
    } else if (skills && Array.isArray(skills)) {
      profile.skills = skills;
      if (skills[0]) profile.trade = skills[0];
    }
    if (address !== undefined) profile.address = address;
    if (emergencyContact !== undefined) profile.emergencyContact = emergencyContact;
    if (bankDetails !== undefined) profile.bankDetails = { ...profile.bankDetails, ...bankDetails };

    if (defaultDailyWage !== undefined && Number(defaultDailyWage) > 0) {
      const wageNum = Number(defaultDailyWage);
      profile.defaultDailyWage = wageNum;
      await WageAgreement.create({
        workerId: workerUser._id,
        thekedarId: profile.thekedarId,
        dailyWage: wageNum,
        effectiveFrom: new Date(),
        createdBy: req.user._id,
        notes: `Wage adjusted during worker profile edit by ${req.user.role}`,
      });
    }

    await profile.save();

    await recordAuditLog({
      req,
      action: 'WORKER_DETAILS_UPDATED',
      targetType: 'User',
      targetId: workerUser._id,
      newValues: { name: workerUser.name, phone: workerUser.phone, wage: profile.defaultDailyWage },
    });

    res.status(200).json({
      status: 'success',
      message: 'Worker details updated successfully',
      data: {
        worker: {
          _id: workerUser._id,
          name: workerUser.name,
          phone: workerUser.phone,
          profile,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

