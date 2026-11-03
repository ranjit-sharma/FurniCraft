import { Attendance, Project, ProjectAssignment, WorkerProfile, WageAgreement, AttendanceRuleVersion, FinancialTransaction, AdvanceRequest } from '../models/index.js';
import { ATTENDANCE_CODES, ATTENDANCE_STATUS, ATTENDANCE_MULTIPLIERS, ROLES, FINANCIAL_CATEGORIES } from '../config/constants.js';
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from '../utils/errors.js';
import { multiplyMoney } from '../utils/decimal.js';
import { recordAuditLog } from './auditService.js';

/**
 * Resolve effective daily wage for a worker on a project
 */
export const getEffectiveWage = async (workerId, projectId) => {
  // 1. Check WorkerProfile defaultDailyWage (authoritative standard worker wage)
  const profile = await WorkerProfile.findOne({ userId: workerId });
  if (profile && profile.defaultDailyWage) {
    return profile.defaultDailyWage;
  }

  // 2. Check active WageAgreement
  const wageAgreement = await WageAgreement.findOne({
    workerId,
    effectiveFrom: { $lte: new Date() },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
  }).sort({ effectiveFrom: -1, createdAt: -1 });

  if (wageAgreement && wageAgreement.dailyWage) {
    return wageAgreement.dailyWage;
  }

  // 3. Fallback to ProjectAssignment wageOverride if explicitly defined
  const assignment = await ProjectAssignment.findOne({
    workerId,
    projectId,
    status: { $in: ['ACTIVE', 'COMPLETED'] },
  });

  if (assignment && assignment.wageOverride !== null && assignment.wageOverride !== undefined) {
    return assignment.wageOverride;
  }

  return 700; // Standard fallback
};

/**
 * Submit Attendance (by Worker or Thekedar)
 */
export const submitAttendance = async ({ data, user, req }) => {
  const workerId = user.role === ROLES.WORKER ? user._id : data.workerId;
  if (!workerId) {
    throw new BadRequestError('Worker ID is required');
  }

  const { projectId, date, shift = 'GENERAL', code, checkInTime, checkOutTime, extraWorkCategory } = data;

  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  let project = null;
  if (projectId) {
    project = await Project.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (workerProfile && workerProfile.thekedarId.toString() !== project.thekedarId.toString()) {
      throw new ForbiddenError(
        'Strict Rule: Worker can only record attendance on projects managed by their permanent Thekedar.'
      );
    }
  }

  const thekedarId = user.role === ROLES.THEKEDAR ? user._id : (project?.thekedarId || workerProfile?.thekedarId);
  if (!thekedarId) {
    throw new BadRequestError('Thekedar association is required to record attendance.');
  }

  // Prevent duplicate/conflicting attendance for same worker, date, and shift
  const existing = await Attendance.findOne({
    workerId,
    date,
    shift,
  });

  // Thekedar re-marking their own worker's day = edit that entry (paid entries stay locked).
  if (existing && user.role === ROLES.THEKEDAR && existing.thekedarId.toString() === user._id.toString()) {
    if (existing.isPayrollProcessed) {
      throw new ForbiddenError(`Attendance for ${date} is already paid and locked; it cannot be changed.`);
    }
    if (project && projectId && existing.projectId?.toString() !== projectId && project.thekedarId.toString() === user._id.toString()) {
      existing.projectId = projectId;
      await existing.save();
    }
    const updated = await rectifyAttendance({
      attendanceId: existing._id,
      code,
      reason: `Re-marked ${existing.code} → ${code} from attendance screen`,
      reviewerUser: user,
      req,
    });
    updated.$locals.wasUpdate = true;
    return updated;
  }

  if (existing) {
    throw new ConflictError(
      `Attendance entry already exists for date ${date}. Overlapping attendance is prohibited.`
    );
  }

  // Calculate earnings using active rule version
  const activeRule = await AttendanceRuleVersion.findOne({ isCurrent: true }) || { versionNumber: 1, multipliers: ATTENDANCE_MULTIPLIERS };
  const multiplier = activeRule.multipliers[code] ?? (ATTENDANCE_MULTIPLIERS[code] || 0);
  const applicableWage = await getEffectiveWage(workerId, projectId);
  const calculatedEarnings = multiplyMoney(applicableWage, multiplier);

  // Initial approval status:
  // If submitter is Thekedar managing this worker/project, auto-approve; if Worker, set to SUBMITTED
  const isThekedarSelf = user.role === ROLES.THEKEDAR && thekedarId.toString() === user._id.toString();
  const initialStatus = isThekedarSelf ? ATTENDANCE_STATUS.APPROVED : ATTENDANCE_STATUS.SUBMITTED;

  const attendance = await Attendance.create({
    workerId,
    projectId: project?._id || null,
    thekedarId,
    date,
    shift,
    code,
    submissionStatus: 'SUBMITTED',
    approvalStatus: initialStatus,
    submittedBy: user._id,
    approvedBy: isThekedarSelf ? user._id : null,
    approvedAt: isThekedarSelf ? new Date() : null,
    checkInTime,
    checkOutTime,
    extraWorkCategory,
    applicableDailyWage: applicableWage,
    ruleVersionApplied: activeRule.versionNumber || 1,
    wageMultiplier: multiplier,
    calculatedEarnings,
    history: [
      {
        action: 'SUBMITTED',
        performedBy: user._id,
        timestamp: new Date(),
        newCode: code,
        reason: 'Initial submission',
      },
    ],
  });

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_SUBMITTED',
    targetType: 'Attendance',
    targetId: attendance._id,
    newValues: { workerId, projectId, date, code, calculatedEarnings, approvalStatus: initialStatus },
  });

  return attendance;
};

/**
 * Approve Attendance (Thekedar or Owner)
 */
/**
 * Approve Attendance (Thekedar or Owner)
 */
export const approveAttendance = async ({ attendanceId, approvedCode, dailyWage, reviewerUser, req }) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  // Security Rule 6: A thekedar must not approve their own attendance as a worker
  if (attendance.workerId.toString() === reviewerUser._id.toString()) {
    throw new ForbiddenError('A thekedar cannot approve their own attendance as a worker');
  }

  // Security Rule 7: Only authorized thekedar or owner can approve
  if (reviewerUser.role === ROLES.THEKEDAR && attendance.thekedarId.toString() !== reviewerUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to approve attendance for this project');
  }

  if (attendance.isPayrollProcessed) {
    throw new ForbiddenError('Cannot modify attendance that has already been finalized in payroll');
  }

  const oldStatus = attendance.approvalStatus;
  const oldCode = attendance.code;
  const oldWage = attendance.applicableDailyWage;
  const oldEarnings = attendance.calculatedEarnings;

  // If approvedCode is specified, override code and multiplier
  if (approvedCode) {
    if (!Object.values(ATTENDANCE_CODES).includes(approvedCode)) {
      throw new BadRequestError(`Invalid attendance code: ${approvedCode}`);
    }
    const activeRule = (await AttendanceRuleVersion.findOne({ isCurrent: true })) || { multipliers: ATTENDANCE_MULTIPLIERS };
    attendance.code = approvedCode;
    attendance.wageMultiplier = activeRule.multipliers[approvedCode] ?? (ATTENDANCE_MULTIPLIERS[approvedCode] || 0);
  }

  // If dailyWage is specified or needs synchronization with current rate
  if (dailyWage !== undefined && dailyWage !== null && Number(dailyWage) > 0) {
    attendance.applicableDailyWage = Number(dailyWage);
  } else {
    const effectiveWage = await getEffectiveWage(attendance.workerId, attendance.projectId);
    if (effectiveWage) {
      attendance.applicableDailyWage = effectiveWage;
    }
  }

  // Recalculate earnings
  attendance.calculatedEarnings = multiplyMoney(attendance.applicableDailyWage, attendance.wageMultiplier);
  attendance.approvalStatus = ATTENDANCE_STATUS.APPROVED;
  attendance.approvedBy = reviewerUser._id;
  attendance.rejectionReason = null;

  if (attendance.correctionRequest?.isRequested) {
    attendance.correctionRequest.status = ATTENDANCE_STATUS.APPROVED;
    attendance.correctionRequest.reviewedBy = reviewerUser._id;
    attendance.correctionRequest.reviewedAt = new Date();
  }

  attendance.history.push({
    action: 'APPROVED',
    performedBy: reviewerUser._id,
    timestamp: new Date(),
    previousCode: oldCode,
    newCode: attendance.code,
    reason: approvedCode && approvedCode !== oldCode
      ? `Approved with code override: changed from ${oldCode} to ${approvedCode}`
      : 'Approved by Thekedar/Admin',
  });

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_APPROVED',
    targetType: 'Attendance',
    targetId: attendance._id,
    oldValues: { approvalStatus: oldStatus, code: oldCode, applicableDailyWage: oldWage, calculatedEarnings: oldEarnings },
    newValues: { approvalStatus: ATTENDANCE_STATUS.APPROVED, code: attendance.code, applicableDailyWage: attendance.applicableDailyWage, calculatedEarnings: attendance.calculatedEarnings },
  });

  return attendance;
};

/**
 * Rectify / Correct Attendance Record (Thekedar or Owner)
 * Allows modifying code and/or wage rate on unfinalized records (even if already approved)
 */
export const rectifyAttendance = async ({ attendanceId, code, dailyWage, reason, reviewerUser, req }) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  // Security Rule: Only authorized thekedar or owner can rectify
  if (reviewerUser.role === ROLES.THEKEDAR && attendance.thekedarId.toString() !== reviewerUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to rectify attendance for this project');
  }

  if (attendance.isPayrollProcessed) {
    throw new ForbiddenError('Cannot modify attendance that has already been finalized in payroll');
  }

  const oldStatus = attendance.approvalStatus;
  const oldCode = attendance.code;
  const oldWage = attendance.applicableDailyWage;
  const oldEarnings = attendance.calculatedEarnings;

  if (code) {
    if (!Object.values(ATTENDANCE_CODES).includes(code)) {
      throw new BadRequestError(`Invalid attendance code: ${code}`);
    }
    const activeRule = (await AttendanceRuleVersion.findOne({ isCurrent: true })) || { multipliers: ATTENDANCE_MULTIPLIERS };
    attendance.code = code;
    attendance.wageMultiplier = activeRule.multipliers[code] ?? (ATTENDANCE_MULTIPLIERS[code] || 0);
  }

  if (dailyWage !== undefined && dailyWage !== null && Number(dailyWage) > 0) {
    attendance.applicableDailyWage = Number(dailyWage);
  } else {
    const effectiveWage = await getEffectiveWage(attendance.workerId, attendance.projectId);
    if (effectiveWage) {
      attendance.applicableDailyWage = effectiveWage;
    }
  }

  attendance.calculatedEarnings = multiplyMoney(attendance.applicableDailyWage, attendance.wageMultiplier);
  attendance.approvalStatus = ATTENDANCE_STATUS.APPROVED;
  attendance.approvedBy = reviewerUser._id;
  attendance.approvedAt = new Date();
  attendance.rejectionReason = null;

  attendance.history.push({
    action: 'RECTIFIED',
    performedBy: reviewerUser._id,
    timestamp: new Date(),
    previousCode: oldCode,
    newCode: attendance.code,
    reason: reason || `Rectified attendance from ${oldCode} to ${attendance.code} (Earnings: ₹${attendance.calculatedEarnings})`,
  });

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_RECTIFIED',
    targetType: 'Attendance',
    targetId: attendance._id,
    oldValues: { approvalStatus: oldStatus, code: oldCode, applicableDailyWage: oldWage, calculatedEarnings: oldEarnings },
    newValues: { approvalStatus: ATTENDANCE_STATUS.APPROVED, code: attendance.code, applicableDailyWage: attendance.applicableDailyWage, calculatedEarnings: attendance.calculatedEarnings },
  });

  return attendance;
};

/**
 * Reject Attendance
 */
export const rejectAttendance = async ({ attendanceId, reason, reviewerUser, req }) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  if (reviewerUser.role === ROLES.THEKEDAR && attendance.thekedarId.toString() !== reviewerUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to review attendance for this project');
  }

  if (attendance.isPayrollProcessed) {
    throw new ForbiddenError('Cannot modify attendance that has already been finalized in payroll');
  }

  const oldStatus = attendance.approvalStatus;
  attendance.approvalStatus = ATTENDANCE_STATUS.REJECTED;
  attendance.rejectionReason = reason;
  attendance.calculatedEarnings = 0; // Rejected attendance yields 0 payable earnings

  if (attendance.correctionRequest?.isRequested) {
    attendance.correctionRequest.status = ATTENDANCE_STATUS.REJECTED;
    attendance.correctionRequest.reviewedBy = reviewerUser._id;
    attendance.correctionRequest.reviewedAt = new Date();
    attendance.correctionRequest.reviewNotes = reason;
  }

  attendance.history.push({
    action: 'REJECTED',
    performedBy: reviewerUser._id,
    timestamp: new Date(),
    reason,
  });

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_REJECTED',
    targetType: 'Attendance',
    targetId: attendance._id,
    oldValues: { approvalStatus: oldStatus },
    newValues: { approvalStatus: ATTENDANCE_STATUS.REJECTED, reason },
  });

  return attendance;
};

/**
 * Worker Requests Attendance Correction
 */
export const requestAttendanceCorrection = async ({ attendanceId, requestedCode, reason, user, req }) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  if (user.role === ROLES.WORKER && attendance.workerId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only request corrections for your own attendance');
  }

  if (attendance.isPayrollProcessed) {
    throw new ForbiddenError('Cannot request correction on attendance already finalized in payroll');
  }

  attendance.correctionRequest = {
    isRequested: true,
    requestedCode,
    reason,
    requestedAt: new Date(),
    status: 'PENDING',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  };

  attendance.approvalStatus = ATTENDANCE_STATUS.CORRECTION_REQUESTED;
  attendance.history.push({
    action: 'CORRECTION_REQUESTED',
    performedBy: user._id,
    timestamp: new Date(),
    previousCode: attendance.code,
    newCode: requestedCode,
    reason,
  });

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_CORRECTION_REQUESTED',
    targetType: 'Attendance',
    targetId: attendance._id,
    newValues: { requestedCode, reason },
  });

  return attendance;
};

/**
 * Review Attendance Correction Request
 */
export const reviewAttendanceCorrection = async ({ attendanceId, status, reviewNotes, reviewerUser, req }) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw new NotFoundError('Attendance record not found');

  if (reviewerUser.role === ROLES.THEKEDAR && attendance.thekedarId.toString() !== reviewerUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to review corrections for this project');
  }

  if (!attendance.correctionRequest || !attendance.correctionRequest.isRequested) {
    throw new BadRequestError('No active correction request found for this record');
  }

  const oldCode = attendance.code;
  attendance.correctionRequest.status = status;
  attendance.correctionRequest.reviewedBy = reviewerUser._id;
  attendance.correctionRequest.reviewedAt = new Date();
  attendance.correctionRequest.reviewNotes = reviewNotes || null;

  if (status === 'APPROVED') {
    const newCode = attendance.correctionRequest.requestedCode;
    const activeRule = await AttendanceRuleVersion.findOne({ isCurrent: true }) || { multipliers: ATTENDANCE_MULTIPLIERS };
    const multiplier = activeRule.multipliers[newCode] ?? (ATTENDANCE_MULTIPLIERS[newCode] || 0);

    attendance.code = newCode;
    attendance.wageMultiplier = multiplier;
    attendance.calculatedEarnings = multiplyMoney(attendance.applicableDailyWage, multiplier);
    attendance.approvalStatus = ATTENDANCE_STATUS.APPROVED;
    attendance.rejectionReason = null;

    attendance.history.push({
      action: 'CORRECTION_APPROVED',
      performedBy: reviewerUser._id,
      timestamp: new Date(),
      previousCode: oldCode,
      newCode,
      reason: reviewNotes || 'Correction approved',
    });
  } else {
    attendance.approvalStatus = ATTENDANCE_STATUS.APPROVED; // Keep previous state or revert
    attendance.history.push({
      action: 'CORRECTION_REJECTED',
      performedBy: reviewerUser._id,
      timestamp: new Date(),
      reason: reviewNotes || 'Correction rejected',
    });
  }

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_CORRECTION_REVIEWED',
    targetType: 'Attendance',
    targetId: attendance._id,
    newValues: { status, oldCode, currentCode: attendance.code },
  });

  return attendance;
};

/**
 * Bulk Approve Attendance
 */
export const bulkApproveAttendance = async ({ attendanceIds, reviewerUser, req }) => {
  const query = {
    _id: { $in: attendanceIds },
    approvalStatus: { $in: [ATTENDANCE_STATUS.SUBMITTED, ATTENDANCE_STATUS.CORRECTION_REQUESTED] },
    isPayrollProcessed: false,
    workerId: { $ne: reviewerUser._id }, // Security rule: cannot approve own attendance
  };

  if (reviewerUser.role === ROLES.THEKEDAR) {
    query.thekedarId = reviewerUser._id;
  }

  const records = await Attendance.find(query);
  const updatedIds = [];

  for (const record of records) {
    record.approvalStatus = ATTENDANCE_STATUS.APPROVED;
    record.approvedBy = reviewerUser._id;
    record.approvedAt = new Date();
    record.rejectionReason = null;
    record.history.push({
      action: 'BULK_APPROVED',
      performedBy: reviewerUser._id,
      timestamp: new Date(),
      reason: 'Bulk approved',
    });
    await record.save();
    updatedIds.push(record._id);
  }

  await recordAuditLog({
    req,
    action: 'ATTENDANCE_BULK_APPROVED',
    targetType: 'Attendance',
    newValues: { count: updatedIds.length, updatedIds },
  });

  return { message: `Successfully approved ${updatedIds.length} attendance records`, updatedIds };
};

/**
 * Get Monthly Calendar for Worker & Project
 */
export const getMonthlyAttendanceCalendar = async ({ workerId, projectId, year, month, user }) => {
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endDateStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const query = {
    date: { $gte: startDateStr, $lt: endDateStr },
  };

  if (workerId) query.workerId = workerId;
  if (projectId) query.projectId = projectId;

  // Enforce access scoping
  if (user.role === ROLES.WORKER) {
    query.workerId = user._id;
  } else if (user.role === ROLES.THEKEDAR) {
    query.thekedarId = user._id;
  }

  const attendanceList = await Attendance.find(query)
    .populate('projectId', 'name projectCode projectType')
    .populate('workerId', 'name email phone')
    .sort({ date: 1 });

  // Fetch financial transactions (salary payments, advances disbursed, etc.)
  const transactionQuery = {
    transactionDate: {
      $gte: new Date(startDateStr),
      $lt: new Date(endDateStr),
    },
    isReversed: false,
  };

  if (user.role === ROLES.WORKER) {
    transactionQuery.workerId = user._id;
  } else if (user.role === ROLES.THEKEDAR) {
    transactionQuery.thekedarId = user._id;
    if (workerId) transactionQuery.workerId = workerId;
    if (projectId) transactionQuery.projectId = projectId;
  } else {
    // OWNER or other management roles
    if (workerId) transactionQuery.workerId = workerId;
    if (projectId) transactionQuery.projectId = projectId;
  }

  const dateWisePayments = await FinancialTransaction.find(transactionQuery)
    .populate('workerId', 'name phone email workerCode')
    .populate('projectId', 'name projectCode')
    .populate('advanceRequestId', 'requestCode reason amount status requestedAt')
    .sort({ transactionDate: 1 });

  // Fetch advance requests within the month
  const advanceQuery = {
    $or: [
      { requestedAt: { $gte: new Date(startDateStr), $lt: new Date(endDateStr) } },
      { reviewedAt: { $gte: new Date(startDateStr), $lt: new Date(endDateStr) } },
    ],
  };

  if (user.role === ROLES.WORKER) {
    advanceQuery.workerId = user._id;
  } else if (user.role === ROLES.THEKEDAR) {
    advanceQuery.thekedarId = user._id;
    if (workerId) advanceQuery.workerId = workerId;
    if (projectId) advanceQuery.projectId = projectId;
  } else {
    if (workerId) advanceQuery.workerId = workerId;
    if (projectId) advanceQuery.projectId = projectId;
  }

  const dateWiseAdvances = await AdvanceRequest.find(advanceQuery)
    .populate('workerId', 'name phone email workerCode')
    .populate('projectId', 'name projectCode')
    .sort({ requestedAt: 1 });

  // Summary aggregation
  let totalApprovedEarnings = 0;
  let approvedDaysCount = 0;
  let totalDehadi = 0;
  const codeCounts = { P: 0, HALF: 0, 'P1/5': 0, PP: 0, ABSENT: 0, LEAVE: 0 };

  attendanceList.forEach((att) => {
    if (att.approvalStatus === ATTENDANCE_STATUS.APPROVED) {
      totalApprovedEarnings += att.calculatedEarnings;
      totalDehadi += (att.wageMultiplier || 0);
      if (['P', 'HALF', 'P1/5', 'PP'].includes(att.code)) {
        approvedDaysCount += 1;
      }
    }
    if (codeCounts[att.code] !== undefined) {
      codeCounts[att.code] += 1;
    }
  });

  // Calculate advance and payment totals
  let totalAdvancesTaken = 0;
  let totalPaymentsMade = 0;

  dateWisePayments.forEach((txn) => {
    if (txn.category === FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT) {
      totalAdvancesTaken += txn.amount || 0;
    } else {
      totalPaymentsMade += txn.amount || 0;
    }
  });

  // Calculate total calendar days in the requested month
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Calculate past month(s) approved earnings that have NOT been paid / finalized in payroll yet
  const pastUnpaidQuery = {
    date: { $lt: startDateStr },
    approvalStatus: ATTENDANCE_STATUS.APPROVED,
    isPayrollProcessed: false,
  };
  if (workerId) pastUnpaidQuery.workerId = workerId;
  else if (user.role === ROLES.WORKER) pastUnpaidQuery.workerId = user._id;
  else if (user.role === ROLES.THEKEDAR) pastUnpaidQuery.thekedarId = user._id;

  const pastUnpaidRecords = await Attendance.find(pastUnpaidQuery);
  const pastMonthUnpaidEarnings = pastUnpaidRecords.reduce((sum, r) => sum + (r.calculatedEarnings || 0), 0);
  const pastMonthUnpaidDaysCount = pastUnpaidRecords.length;

  return {
    year,
    month,
    records: attendanceList,
    payments: dateWisePayments,
    advances: dateWiseAdvances,
    summary: {
      totalRecords: attendanceList.length,
      approvedDaysCount,
      totalDehadi,
      totalApprovedEarnings,
      totalDaysInMonth,
      pastMonthUnpaidEarnings,
      pastMonthUnpaidDaysCount,
      totalAdvancesTaken,
      totalPaymentsMade,
      codeCounts,
    },
  };
};
