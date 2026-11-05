import {
  WorkerProfile,
  Project,
  ProjectMoneyReceived,
  Payroll,
  FinancialTransaction,
  AdvanceRequest,
  ProjectExpense,
  PayrollAdjustment,
  SupportTicket,
} from '../models/index.js';

/**
 * Concurrency retry wrapper for operations involving uniquely generated codes.
 * If simultaneous requests from multiple Thekedars collide on a unique key constraint (E11000),
 * this automatically retries with jittered backoff, regenerating the next safe unique code.
 */
export const withDuplicateRetry = async (fn, maxRetries = 5) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      const isDup = err.code === 11000 || (err.message && err.message.includes('E11000'));
      if (isDup && attempt < maxRetries - 1) {
        attempt++;
        // Jittered backoff: 10ms - 50ms to let competing concurrent operation commit
        const jitter = Math.floor(10 * attempt + Math.random() * 20);
        await new Promise((res) => setTimeout(res, jitter));
        continue;
      }
      throw err;
    }
  }
};

/**
 * Robustly generates the next sequential unique workerCode (e.g. FC-WRK-0021).
 * Inspects all existing worker profiles to determine the true arithmetic maximum
 * numeric suffix, preventing collisions across all Thekedars.
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

/**
 * Robustly generates the next sequential unique transactionId (e.g. TXN-DISB-753718-015).
 * Guarantees zero collision across advance disbursements, salary payments, and net settlements.
 */
export const generateUniqueTransactionId = async (type = 'DISB') => {
  const txns = await FinancialTransaction.find(
    { transactionId: { $regex: `^TXN-${type}-` } },
    'transactionId'
  ).lean();

  let maxNum = 0;
  for (const t of txns) {
    if (t.transactionId) {
      const match = t.transactionId.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, txns.length + 1);
  let candidate = `TXN-${type}-${Date.now().toString().slice(-6)}-${String(nextNum).padStart(3, '0')}`;

  while (await FinancialTransaction.exists({ transactionId: candidate })) {
    nextNum++;
    candidate = `TXN-${type}-${Date.now().toString().slice(-6)}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique advance requestCode (e.g. ADV-REQ-591316-009).
 */
export const generateUniqueAdvanceRequestCode = async () => {
  const reqs = await AdvanceRequest.find({}, 'requestCode').lean();
  let maxNum = 0;
  for (const r of reqs) {
    if (r.requestCode) {
      const match = r.requestCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, reqs.length + 1);
  let candidate = `ADV-REQ-${Date.now().toString().slice(-6)}-${String(nextNum).padStart(3, '0')}`;

  while (await AdvanceRequest.exists({ requestCode: candidate })) {
    nextNum++;
    candidate = `ADV-REQ-${Date.now().toString().slice(-6)}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique expenseCode (e.g. EXP-2026-001).
 */
export const generateUniqueExpenseCode = async () => {
  const expenses = await ProjectExpense.find({}, 'expenseCode').lean();
  let maxNum = 0;
  for (const e of expenses) {
    if (e.expenseCode) {
      const match = e.expenseCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, expenses.length + 1);
  let candidate = `EXP-${Date.now().toString().slice(-4)}-${String(nextNum).padStart(3, '0')}`;

  while (await ProjectExpense.exists({ expenseCode: candidate })) {
    nextNum++;
    candidate = `EXP-${Date.now().toString().slice(-4)}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next sequential unique adjustmentCode (e.g. ADJ-1793856000-001).
 */
export const generateUniqueAdjustmentCode = async () => {
  const adjustments = await PayrollAdjustment.find({}, 'adjustmentCode').lean();
  let maxNum = 0;
  for (const a of adjustments) {
    if (a.adjustmentCode) {
      const match = a.adjustmentCode.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = Math.max(maxNum + 1, adjustments.length + 1);
  let candidate = `ADJ-${Date.now()}-${String(nextNum).padStart(3, '0')}`;

  while (await PayrollAdjustment.exists({ adjustmentCode: candidate })) {
    nextNum++;
    candidate = `ADJ-${Date.now()}-${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
};

/**
 * Robustly generates the next unique ticketNumber (e.g. TKT-2026-834912).
 */
export const generateUniqueTicketNumber = async (year = new Date().getFullYear()) => {
  let candidate = `TKT-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  while (await SupportTicket.exists({ ticketNumber: candidate })) {
    candidate = `TKT-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  }
  return candidate;
};

