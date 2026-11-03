import * as toolService from '../services/toolService.js';
import { Tool, ToolIssue, WorkerProfile } from '../models/index.js';
import { ROLES, TOOL_STATUS } from '../config/constants.js';
import { NotFoundError } from '../utils/errors.js';

export const createTool = async (req, res, next) => {
  try {
    const tool = await toolService.createTool({
      data: req.body,
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Tool added to inventory',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const getToolById = async (req, res, next) => {
  try {
    const tool = await toolService.getToolById({
      toolId: req.params.toolId,
      user: req.user,
    });

    res.status(200).json({
      status: 'success',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTool = async (req, res, next) => {
  try {
    const tool = await toolService.updateTool({
      toolId: req.params.toolId,
      data: req.body,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool details updated successfully',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const getToolStats = async (req, res, next) => {
  try {
    const stats = await toolService.getToolStats({ user: req.user });

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
};

export const listTools = async (req, res, next) => {
  try {
    const { category, status, projectId, workerId, thekedarId, search } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (projectId) filter['currentAssignment.projectId'] = projectId;
    if (workerId) filter['currentAssignment.workerId'] = workerId;

    if (req.user.role === ROLES.THEKEDAR) {
      // Strict Thekedar isolation: Thekedar ONLY sees their own tools
      filter.thekedarId = req.user._id;
    } else if (req.user.role === ROLES.WORKER) {
      const wp = await WorkerProfile.findOne({ userId: req.user._id });
      filter.$or = [
        { 'currentAssignment.workerId': req.user._id },
        { thekedarId: wp?.thekedarId, status: TOOL_STATUS.AVAILABLE },
      ];
    } else if (req.user.role === ROLES.OWNER) {
      if (thekedarId) filter.thekedarId = thekedarId;
    }

    if (search && search.trim()) {
      const s = search.trim();
      filter.$or = [
        { toolCode: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } },
        { brand: { $regex: s, $options: 'i' } },
      ];
    }

    const tools = await Tool.find(filter)
      .populate('thekedarId', 'name email phone')
      .populate('currentAssignment.projectId', 'name projectCode siteAddress')
      .populate('currentAssignment.workerId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { tools },
    });
  } catch (error) {
    next(error);
  }
};

export const issueTool = async (req, res, next) => {
  try {
    const toolId = req.params.toolId || req.body.toolId;
    const toolIssue = await toolService.issueTool({
      data: { ...req.body, toolId },
      user: req.user,
      req,
    });

    res.status(201).json({
      status: 'success',
      message: 'Tool issued successfully',
      data: { toolIssue },
    });
  } catch (error) {
    next(error);
  }
};

export const transferTool = async (req, res, next) => {
  try {
    const toolId = req.params.toolId || req.body.toolId;
    const tool = await toolService.transferTool({
      data: { ...req.body, toolId },
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool transferred to new project successfully',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const returnTool = async (req, res, next) => {
  try {
    const toolId = req.params.toolId || req.body.toolId;
    const issueId = req.params.issueId || req.body.issueId;

    const tool = await toolService.returnTool({
      toolId,
      issueId,
      conditionAtReturn: req.body.conditionAtReturn,
      quantity: req.body.quantity,
      damageNotes: req.body.damageNotes,
      notes: req.body.notes,
      reviewerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool return recorded successfully',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const reportMissing = async (req, res, next) => {
  try {
    const tool = await toolService.reportMissingTool({
      toolId: req.params.toolId,
      reason: req.body.reason,
      missingDate: req.body.missingDate,
      conditionLastSeen: req.body.conditionLastSeen,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool reported missing',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveMissing = async (req, res, next) => {
  try {
    const tool = await toolService.resolveMissingTool({
      toolId: req.params.toolId,
      resolutionStatus: req.body.resolutionStatus,
      verifiedCondition: req.body.verifiedCondition,
      notes: req.body.notes,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Missing tool report resolved',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const reportDamage = async (req, res, next) => {
  try {
    const tool = await toolService.reportToolDamage({
      toolId: req.params.toolId,
      damageType: req.body.damageType,
      description: req.body.description || req.body.damageNotes,
      damageDate: req.body.damageDate,
      workerId: req.body.workerId,
      projectId: req.body.projectId,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool damage reported',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveDamage = async (req, res, next) => {
  try {
    const tool = await toolService.resolveToolDamage({
      toolId: req.params.toolId,
      resolutionStatus: req.body.resolutionStatus,
      notes: req.body.notes,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool damage resolution updated',
      data: { tool },
    });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeReceipt = async (req, res, next) => {
  try {
    const issue = await toolService.acknowledgeToolReceipt({
      issueId: req.params.issueId,
      workerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool receipt acknowledged',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

export const listToolIssues = async (req, res, next) => {
  try {
    const { projectId, workerId, status } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;

    if (req.user.role === ROLES.THEKEDAR) {
      filter.$or = [
        { thekedarId: req.user._id },
        { issuedBy: req.user._id },
      ];
    } else if (req.user.role === ROLES.WORKER) {
      filter.workerId = req.user._id;
    } else if (workerId) {
      filter.workerId = workerId;
    }

    const issues = await ToolIssue.find(filter)
      .populate('toolId')
      .populate('thekedarId', 'name phone')
      .populate('projectId', 'name projectCode')
      .populate('workerId', 'name phone')
      .populate('issuedBy', 'name')
      .sort({ issueDate: -1 });

    res.status(200).json({
      status: 'success',
      data: { issues },
    });
  } catch (error) {
    next(error);
  }
};
