import { User, WorkerProfile, Project, ProjectAssignment, ProjectMoneyReceived, Attendance, Payroll, FinancialTransaction, AdvanceRequest, AuditLog, Notification } from '../models/index.js';
import { ROLES, ATTENDANCE_STATUS, ADVANCE_REQUEST_STATUS, PAYROLL_STATUS, MAX_ADVANCE_LIMIT, FINANCIAL_CATEGORIES } from '../config/constants.js';
import { escapeRegex } from '../utils/sanitize.js';

export const getWorkerDashboardData = async (workerId) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const profile = await WorkerProfile.findOne({ userId: workerId }).populate('thekedarId', 'name phone');
  const thekedarId = profile?.thekedarId?._id || profile?.thekedarId;
  const todayAttendance = await Attendance.findOne({ workerId, date: todayStr }).populate('projectId', 'name projectCode');
  
  const assignmentFilter = { workerId, ...(thekedarId ? { thekedarId } : {}) };
  const activeAssignments = await ProjectAssignment.find({ ...assignmentFilter, status: 'ACTIVE' }).populate('projectId', 'name projectCode projectType siteAddress');
  const allAssignments = await ProjectAssignment.find(assignmentFilter).sort({ updatedAt: -1 }).limit(10).populate('projectId', 'name projectCode projectType siteAddress');

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
    pendingAdvanceRequests,
    recentTransactions,
    notifications,
  };
};

export const getThekedarDashboardData = async (thekedarId, date) => {
  // The phone sends its local date so "today" matches what the Thekedar sees (server may run in UTC).
  const today = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : new Date().toISOString().slice(0, 10);
  const startOfMonth = new Date(`${today.slice(0, 7)}-01T00:00:00`);

  const [activeProjects, workerProfiles, todayAttendance, unpaidByWorker, pendingAdvanceRequests, moneyByProject, monthTotals, recentTransactions] =
    await Promise.all([
      Project.find({ thekedarId, status: { $in: ['PLANNED', 'IN_PROGRESS'] } }).select('name projectCode status siteAddress clientName priority').lean(),
      WorkerProfile.find({ thekedarId }).populate('userId', 'name phone status').lean(),
      Attendance.find({ thekedarId, date: today }).select('workerId projectId code calculatedEarnings isPayrollProcessed').lean(),
      Attendance.aggregate([
        { $match: { thekedarId, approvalStatus: ATTENDANCE_STATUS.APPROVED, isPayrollProcessed: false } },
        { $group: { _id: '$workerId', amount: { $sum: '$calculatedEarnings' } } },
      ]),
      AdvanceRequest.find({ thekedarId, status: ADVANCE_REQUEST_STATUS.PENDING }).populate('workerId', 'name phone').lean(),
      ProjectMoneyReceived.aggregate([{ $match: { thekedarId } }, { $group: { _id: '$projectId', amount: { $sum: '$amount' } } }]),
      FinancialTransaction.aggregate([
        { $match: { thekedarId, isReversed: false, transactionDate: { $gte: startOfMonth }, category: { $in: [FINANCIAL_CATEGORIES.SALARY_PAYMENT, FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT] } } },
        { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      ]),
      FinancialTransaction.find({ thekedarId, isReversed: false }).sort({ transactionDate: -1 }).limit(4).populate('workerId', 'name').lean(),
    ]);

  const unpaidMap = new Map(unpaidByWorker.map((u) => [u._id.toString(), u.amount]));
  const todayMap = new Map(todayAttendance.map((a) => [a.workerId.toString(), a]));
  const moneyMap = new Map(moneyByProject.map((m) => [m._id?.toString(), m.amount]));
  const monthMap = new Map(monthTotals.map((m) => [m._id, m.amount]));

  // Same "earned" rule as the Workers page: unpaid approved attendance + any carried-over salary balance.
  const workers = workerProfiles
    .filter((wp) => wp.userId)
    .map((wp) => {
      const uid = wp.userId._id.toString();
      const unpaidWages = (unpaidMap.get(uid) || 0) + (wp.outstandingSalaryBalance || 0);
      const advance = wp.outstandingAdvanceBalance || 0;
      return {
        userId: wp.userId._id,
        name: wp.userId.name,
        phone: wp.userId.phone,
        status: wp.userId.status,
        workerCode: wp.workerCode,
        defaultDailyWage: wp.defaultDailyWage,
        trade: wp.trade || (Array.isArray(wp.skills) && wp.skills.length > 0 ? wp.skills[0] : 'Mistry'),
        skills: wp.skills,
        isOnLeave: !!wp.isOnLeave,
        unpaidWages,
        outstandingAdvanceBalance: advance,
        netPayable: unpaidWages - advance,
        today: todayMap.get(uid) || null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeWorkers = workers.filter((w) => w.status === 'ACTIVE');
  const sum = (list, key) => list.reduce((acc, w) => acc + (w[key] || 0), 0);
  const unpaidWages = sum(workers, 'unpaidWages');
  const outstandingAdvances = sum(workers, 'outstandingAdvanceBalance');

  return {
    today,
    metrics: {
      workers: workers.length,
      activeWorkers: activeWorkers.length,
      markedToday: activeWorkers.filter((w) => w.today).length,
      activeProjects: activeProjects.length,
      unpaidWages,
      outstandingAdvances,
      netPayable: unpaidWages - outstandingAdvances,
      paidThisMonth: monthMap.get(FINANCIAL_CATEGORIES.SALARY_PAYMENT) || 0,
      advancesThisMonth: monthMap.get(FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT) || 0,
    },
    workers,
    activeProjects: activeProjects.map((pr) => ({ ...pr, totalMoneyReceived: moneyMap.get(pr._id.toString()) || 0 })),
    pendingAdvanceRequests,
    recentTransactions,
  };
};

export const getMembersOverview = async ({ role, search } = {}) => {
  const filter = {};
  if (role && role !== 'ALL') {
    filter.role = role;
  }
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
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

  // Visit tracking metrics (only Thekedar and Owner visits count)
  const visitActions = ['USER_LOGIN', 'APP_VISIT'];
  const thekedarOwnerRoles = [ROLES.THEKEDAR, ROLES.OWNER];
  const totalVisits = await AuditLog.countDocuments({
    action: { $in: visitActions },
    actorRole: { $in: thekedarOwnerRoles },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayVisits = await AuditLog.countDocuments({
    action: { $in: visitActions },
    actorRole: { $in: thekedarOwnerRoles },
    createdAt: { $gte: startOfToday },
  });

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

  // Recent visits stream (only Thekedar and Owner visits)
  const recentVisits = await AuditLog.find({
    action: { $in: visitActions },
    actorRole: { $in: thekedarOwnerRoles },
  })
    .sort({ createdAt: -1 })
    .limit(15);

  const members = users.map((u) => {
    const uObj = u.toObject();
    const wp = wpMap.get(u._id.toString());
    const isWorker = uObj.role === ROLES.WORKER;
    return {
      ...uObj,
      workerCode: wp?.workerCode || null,
      defaultDailyWage: wp?.defaultDailyWage || null,
      outstandingAdvanceBalance: wp?.outstandingAdvanceBalance || 0,
      outstandingSalaryBalance: wp?.outstandingSalaryBalance || 0,
      visitCount: isWorker ? null : (uObj.visitCount || 0),
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
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [thekedars, profiles, unpaidByWorker, projectsByThekedar, monthTotals, recentAudits, recentTransactions] = await Promise.all([
    User.find({ role: ROLES.THEKEDAR }).select('name phone status lastLoginAt').sort({ name: 1 }).lean(),
    WorkerProfile.find().select('userId thekedarId defaultDailyWage outstandingAdvanceBalance outstandingSalaryBalance').lean(),
    // Earned but not yet paid = approved attendance not settled by a payment (same rule as the Workers page)
    Attendance.aggregate([
      { $match: { approvalStatus: ATTENDANCE_STATUS.APPROVED, isPayrollProcessed: false } },
      { $group: { _id: '$workerId', amount: { $sum: '$calculatedEarnings' } } },
    ]),
    Project.aggregate([
      { $group: { _id: '$thekedarId', total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ['$status', ['PLANNED', 'IN_PROGRESS']] }, 1, 0] } } } },
    ]),
    FinancialTransaction.aggregate([
      { $match: { isReversed: false, transactionDate: { $gte: startOfMonth }, category: { $in: [FINANCIAL_CATEGORIES.SALARY_PAYMENT, FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT] } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' } } },
    ]),
    AuditLog.find({ action: { $nin: ['USER_LOGIN', 'APP_VISIT'] } }).sort({ createdAt: -1 }).limit(6).lean(),
    FinancialTransaction.find({ isReversed: false })
      .sort({ transactionDate: -1 })
      .limit(4)
      .populate('workerId', 'name')
      .populate('thekedarId', 'name')
      .lean(),
  ]);

  const unpaidMap = new Map(unpaidByWorker.map((u) => [u._id.toString(), u.amount]));
  const projectMap = new Map(projectsByThekedar.map((p) => [p._id?.toString(), p]));
  const monthMap = new Map(monthTotals.map((m) => [m._id, m.amount]));

  const perThekedar = new Map();
  for (const wp of profiles) {
    const key = wp.thekedarId?.toString();
    const row = perThekedar.get(key) || { workers: 0, unpaidWages: 0, outstandingAdvances: 0 };
    row.workers += 1;
    row.unpaidWages += (unpaidMap.get(wp.userId?.toString()) || 0) + (wp.outstandingSalaryBalance || 0);
    row.outstandingAdvances += wp.outstandingAdvanceBalance || 0;
    perThekedar.set(key, row);
  }

  const thekedarSummaries = thekedars.map((th) => {
    const money = perThekedar.get(th._id.toString()) || { workers: 0, unpaidWages: 0, outstandingAdvances: 0 };
    const proj = projectMap.get(th._id.toString()) || { total: 0, active: 0 };
    return { ...th, ...money, netPayable: money.unpaidWages - money.outstandingAdvances, projects: proj.total, activeProjects: proj.active };
  });

  const sum = (key) => thekedarSummaries.reduce((acc, th) => acc + th[key], 0);
  const unpaidWages = sum('unpaidWages');
  const outstandingAdvances = sum('outstandingAdvances');

  return {
    metrics: {
      totalThekedars: thekedars.length,
      activeThekedars: thekedars.filter((th) => th.status === 'ACTIVE').length,
      totalWorkers: profiles.length,
      totalProjects: sum('projects'),
      activeProjects: sum('activeProjects'),
      unpaidWages,
      outstandingAdvances,
      netPayable: unpaidWages - outstandingAdvances,
      paidThisMonth: monthMap.get(FINANCIAL_CATEGORIES.SALARY_PAYMENT) || 0,
      advancesThisMonth: monthMap.get(FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT) || 0,
    },
    thekedars: thekedarSummaries,
    recentAudits,
    recentTransactions: recentTransactions.map((tx) => {
      const wId = tx.workerId?._id?.toString() || tx.workerId?.toString();
      const wp = profiles.find((p) => p.userId?.toString() === wId);
      return {
        ...tx,
        workerWage: wp?.defaultDailyWage || null,
      };
    }),
  };
};
