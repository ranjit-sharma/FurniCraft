import { Router } from 'express';
import * as payrollController from '../controllers/payrollController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { finalizePayrollSchema, addPayrollAdjustmentSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/preview', requireRole(ROLES.OWNER, ROLES.THEKEDAR), payrollController.previewPayroll);
router.post('/finalize', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(finalizePayrollSchema), payrollController.finalizePayroll);
router.post('/adjustments', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(addPayrollAdjustmentSchema), payrollController.addAdjustment);
router.get('/', payrollController.listPayrolls);
router.get('/:payrollId', payrollController.getPayrollDetails);

export default router;
