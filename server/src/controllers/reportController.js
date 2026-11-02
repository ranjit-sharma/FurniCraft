import * as reportService from '../services/reportService.js';
import * as exportService from '../services/exportService.js';
import { ROLES } from '../config/constants.js';
import { ForbiddenError } from '../utils/errors.js';
import { Payroll, AuditLog, User } from '../models/index.js';
import { recordAuditLog } from '../services/auditService.js';

export const getDashboardMetrics = async (req, res, next) => {
  try {
    let data;
    if (req.user.role === ROLES.WORKER) {
      data = await reportService.getWorkerDashboardData(req.user._id);
    } else if (req.user.role === ROLES.THEKEDAR) {
      data = await reportService.getThekedarDashboardData(req.user._id);
    } else if (req.user.role === ROLES.OWNER) {
      data = await reportService.getOwnerDashboardData();
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const exportAttendance = async (req, res, next) => {
  try {
    const { projectId, workerId, startDate, endDate, year, month } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (workerId) filter.workerId = workerId;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (year && month) {
      const padM = String(month).padStart(2, '0');
      filter.date = { $regex: `^${year}-${padM}` };
    }

    // Role scoping
    if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const selectedLang = req.query.lang || req.headers['x-custom-lang'] || req.user?.preferredLanguage || 'en';
    const pdfBuffer = await exportService.generateAttendancePDF(filter, { reqUser: req.user, lang: selectedLang });

    const filename = year && month
      ? `attendance-${year}-${String(month).padStart(2, '0')}.pdf`
      : `attendance-report-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const exportSalaryStatement = async (req, res, next) => {
  try {
    const { payrollId } = req.params;

    // Verify access to payroll
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) throw new Error('Payroll record not found');

    if (req.user.role === ROLES.WORKER && payroll.workerId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only export your own salary statements');
    }
    if (req.user.role === ROLES.THEKEDAR && payroll.thekedarId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not manage this payroll record');
    }

    const selectedLang = req.query.lang || req.headers['x-custom-lang'] || req.user?.preferredLanguage || 'en';
    const pdfBuffer = await exportService.generateSalaryStatementPDF(payrollId, { reqUser: req.user, lang: selectedLang });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payroll.payrollCode}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const getMembersOverview = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const data = await reportService.getMembersOverview({ role, search });
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const trackAppVisit = async (req, res, next) => {
  try {
    if (req.user) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentVisit = await AuditLog.findOne({
        actorId: req.user._id,
        action: { $in: ['USER_LOGIN', 'APP_VISIT'] },
        createdAt: { $gte: fifteenMinsAgo },
      });

      if (!recentVisit) {
        await recordAuditLog({
          req,
          actorId: req.user._id,
          actorName: req.user.name,
          actorRole: req.user.role,
          action: 'APP_VISIT',
          targetType: 'Application',
          targetId: req.user._id,
        });

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { visitCount: 1 },
          lastLoginAt: new Date(),
        });
      }
    }
    res.status(200).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};
