import { FurnitureTask, Project, WorkerProfile } from '../models/index.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';
import { ROLES, TASK_STATUS } from '../config/constants.js';

export const listTasks = async (req, res, next) => {
  try {
    const { projectId, assignedWorkerId, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    if (req.user.role === ROLES.WORKER) {
      filter.assignedWorkerId = req.user._id;
    } else if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
      if (assignedWorkerId) filter.assignedWorkerId = assignedWorkerId;
    } else if (assignedWorkerId) {
      filter.assignedWorkerId = assignedWorkerId;
    }

    const tasks = await FurnitureTask.find(filter)
      .populate('projectId', 'name projectCode siteAddress')
      .populate('assignedWorkerId', 'name phone')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { projectId, assignedWorkerId } = req.body;
    const project = await Project.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');

    const effectiveThekedarId = req.user.role === ROLES.THEKEDAR ? req.user._id : project.thekedarId;

    if (assignedWorkerId) {
      const workerProfile = await WorkerProfile.findOne({ userId: assignedWorkerId });
      if (!workerProfile) throw new NotFoundError('Worker profile not found');

      if (workerProfile.thekedarId.toString() !== effectiveThekedarId.toString()) {
        throw new ForbiddenError(
          'Strict Rule: This worker belongs to another permanent Thekedar and cannot be assigned to this task.'
        );
      }
    }

    const task = await FurnitureTask.create({
      ...req.body,
      thekedarId: effectiveThekedarId,
      status: TASK_STATUS.PENDING,
    });

    await recordAuditLog({
      req,
      action: 'FURNITURE_TASK_CREATED',
      targetType: 'FurnitureTask',
      targetId: task._id,
      newValues: { furnitureItemName: task.furnitureItemName, taskType: task.taskType },
    });

    res.status(201).json({
      status: 'success',
      message: 'Furniture task created successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await FurnitureTask.findById(req.params.taskId);
    if (!task) throw new NotFoundError('Furniture task not found');

    if (req.user.role === ROLES.WORKER && task.assignedWorkerId && task.assignedWorkerId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update tasks assigned to you');
    }

    const { completedUnits, status, defectNotes, assignedWorkerId } = req.body;

    if (assignedWorkerId && assignedWorkerId !== task.assignedWorkerId?.toString()) {
      const workerProfile = await WorkerProfile.findOne({ userId: assignedWorkerId });
      if (!workerProfile) throw new NotFoundError('Worker profile not found');

      if (workerProfile.thekedarId.toString() !== task.thekedarId.toString()) {
        throw new ForbiddenError(
          'Strict Rule: This worker belongs to another permanent Thekedar and cannot be assigned to this task.'
        );
      }
      task.assignedWorkerId = assignedWorkerId;
    }

    if (completedUnits !== undefined) task.completedUnits = completedUnits;
    if (status !== undefined) task.status = status;
    if (defectNotes) {
      task.defectReport = {
        hasDefect: true,
        description: defectNotes,
        reportedBy: req.user._id,
        reportedAt: new Date(),
        isResolved: false,
      };
      task.status = TASK_STATUS.REWORK_NEEDED;
    }

    if (status === TASK_STATUS.COMPLETED && !task.actualCompletionDate) {
      task.actualCompletionDate = new Date();
      if (task.completedUnits < task.plannedUnits) {
        task.completedUnits = task.plannedUnits;
      }
    }

    if (task.completedUnits >= task.plannedUnits && task.status !== TASK_STATUS.VERIFIED) {
      task.status = TASK_STATUS.COMPLETED;
      if (!task.actualCompletionDate) task.actualCompletionDate = new Date();
    }

    await task.save();

    await recordAuditLog({
      req,
      action: 'FURNITURE_TASK_UPDATED',
      targetType: 'FurnitureTask',
      targetId: task._id,
      newValues: { completedUnits: task.completedUnits, status: task.status },
    });

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyTask = async (req, res, next) => {
  try {
    const task = await FurnitureTask.findById(req.params.taskId);
    if (!task) throw new NotFoundError('Furniture task not found');

    if (req.user.role === ROLES.THEKEDAR && task.thekedarId.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only review tasks for your projects');
    }

    const { status, defectNotes } = req.body || {};

    if (status === TASK_STATUS.REWORK_NEEDED || defectNotes) {
      task.status = TASK_STATUS.REWORK_NEEDED;
      task.defectReport = {
        hasDefect: true,
        description: defectNotes || 'Rework requested by Thekedar during inspection',
        reportedBy: req.user._id,
        reportedAt: new Date(),
        isResolved: false,
      };
    } else {
      task.status = TASK_STATUS.VERIFIED;
      task.verifiedBy = req.user._id;
      task.verifiedAt = new Date();
      if (task.defectReport) {
        task.defectReport.isResolved = true;
      }
    }
    await task.save();

    await recordAuditLog({
      req,
      action: task.status === TASK_STATUS.VERIFIED ? 'FURNITURE_TASK_VERIFIED' : 'FURNITURE_TASK_REWORK_REQUESTED',
      targetType: 'FurnitureTask',
      targetId: task._id,
      newValues: { status: task.status, defectNotes },
    });

    res.status(200).json({
      status: 'success',
      message: task.status === TASK_STATUS.VERIFIED ? 'Craft task approved and verified by Thekedar!' : 'Task returned to worker for rework',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};
