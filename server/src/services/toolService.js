import { Tool, ToolIssue, Project, User, WorkerProfile } from '../models/index.js';
import { ROLES, TOOL_STATUS, TOOL_CONDITION } from '../config/constants.js';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { recordAuditLog } from './auditService.js';

/**
 * Generate unique auto Tool ID: FC-TOOL-XXXX
 */
const generateToolCode = async () => {
  const count = await Tool.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `FC-TOOL-${randomSuffix}`;
};

/**
 * Generate unique issue code: FC-ISSUE-XXXX
 */
const generateIssueCode = async () => {
  const count = await ToolIssue.countDocuments();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `FC-ISS-${randomSuffix}`;
};

/**
 * Helper to ensure user can access a specific tool
 */
const verifyToolAccess = (tool, user) => {
  if (!tool) throw new NotFoundError('Tool not found');
  if (user.role === ROLES.THEKEDAR) {
    const ownerId = tool.thekedarId?._id
      ? tool.thekedarId._id.toString()
      : tool.thekedarId
      ? tool.thekedarId.toString()
      : null;
    if (ownerId && ownerId !== user._id.toString()) {
      throw new ForbiddenError('You can only access tools belonging to your inventory');
    }
  }
};

/**
 * 1. Register Tool
 */
export const createTool = async ({ data, user, req }) => {
  const thekedarId = user.role === ROLES.THEKEDAR ? user._id : data.thekedarId || user._id;
  const toolCode = data.toolCode || (await generateToolCode());

  const initialCondition = data.initialCondition || data.condition || TOOL_CONDITION.NEW;
  const quantity = Math.max(1, parseInt(data.quantity, 10) || 1);

  const tool = await Tool.create({
    toolCode,
    name: data.name,
    thekedarId,
    category: data.category || 'Power Tools',
    description: data.description || '',
    brand: data.brand || '',
    modelNumber: data.modelNumber || '',
    serialNumber: data.serialNumber || '',
    quantity,
    issuedQuantity: 0,
    initialCondition,
    condition: initialCondition,
    status: TOOL_STATUS.AVAILABLE,
    isActive: true,
    registrationDate: data.registrationDate ? new Date(data.registrationDate) : new Date(),
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
    purchaseCost: parseFloat(data.purchaseCost) || 0,
    notes: data.notes || '',
    movementHistory: [
      {
        action: 'REGISTERED',
        timestamp: new Date(),
        actorId: user._id,
        actorName: user.name,
        quantity,
        condition: initialCondition,
        notes: `Tool registered in inventory with ${quantity} unit(s)`,
      },
    ],
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

/**
 * 2. Get Single Tool with Complete Movement History
 */
export const getToolById = async ({ toolId, user }) => {
  const tool = await Tool.findById(toolId)
    .populate('thekedarId', 'name phone email')
    .populate('currentAssignment.projectId', 'name projectCode siteAddress')
    .populate('currentAssignment.workerId', 'name phone')
    .populate('missingReport.workerId', 'name phone')
    .populate('missingReport.projectId', 'name projectCode')
    .populate('damageReport.workerId', 'name phone')
    .populate('damageReport.projectId', 'name projectCode');

  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  return tool;
};

/**
 * 3. Update Permitted Tool Details / Deactivate Tool
 */
export const updateTool = async ({ toolId, data, user, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  if (data.name) tool.name = data.name.trim();
  if (data.category) tool.category = data.category;
  if (data.description !== undefined) tool.description = data.description.trim();
  if (data.brand !== undefined) tool.brand = data.brand.trim();
  if (data.modelNumber !== undefined) tool.modelNumber = data.modelNumber.trim();
  if (data.serialNumber !== undefined) tool.serialNumber = data.serialNumber.trim();
  if (data.notes !== undefined) tool.notes = data.notes.trim();

  if (data.isActive !== undefined) {
    tool.isActive = data.isActive;
    if (!data.isActive) {
      tool.status = TOOL_STATUS.RETIRED;
      tool.movementHistory.push({
        action: 'RETIRED',
        timestamp: new Date(),
        actorId: user._id,
        actorName: user.name,
        notes: data.deactivationReason || 'Tool deactivated by Thekedar',
      });
    }
  }

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_UPDATED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: data,
  });

  return tool;
};

/**
 * 4. Issue Tool to Worker & Project
 */
export const issueTool = async ({ data, user, req }) => {
  const { toolId, projectId, workerId, issueDate, expectedReturnDate, conditionAtIssue, quantity, notes } = data;

  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  if (!tool.isActive || tool.status === TOOL_STATUS.RETIRED) {
    throw new BadRequestError('Cannot issue a deactivated or retired tool');
  }

  if (tool.status === TOOL_STATUS.MISSING || tool.status === TOOL_STATUS.LOST) {
    throw new ConflictError(`Tool '${tool.name}' is currently reported missing and cannot be issued.`);
  }

  if (tool.status === TOOL_STATUS.DAMAGED || tool.status === TOOL_STATUS.UNDER_INSPECTION) {
    throw new ConflictError(`Tool '${tool.name}' is currently damaged or under inspection.`);
  }

  const availableQty = Math.max(0, (tool.quantity || 1) - (tool.issuedQuantity || 0));
  const issueQty = Math.min(availableQty, Math.max(1, parseInt(quantity, 10) || 1));

  if (availableQty <= 0 || tool.status === TOOL_STATUS.ISSUED) {
    throw new ConflictError(`Tool '${tool.name}' is currently not available (Status: ${tool.status}). It has no available units to issue.`);
  }

  // Verify project belongs to Thekedar
  const project = await Project.findById(projectId);
  if (!project) throw new NotFoundError('Project not found');
  if (user.role === ROLES.THEKEDAR && project.thekedarId && project.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only issue tools to your own projects');
  }

  // Verify worker belongs to Thekedar
  const worker = await User.findById(workerId);
  if (!worker) throw new NotFoundError('Worker not found');
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  if (user.role === ROLES.THEKEDAR && workerProfile && workerProfile.thekedarId && workerProfile.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only issue tools to workers under your workforce management');
  }

  const issueCode = await generateIssueCode();
  const toolIssue = await ToolIssue.create({
    issueCode,
    toolId: tool._id,
    thekedarId: tool.thekedarId || user._id,
    projectId,
    workerId,
    issuedBy: user._id,
    issueDate: issueDate ? new Date(issueDate) : new Date(),
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
    quantity: issueQty,
    conditionAtIssue: conditionAtIssue || tool.condition || TOOL_CONDITION.GOOD,
    status: 'ISSUED',
  });

  // Update tool state
  tool.issuedQuantity = (tool.issuedQuantity || 0) + issueQty;
  tool.status = tool.issuedQuantity >= tool.quantity ? TOOL_STATUS.ISSUED : TOOL_STATUS.PARTIALLY_ISSUED;
  tool.currentAssignment = {
    projectId,
    projectName: project.name,
    workerId,
    workerName: worker.name,
    issueDate: toolIssue.issueDate,
    expectedReturnDate: toolIssue.expectedReturnDate,
    quantity: issueQty,
    toolIssueId: toolIssue._id,
  };

  // Append movement history
  tool.movementHistory.push({
    action: 'ISSUED',
    timestamp: new Date(),
    actorId: user._id,
    actorName: user.name,
    workerId: worker._id,
    workerName: worker.name,
    projectId: project._id,
    projectName: project.name,
    quantity: issueQty,
    condition: toolIssue.conditionAtIssue,
    notes: notes || `Issued to ${worker.name} for site ${project.name}`,
  });

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_ISSUED',
    targetType: 'ToolIssue',
    targetId: toolIssue._id,
    newValues: { issueCode, toolId: tool._id, projectId, workerId, quantity: issueQty },
  });

  return toolIssue;
};

/**
 * 5. Transfer Tool from One Project/Site to Another
 */
export const transferTool = async ({ data, user, req }) => {
  const { toolId, toolIssueId, toProjectId, toWorkerId, reason, transferDate, notes } = data;

  let currentIssue;
  let tool;

  if (toolIssueId) {
    currentIssue = await ToolIssue.findById(toolIssueId);
    if (!currentIssue) throw new NotFoundError('Tool issue record not found');
    tool = await Tool.findById(currentIssue.toolId);
  } else if (toolId) {
    tool = await Tool.findById(toolId);
    if (!tool) throw new NotFoundError('Tool not found');
    if (tool.currentAssignment?.toolIssueId) {
      currentIssue = await ToolIssue.findById(tool.currentAssignment.toolIssueId);
    }
  }

  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  if (tool.status !== TOOL_STATUS.ISSUED && tool.status !== TOOL_STATUS.PARTIALLY_ISSUED && (!currentIssue || currentIssue.status !== 'ISSUED')) {
    throw new BadRequestError('Only currently issued tools can be transferred between projects');
  }

  // Validate destination project
  const toProject = await Project.findById(toProjectId);
  if (!toProject) throw new NotFoundError('Destination project not found');
  if (user.role === ROLES.THEKEDAR && toProject.thekedarId && toProject.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only transfer tools to your assigned projects');
  }

  // Destination worker
  let destWorker = null;
  const finalWorkerId = toWorkerId || tool.currentAssignment?.workerId || (currentIssue ? currentIssue.workerId : null);
  if (finalWorkerId) {
    destWorker = await User.findById(finalWorkerId);
  }

  const fromProjectId = tool.currentAssignment?.projectId || (currentIssue ? currentIssue.projectId : null);
  const fromProject = fromProjectId ? await Project.findById(fromProjectId) : null;
  const fromProjectName = fromProject?.name || tool.currentAssignment?.projectName || 'Previous Site';

  // Record transfer in ToolIssue if exists
  if (currentIssue) {
    currentIssue.transfers = currentIssue.transfers || [];
    currentIssue.transfers.push({
      fromProjectId,
      toProjectId,
      transferredBy: user._id,
      transferredAt: transferDate ? new Date(transferDate) : new Date(),
      reason: reason || 'Site transfer requested by Thekedar',
      acknowledgedByDestWorker: true,
    });
    currentIssue.projectId = toProjectId;
    if (destWorker) currentIssue.workerId = destWorker._id;
    currentIssue.status = 'TRANSFERRED';
    await currentIssue.save();
  }

  // Update tool current assignment
  tool.currentAssignment.projectId = toProjectId;
  tool.currentAssignment.projectName = toProject.name;
  if (destWorker) {
    tool.currentAssignment.workerId = destWorker._id;
    tool.currentAssignment.workerName = destWorker.name;
  }

  // Append movement history
  tool.movementHistory.push({
    action: 'TRANSFERRED',
    timestamp: transferDate ? new Date(transferDate) : new Date(),
    actorId: user._id,
    actorName: user.name,
    fromProjectId,
    fromProjectName,
    toProjectId,
    toProjectName: toProject.name,
    workerId: destWorker?._id || null,
    workerName: destWorker?.name || '',
    reason: reason || 'Site transfer',
    notes: notes || `Transferred from ${fromProjectName} to ${toProject.name}`,
  });

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_TRANSFERRED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { fromProjectId, toProjectId, toWorkerId: destWorker?._id, reason },
  });

  return tool;
};

/**
 * 6. Return Tool from Worker / Site
 */
export const returnTool = async ({ toolId, issueId, conditionAtReturn, quantity, damageNotes, notes, reviewerUser, req }) => {
  let tool;
  let currentIssue;

  if (issueId) {
    currentIssue = await ToolIssue.findById(issueId);
    if (!currentIssue) throw new NotFoundError('Tool issue not found');
    tool = await Tool.findById(currentIssue.toolId);
  } else if (toolId) {
    tool = await Tool.findById(toolId);
    if (!tool) throw new NotFoundError('Tool not found');
    if (tool.currentAssignment?.toolIssueId) {
      currentIssue = await ToolIssue.findById(tool.currentAssignment.toolIssueId);
    }
  }

  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, reviewerUser);

  const returnQty = Math.max(1, parseInt(quantity, 10) || tool.currentAssignment?.quantity || 1);
  const normalizedCondition = conditionAtReturn || TOOL_CONDITION.GOOD;

  if (currentIssue) {
    currentIssue.actualReturnDate = new Date();
    currentIssue.conditionAtReturn = normalizedCondition;
    currentIssue.returnedQuantity = (currentIssue.returnedQuantity || 0) + returnQty;
    currentIssue.returnAcknowledgedByThekedar = true;
    if (damageNotes) currentIssue.damageNotes = damageNotes;
    currentIssue.status = currentIssue.returnedQuantity >= currentIssue.quantity ? 'RETURNED' : 'PARTIALLY_RETURNED';
    await currentIssue.save();
  }

  // Update tool issued quantity
  tool.issuedQuantity = Math.max(0, (tool.issuedQuantity || 0) - returnQty);
  tool.condition = normalizedCondition;

  const returningWorkerName = tool.currentAssignment?.workerName || 'Worker';
  const returningProjectName = tool.currentAssignment?.projectName || 'Site';

  // Handle condition outcome
  if (normalizedCondition === 'DAMAGED' || normalizedCondition === TOOL_CONDITION.DAMAGED) {
    tool.status = TOOL_STATUS.DAMAGED;
    tool.damageReport = {
      isDamaged: true,
      reportedDate: new Date(),
      workerId: tool.currentAssignment?.workerId || null,
      workerName: tool.currentAssignment?.workerName || '',
      projectId: tool.currentAssignment?.projectId || null,
      projectName: tool.currentAssignment?.projectName || '',
      damageType: 'Reported on Return',
      description: damageNotes || notes || 'Tool returned in damaged condition',
      resolutionStatus: 'REPORTED',
    };
  } else if (normalizedCondition === 'MISSING' || normalizedCondition === TOOL_STATUS.MISSING) {
    tool.status = TOOL_STATUS.MISSING;
    tool.missingReport = {
      isMissing: true,
      reportedDate: new Date(),
      workerId: tool.currentAssignment?.workerId || null,
      workerName: tool.currentAssignment?.workerName || '',
      projectId: tool.currentAssignment?.projectId || null,
      projectName: tool.currentAssignment?.projectName || '',
      conditionLastSeen: 'Damaged/Missing',
      reason: damageNotes || notes || 'Reported missing upon attempted return',
      resolutionStatus: 'REPORTED',
    };
  } else {
    // Returned in good condition
    tool.status = tool.issuedQuantity > 0 ? TOOL_STATUS.PARTIALLY_ISSUED : TOOL_STATUS.AVAILABLE;
  }

  // If all units returned or tool damaged/missing, clear assignment
  if (tool.issuedQuantity === 0 || tool.status === TOOL_STATUS.DAMAGED || tool.status === TOOL_STATUS.MISSING) {
    tool.currentAssignment = {
      projectId: null,
      projectName: '',
      workerId: null,
      workerName: '',
      issueDate: null,
      expectedReturnDate: null,
      quantity: 0,
      toolIssueId: null,
    };
  }

  // Append movement history
  tool.movementHistory.push({
    action: tool.issuedQuantity > 0 ? 'PARTIALLY_RETURNED' : 'RETURNED',
    timestamp: new Date(),
    actorId: reviewerUser._id,
    actorName: reviewerUser.name,
    workerId: currentIssue?.workerId || null,
    workerName: returningWorkerName,
    projectId: currentIssue?.projectId || null,
    projectName: returningProjectName,
    quantity: returnQty,
    condition: normalizedCondition,
    notes: notes || damageNotes || `Returned by ${returningWorkerName} in ${normalizedCondition} condition`,
  });

  await tool.save();

  await recordAuditLog({
    req,
    actorId: reviewerUser._id,
    actorName: reviewerUser.name,
    actorRole: reviewerUser.role,
    action: 'TOOL_RETURNED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { conditionAtReturn: normalizedCondition, status: tool.status, quantity: returnQty },
  });

  return tool;
};

/**
 * 7. Report Missing Tool
 */
export const reportMissingTool = async ({ toolId, reason, missingDate, conditionLastSeen, user, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  if (!reason || reason.trim().length < 3) {
    throw new BadRequestError('A specific reason or circumstances description is mandatory when reporting a tool missing');
  }

  const lastWorkerId = tool.currentAssignment?.workerId || null;
  const lastWorkerName = tool.currentAssignment?.workerName || '';
  const lastProjectId = tool.currentAssignment?.projectId || null;
  const lastProjectName = tool.currentAssignment?.projectName || '';

  tool.status = TOOL_STATUS.MISSING;
  tool.missingReport = {
    isMissing: true,
    reportedDate: missingDate ? new Date(missingDate) : new Date(),
    workerId: lastWorkerId,
    workerName: lastWorkerName,
    projectId: lastProjectId,
    projectName: lastProjectName,
    conditionLastSeen: conditionLastSeen || tool.condition || 'GOOD',
    reason: reason.trim(),
    resolutionStatus: 'REPORTED',
  };

  // Append to movement history
  tool.movementHistory.push({
    action: 'REPORTED_MISSING',
    timestamp: tool.missingReport.reportedDate,
    actorId: user._id,
    actorName: user.name,
    workerId: lastWorkerId,
    workerName: lastWorkerName,
    projectId: lastProjectId,
    projectName: lastProjectName,
    condition: tool.missingReport.conditionLastSeen,
    reason: reason.trim(),
    notes: `Reported missing by ${user.name}. Reason: ${reason.trim()}`,
  });

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_REPORTED_MISSING',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { reason: reason.trim(), status: tool.status },
  });

  return tool;
};

/**
 * 8. Resolve Missing Tool (Mark Found or Closed)
 */
export const resolveMissingTool = async ({ toolId, resolutionStatus, verifiedCondition, notes, user, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  tool.missingReport.resolutionStatus = resolutionStatus; // 'FOUND' or 'CLOSED'
  tool.missingReport.resolutionDate = new Date();
  tool.missingReport.resolutionNotes = notes || '';

  if (resolutionStatus === 'FOUND') {
    tool.missingReport.isMissing = false;
    const isGood = verifiedCondition === 'GOOD' || verifiedCondition === TOOL_CONDITION.GOOD;
    tool.condition = isGood ? TOOL_CONDITION.GOOD : TOOL_CONDITION.DAMAGED;
    tool.status = isGood ? TOOL_STATUS.AVAILABLE : TOOL_STATUS.DAMAGED;
    tool.issuedQuantity = 0;
    tool.currentAssignment = {
      projectId: null,
      projectName: '',
      workerId: null,
      workerName: '',
      issueDate: null,
      expectedReturnDate: null,
      quantity: 0,
      toolIssueId: null,
    };

    tool.movementHistory.push({
      action: 'FOUND_RESOLVED',
      timestamp: new Date(),
      actorId: user._id,
      actorName: user.name,
      condition: tool.condition,
      resolutionStatus: 'FOUND',
      notes: notes || `Tool recovered & verified in ${tool.condition} condition. Restored to ${tool.status}.`,
    });
  } else {
    // CLOSED
    tool.movementHistory.push({
      action: 'STATUS_UPDATED',
      timestamp: new Date(),
      actorId: user._id,
      actorName: user.name,
      resolutionStatus: 'CLOSED',
      notes: notes || 'Missing tool investigation closed as unrecovered.',
    });
  }

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_MISSING_RESOLVED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { resolutionStatus, status: tool.status },
  });

  return tool;
};

/**
 * 9. Report Tool Damage
 */
export const reportToolDamage = async ({ toolId, damageType, description, damageDate, workerId, projectId, user, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  if (!description || description.trim().length < 3) {
    throw new BadRequestError('A specific description of the damage or defect is mandatory');
  }

  const assignedWorkerId = workerId || tool.currentAssignment?.workerId || null;
  const assignedWorkerName = tool.currentAssignment?.workerName || '';
  const assignedProjectId = projectId || tool.currentAssignment?.projectId || null;
  const assignedProjectName = tool.currentAssignment?.projectName || '';

  tool.status = TOOL_STATUS.DAMAGED;
  tool.condition = TOOL_CONDITION.DAMAGED;
  tool.damageReport = {
    isDamaged: true,
    reportedDate: damageDate ? new Date(damageDate) : new Date(),
    workerId: assignedWorkerId,
    workerName: assignedWorkerName,
    projectId: assignedProjectId,
    projectName: assignedProjectName,
    damageType: damageType || 'Wear and Tear',
    description: description.trim(),
    resolutionStatus: 'REPORTED',
  };

  tool.movementHistory.push({
    action: 'REPORTED_DAMAGED',
    timestamp: tool.damageReport.reportedDate,
    actorId: user._id,
    actorName: user.name,
    workerId: assignedWorkerId,
    workerName: assignedWorkerName,
    projectId: assignedProjectId,
    projectName: assignedProjectName,
    damageType: tool.damageReport.damageType,
    condition: 'DAMAGED',
    notes: `Damage reported (${tool.damageReport.damageType}): ${description.trim()}`,
  });

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_REPORTED_DAMAGED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { damageType, description: description.trim(), status: tool.status },
  });

  return tool;
};

/**
 * 10. Resolve Tool Damage (Mark Usable Again or Retire)
 */
export const resolveToolDamage = async ({ toolId, resolutionStatus, notes, user, req }) => {
  const tool = await Tool.findById(toolId);
  if (!tool) throw new NotFoundError('Tool not found');
  verifyToolAccess(tool, user);

  tool.damageReport.resolutionStatus = resolutionStatus;
  tool.damageReport.resolutionDate = new Date();
  tool.damageReport.resolutionNotes = notes || '';

  if (resolutionStatus === 'USABLE_AGAIN') {
    tool.damageReport.isDamaged = false;
    tool.condition = TOOL_CONDITION.GOOD;
    tool.status = TOOL_STATUS.AVAILABLE;
    tool.issuedQuantity = 0;
    tool.currentAssignment = {
      projectId: null,
      projectName: '',
      workerId: null,
      workerName: '',
      issueDate: null,
      expectedReturnDate: null,
      quantity: 0,
      toolIssueId: null,
    };

    tool.movementHistory.push({
      action: 'REPAIRED_USABLE',
      timestamp: new Date(),
      actorId: user._id,
      actorName: user.name,
      condition: TOOL_CONDITION.GOOD,
      resolutionStatus: 'USABLE_AGAIN',
      notes: notes || 'Tool inspected, repaired, and confirmed fully usable by Thekedar.',
    });
  } else if (resolutionStatus === 'RETIRED') {
    tool.status = TOOL_STATUS.RETIRED;
    tool.isActive = false;

    tool.movementHistory.push({
      action: 'RETIRED',
      timestamp: new Date(),
      actorId: user._id,
      actorName: user.name,
      resolutionStatus: 'RETIRED',
      notes: notes || 'Tool decommissioned and permanently retired from active inventory.',
    });
  }

  await tool.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'TOOL_DAMAGE_RESOLVED',
    targetType: 'Tool',
    targetId: tool._id,
    newValues: { resolutionStatus, status: tool.status },
  });

  return tool;
};

/**
 * 11. Tool Dashboard Summary Statistics
 */
export const getToolStats = async ({ user }) => {
  const filter = {};
  if (user.role === ROLES.THEKEDAR) {
    filter.thekedarId = user._id;
  }

  const tools = await Tool.find(filter);

  let total = tools.length;
  let available = 0;
  let issued = 0;
  let transferred = 0;
  let returned = 0;
  let missing = 0;
  let damaged = 0;

  for (const t of tools) {
    if (t.status === TOOL_STATUS.AVAILABLE) available++;
    if (t.status === TOOL_STATUS.ISSUED || t.status === TOOL_STATUS.PARTIALLY_ISSUED) issued++;
    if (t.status === TOOL_STATUS.MISSING || t.status === TOOL_STATUS.LOST) missing++;
    if (t.status === TOOL_STATUS.DAMAGED || t.status === TOOL_STATUS.UNDER_INSPECTION || t.status === TOOL_STATUS.MAINTENANCE) damaged++;

    // Count movement history occurrences
    const hasTransfer = t.movementHistory?.some((m) => m.action === 'TRANSFERRED');
    if (hasTransfer) transferred++;

    const hasReturn = t.movementHistory?.some((m) => m.action === 'RETURNED' || m.action === 'PARTIALLY_RETURNED');
    if (hasReturn) returned++;
  }

  return {
    total,
    available,
    issued,
    transferred,
    returned,
    missing,
    damaged,
  };
};

/**
 * Backwards compatibility helper for acknowledging receipt
 */
export const acknowledgeToolReceipt = async ({ issueId, workerUser, req }) => {
  const issue = await ToolIssue.findById(issueId);
  if (!issue) throw new NotFoundError('Tool issue not found');
  issue.acknowledgedByWorker = true;
  issue.acknowledgedAt = new Date();
  await issue.save();
  return issue;
};

/**
 * Backwards compatibility helper for older report endpoints
 */
export const reportToolDamageOrMissing = async ({ toolId, damageNotes, isMissing = false, reporterUser, req }) => {
  if (isMissing) {
    return reportMissingTool({
      toolId,
      reason: damageNotes || 'Reported missing',
      user: reporterUser,
      req,
    });
  } else {
    return reportToolDamage({
      toolId,
      damageType: 'Reported Defect',
      description: damageNotes || 'Tool damaged',
      user: reporterUser,
      req,
    });
  }
};
