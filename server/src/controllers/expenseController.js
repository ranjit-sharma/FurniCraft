import { ProjectExpense, Project } from '../models/index.js';
import { NotFoundError } from '../utils/errors.js';
import { recordAuditLog } from '../services/auditService.js';
import { ROLES } from '../config/constants.js';
import { generateUniqueExpenseCode, withDuplicateRetry } from '../utils/codeGenerator.js';

export const listExpenses = async (req, res, next) => {
  try {
    const { projectId, category } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (category) filter.category = category;

    if (req.user.role === ROLES.THEKEDAR) {
      filter.thekedarId = req.user._id;
    }

    const safeLimit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const safePage = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const expenses = await ProjectExpense.find(filter)
      .populate('projectId', 'name projectCode')
      .populate('recordedBy', 'name')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(safeLimit);

    res.status(200).json({
      status: 'success',
      data: { expenses, page: safePage, limit: safeLimit },
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const project = await Project.findById(req.body.projectId);
    if (!project) throw new NotFoundError('Project not found');

    const expense = await withDuplicateRetry(async () => {
      const expenseCode = await generateUniqueExpenseCode();

      return await ProjectExpense.create({
        ...req.body,
        expenseCode,
        thekedarId: project.thekedarId,
        recordedBy: req.user._id,
      });
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
