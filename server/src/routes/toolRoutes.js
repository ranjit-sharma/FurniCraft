import { Router } from 'express';
import * as toolController from '../controllers/toolController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createToolSchema,
  issueToolSchema,
  returnToolSchema,
  transferToolSchema,
  reportToolDamageSchema,
} from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', toolController.listTools);
router.post('/', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(createToolSchema), toolController.createTool);
router.post('/issue', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(issueToolSchema), toolController.issueTool);
router.patch('/issues/:issueId/acknowledge', toolController.acknowledgeReceipt);
router.post('/issues/:issueId/return', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(returnToolSchema), toolController.returnTool);
router.post('/issues/transfer', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(transferToolSchema), toolController.transferTool);
router.post('/:toolId/report-damage', validate(reportToolDamageSchema), toolController.reportDamage);
router.get('/issues', toolController.listToolIssues);

export default router;
