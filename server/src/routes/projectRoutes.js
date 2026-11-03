import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { authorizeProjectAccess } from '../middleware/resourceAuthMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createProjectSchema, updateProjectSchema, recordProjectMoneyReceivedSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', projectController.listProjects);
router.get('/money-received/all', requireRole(ROLES.OWNER, ROLES.THEKEDAR), projectController.listProjectMoneyReceived);
router.post('/', requireRole(ROLES.THEKEDAR), validate(createProjectSchema), projectController.createProject);
router.get('/:projectId', authorizeProjectAccess, projectController.getProjectDetails);
router.put('/:projectId', requireRole(ROLES.THEKEDAR), authorizeProjectAccess, validate(updateProjectSchema), projectController.updateProject);
router.get('/:projectId/money-received', requireRole(ROLES.OWNER, ROLES.THEKEDAR), authorizeProjectAccess, projectController.listProjectMoneyReceived);
router.post('/:projectId/money-received', requireRole(ROLES.THEKEDAR), authorizeProjectAccess, validate(recordProjectMoneyReceivedSchema), projectController.recordMoneyReceived);

export default router;
