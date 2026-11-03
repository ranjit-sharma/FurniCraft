import * as projectService from '../services/projectService.js';
import { Project, ProjectAssignment, ProjectMoneyReceived, WorkerProfile } from '../models/index.js';
import { ROLES, PROJECT_STATUS } from '../config/constants.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';

const PRIORITY_ORDER = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const sortByPriority = (a, b) => {
  const pA = PRIORITY_ORDER[a.priority] || 2;
  const pB = PRIORITY_ORDER[b.priority] || 2;
  if (pB !== pA) return pB - pA;
  return new Date(b.createdAt) - new Date(a.createdAt);
};

export const listProjects = async (req, res, next) => {
  try {
    const { status, type, priority, search } = req.query;
    const filter = {};
    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        filter.status = { $ne: PROJECT_STATUS.ARCHIVED };
      } else {
        filter.status = status;
      }
    }
    if (type && type !== 'ALL') filter.projectType = type;
    if (priority && priority !== 'ALL') filter.priority = priority;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { projectCode: { $regex: q, $options: 'i' } },
        { clientName: { $regex: q, $options: 'i' } },
        { siteAddress: { $regex: q, $options: 'i' } },
      ];
    }

    if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    } else if (req.user.role === ROLES.WORKER) {
      const workerProfile = await WorkerProfile.findOne({ userId: req.user._id });
      const permanentThekedarId = workerProfile?.thekedarId;

      const assignments = await ProjectAssignment.find({
        workerId: req.user._id,
        ...(permanentThekedarId ? { thekedarId: permanentThekedarId } : {}),
      });
      const allWorkerProjectIds = [...new Set(assignments.map((a) => a.projectId.toString()))];
      filter._id = { $in: allWorkerProjectIds };
      if (permanentThekedarId) {
        filter.thekedarId = permanentThekedarId;
      }
    }

    const projects = await Project.find(filter)
      .populate('thekedarId', 'name phone email')
      .sort({ createdAt: -1 });

    if (req.user.role === ROLES.WORKER) {
      const allWorkerProjectIds = projects.map((p) => p._id);
      const workerAssignments = await ProjectAssignment.find({
        workerId: req.user._id,
        projectId: { $in: allWorkerProjectIds },
      });

      // Workers should NOT see project money, budget, or expenses
      const sanitized = projects.map((p) => {
        const obj = p.toObject();
        delete obj.totalMoneyReceived;
        delete obj.paymentsCount;
        delete obj.estimatedBudget;
        delete obj.totalExpense;
        obj.myAssignment = workerAssignments.find((a) => a.projectId.toString() === p._id.toString()) || null;
        return obj;
      });
      sanitized.sort(sortByPriority);
      return res.status(200).json({
        status: 'success',
        data: { projects: sanitized },
      });
    }

    const projectIds = projects.map((p) => p._id);
    const paymentsSummary = await ProjectMoneyReceived.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      {
        $group: {
          _id: '$projectId',
          totalMoneyReceived: { $sum: '$amount' },
          paymentsCount: { $sum: 1 },
        },
      },
    ]);

    const paymentsMap = new Map();
    paymentsSummary.forEach((p) => {
      paymentsMap.set(p._id.toString(), {
        totalMoneyReceived: p.totalMoneyReceived,
        paymentsCount: p.paymentsCount,
      });
    });

    const enrichedProjects = projects.map((project) => {
      const pObj = project.toObject();
      const stats = paymentsMap.get(project._id.toString()) || { totalMoneyReceived: 0, paymentsCount: 0 };
      pObj.totalMoneyReceived = stats.totalMoneyReceived;
      pObj.paymentsCount = stats.paymentsCount;
      return pObj;
    });

    enrichedProjects.sort(sortByPriority);

    res.status(200).json({
      status: 'success',
      data: { projects: enrichedProjects },
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject({
      data: req.body,
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Furniture project created successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectDetails = async (req, res, next) => {
  try {
    const result = await projectService.getProjectDashboardDetails({
      projectId: req.params.projectId,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) throw new NotFoundError('Project not found');

    if (req.user.role === ROLES.THEKEDAR && project.thekedarId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update projects assigned to you');
    }

    const oldValues = { name: project.name, status: project.status, priority: project.priority, estimatedBudget: project.estimatedBudget };
    Object.assign(project, req.body);
    await project.save();

    await recordAuditLog({
      req,
      action: 'PROJECT_UPDATED',
      targetType: 'Project',
      targetId: project._id,
      oldValues,
      newValues: req.body,
    });

    res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

export const recordMoneyReceived = async (req, res, next) => {
  try {
    const payment = await projectService.recordProjectMoneyReceived({
      projectId: req.params.projectId,
      data: req.body,
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Project money received recorded successfully',
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const listProjectMoneyReceived = async (req, res, next) => {
  try {
    const payments = await projectService.listAllProjectMoneyReceived({
      user: req.user,
      projectId: req.params.projectId || req.query.projectId,
    });

    res.status(200).json({
      status: 'success',
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
};
