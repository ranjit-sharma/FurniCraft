import { Project, ProjectAssignment, FurnitureTask, ProjectExpense, ProjectMoneyReceived, Tool, Attendance, User, WorkerProfile } from '../models/index.js';
import { ROLES, PROJECT_STATUS, ATTENDANCE_STATUS } from '../config/constants.js';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { recordAuditLog } from './auditService.js';

export const createProject = async ({ data, user, req }) => {
  const count = await Project.countDocuments();
  const projectCode = data.projectCode || `FURN-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

  const thekedarId = user.role === ROLES.THEKEDAR ? user._id : data.thekedarId;
  if (!thekedarId) {
    throw new BadRequestError('Thekedar ID is required for project creation');
  }

  const project = await Project.create({
    ...data,
    projectCode,
    thekedarId,
    status: PROJECT_STATUS.PLANNED,
  });

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PROJECT_CREATED',
    targetType: 'Project',
    targetId: project._id,
    newValues: { projectCode, name: project.name, projectType: project.projectType },
  });

  return project;
};

export const assignWorkerToProject = async ({ data, user, req }) => {
  const { workerId, projectId, wageOverride, roleInProject, scheduleNotes, startDate } = data;

  const project = await Project.findById(projectId);
  if (!project) throw new NotFoundError('Project not found');

  if (user.role === ROLES.THEKEDAR && project.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only assign workers to projects you manage');
  }

  // Strict Rule: A worker can ONLY work under their permanent Thekedar and no other Thekedar
  const workerProfile = await WorkerProfile.findOne({ userId: workerId });
  if (workerProfile && workerProfile.thekedarId.toString() !== project.thekedarId.toString()) {
    throw new ForbiddenError(
      'Strict Rule: This worker belongs to another permanent Thekedar. A worker can only work on projects managed by their permanent Thekedar.'
    );
  }

  // Check if active assignment already exists
  const existingAssignment = await ProjectAssignment.findOne({
    workerId,
    projectId,
    status: 'ACTIVE',
  });

  if (existingAssignment) {
    throw new ConflictError('Worker is already actively assigned to this project');
  }

  const assignment = await ProjectAssignment.create({
    workerId,
    projectId,
    thekedarId: project.thekedarId,
    assignedBy: user._id,
    startDate: startDate ? new Date(startDate) : new Date(),
    status: 'ACTIVE',
    wageOverride: wageOverride || null,
    roleInProject: roleInProject || 'FURNITURE_FITTER',
    scheduleNotes,
  });

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'WORKER_ASSIGNED_TO_PROJECT',
    targetType: 'ProjectAssignment',
    targetId: assignment._id,
    newValues: { workerId, projectId, wageOverride },
  });

  return assignment;
};

export const getProjectDashboardDetails = async ({ projectId, user }) => {
  const project = await Project.findById(projectId).populate('thekedarId', 'name email phone');
  if (!project) throw new NotFoundError('Project not found');

  // Enforce access scoping
  if (user.role === ROLES.THEKEDAR && project.thekedarId._id.toString() !== user._id.toString()) {
    throw new ForbiddenError('Access denied: You do not manage this project');
  }

  if (user.role === ROLES.WORKER) {
    const workerProfile = await WorkerProfile.findOne({ userId: user._id });
    if (workerProfile && project.thekedarId._id.toString() !== workerProfile.thekedarId.toString()) {
      throw new ForbiddenError('Access denied: You can only view projects managed by your permanent Thekedar');
    }
    const isAssigned = await ProjectAssignment.findOne({ projectId, workerId: user._id });
    if (!isAssigned) {
      throw new ForbiddenError('Access denied: You are not assigned to this project');
    }
  }

  // Active worker assignments
  const assignments = await ProjectAssignment.find({ projectId, status: 'ACTIVE' }).populate('workerId', 'name email phone');

  // Furniture Tasks
  const tasks = await FurnitureTask.find({ projectId }).populate('assignedWorkerId', 'name');

  // Project Money Received from Client
  const moneyReceived = await ProjectMoneyReceived.find({ projectId }).sort({ receivedDate: -1 });
  const totalMoneyReceived = moneyReceived.reduce((acc, curr) => acc + curr.amount, 0);

  // Tools currently at this project
  const tools = await Tool.find({
    $or: [
      { 'currentAssignment.projectId': projectId },
      { projectId: projectId },
    ],
  }).populate('currentAssignment.workerId', 'name email phone');

  // Real Labor Cost from approved attendance
  const laborAttendance = await Attendance.aggregate([
    { $match: { projectId: project._id, approvalStatus: ATTENDANCE_STATUS.APPROVED } },
    { $group: { _id: null, totalLabor: { $sum: '$calculatedEarnings' }, totalDays: { $sum: 1 } } },
  ]);
  const totalLaborCost = laborAttendance[0]?.totalLabor || 0;

  const netOperatingSurplus = totalMoneyReceived - totalLaborCost;

  if (user.role === ROLES.WORKER) {
    const cleanProject = project.toObject();
    delete cleanProject.totalMoneyReceived;
    delete cleanProject.estimatedBudget;
    delete cleanProject.totalExpense;

    return {
      project: cleanProject,
      assignments,
      tasks,
      moneyReceived: [],
      tools,
      financialSummary: null,
    };
  }

  return {
    project,
    assignments,
    tasks,
    moneyReceived,
    tools,
    financialSummary: {
      totalMoneyReceived,
      totalLaborCost,
      netOperatingSurplus,
    },
  };
};

export const recordProjectMoneyReceived = async ({ projectId, data, user, req }) => {
  const project = await Project.findById(projectId);
  if (!project) throw new NotFoundError('Project not found');

  if (user.role === ROLES.THEKEDAR && project.thekedarId.toString() !== user._id.toString()) {
    throw new ForbiddenError('You can only record money received for projects you manage');
  }

  const count = await ProjectMoneyReceived.countDocuments();
  const receiptCode = `RCP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const payment = await ProjectMoneyReceived.create({
    receiptCode,
    projectId: project._id,
    thekedarId: project.thekedarId,
    amount: data.amount,
    receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
    paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
    receiptReference: data.receiptReference || null,
    payerName: data.payerName || project.clientName,
    stage: data.stage || 'Advance Booking',
    notes: data.notes || '',
    recordedBy: user._id,
  });

  project.totalMoneyReceived = (project.totalMoneyReceived || 0) + data.amount;
  await project.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PROJECT_MONEY_RECEIVED',
    targetType: 'Project',
    targetId: project._id,
    newValues: { receiptCode, amount: data.amount, paymentMethod: data.paymentMethod, stage: data.stage },
  });

  return payment;
};

export const listAllProjectMoneyReceived = async ({ user, projectId }) => {
  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (user.role === ROLES.THEKEDAR) filter.thekedarId = user._id;

  return await ProjectMoneyReceived.find(filter)
    .populate('projectId', 'name projectCode clientName')
    .sort({ receivedDate: -1 });
};
