import mongoose from 'mongoose';
import { AdvanceRequest, FinancialTransaction, WorkerProfile, Payroll, User, Attendance } from '../models/index.js';
import { ADVANCE_REQUEST_STATUS, FINANCIAL_CATEGORIES, PAYMENT_METHODS, PAYROLL_STATUS, ROLES, ATTENDANCE_STATUS, MAX_ADVANCE_LIMIT } from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { addMoney, subtractMoney } from '../utils/decimal.js';
import { recordAuditLog } from './auditService.js';
import { generateUniqueTransactionId, generateUniqueAdvanceRequestCode, withDuplicateRetry } from '../utils/codeGenerator.js';

/**
 * Worker submits Advance Request
 */
export const createAdvanceRequest = async ({ workerId, projectId, amount, reason, user, req }) => {
  const finalWorkerId = user.role === ROLES.WORKER ? user._id : workerId;
  const workerProfile = await WorkerProfile.findOne({ userId: finalWorkerId });
  if (!workerProfile) throw new NotFoundError('Worker profile not found');

  if (amount > MAX_ADVANCE_LIMIT) {
    throw new BadRequestError(`Worker cannot take more than ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')} advance (requested: ₹${amount.toLocaleString('en-IN')}).`);
  }

  const currentAdvance = workerProfile.outstandingAdvanceBalance || 0;
  if (currentAdvance >= MAX_ADVANCE_LIMIT) {
    throw new BadRequestError(`Worker cannot take more than ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')} advance. Current outstanding advance is already ₹${currentAdvance.toLocaleString('en-IN')}.`);
  }

  if (addMoney(currentAdvance, amount) > MAX_ADVANCE_LIMIT) {
    throw new BadRequestError(`Worker cannot take more than ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')} advance. With current advance of ₹${currentAdvance.toLocaleString('en-IN')}, requesting ₹${amount.toLocaleString('en-IN')} pushes total to ₹${(currentAdvance + amount).toLocaleString('en-IN')}. Maximum additional advance allowed is ₹${(MAX_ADVANCE_LIMIT - currentAdvance).toLocaleString('en-IN')}.`);
  }

  return await withDuplicateRetry(async () => {
    const requestCode = await generateUniqueAdvanceRequestCode();

    const advanceRequest = await AdvanceRequest.create({
      requestCode,
      workerId: finalWorkerId,
      thekedarId: workerProfile.thekedarId,
      projectId: projectId || null,
      amount,
      reason,
      status: ADVANCE_REQUEST_STATUS.PENDING,
    });

    await recordAuditLog({
      req,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'ADVANCE_REQUEST_CREATED',
      targetType: 'AdvanceRequest',
      targetId: advanceRequest._id,
      newValues: { requestCode, amount, reason },
    });

    return advanceRequest;
  });
};

/**
 * Thekedar reviews (approves/rejects) Advance Request
 */
export const reviewAdvanceRequest = async ({ requestId, status, reviewNotes, reviewerUser, req }) => {
  // Security rule 9: Worker must never approve their own advance request
  if (reviewerUser.role === ROLES.WORKER) {
    throw new ForbiddenError('Workers cannot approve advance requests');
  }

  const advanceRequest = await AdvanceRequest.findById(requestId);
  if (!advanceRequest) throw new NotFoundError('Advance request not found');

  if (reviewerUser.role === ROLES.THEKEDAR && advanceRequest.thekedarId.toString() !== reviewerUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to review advance requests for this worker');
  }

  if (advanceRequest.status !== ADVANCE_REQUEST_STATUS.PENDING) {
    throw new BadRequestError(`Cannot review advance request that is already ${advanceRequest.status}`);
  }

  if (status === ADVANCE_REQUEST_STATUS.APPROVED) {
    const workerProfile = await WorkerProfile.findOne({ userId: advanceRequest.workerId });
    if (workerProfile) {
      const currentAdvance = workerProfile.outstandingAdvanceBalance || 0;
      if (currentAdvance >= MAX_ADVANCE_LIMIT) {
        throw new BadRequestError(`Cannot approve advance: worker already has ₹${currentAdvance.toLocaleString('en-IN')} advance (maximum allowed is ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')}).`);
      }
      if (addMoney(currentAdvance, advanceRequest.amount) > MAX_ADVANCE_LIMIT) {
        throw new BadRequestError(`Cannot approve advance: worker cannot take more than ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')} advance (current: ₹${currentAdvance.toLocaleString('en-IN')}, requested: ₹${advanceRequest.amount.toLocaleString('en-IN')}).`);
      }
    }
  }

  advanceRequest.status = status;
  advanceRequest.reviewedBy = reviewerUser._id;
  advanceRequest.reviewedAt = new Date();
  advanceRequest.reviewNotes = reviewNotes || null;
  await advanceRequest.save();

  await recordAuditLog({
    req,
    actorId: reviewerUser._id,
    actorName: reviewerUser.name,
    actorRole: reviewerUser.role,
    action: `ADVANCE_REQUEST_${status}`,
    targetType: 'AdvanceRequest',
    targetId: advanceRequest._id,
    newValues: { status, reviewNotes },
  });

  return advanceRequest;
};

/**
 * Disburse Advance (records actual financial transaction and updates worker outstanding advance balance)
 */
export const disburseAdvance = async ({ requestId, paymentMethod, receiptReference, notes, recordedBy, req }) => {
  // Atomically claim the approved advance request to prevent double-disbursement race conditions
  const advanceRequest = await AdvanceRequest.findOneAndUpdate(
    { _id: requestId, status: ADVANCE_REQUEST_STATUS.APPROVED },
    { status: 'PROCESSING' },
    { new: true }
  );

  if (!advanceRequest) {
    const existing = await AdvanceRequest.findById(requestId);
    if (!existing) throw new NotFoundError('Advance request not found');
    throw new BadRequestError('Only approved advance requests can be disbursed (or disbursement is already being processed)');
  }

  const workerProfile = await WorkerProfile.findOne({ userId: advanceRequest.workerId });
  if (workerProfile) {
    const currentAdvance = workerProfile.outstandingAdvanceBalance || 0;
    if (currentAdvance >= MAX_ADVANCE_LIMIT) {
      await AdvanceRequest.findByIdAndUpdate(requestId, { status: ADVANCE_REQUEST_STATUS.APPROVED });
      throw new BadRequestError(`Cannot disburse advance: worker already has ₹${currentAdvance.toLocaleString('en-IN')} advance (maximum allowed is ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')}).`);
    }
    if (addMoney(currentAdvance, advanceRequest.amount) > MAX_ADVANCE_LIMIT) {
      await AdvanceRequest.findByIdAndUpdate(requestId, { status: ADVANCE_REQUEST_STATUS.APPROVED });
      throw new BadRequestError(`Cannot disburse advance: worker cannot take more than ₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')} advance.`);
    }
  }

  // Atomically reserve balance on WorkerProfile with max cap condition to prevent race condition
  let updatedProfile = null;
  if (workerProfile) {
    updatedProfile = await WorkerProfile.findOneAndUpdate(
      {
        userId: advanceRequest.workerId,
        outstandingAdvanceBalance: { $lte: MAX_ADVANCE_LIMIT - advanceRequest.amount },
      },
      {
        $inc: {
          outstandingAdvanceBalance: advanceRequest.amount,
          totalAdvancesDisbursed: advanceRequest.amount,
        },
      },
      { new: true }
    );

    if (!updatedProfile) {
      await AdvanceRequest.findByIdAndUpdate(requestId, { status: ADVANCE_REQUEST_STATUS.APPROVED });
      throw new BadRequestError(`Cannot disburse advance: worker advance limit (₹${MAX_ADVANCE_LIMIT.toLocaleString('en-IN')}) would be exceeded.`);
    }
  }

  try {
    const transaction = await withDuplicateRetry(async () => {
      const transactionId = await generateUniqueTransactionId('DISB');
      return await FinancialTransaction.create({
        transactionId,
        category: FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT,
        amount: advanceRequest.amount,
        transactionDate: new Date(),
        paymentMethod: paymentMethod || PAYMENT_METHODS.CASH,
        receiptReference: receiptReference || null,
        workerId: advanceRequest.workerId,
        thekedarId: advanceRequest.thekedarId,
        projectId: advanceRequest.projectId,
        advanceRequestId: advanceRequest._id,
        recordedBy: recordedBy._id,
        notes: notes || `Disbursement for request ${advanceRequest.requestCode}`,
      });
    });

    advanceRequest.status = ADVANCE_REQUEST_STATUS.DISBURSED;
    advanceRequest.disbursedTransactionId = transaction._id;
    await advanceRequest.save();

    await recordAuditLog({
      req,
      actorId: recordedBy._id,
      actorName: recordedBy.name,
      actorRole: recordedBy.role,
      action: 'ADVANCE_DISBURSED',
      targetType: 'FinancialTransaction',
      targetId: transaction._id,
      newValues: { transactionId, amount: advanceRequest.amount, paymentMethod },
    });

    return transaction;
  } catch (err) {
    // Rollback atomic increment on worker profile if transaction creation failed
    if (updatedProfile) {
      await WorkerProfile.findOneAndUpdate(
        { userId: advanceRequest.workerId },
        {
          $inc: {
            outstandingAdvanceBalance: -advanceRequest.amount,
            totalAdvancesDisbursed: -advanceRequest.amount,
          },
        }
      );
    }
    await AdvanceRequest.findByIdAndUpdate(requestId, { status: ADVANCE_REQUEST_STATUS.APPROVED });
    throw err;
  }
};

/**
 * Thekedar hands an advance to their worker on the spot: request, approval and disbursement in one step.
 * The disbursement raises outstandingAdvanceBalance, which the next net payment deducts.
 */
export const giveAdvance = async ({ workerId, amount, reason, paymentMethod, receiptReference, user, req }) => {
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  if (!workerProfile) throw new NotFoundError('Worker profile not found');
  if (user.role === ROLES.THEKEDAR && workerProfile.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only give advances to workers under your management');
  }

  const advanceRequest = await createAdvanceRequest({ workerId, amount, reason, user, req });
  await reviewAdvanceRequest({
    requestId: advanceRequest._id,
    status: ADVANCE_REQUEST_STATUS.APPROVED,
    reviewNotes: 'Given directly by Thekedar',
    reviewerUser: user,
    req,
  });
  const transaction = await disburseAdvance({
    requestId: advanceRequest._id,
    paymentMethod,
    receiptReference,
    notes: `Advance given: ${reason}`,
    recordedBy: user,
    req,
  });

  return { advanceRequest: await AdvanceRequest.findById(advanceRequest._id), transaction };
};

/**
 * Record Salary Payment against a Finalized Payroll (Supports Partial & Full Payments)
 */
export const recordSalaryPayment = async ({ payrollId, amount, paymentMethod, receiptReference, notes, recordedBy, req }) => {
  const payroll = await Payroll.findById(payrollId);
  if (!payroll) throw new NotFoundError('Payroll record not found');

  if (payroll.status !== PAYROLL_STATUS.FINALIZED && payroll.status !== PAYROLL_STATUS.PARTIALLY_PAID) {
    throw new BadRequestError(`Cannot record salary payment on payroll with status: ${payroll.status}`);
  }

  if (amount > payroll.balanceRemaining) {
    throw new BadRequestError(
      `Payment amount (₹${amount}) cannot exceed remaining payroll balance (₹${payroll.balanceRemaining})`
    );
  }

  const transaction = await withDuplicateRetry(async () => {
    const transactionId = await generateUniqueTransactionId('SAL');
    return await FinancialTransaction.create({
      transactionId,
      category: FINANCIAL_CATEGORIES.SALARY_PAYMENT,
      amount,
      transactionDate: new Date(),
      paymentMethod: paymentMethod || PAYMENT_METHODS.BANK_TRANSFER,
      receiptReference: receiptReference || null,
      workerId: payroll.workerId,
      thekedarId: payroll.thekedarId,
      payrollId: payroll._id,
      recordedBy: recordedBy._id,
      notes: notes || `Salary payment for period ${payroll.periodMonth}/${payroll.periodYear}`,
    });
  });

  // Allocate payment to payroll
  payroll.salaryPaymentsAllocated = addMoney(payroll.salaryPaymentsAllocated, amount);
  payroll.balanceRemaining = Math.max(0, subtractMoney(payroll.balanceRemaining, amount));
  payroll.allocatedPaymentTransactions.push(transaction._id);

  if (payroll.balanceRemaining === 0) {
    payroll.status = PAYROLL_STATUS.PAID;
  } else {
    payroll.status = PAYROLL_STATUS.PARTIALLY_PAID;
  }
  await payroll.save();

  // Update WorkerProfile outstanding salary balance
  const workerProfile = await WorkerProfile.findOne({ userId: payroll.workerId });
  if (workerProfile) {
    workerProfile.totalSalaryPaid = addMoney(workerProfile.totalSalaryPaid, amount);
    workerProfile.outstandingSalaryBalance = Math.max(0, subtractMoney(workerProfile.outstandingSalaryBalance, amount));
    await workerProfile.save();
  }

  await recordAuditLog({
    req,
    actorId: recordedBy._id,
    actorName: recordedBy.name,
    actorRole: recordedBy.role,
    action: 'SALARY_PAYMENT_RECORDED',
    targetType: 'FinancialTransaction',
    targetId: transaction._id,
    newValues: { transactionId, amount, remainingPayrollBalance: payroll.balanceRemaining },
  });

  return transaction;
};

/**
 * Get Comprehensive Worker Ledger
 */
export const getWorkerLedger = async (workerId) => {
  const workerProfile = await WorkerProfile.findOne({ userId: workerId }).populate('userId', 'name email phone');
  if (!workerProfile) throw new NotFoundError('Worker profile not found');

  const transactions = await FinancialTransaction.find({
    workerId,
    isReversed: false,
  })
    .sort({ transactionDate: -1, createdAt: -1 })
    .populate('payrollId', 'payrollCode periodMonth periodYear')
    .populate('projectId', 'name projectCode')
    .populate('recordedBy', 'name');

  return {
    worker: {
      id: workerProfile.userId._id,
      name: workerProfile.userId.name,
      code: workerProfile.workerCode,
      totalAdvancesDisbursed: workerProfile.totalAdvancesDisbursed,
      totalAdvancesRecovered: workerProfile.totalAdvancesRecovered,
      outstandingAdvanceBalance: workerProfile.outstandingAdvanceBalance,
      totalSalaryPaid: workerProfile.totalSalaryPaid,
      outstandingSalaryBalance: workerProfile.outstandingSalaryBalance,
    },
    transactions,
  };
};

/**
 * Reverse a Financial Transaction
 */
export const reverseTransaction = async ({ transactionId, reason, authorizerUser, req }) => {
  const transaction = await FinancialTransaction.findById(transactionId);
  if (!transaction) throw new NotFoundError('Transaction not found');

  if (transaction.isReversed) {
    throw new BadRequestError('Transaction has already been reversed');
  }

  transaction.isReversed = true;
  transaction.reversalReason = reason;
  transaction.reversedAt = new Date();
  transaction.reversedBy = authorizerUser._id;
  await transaction.save();

  // Reverse balance changes on WorkerProfile if applicable
  if (transaction.workerId) {
    const workerProfile = await WorkerProfile.findOne({ userId: transaction.workerId });
    if (workerProfile) {
      if (transaction.category === FINANCIAL_CATEGORIES.ADVANCE_DISBURSEMENT) {
        workerProfile.totalAdvancesDisbursed = Math.max(0, subtractMoney(workerProfile.totalAdvancesDisbursed, transaction.amount));
        workerProfile.outstandingAdvanceBalance = Math.max(0, subtractMoney(workerProfile.outstandingAdvanceBalance, transaction.amount));
      } else if (transaction.category === FINANCIAL_CATEGORIES.ADVANCE_RECOVERY) {
        workerProfile.totalAdvancesRecovered = Math.max(0, subtractMoney(workerProfile.totalAdvancesRecovered, transaction.amount));
        workerProfile.outstandingAdvanceBalance = addMoney(workerProfile.outstandingAdvanceBalance, transaction.amount);
      } else if (transaction.category === FINANCIAL_CATEGORIES.SALARY_PAYMENT) {
        workerProfile.totalSalaryPaid = Math.max(0, subtractMoney(workerProfile.totalSalaryPaid, transaction.amount));
        workerProfile.outstandingSalaryBalance = addMoney(workerProfile.outstandingSalaryBalance, transaction.amount);

        // If this payment included advance deductions in breakdown, revert advance recovery balance
        if (transaction.breakdown?.advanceDeduction > 0) {
          workerProfile.totalAdvancesRecovered = Math.max(
            0,
            subtractMoney(workerProfile.totalAdvancesRecovered, transaction.breakdown.advanceDeduction)
          );
          workerProfile.outstandingAdvanceBalance = addMoney(
            workerProfile.outstandingAdvanceBalance,
            transaction.breakdown.advanceDeduction
          );
        }

        // Also revert payroll allocated amount
        if (transaction.payrollId) {
          const payroll = await Payroll.findById(transaction.payrollId);
          if (payroll) {
            payroll.salaryPaymentsAllocated = Math.max(0, subtractMoney(payroll.salaryPaymentsAllocated, transaction.amount));
            payroll.balanceRemaining = addMoney(payroll.balanceRemaining, transaction.amount);
            payroll.status = PAYROLL_STATUS.PARTIALLY_PAID;
            await payroll.save();
          }
        }
      }
      await workerProfile.save();
    }
  }

  await recordAuditLog({
    req,
    actorId: authorizerUser._id,
    actorName: authorizerUser.name,
    actorRole: authorizerUser.role,
    action: 'TRANSACTION_REVERSED',
    targetType: 'FinancialTransaction',
    targetId: transaction._id,
    newValues: { transactionId: transaction.transactionId, reason },
  });

  return transaction;
};

/**
 * Pay Worker Net Amount Directly (Settle Earned Wages, Deduct Advance, Add Bonuses)
 */
export const payWorkerNet = async ({
  workerId,
  baseEarned = 0,
  advanceDeduction = 0,
  foodDeduction = 0,
  roomRentDeduction = 0,
  additionalWages = 0,
  paymentMethod = PAYMENT_METHODS.CASH,
  receiptReference,
  notes,
  payerUser,
  req,
}) => {
  const worker = await User.findById(workerId);
  if (!worker || worker.role !== ROLES.WORKER) {
    throw new NotFoundError('Worker not found');
  }

  const profile = await WorkerProfile.findOne({ userId: workerId });
  if (!profile) throw new NotFoundError('Worker profile not found');

  if (payerUser.role === ROLES.THEKEDAR && profile.thekedarId.toString() !== payerUser._id.toString()) {
    throw new ForbiddenError('You can only pay workers under your management');
  }

  const numBaseEarned = parseFloat(baseEarned) || 0;
  const numAdvanceDeduction = parseFloat(advanceDeduction) || 0;
  const numFoodDeduction = parseFloat(foodDeduction) || 0;
  const numRoomRentDeduction = parseFloat(roomRentDeduction) || 0;
  const numAdditionalWages = parseFloat(additionalWages) || 0;

  if (numAdvanceDeduction < 0) {
    throw new BadRequestError('Advance deduction cannot be negative');
  }
  if (numFoodDeduction < 0) {
    throw new BadRequestError('Food deduction cannot be negative');
  }
  if (numRoomRentDeduction < 0) {
    throw new BadRequestError('Room rent deduction cannot be negative');
  }
  if (numAdvanceDeduction > (profile.outstandingAdvanceBalance || 0)) {
    throw new BadRequestError(
      `Advance deduction (₹${numAdvanceDeduction}) cannot exceed outstanding advance balance (₹${profile.outstandingAdvanceBalance || 0})`
    );
  }

  const totalCredits = addMoney(numBaseEarned, numAdditionalWages);
  const totalDeductions = addMoney(addMoney(numAdvanceDeduction, numFoodDeduction), numRoomRentDeduction);
  const netPayable = Math.max(0, subtractMoney(totalCredits, totalDeductions));

  const remainingAdv = Math.max(0, subtractMoney(profile.outstandingAdvanceBalance || 0, numAdvanceDeduction));
  const breakdown = {
    baseEarned: numBaseEarned,
    advanceDeduction: numAdvanceDeduction,
    foodDeduction: numFoodDeduction,
    roomRentDeduction: numRoomRentDeduction,
    additionalWages: numAdditionalWages,
    netPaid: netPayable,
    remainingAdvance: remainingAdv,
  };

  const executePayment = async (session) => {
    const sessionOpt = session ? { session } : {};
    const txIdSalary = await generateUniqueTransactionId('NET');

    const salaryTxnArr = await FinancialTransaction.create(
      [
        {
          transactionId: txIdSalary,
          category: FINANCIAL_CATEGORIES.SALARY_PAYMENT,
          amount: netPayable,
          paymentMethod,
          receiptReference: receiptReference || null,
          workerId: worker._id,
          thekedarId: profile.thekedarId,
          recordedBy: payerUser._id,
          breakdown,
          notes:
            notes ||
            (netPayable > 0
              ? `Direct net wage payment (Base: ₹${numBaseEarned}, Adv Cut: ₹${numAdvanceDeduction}, Food: ₹${numFoodDeduction}, Room: ₹${numRoomRentDeduction}, Bonus: ₹${numAdditionalWages})`
              : `Net wage settlement (Base: ₹${numBaseEarned} offset against Adv: ₹${numAdvanceDeduction}, Food: ₹${numFoodDeduction}, Room: ₹${numRoomRentDeduction})`),
          transactionDate: new Date(),
        },
      ],
      sessionOpt
    );
    const createdTxn = salaryTxnArr[0];

    // If advance was deducted ("cut"), update advance balances on profile without creating duplicate automatic transactions
    if (numAdvanceDeduction > 0) {
      profile.outstandingAdvanceBalance = Math.max(
        0,
        subtractMoney(profile.outstandingAdvanceBalance || 0, numAdvanceDeduction)
      );
      profile.totalAdvancesRecovered = addMoney(profile.totalAdvancesRecovered || 0, numAdvanceDeduction);
    }

    profile.totalSalaryPaid = addMoney(profile.totalSalaryPaid || 0, netPayable);
    profile.outstandingSalaryBalance = Math.max(
      0,
      subtractMoney(profile.outstandingSalaryBalance || 0, numBaseEarned)
    );
    await profile.save(sessionOpt);

    // Mark approved attendance as processed up to numBaseEarned
    if (numBaseEarned > 0) {
      const attendanceQuery = Attendance.find({
        workerId,
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        isPayrollProcessed: false,
      }).sort({ date: 1 });

      if (session) {
        attendanceQuery.session(session);
      }

      const unpaidAttendances = await attendanceQuery;
      let remainingToMark = numBaseEarned;
      for (const att of unpaidAttendances) {
        if (remainingToMark <= 0) break;
        att.isPayrollProcessed = true;
        await att.save(sessionOpt);
        remainingToMark -= att.calculatedEarnings;
      }
    }

    return createdTxn;
  };

  // Atomically execute payment within MongoDB transaction session when replica set is active (MongoDB Atlas in production)
  let salaryTxn;
  try {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        salaryTxn = await executePayment(session);
      });
    } catch (txErr) {
      if (/replica set/i.test(txErr.message) || /Transaction numbers/i.test(txErr.message)) {
        salaryTxn = await executePayment(null);
      } else {
        throw txErr;
      }
    } finally {
      await session.endSession();
    }
  } catch (sessErr) {
    if (!salaryTxn) {
      salaryTxn = await executePayment(null);
    }
  }

  await recordAuditLog({
    req,
    actorId: payerUser._id,
    actorName: payerUser.name,
    actorRole: payerUser.role,
    action: 'WORKER_NET_PAYMENT_PROCESSED',
    targetType: 'WorkerProfile',
    targetId: profile._id,
    newValues: {
      workerId,
      baseEarned: numBaseEarned,
      advanceDeduction: numAdvanceDeduction,
      additionalWages: numAdditionalWages,
      netPaid: netPayable,
      remainingAdvance: profile.outstandingAdvanceBalance,
    },
  });

  return {
    netPaid: netPayable,
    advanceDeduction: numAdvanceDeduction,
    remainingAdvance: profile.outstandingAdvanceBalance,
    transaction: salaryTxn,
    breakdown,
    billUrl: `/api/v1/finance/transactions/${salaryTxn._id}/bill`,
  };
};
