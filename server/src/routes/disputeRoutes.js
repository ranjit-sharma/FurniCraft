import { Router } from 'express';
import * as disputeController from '../controllers/disputeController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createDisputeSchema, resolveDisputeSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', disputeController.listDisputes);
router.post('/', validate(createDisputeSchema), disputeController.createDispute);
router.patch('/:disputeId/resolve', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(resolveDisputeSchema), disputeController.resolveDispute);

export default router;
