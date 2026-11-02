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

export const listTools = async (req, res, next) => {
  try {
    const { category, status, projectId, thekedarId } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (projectId) filter['currentAssignment.projectId'] = projectId;

    if (req.user.role === ROLES.THEKEDAR) {
      // Thekedar ONLY sees their own tools inventory — prevents conflicts between Thekedars
      filter.thekedarId = req.user._id;
    } else if (req.user.role === ROLES.WORKER) {
      // Workers view tools assigned to them or available tools from their supervising thekedar
      const wp = await WorkerProfile.findOne({ userId: req.user._id });
      filter.$or = [
        { 'currentAssignment.workerId': req.user._id },
        { thekedarId: wp?.thekedarId, status: TOOL_STATUS.AVAILABLE },
      ];
    } else if (req.user.role === ROLES.OWNER) {
      if (thekedarId) filter.thekedarId = thekedarId;
    }

    const tools = await Tool.find(filter)
      .populate('thekedarId', 'name email phone')
      .populate('currentAssignment.projectId', 'name projectCode')
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
    const toolIssue = await toolService.issueTool({
      data: req.body,
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

export const returnTool = async (req, res, next) => {
  try {
    const issue = await toolService.returnTool({
      issueId: req.params.issueId,
      conditionAtReturn: req.body.conditionAtReturn,
      damageNotes: req.body.damageNotes,
      reviewerUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool returned successfully',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

export const transferTool = async (req, res, next) => {
  try {
    const issue = await toolService.transferTool({
      data: req.body,
      user: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      message: 'Tool transferred to new project and worker',
      data: { issue },
    });
  } catch (error) {
    next(error);
  }
};

export const reportDamage = async (req, res, next) => {
  try {
    const result = await toolService.reportToolDamageOrMissing({
      toolId: req.params.toolId,
      damageNotes: req.body.damageNotes,
      isMissing: req.body.isMissing,
      reporterUser: req.user,
      req,
    });

    res.status(200).json({
      status: 'success',
      ...result,
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
