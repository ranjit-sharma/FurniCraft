import { User, WorkerProfile, Project, ProjectAssignment, Attendance, Payroll, FinancialTransaction, Tool, AdvanceRequest, Dispute, AuditLog, Notification, FurnitureTask } from '../models/index.js';
import { ROLES, ATTENDANCE_STATUS, ADVANCE_REQUEST_STATUS, PAYROLL_STATUS, TOOL_STATUS, MAX_ADVANCE_LIMIT } from '../config/constants.js';

export const getWorkerDashboardData = async (workerId) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const profile = await WorkerProfile.findOne({ userId: workerId }).populate('thekedarId', 'name phone');
  const thekedarId = profile?.thekedarId?._id || profile?.thekedarId;
  const todayAttendance = await Attendance.findOne({ workerId, date: todayStr }).populate('projectId', 'name projectCode');
  
  const assignmentFilter = { workerId, ...(thekedarId ? { thekedarId } : {}) };
  const activeAssignments = await ProjectAssignment.find({ ...assignmentFilter, status: 'ACTIVE' }).populate('projectId', 'name projectCode projectType siteAddress');
  const allAssignments = await ProjectAssignment.find(assignmentFilter).sort({ updatedAt: -1 }).limit(10).populate('projectId', 'name projectCode projectType siteAddress');

  const assignedTasks = await FurnitureTask.find({ assignedWorkerId: workerId, ...(thekedarId ? { thekedarId } : {}) })
    .populate('projectId', 'name projectCode')
    .sort({ createdAt: -1 });

  const issuedTools = await Tool.find({ 'currentAssignment.workerId': workerId });

  const pendingAdvanceRequests = await AdvanceRequest.find({ workerId, status: ADVANCE_REQUEST_STATUS.PENDING });

  const recentTransactions = await FinancialTransaction.find({ workerId, isReversed: false })
    .sort({ transactionDate: -1 })
    .limit(5);

  const notifications = await Notification.find({ recipientId: workerId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(5);

  return {
    profile,
    todayAttendance,
    activeAssignments,
    allAssignments,
    assignedTasks,
    issuedTools,
    pendingAdvanceRequests,
    recentTransactions,
    notifications,
  };
};

export const getThekedarDashboardData = async (thekedarId) => {
  const activeProjects = await Project.find({ thekedarId, status: { $in: ['PLANNED', 'IN_PROGRESS'] } });
  
  // Workers under this thekedar
  const workerProfiles = await WorkerProfile.find({ thekedarId }).populate('userId', 'name phone status');

  const pendingAttendanceCount = await Attendance.countDocuments({
    thekedarId,
    approvalStatus: { $in: [ATTENDANCE_STATUS.SUBMITTED, ATTENDANCE_STATUS.CORRECTION_REQUESTED] },
    workerId: { $ne: thekedarId },
  });

  const pendingAdvanceRequests = await AdvanceRequest.find({
    thekedarId,
    status: ADVANCE_REQUEST_STATUS.PENDING,
  }).populate('workerId', 'name phone').populate('projectId', 'name projectCode');

  const wpMap = new Map();
  workerProfiles.forEach((wp) => {
    const uid = wp.userId?._id?.toString() || wp.userId?.toString();
    if (uid) wpMap.set(uid, wp);
  });

  const enrichedPendingAdvanceRequests = pendingAdvanceRequests.map((adv) => {
    const wId = (adv.workerId?._id || adv.workerId)?.toString();
    const wp = wpMap.get(wId);
    const currentAdvanceBalance = wp?.outstandingAdvanceBalance || 0;
    const exceedsLimit = currentAdvanceBalance >= MAX_ADVANCE_LIMIT || (currentAdvanceBalance + (adv.amount || 0)) > MAX_ADVANCE_LIMIT;
    return {
      ...adv.toObject(),
      currentAdvanceBalance,
      exceedsLimit,
    };
  });

  const recentPayrolls = await Payroll.find({ thekedarId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('workerId', 'name');

  // Sum of outstanding advances and salary
  let totalOutstandingAdvances = 0;
  let totalOutstandingSalary = 0;
  workerProfiles.forEach((wp) => {
    totalOutstandingAdvances += wp.outstandingAdvanceBalance || 0;
    totalOutstandingSalary += wp.outstandingSalaryBalance || 0;
  });

  const issuedTools = await Tool.find({
    status: TOOL_STATUS.ISSUED,
    'currentAssignment.projectId': { $in: activeProjects.map((p) => p._id) },
  }).populate('currentAssignment.workerId', 'name').populate('currentAssignment.projectId', 'name projectCode');

  const pendingTaskApprovals = await FurnitureTask.find({
    thekedarId,
    status: TASK_STATUS.COMPLETED,
  })
    .populate('projectId', 'name projectCode siteAddress')
    .populate('assignedWorkerId', 'name phone')
    .sort({ actualCompletionDate: -1, updatedAt: -1 });

  return {
    metrics: {
      activeProjectsCount: activeProjects.length,
      managedWorkersCount: workerProfiles.length,
      pendingAttendanceCount,
      pendingAdvanceCount: pendingAdvanceRequests.length,
      pendingTaskApprovalCount: pendingTaskApprovals.length,
      totalOutstandingAdvances,
      totalOutstandingSalary,
      issuedToolsCount: issuedTools.length,
      openDisputesCount: recentDisputes.length,
    },
    activeProjects,
    workerProfiles,
    pendingAdvanceRequests: enrichedPendingAdvanceRequests,
    pendingTaskApprovals,
    recentPayrolls,
    issuedTools,
    recentDisputes,
  };
};

export const getMembersOverview = async ({ role, search } = {}) => {
  const filter = {};
  if (role && role !== 'ALL') {
    filter.role = role;
  }
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  // Summary counts across whole application
  const totalMembers = await User.countDocuments();
  const totalThekedars = await User.countDocuments({ role: ROLES.THEKEDAR });
  const activeThekedars = await User.countDocuments({ role: ROLES.THEKEDAR, status: 'ACTIVE' });
  const totalWorkers = await User.countDocuments({ role: ROLES.WORKER });
  const activeWorkers = await User.countDocuments({ role: ROLES.WORKER, status: 'ACTIVE' });
  const totalOwners = await User.countDocuments({ role: ROLES.OWNER });
  const activeOwners = await User.countDocuments({ role: ROLES.OWNER, status: 'ACTIVE' });

  // Visit tracking metrics
  const visitActions = ['USER_LOGIN', 'APP_VISIT'];
  const totalVisits = await AuditLog.countDocuments({ action: { $in: visitActions } });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayVisits = await AuditLog.countDocuments({
    action: { $in: visitActions },
    createdAt: { $gte: startOfToday },
  });

  const workerVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.WORKER });
  const thekedarVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.THEKEDAR });
  const ownerVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.OWNER });

  // Load all users according to filter
  const users = await User.find(filter)
    .select('-password')
    .populate('assignedThekedar', 'name phone email')
    .sort({ createdAt: -1 });

  // Worker profiles lookup
  const workerProfiles = await WorkerProfile.find();
  const wpMap = new Map();
  workerProfiles.forEach((wp) => {
    const uid = wp.userId?.toString();
    if (uid) wpMap.set(uid, wp);
  });

  // Recent visits stream
  const recentVisits = await AuditLog.find({ action: { $in: visitActions } })
    .sort({ createdAt: -1 })
    .limit(15);

  const members = users.map((u) => {
    const uObj = u.toObject();
    const wp = wpMap.get(u._id.toString());
    return {
      ...uObj,
      workerCode: wp?.workerCode || null,
      defaultDailyWage: wp?.defaultDailyWage || null,
      outstandingAdvanceBalance: wp?.outstandingAdvanceBalance || 0,
      outstandingSalaryBalance: wp?.outstandingSalaryBalance || 0,
      visitCount: uObj.visitCount || 0,
    };
  });

  return {
    summary: {
      totalMembers,
      totalThekedars,
      activeThekedars,
      totalWorkers,
      activeWorkers,
      totalOwners,
      activeOwners,
      totalVisits,
      todayVisits,
      visitsByRole: {
        WORKER: workerVisits,
        THEKEDAR: thekedarVisits,
        OWNER: ownerVisits,
      },
    },
    members,
    recentVisits,
  };
};

export const getOwnerDashboardData = async () => {
  const totalProjects = await Project.countDocuments();
  const activeProjects = await Project.countDocuments({ status: 'IN_PROGRESS' });
  const totalThekedars = await User.countDocuments({ role: ROLES.THEKEDAR });
  const activeThekedars = await User.countDocuments({ role: ROLES.THEKEDAR, status: 'ACTIVE' });
  const totalWorkers = await User.countDocuments({ role: ROLES.WORKER });
  const activeWorkers = await User.countDocuments({ role: ROLES.WORKER, status: 'ACTIVE' });
  const totalOwners = await User.countDocuments({ role: ROLES.OWNER });
  const totalMembers = await User.countDocuments();

  // Application Visits
  const visitActions = ['USER_LOGIN', 'APP_VISIT'];
  const totalVisits = await AuditLog.countDocuments({ action: { $in: visitActions } });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayVisits = await AuditLog.countDocuments({
    action: { $in: visitActions },
    createdAt: { $gte: startOfToday },
  });
  const workerVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.WORKER });
  const thekedarVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.THEKEDAR });
  const ownerVisits = await AuditLog.countDocuments({ action: { $in: visitActions }, actorRole: ROLES.OWNER });

  // Organization-wide financial liabilities
  const profiles = await WorkerProfile.find();
  let totalAdvanceLiability = 0;
  let totalSalaryLiability = 0;
  profiles.forEach((p) => {
    totalAdvanceLiability += p.outstandingAdvanceBalance || 0;
    totalSalaryLiability += p.outstandingSalaryBalance || 0;
  });

  // Tools status
  const totalTools = await Tool.countDocuments();
  const availableTools = await Tool.countDocuments({ status: TOOL_STATUS.AVAILABLE });
  const issuedTools = await Tool.countDocuments({ status: TOOL_STATUS.ISSUED });
  const maintenanceTools = await Tool.countDocuments({ status: TOOL_STATUS.MAINTENANCE });

  // Recent Audit events
  const recentAudits = await AuditLog.find().sort({ createdAt: -1 }).limit(10);

  // Recent transactions
  const recentTransactions = await FinancialTransaction.find({ isReversed: false })
    .sort({ transactionDate: -1 })
    .limit(10)
    .populate('workerId', 'name')
    .populate('thekedarId', 'name');

  // Load all registered members with their profiles
  const allUsers = await User.find()
    .select('-password')
    .populate('assignedThekedar', 'name phone email')
    .sort({ createdAt: -1 });

  const wpMap = new Map();
  profiles.forEach((wp) => {
    const uid = wp.userId?.toString();
    if (uid) wpMap.set(uid, wp);
  });

  const allMembers = allUsers.map((u) => {
    const uObj = u.toObject();
    const wp = wpMap.get(u._id.toString());
    return {
      ...uObj,
      workerCode: wp?.workerCode || null,
      defaultDailyWage: wp?.defaultDailyWage || null,
      outstandingAdvanceBalance: wp?.outstandingAdvanceBalance || 0,
      outstandingSalaryBalance: wp?.outstandingSalaryBalance || 0,
      visitCount: uObj.visitCount || 0,
    };
  });

  // Recent visit events
  const recentVisits = await AuditLog.find({ action: { $in: visitActions } })
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    metrics: {
      totalProjects,
      activeProjects,
      totalMembers,
      totalThekedars,
      activeThekedars,
      totalWorkers,
      activeWorkers,
      totalOwners,
      totalVisits,
      todayVisits,
      visitsByRole: {
        WORKER: workerVisits,
        THEKEDAR: thekedarVisits,
        OWNER: ownerVisits,
      },
      totalAdvanceLiability,
      totalSalaryLiability,
      totalLiabilities: totalAdvanceLiability + totalSalaryLiability,
      toolInventory: {
        total: totalTools,
        available: availableTools,
        issued: issuedTools,
        maintenance: maintenanceTools,
      },
    },
    allMembers,
    recentVisits,
    recentAudits,
    recentTransactions,
  };
};
