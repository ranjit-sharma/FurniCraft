import { ROLES } from '../config/constants.js';
import { Project, ProjectAssignment, FinancialTransaction } from '../models/index.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

/**
 * Ensures user has access to specified project:
 * - OWNER: Global access
 * - THEKEDAR: Only if project.thekedarId matches
 * - WORKER: Only if worker has an assignment to this project
 */
export const authorizeProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) return next();

    if (req.user.role === ROLES.OWNER) {
      return next();
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (req.user.role === ROLES.THEKEDAR) {
      if (project.thekedarId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('Access denied: You are not authorized for this project');
      }
      req.project = project;
      return next();
    }

    if (req.user.role === ROLES.WORKER) {
      const assignment = await ProjectAssignment.findOne({
        projectId: project._id,
        workerId: req.user._id,
      });

      if (!assignment) {
        throw new ForbiddenError('Access denied: You are not assigned to this project');
      }
      req.project = project;
      return next();
    }

    throw new ForbiddenError('Access denied');
  } catch (error) {
    next(error);
  }
};

/**
 * Ensures user has access to worker records:
 * - OWNER: Global access
 * - THEKEDAR: Can access workers registered by or assigned to them
 * - WORKER: Can access ONLY their own worker ID
 */
export const authorizeWorkerAccess = async (req, res, next) => {
  try {
    const targetWorkerId = req.params.workerId || req.params.id || req.body.workerId;
    if (!targetWorkerId) return next();

    if (req.user.role === ROLES.OWNER) {
      return next();
    }

    if (req.user.role === ROLES.WORKER) {
      if (targetWorkerId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('Access denied: You can only view your own records');
      }
      return next();
    }

    if (req.user.role === ROLES.THEKEDAR) {
      // Allowed if worker is managed by the thekedar or on one of their projects
      const hasAssignment = await ProjectAssignment.findOne({
        workerId: targetWorkerId,
        thekedarId: req.user._id,
      });

      if (hasAssignment) return next();

      // Or if assignedThekedar matches
      const { User } = await import('../models/User.js');
      const worker = await User.findById(targetWorkerId);
      if (worker && worker.assignedThekedar && worker.assignedThekedar.toString() === req.user._id.toString()) {
        return next();
      }

      throw new ForbiddenError('Access denied: Worker is not under your management');
    }

    throw new ForbiddenError('Access denied');
  } catch (error) {
    next(error);
  }
};

/**
 * Ensures user can access a specific financial transaction
 */
export const authorizeFinancialTransactionAccess = async (req, res, next) => {
  try {
    const transactionId = req.params.transactionId || req.params.id;
    if (!transactionId) return next();

    if (req.user.role === ROLES.OWNER) return next();

    const transaction = await FinancialTransaction.findById(transactionId);
    if (!transaction) throw new NotFoundError('Transaction not found');

    if (req.user.role === ROLES.THEKEDAR) {
      if (transaction.thekedarId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('Access denied: Unauthorized transaction');
      }
      return next();
    }

    if (req.user.role === ROLES.WORKER) {
      if (!transaction.workerId || transaction.workerId.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('Access denied: You cannot access other workers transactions');
      }
      return next();
    }

    throw new ForbiddenError('Access denied');
  } catch (error) {
    next(error);
  }
};
