import { Payroll, PayrollAdjustment, Attendance, WorkerProfile, AttendanceRuleVersion } from '../models/index.js';
import { PAYROLL_STATUS, ATTENDANCE_STATUS, FINANCIAL_CATEGORIES, PAYMENT_METHODS, ROLES } from '../config/constants.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { addMoney, subtractMoney, roundRupee } from '../utils/decimal.js';
import { recordAuditLog } from './auditService.js';
import { generateUniquePayrollCode, generateUniqueAdjustmentCode } from '../utils/codeGenerator.js';

/**
 * Preview Payroll calculation before finalization
 */
export const calculatePayrollPreview = async ({ workerId, periodMonth, periodYear, allowances = 0, deductions = 0, proposedAdvanceRecovery = 0, thekedarUser }) => {
  const workerProfile = await WorkerProfile.findOne({ userId: workerId }).populate('userId', 'name email phone');
  if (!workerProfile) throw new NotFoundError('Worker profile not found');

  const startDateStr = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
  const nextMonthYear = periodMonth === 12 ? periodYear + 1 : periodYear;
  const nextMonth = periodMonth === 12 ? 1 : periodMonth + 1;
  const endDateStr = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Fetch approved attendance records for this worker in this period
  const attendanceRecords = await Attendance.find({
    workerId,
    date: { $gte: startDateStr, $lt: endDateStr },
    approvalStatus: ATTENDANCE_STATUS.APPROVED,
    isPayrollProcessed: false,
  }).populate('projectId', 'name projectCode');

  // Breakdown initialization
  const breakdown = {
    P: { count: 0, earnings: 0 },
    HALF: { count: 0, earnings: 0 },
    'P1/5': { count: 0, earnings: 0 },
    PP: { count: 0, earnings: 0 },
    ABSENT: { count: 0 },
    LEAVE: { count: 0 },
  };

  let grossEarnings = 0;
  let totalApprovedDays = 0;
  const lineItems = [];

  for (const record of attendanceRecords) {
    const code = record.code;
    const earned = record.calculatedEarnings || 0;

    if (breakdown[code]) {
      if (['P', 'HALF', 'P1/5', 'PP'].includes(code)) {
        breakdown[code].count += 1;
        breakdown[code].earnings = addMoney(breakdown[code].earnings, earned);
        totalApprovedDays += 1;
        grossEarnings = addMoney(grossEarnings, earned);
      } else {
        breakdown[code].count += 1;
      }
    }

    lineItems.push({
      date: record.date,
      projectId: record.projectId?._id,
      projectName: record.projectId?.name,
      attendanceCode: code,
      dailyWage: record.applicableDailyWage,
      multiplier: record.wageMultiplier,
      earnedAmount: earned,
      shift: record.shift,
    });
  }

  // Validate Advance Recovery: cannot exceed worker's outstanding advance balance or gross earnings
  const maxRecoverable = Math.min(workerProfile.outstandingAdvanceBalance, grossEarnings + allowances);
  const actualAdvanceRecovery = Math.min(proposedAdvanceRecovery, maxRecoverable);

  // Remaining salary calculation
  // Remaining salary payable = gross earnings + allowances - deductions - advance recovery
  const netEarnings = addMoney(grossEarnings, allowances);
  const totalSubtractions = addMoney(deductions, actualAdvanceRecovery);
  const netPayable = roundRupee(Math.max(0, subtractMoney(netEarnings, totalSubtractions)));

  return {
    worker: {
      id: workerProfile.userId._id,
      name: workerProfile.userId.name,
      code: workerProfile.workerCode,
      defaultDailyWage: workerProfile.defaultDailyWage,
      outstandingAdvanceBalance: workerProfile.outstandingAdvanceBalance,
      outstandingSalaryBalance: workerProfile.outstandingSalaryBalance,
    },
    periodMonth,
    periodYear,
    startDate: startDateStr,
    endDate: endDateStr,
    totalApprovedDays,
    breakdown,
    grossEarnings,
    allowances,
    deductions,
    advancesRecovered: actualAdvanceRecovery,
    netPayable,
    lineItemsCount: lineItems.length,
    lineItems,
  };
};

/**
 * Finalize Payroll (Create Immutable Record & Update Ledger)
 */
export const finalizePayroll = async ({ data, thekedarUser, req }) => {
  const { workerId, periodMonth, periodYear, allowances = 0, deductions = 0, advanceRecoveryAmount = 0, notes } = data;

  // Check if payroll already exists for this worker & period
  const existingPayroll = await Payroll.findOne({ workerId, periodMonth, periodYear });
  if (existingPayroll) {
    throw new ConflictError(
      `Payroll for this worker for ${periodMonth}/${periodYear} has already been created (Status: ${existingPayroll.status}, Code: ${existingPayroll.payrollCode}). Duplicate finalization is prevented.`
    );
  }

  // Calculate preview and verify
  const preview = await calculatePayrollPreview({
    workerId,
    periodMonth,
    periodYear,
    allowances,
    deductions,
    proposedAdvanceRecovery: advanceRecoveryAmount,
    thekedarUser,
  });

  const payrollCode = await generateUniquePayrollCode(periodYear, periodMonth);

  const payroll = await Payroll.create({
    payrollCode,
    workerId,
    thekedarId: thekedarUser._id,
    periodMonth,
    periodYear,
    startDate: preview.startDate,
    endDate: preview.endDate,
    status: PAYROLL_STATUS.FINALIZED,
    totalApprovedDays: preview.totalApprovedDays,
    attendanceBreakdown: preview.breakdown,
    grossEarnings: preview.grossEarnings,
    totalAllowances: allowances,
    totalDeductions: deductions,
    advancesRecovered: preview.advancesRecovered,
    netPayable: preview.netPayable,
    salaryPaymentsAllocated: 0,
    balanceRemaining: preview.netPayable,
    lineItems: preview.lineItems,
    ruleVersionApplied: 1,
    finalizedBy: thekedarUser._id,
    finalizedAt: new Date(),
    isImmutable: true,
    notes,
  });

  // Mark all included attendance records as processed & link payroll ID
  await Attendance.updateMany(
    {
      workerId,
      date: { $gte: preview.startDate, $lt: preview.endDate },
      approvalStatus: ATTENDANCE_STATUS.APPROVED,
      isPayrollProcessed: false,
    },
    {
      $set: {
        isPayrollProcessed: true,
        payrollId: payroll._id,
      },
    }
  );

  // Update Worker Profile balances
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  if (workerProfile) {
    workerProfile.outstandingSalaryBalance = addMoney(
      workerProfile.outstandingSalaryBalance,
      preview.netPayable
    );

    if (preview.advancesRecovered > 0) {
      workerProfile.totalAdvancesRecovered = addMoney(
        workerProfile.totalAdvancesRecovered,
        preview.advancesRecovered
      );
      workerProfile.outstandingAdvanceBalance = Math.max(
        0,
        subtractMoney(workerProfile.outstandingAdvanceBalance, preview.advancesRecovered)
      );
    }

    await workerProfile.save();
  }

  await recordAuditLog({
    req,
    actorId: thekedarUser._id,
    actorName: thekedarUser.name,
    actorRole: thekedarUser.role,
    action: 'PAYROLL_FINALIZED',
    targetType: 'Payroll',
    targetId: payroll._id,
    newValues: {
      payrollCode,
      grossEarnings: preview.grossEarnings,
      netPayable: preview.netPayable,
      advancesRecovered: preview.advancesRecovered,
    },
  });

  return payroll;
};

/**
 * Add Immutable Adjustment to Finalized Payroll
 */
export const addPayrollAdjustment = async ({ payrollId, type, amount, reason, authorizedUser, req }) => {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) throw new NotFoundError('Payroll not found');

  if (payroll.status !== PAYROLL_STATUS.FINALIZED && payroll.status !== PAYROLL_STATUS.PARTIALLY_PAID) {
    throw new BadRequestError('Adjustments can only be added to finalized payrolls');
  }

  const adjustmentCode = await generateUniqueAdjustmentCode();

  const adjustment = await PayrollAdjustment.create({
    adjustmentCode,
    payrollId: payroll._id,
    workerId: payroll.workerId,
    thekedarId: authorizedUser._id,
    type,
    amount,
    reason,
    authorizedBy: authorizedUser._id,
    authorizedAt: new Date(),
  });

  // Adjust remaining balance
  const oldBalance = payroll.balanceRemaining;
  if (type === 'CREDIT') {
    payroll.netPayable = addMoney(payroll.netPayable, amount);
    payroll.balanceRemaining = addMoney(payroll.balanceRemaining, amount);
  } else {
    payroll.netPayable = Math.max(0, subtractMoney(payroll.netPayable, amount));
    payroll.balanceRemaining = Math.max(0, subtractMoney(payroll.balanceRemaining, amount));
  }
  await payroll.save();

  // Adjust worker profile outstanding salary balance
  const workerProfile = await WorkerProfile.findOne({ userId: payroll.workerId });
  if (workerProfile) {
    if (type === 'CREDIT') {
      workerProfile.outstandingSalaryBalance = addMoney(workerProfile.outstandingSalaryBalance, amount);
    } else {
      workerProfile.outstandingSalaryBalance = Math.max(0, subtractMoney(workerProfile.outstandingSalaryBalance, amount));
    }
    await workerProfile.save();
  }

  await recordAuditLog({
    req,
    action: 'PAYROLL_ADJUSTED',
    targetType: 'PayrollAdjustment',
    targetId: adjustment._id,
    newValues: { adjustmentCode, type, amount, reason, oldBalance, newBalance: payroll.balanceRemaining },
  });

  return adjustment;
};
