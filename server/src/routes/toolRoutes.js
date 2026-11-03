import { Router } from 'express';
import * as toolController from '../controllers/toolController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  createToolSchema,
  updateToolSchema,
  issueToolSchema,
  returnToolSchema,
  transferToolSchema,
  reportToolDamageSchema,
  reportMissingToolSchema,
  resolveMissingToolSchema,
  resolveDamageToolSchema,
} from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

// Stats & List
router.get('/stats', toolController.getToolStats);
router.get('/issues', toolController.listToolIssues);
router.get('/', toolController.listTools);

// Registration & Management
router.post('/', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(createToolSchema), toolController.createTool);
router.get('/:toolId', toolController.getToolById);
router.put('/:toolId', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(updateToolSchema), toolController.updateTool);

// Operations: Issue
router.post('/issue', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(issueToolSchema), toolController.issueTool);
router.post('/:toolId/issue', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(issueToolSchema), toolController.issueTool);

// Operations: Transfer
router.post('/issues/transfer', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(transferToolSchema), toolController.transferTool);
router.post('/:toolId/transfer', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(transferToolSchema), toolController.transferTool);

// Operations: Return
router.post('/issues/:issueId/return', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(returnToolSchema), toolController.returnTool);
router.post('/:toolId/return', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(returnToolSchema), toolController.returnTool);

// Operations: Missing
router.post('/:toolId/report-missing', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(reportMissingToolSchema), toolController.reportMissing);
router.patch('/:toolId/resolve-missing', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(resolveMissingToolSchema), toolController.resolveMissing);

// Operations: Damage
router.post('/:toolId/report-damage', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(reportToolDamageSchema), toolController.reportDamage);
router.patch('/:toolId/resolve-damage', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(resolveDamageToolSchema), toolController.resolveDamage);

// Worker Acknowledgment
router.patch('/issues/:issueId/acknowledge', toolController.acknowledgeReceipt);

export default router;
