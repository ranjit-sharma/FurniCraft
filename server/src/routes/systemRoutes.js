import { Router } from 'express';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import { getDatabaseHealth } from '../config/db.js';

const router = Router();

// Protected: Only Owner/Admin can view database connection infrastructure
router.get('/db-health', requireAuthentication, requireRole(ROLES.OWNER), async (req, res, next) => {
  try {
    const health = await getDatabaseHealth();
    res.status(200).json({
      status: 'success',
      data: health,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
