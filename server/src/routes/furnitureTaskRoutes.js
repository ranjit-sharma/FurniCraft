import { Router } from 'express';
import * as furnitureTaskController from '../controllers/furnitureTaskController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createFurnitureTaskSchema, updateFurnitureTaskSchema } from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', furnitureTaskController.listTasks);
router.post('/', requireRole(ROLES.THEKEDAR), validate(createFurnitureTaskSchema), furnitureTaskController.createTask);
router.patch('/:taskId', validate(updateFurnitureTaskSchema), furnitureTaskController.updateTask);
router.patch('/:taskId/verify', requireRole(ROLES.THEKEDAR), furnitureTaskController.verifyTask);

export default router;
