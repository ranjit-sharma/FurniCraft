import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/dashboard', reportController.getDashboardMetrics);
router.get('/members-overview', requireRole(ROLES.OWNER), reportController.getMembersOverview);
router.post('/track-visit', reportController.trackAppVisit);
router.get('/export/attendance', reportController.exportAttendance);
router.get('/export/salary/:payrollId', reportController.exportSalaryStatement);

export default router;
