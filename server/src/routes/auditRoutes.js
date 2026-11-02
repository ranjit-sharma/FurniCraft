import { Router } from 'express';
import * as auditController from '../controllers/auditController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);
router.use(requireRole(ROLES.OWNER)); // Only OWNER can view organization audit logs

router.get('/', auditController.listAuditLogs);

export default router;
