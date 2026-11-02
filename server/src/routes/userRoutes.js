import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.get('/', requireRole(ROLES.OWNER, ROLES.THEKEDAR), userController.listUsers);
router.get('/thekedars', requireRole(ROLES.OWNER), userController.listThekedars);
router.get('/workers', requireRole(ROLES.OWNER, ROLES.THEKEDAR), userController.listWorkers);
router.get('/workers/:userId', userController.getWorkerProfile);
router.put('/workers/:targetUserId/wage', requireRole(ROLES.OWNER, ROLES.THEKEDAR), userController.updateWorkerWage);
router.delete('/workers/:userId', requireRole(ROLES.OWNER, ROLES.THEKEDAR), userController.deleteWorker);
router.patch('/thekedars/:userId/status', requireRole(ROLES.OWNER), userController.updateUserStatus);
router.patch('/workers/:userId/status', requireRole(ROLES.THEKEDAR), userController.updateUserStatus);
router.delete('/thekedars/:userId', requireRole(ROLES.OWNER), userController.deleteThekedar);
router.patch('/profile/language', userController.updateLanguagePreference);
router.patch('/:userId/status', requireRole(ROLES.OWNER, ROLES.THEKEDAR), userController.updateUserStatus);

export default router;
