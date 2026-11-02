import { Tool, ToolIssue, ToolMaintenance, Project, User, WorkerProfile } from '../models/index.js';
import { ROLES, TOOL_STATUS, TOOL_CONDITION } from '../config/constants.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { recordAuditLog } from './auditService.js';

export const createTool = async ({ data, user, req }) => {
  const count = await Tool.countDocuments();
  const toolCode = data.toolCode || `TOOL-${Date.now().toString().slice(-4)}-${String(count + 1).padStart(3, '0')}`;

  // Enforce Thekedar tool ownership isolation
  const thekedarId = user.role === ROLES.THEKEDAR ? user._id : data.thekedarId || user._id;

  const tool = await Tool.create({
    ...data,
    thekedarId,
    toolCode,
    status: TOOL_STATUS.AVAILABLE,
    condition: data.condition || TOOL_CONDITION.EXCELLENT,
  });

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_CREATED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { toolCode, name: tool.name, category: tool.category, thekedarId },
  });

  return tool;
};

export const issueTool = async ({ data, user, req }) => {
  const { toolId, projectId, workerId, expectedReturnDate, conditionAtIssue } = data;

  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');

  // Verify Thekedar ownership: one thekedar cannot issue or see another thekedar's tools
  if (user.role === ROLES.THEKEDAR) {
    if (tool.thekedarId && tool.thekedarId.toString() !== user._id.toString()) {
      throw new ForbiddenError('You can only issue tools that belong to your inventory');
    }
    if (!tool.thekedarId) {
      tool.thekedarId = user._id;
    }
  }

  // Prevent issuing unavailable inventory
  if (tool.status !== TOOL_STATUS.AVAILABLE) {
    throw new ConflictError(`Tool '${tool.name}' is currently not available (Status: ${tool.status}). It cannot be issued.`);
  }

  const project = await Project.findById(projectId);
  if (!project) throw new NotFoundError('Project not found');

  if (user.role === ROLES.THEKEDAR && project.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only issue tools to your assigned projects');
  }

  // Strict Rule: Tools can only be issued to workers under your permanent management
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  if (workerProfile && tool.thekedarId && workerProfile.thekedarId.toString() !== tool.thekedarId.toString()) {
    throw new ForbiddenError('Strict Rule: Tools can only be issued to workers under your permanent management.');
  }

  const issueCount = await ToolIssue.countDocuments();
  const issueCode = `ISSUE-${Date.now().toString().slice(-4)}-${String(issueCount + 1).padStart(3, '0')}`;

  const toolIssue = await ToolIssue.create({
    issueCode,
    toolId: tool._id,
    thekedarId: tool.thekedarId || user._id,
    projectId,
    workerId,
    issuedBy: user._id,
    issueDate: new Date(),
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
    conditionAtIssue: conditionAtIssue || tool.condition,
    status: 'ISSUED',
  });

  // Update tool state
  tool.status = TOOL_STATUS.ISSUED;
  tool.currentAssignment = {
    projectId,
    workerId,
    issueDate: new Date(),
    toolIssueId: toolIssue._id,
  };
  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_ISSUED',
    targetType: 'ToolIssue',
    targetId: toolIssue._id,
    newValues: { issueCode, toolId: tool._id, projectId, workerId },
  });

  return toolIssue;
};

export const acknowledgeToolReceipt = async ({ issueId, workerUser, req }) => {
  const issue = await ToolIssue.findById(issueId);
  if (!issue) throw new NotFoundError('Tool issue not found');

  if (issue.workerId.toString() !== workerUser._id.toString()) {
    throw new ForbiddenError('You can only acknowledge receipt of tools issued to you');
  }

  issue.acknowledgedByWorker = true;
  issue.acknowledgedAt = new Date();
  await issue.save();

  await recordAuditLog({
    req,
    actorId: workerUser._id,
    actorName: workerUser.name,
    actorRole: workerUser.role,
    action: 'TOOL_RECEIPT_ACKNOWLEDGED',
    targetType: 'ToolIssue',
    targetId: issue._id,
  });

  return issue;
};

export const returnTool = async ({ issueId, conditionAtReturn, damageNotes, reviewerUser, req }) => {
  const issue = await ToolIssue.findById(issueId);
  if (!issue) throw new NotFoundError('Tool issue not found');

  if (issue.status === 'RETURNED') {
    throw new BadRequestError('This tool has already been returned');
  }

  const tool = await Tool.findById(issue.toolId);
  if (!tool) throw new NotFoundError('Tool not found');

  issue.status = 'RETURNED';
  issue.actualReturnDate = new Date();
  issue.conditionAtReturn = conditionAtReturn;
  issue.returnAcknowledgedByThekedar = true;
  if (damageNotes) {
    issue.damageNotes = damageNotes;
  }
  await issue.save();

  // Reset tool assignment and update condition
  tool.condition = conditionAtReturn;
  if (conditionAtReturn === TOOL_CONDITION.DAMAGED || conditionAtReturn === TOOL_CONDITION.UNDER_MAINTENANCE) {
    tool.status = TOOL_STATUS.MAINTENANCE;
  } else {
    tool.status = TOOL_STATUS.AVAILABLE;
  }
  tool.currentAssignment = {
    projectId: null,
    workerId: null,
    issueDate: null,
    toolIssueId: null,
  };
  await tool.save();

  await recordAuditLog({
    req,
    actorId: reviewerUser._id,
    actorName: reviewerUser.name,
    actorRole: reviewerUser.role,
    action: 'TOOL_RETURNED',
    targetType: 'ToolIssue',
    targetId: issue._id,
    newValues: { conditionAtReturn, status: tool.status },
  });

  return issue;
};

export const transferTool = async ({ data, user, req }) => {
  const { toolIssueId, toProjectId, toWorkerId, reason } = data;

  const currentIssue = await ToolIssue.findById(toolIssueId);
  if (!currentIssue) throw new NotFoundError('Tool issue record not found');

  if (currentIssue.status !== 'ISSUED') {
    throw new BadRequestError('Only currently active issued tools can be transferred');
  }

  const tool = await Tool.findById(currentIssue.toolId);
  if (!tool) throw new NotFoundError('Tool not found');

  // Record transfer in history
  currentIssue.transfers.push({
    fromProjectId: currentIssue.projectId,
    toProjectId,
    transferredBy: user._id,
    transferredAt: new Date(),
    reason,
    acknowledgedByDestWorker: false,
  });

  // Update current issue project and worker
  currentIssue.projectId = toProjectId;
  currentIssue.workerId = toWorkerId;
  currentIssue.acknowledgedByWorker = false; // Requires dest worker acknowledgment
  await currentIssue.save();

  // Update tool current assignment
  tool.currentAssignment.projectId = toProjectId;
  tool.currentAssignment.workerId = toWorkerId;
  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_TRANSFERRED',
    targetType: 'ToolIssue',
    targetId: currentIssue._id,
    newValues: { fromProjectId: currentIssue.projectId, toProjectId, toWorkerId, reason },
  });

  return currentIssue;
};

export const reportToolDamageOrMissing = async ({ toolId, damageNotes, isMissing = false, reporterUser, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');

  if (isMissing) {
    tool.status = TOOL_STATUS.LOST;
  } else {
    tool.condition = TOOL_CONDITION.DAMAGED;
    tool.status = TOOL_STATUS.MAINTENANCE;
  }
  await tool.save();

  // Find active issue if any
  const activeIssue = await ToolIssue.findOne({
    toolId: tool._id,
    status: 'ISSUED',
  });

  if (activeIssue) {
    activeIssue.status = isMissing ? 'REPORTED_MISSING' : 'REPORTED_DAMAGED';
    activeIssue.damageNotes = damageNotes;
    activeIssue.damageReportedBy = reporterUser._id;
    await activeIssue.save();
  }

  await recordAuditLog({
    req,
    actorId: reporterUser._id,
    actorName: reporterUser.name,
    actorRole: reporterUser.role,
    action: isMissing ? 'TOOL_REPORTED_MISSING' : 'TOOL_REPORTED_DAMAGED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { damageNotes, status: tool.status },
  });

  return { message: isMissing ? 'Tool reported missing' : 'Tool damage reported', tool };
};
