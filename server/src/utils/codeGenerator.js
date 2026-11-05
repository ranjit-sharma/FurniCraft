import { WorkerProfile, Project, ProjectMoneyReceived, Payroll } from '../models/index.js';

/**
 * Robustly generates the next sequential unique workerCode (e.g. FC-WRK-0021).
 * Inspects all existing worker profiles to determine the true arithmetic maximum
 * numeric suffix, preventing collisions caused by document deletions or gaps.
 */
export const generateUniqueWorkerCode = async (prefix = 'FC-WRK') => {
  const profiles = await WorkerProfile.find({}, 'workerCode').lean();
  let maxNum = 0;
  for (const p of profiles) {
    if (p.workerCode) {
      const match = p.workerCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, profiles.length + 1);
  let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;

  while (await WorkerProfile.exists({ workerCode: candidate })) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique projectCode (e.g. FURN-2026-010).
 * Prevents duplicate key errors if older projects were deleted or sequence has gaps.
 */
export const generateUniqueProjectCode = async (year = new Date().getFullYear()) => {
  const prefix = `FURN-${year}`;
  const regex = new RegExp(`^FURN-${year}-(\\d+)$`, 'i');
  const projects = await Project.find(
    { projectCode: { $regex: `^FURN-${year}-`, $options: 'i' } },
    'projectCode'
  ).lean();

  let maxNum = 0;
  for (const p of projects) {
    if (p.projectCode) {
      const match = p.projectCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, projects.length + 1);
  let candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;

  while (await Project.exists({ projectCode: candidate })) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique receiptCode (e.g. RCP-2026-0012).
 */
export const generateUniqueReceiptCode = async (year = new Date().getFullYear()) => {
  const prefix = `RCP-${year}`;
  const regex = new RegExp(`^RCP-${year}-(\\d+)$`, 'i');
  const receipts = await ProjectMoneyReceived.find(
    { receiptCode: { $regex: `^RCP-${year}-`, $options: 'i' } },
    'receiptCode'
  ).lean();

  let maxNum = 0;
  for (const r of receipts) {
    if (r.receiptCode) {
      const match = r.receiptCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, receipts.length + 1);
  let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;

  while (await ProjectMoneyReceived.exists({ receiptCode: candidate })) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique payrollCode (e.g. PAY-2026-11-0001).
 */
export const generateUniquePayrollCode = async (periodYear, periodMonth) => {
  const padMonth = String(periodMonth).padStart(2, '0');
  const prefix = `PAY-${periodYear}-${padMonth}`;
  const regex = new RegExp(`^PAY-${periodYear}-${padMonth}-(\\d+)$`, 'i');
  const payrolls = await Payroll.find(
    { payrollCode: { $regex: `^PAY-${periodYear}-${padMonth}-`, $options: 'i' } },
    'payrollCode'
  ).lean();

  let maxNum = 0;
  for (const p of payrolls) {
    if (p.payrollCode) {
      const match = p.payrollCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, payrolls.length + 1);
  let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;

  while (await Payroll.exists({ payrollCode: candidate })) {
    nextNum++;
    candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  return candidate;
};
