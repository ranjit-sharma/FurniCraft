import { Router } from 'express';
import * as attendanceController from '../controllers/attendanceController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import {
  submitAttendanceSchema,
  approveAttendanceSchema,
  rectifyAttendanceSchema,
  rejectAttendanceSchema,
  requestCorrectionSchema,
  reviewCorrectionSchema,
  bulkApproveAttendanceSchema,
} from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(requireAuthentication);

router.post('/submit', validate(submitAttendanceSchema), attendanceController.submit);
router.get('/calendar', attendanceController.getMonthlyCalendar);
router.patch('/:attendanceId/approve', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(approveAttendanceSchema), attendanceController.approve);
router.patch('/:attendanceId/rectify', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(rectifyAttendanceSchema), attendanceController.rectify);
router.patch('/:attendanceId/reject', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(rejectAttendanceSchema), attendanceController.reject);
router.post('/:attendanceId/request-correction', validate(requestCorrectionSchema), attendanceController.requestCorrection);
router.patch('/:attendanceId/review-correction', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(reviewCorrectionSchema), attendanceController.reviewCorrection);
router.post('/bulk-approve', requireRole(ROLES.OWNER, ROLES.THEKEDAR), validate(bulkApproveAttendanceSchema), attendanceController.bulkApprove);

export default router;
