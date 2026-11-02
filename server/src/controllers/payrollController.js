import * as payrollService from '../services/payrollEngineService.js';
import { Payroll, PayrollAdjustment } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

export const previewPayroll = async (req, res, next) => {
  try {
    const { workerId, periodMonth, periodYear, allowances, deductions, advanceRecoveryAmount } = req.query;

    const preview = await payrollService.calculatePayrollPreview({
      workerId,
      periodMonth: parseInt(periodMonth, 10),
      periodYear: parseInt(periodYear, 10),
      allowances: parseFloat(allowances) || 0,
      deductions: parseFloat(deductions) || 0,
      proposedAdvanceRecovery: parseFloat(advanceRecoveryAmount) || 0,
      thekedarUser: req.user,
    });

    res.status(200).json({
      status: 'success',
      data: { preview },
    });
  } catch (error) {
    next(error);
  }
};

export const finalizePayroll = async (req, res, next) => {
  try {
    const payroll = await payrollService.finalizePayroll({
      data: req.body,
      thekedarUser: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Payroll successfully finalized and locked',
      data: { payroll },
    });
  } catch (error) {
    next(error);
  }
};

export const addAdjustment = async (req, res, next) => {
  try {
    const adjustment = await payrollService.addPayrollAdjustment({
      payrollId: req.body.payrollId,
      type: req.body.type,
      amount: req.body.amount,
      reason: req.body.reason,
      authorizedUser: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Immutable payroll adjustment added successfully',
      data: { adjustment },
    });
  } catch (error) {
    next(error);
  }
};

export const listPayrolls = async (req, res, next) => {
  try {
    const { workerId, month, year, status } = req.query;
    const filter = {};

    if (month) filter.periodMonth = parseInt(month, 10);
    if (year) filter.periodYear = parseInt(year, 10);
    if (status) filter.status = status;

    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
      if (workerId) filter.workerId = workerId;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    const payrolls = await Payroll.find(filter)
      .populate('workerId', 'name email phone')
      .populate('thekedarId', 'name phone')
      .sort({ periodYear: -1, periodMonth: -1 });

    res.status(200).json({
      status: 'success',
      data: { payrolls },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollDetails = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.payrollId)
      .populate('workerId', 'name email phone')
      .populate('thekedarId', 'name phone')
      .populate('allocatedPaymentTransactions')
      .populate('finalizedBy', 'name');

    if (!payroll) throw new NotFoundError('Payroll record not found');

    if (req.user.role === ROLES.WORKER && payroll.workerId._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only view your own payroll records');
    }

    if (req.user.role === ROLES.THEKEDAR && payroll.thekedarId._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have access to this payroll');
    }

    const adjustments = await PayrollAdjustment.find({ payrollId: payroll._id })
      .populate('authorizedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        payroll,
        adjustments,
      },
    });
  } catch (error) {
    next(error);
  }
};
