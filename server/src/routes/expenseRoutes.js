import { Router } from 'express';
import * as expenseController from '../controllers/expenseController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createExpenseSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', expenseController.listExpenses);
router.post('/', requireRole(ROLES.THEKEDAR), validate(createExpenseSchema), expenseController.createExpense);

export default router;
