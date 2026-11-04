import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuthentication, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { authLimiter, loginLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  thekedarRegisterSchema,
  sendRegistrationOtpSchema,
  forgotPasswordOtpRequestSchema,
  verifyResetOtpSchema,
  resetPasswordWithOtpSchema,
} from '../validators/schemas.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Public routes with rate limiting
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// Public Thekedar Registration ONLY (never public Worker or Owner registration)
router.post('/register-thekedar', authLimiter, validate(thekedarRegisterSchema), authController.registerThekedar);
router.post('/send-registration-otp', otpLimiter, validate(sendRegistrationOtpSchema), authController.sendRegistrationOtp);

// OTP Password Reset (Thekedars & Workers only, 6-digit OTP, 5 min expiry, 60s cooldown, attempt limits)
router.post('/forgot-password-otp', otpLimiter, validate(forgotPasswordOtpRequestSchema), authController.requestPasswordResetOtp);
router.post('/verify-reset-otp', otpLimiter, validate(verifyResetOtpSchema), authController.verifyPasswordResetOtp);
router.post('/reset-password-otp', otpLimiter, validate(resetPasswordWithOtpSchema), authController.resetPasswordWithOtp);

// Legacy Email-based Recovery (Fallback / compatibility)
router.post('/forgot-password', otpLimiter, validate(resetPasswordRequestSchema), authController.forgotPassword);
router.post('/reset-password', otpLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Workforce Registration (Protected: Thekedars can only register Workers; Owners can register Thekedars/Workers)
router.post(
  '/register',
  authLimiter,
  requireAuthentication,
  (req, res, next) => {
    // Only Owner or Thekedar can register workforce users
    if (req.user.role === ROLES.WORKER) {
      return res.status(403).json({ status: 'fail', message: 'Workers cannot register new users' });
    }
    // Thekedar can only register WORKER
    if (req.user.role === ROLES.THEKEDAR && req.body.role !== ROLES.WORKER) {
      return res.status(403).json({ status: 'fail', message: 'Thekedars can only register Workers' });
    }
    // Owner cannot create another Owner through workforce registration
    if (req.user.role === ROLES.OWNER && req.body.role === ROLES.OWNER) {
      return res.status(403).json({ status: 'fail', message: 'Owner accounts must be provisioned through secure configuration' });
    }
    next();
  },
  validate(registerSchema),
  authController.register
);

// Protected routes
router.use(requireAuthentication);
router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);
router.post('/revoke-sessions/:userId', requireRole(ROLES.OWNER), authController.revokeSessions);

export default router;
