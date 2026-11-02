import { ProjectExpense, Project } from '../models/index.js';
import { NotFoundError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';
import { ROLES } from '../config/constants.js';

export const listExpenses = async (req, res, next) => {
  try {
    const { projectId, category } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (category) filter.category = category;

    if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const expenses = await ProjectExpense.find(filter)
      .populate('projectId', 'name projectCode')
      .populate('recordedBy', 'name')
      .sort({ expenseDate: -1 });

    res.status(200).json({
      status: 'success',
      data: { expenses },
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const project = await Project.findById(req.body.projectId);
    if (!project) throw new NotFoundError('Project not found');

    const count = await ProjectExpense.countDocuments();
    const expenseCode = `EXP-${Date.now().toString().slice(-4)}-${String(count + 1).padStart(3, '0')}`;

    const expense = await ProjectExpense.create({
      ...req.body,
      expenseCode,
      thekedarId: project.thekedarId,
      recordedBy: req.user._id,
    });

    await recordAuditLog({
      req,
      action: 'PROJECT_EXPENSE_CREATED',
      targetType: 'ProjectExpense',
      targetId: expense._id,
      newValues: { expenseCode, title: expense.title, amount: expense.amount, category: expense.category },
    });

    res.status(201).json({
      status: 'success',
      message: 'Expense recorded successfully',
      data: { expense },
    });
  } catch (error) {
    next(error);
  }
};
