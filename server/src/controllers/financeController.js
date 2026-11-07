import mongoose from 'mongoose';
import * as financeService from '../services/financeService.js';
import * as exportService from '../services/exportService.js';
import { AdvanceRequest, FinancialTransaction, WorkerProfile } from '../models/index.js';
import { ROLES, ADVANCE_REQUEST_STATUS, MAX_ADVANCE_LIMIT } from '../config/constants.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { escapeRegex } from '../utils/sanitize.js';

export const createAdvanceRequest = async (req, res, next) => {
  try {
    const advanceRequest = await financeService.createAdvanceRequest({
      workerId: req.body.workerId,
      projectId: req.body.projectId,
      amount: req.body.amount,
      reason: req.body.reason,
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Advance request submitted successfully',
      data: { advanceRequest },
    });
  } catch (error) {
    next(error);
  }
};

export const reviewAdvanceRequest = async (req, res, next) => {
  try {
    const advanceRequest = await financeService.reviewAdvanceRequest({
      requestId: req.params.requestId,
      status: req.body.status,
      reviewNotes: req.body.reviewNotes,
      reviewerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: `Advance request ${req.body.status.toLowerCase()}`,
      data: { advanceRequest },
    });
  } catch (error) {
    next(error);
  }
};

export const giveAdvance = async (req, res, next) => {
  try {
    const result = await financeService.giveAdvance({
      workerId: req.params.workerId,
      amount: req.body.amount,
      reason: req.body.reason,
      paymentMethod: req.body.paymentMethod,
      receiptReference: req.body.receiptReference,
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Advance given and recorded',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const disburseAdvance = async (req, res, next) => {
  try {
    const transaction = await financeService.disburseAdvance({
      requestId: req.params.requestId,
      paymentMethod: req.body.paymentMethod,
      receiptReference: req.body.receiptReference,
      notes: req.body.notes,
      recordedBy: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Advance disbursed and transaction recorded',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

export const recordSalaryPayment = async (req, res, next) => {
  try {
    const transaction = await financeService.recordSalaryPayment({
      payrollId: req.body.payrollId,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      receiptReference: req.body.receiptReference,
      notes: req.body.notes,
      recordedBy: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Salary payment recorded and allocated to payroll',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

export const payWorkerNet = async (req, res, next) => {
  try {
    const result = await financeService.payWorkerNet({
      workerId: req.params.workerId,
      baseEarned: req.body.baseEarned,
      advanceDeduction: req.body.advanceDeduction,
      foodDeduction: req.body.foodDeduction,
      roomRentDeduction: req.body.roomRentDeduction,
      additionalWages: req.body.additionalWages,
      paymentMethod: req.body.paymentMethod,
      receiptReference: req.body.receiptReference,
      notes: req.body.notes,
      payerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: `Net payment of ₹${result.netPaid.toLocaleString('en-IN')} recorded successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listAdvanceRequests = async (req, res, next) => {
  try {
    const { status, workerId } = req.query;
    const filter = {};
    if (status) filter.status = status;

    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
      if (workerId) filter.workerId = workerId;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    const requests = await AdvanceRequest.find(filter)
      .populate('workerId', 'name email phone')
      .populate('projectId', 'name projectCode')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    const workerIds = [...new Set(requests.map(r => r.workerId?._id || r.workerId).filter(Boolean))];
    const profiles = await WorkerProfile.find({ userId: { $in: workerIds } });
    const profileMap = new Map();
    profiles.forEach(p => profileMap.set(p.userId.toString(), p));

    const enrichedRequests = requests.map(r => {
      const wId = (r.workerId?._id || r.workerId)?.toString();
      const p = profileMap.get(wId);
      const currentAdvanceBalance = p?.outstandingAdvanceBalance || 0;
      const exceedsLimit = false; // No upper limit on advance
      return {
        ...r.toObject(),
        currentAdvanceBalance,
        exceedsLimit,
      };
    });

    res.status(200).json({
      status: 'success',
      data: { requests: enrichedRequests },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerLedger = async (req, res, next) => {
  try {
    const targetWorkerId = req.params.workerId || req.user._id;

    if (req.user.role === ROLES.WORKER && targetWorkerId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Workers can only access their own financial ledger');
    }

    const ledger = await financeService.getWorkerLedger(targetWorkerId);

    res.status(200).json({
      status: 'success',
      data: ledger,
    });
  } catch (error) {
    next(error);
  }
};

export const listTransactions = async (req, res, next) => {
  try {
    const { category, workerId, projectId, search, transactionId } = req.query;
    const filter = { isReversed: false };
    if (category) filter.category = category;
    if (projectId) filter.projectId = projectId;

    if (transactionId) {
      filter.transactionId = transactionId.toUpperCase().trim();
    } else if (search) {
      const cleanSearch = escapeRegex(search.trim());
      filter.$or = [
        { transactionId: { $regex: cleanSearch, $options: 'i' } },
        { receiptReference: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
      if (workerId) filter.workerId = workerId;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    const safeLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const safePage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const transactions = await FinancialTransaction.find(filter)
      .populate('workerId', 'name phone email')
      .populate('thekedarId', 'name phone email')
      .populate('projectId', 'name projectCode')
      .populate('payrollId', 'payrollCode')
      .populate('recordedBy', 'name role')
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(safeLimit);

    res.status(200).json({
      status: 'success',
      data: { transactions, page: safePage, limit: safeLimit },
    });
  } catch (error) {
    next(error);
  }
};

export const searchTransactionById = async (req, res, next) => {
  try {
    const { query } = req.params;
    if (!query) {
      throw new BadRequestError('Transaction ID or search query is required');
    }

    const cleanQuery = query.trim();
    const safeRegex = escapeRegex(cleanQuery);
    const filter = {
      $or: [
        { transactionId: { $regex: `^${safeRegex}$`, $options: 'i' } },
        { transactionId: { $regex: safeRegex, $options: 'i' } },
        { receiptReference: { $regex: safeRegex, $options: 'i' } },
      ],
    };

    if (mongoose.Types.ObjectId.isValid(cleanQuery)) {
      filter.$or.push({ _id: cleanQuery });
    }

    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const transactions = await FinancialTransaction.find(filter)
      .populate('workerId', 'name phone email')
      .populate('thekedarId', 'name phone email')
      .populate('projectId', 'name projectCode clientName location')
      .populate('payrollId', 'payrollCode periodStart periodEnd')
      .populate('advanceRequestId', 'reason amount status')
      .populate('recordedBy', 'name role')
      .sort({ transactionDate: -1 });

    res.status(200).json({
      status: 'success',
      data: { transactions, count: transactions.length },
    });
  } catch (error) {
    next(error);
  }
};

export const reverseTransaction = async (req, res, next) => {
  try {
    const transaction = await financeService.reverseTransaction({
      transactionId: req.params.transactionId,
      reason: req.body.reason,
      authorizerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Financial transaction successfully reversed',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadPaymentBill = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const selectedLang = req.query.lang || req.headers['x-custom-lang'] || req.user?.preferredLanguage || 'en';
    const pdfBuffer = await exportService.generatePaymentBillPDF(transactionId, { reqUser: req.user, lang: selectedLang });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Bill_${transactionId}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
