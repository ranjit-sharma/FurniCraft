import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { User, OtpRecord } from '../src/models/index.js';

const app = createApp();

describe('Final Authentication Rules — FurniCraft ERP Tests', () => {
  const timestamp = Date.now();
  const testThekedarPhone = `9822${String(timestamp).slice(-6)}`;
  const testThekedarEmail = `thekedar.${timestamp}@furnicraft.com`;
  const testPassword = 'ThekedarSecure@2026';
  let createdThekedarId;

  // ----------------------------------------------------
  // RULE 1 & 2: THEKEDAR REGISTRATION ONLY & PUBLIC RESTRICTIONS
  // ----------------------------------------------------
  describe('Rule 1 & 2: Public Registration & Role Isolation', () => {
    it('MANDATORY RULE: Public /register endpoint requires authentication (workers/owners cannot register publicly)', async () => {
      const resWorker = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Unauthorized Worker',
          email: `worker.unauth.${timestamp}@furnicraft.com`,
          phone: '9877001122',
          password: 'WorkerPass@2026',
          role: 'WORKER',
        });

      // Must be 401 Unauthorized or 403 Forbidden without credentials
      expect([401, 403]).toContain(resWorker.status);

      const resOwner = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Unauthorized Owner',
          email: `owner.unauth.${timestamp}@furnicraft.com`,
          phone: '9877003344',
          password: 'OwnerPass@2026',
          role: 'OWNER',
        });

      expect([401, 403]).toContain(resOwner.status);
    });

    it('MANDATORY RULE: Register as Thekedar allows public creation and strictly enforces THEKEDAR role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-thekedar')
        .send({
          name: 'Shyam Contractor',
          email: testThekedarEmail,
          phone: testThekedarPhone,
          password: testPassword,
          role: 'OWNER', // Attempting privilege escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.role).toBe('THEKEDAR'); // MUST be THEKEDAR, ignoring 'OWNER'
      expect(res.body.data.user.email).toBe(testThekedarEmail.toLowerCase());

      createdThekedarId = res.body.data.user._id;

      // Verify in DB that role is strictly THEKEDAR
      const dbUser = await User.findById(createdThekedarId);
      expect(dbUser.role).toBe('THEKEDAR');
    });

    it('MANDATORY RULE: Prevent duplicate account with same email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-thekedar')
        .send({
          name: 'Duplicate Email Thekedar',
          email: testThekedarEmail,
          phone: '9988776655',
          password: 'OtherPassword@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('email');
    });

    it('MANDATORY RULE: Prevent duplicate account with same mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-thekedar')
        .send({
          name: 'Duplicate Phone Thekedar',
          email: `different.${Date.now()}@furnicraft.com`,
          phone: testThekedarPhone,
          password: 'OtherPassword@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('mobile number');
    });
  });

  // ----------------------------------------------------
  // RULE 3 & 4: LOGIN WITH EMAIL OR MOBILE NUMBER
  // ----------------------------------------------------
  describe('Rule 3 & 4: Login with Email or Mobile Number', () => {
    it('should authenticate user using email address', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testThekedarEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.role).toBe('THEKEDAR');
      expect(res.body.data.token).toBeDefined();
    });

    it('should authenticate user using mobile number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testThekedarPhone,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.role).toBe('THEKEDAR');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid password with generic message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testThekedarPhone,
          password: 'WrongPassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should reject non-existent user with generic message to prevent account enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: '9999999999',
          password: 'SomePassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  // ----------------------------------------------------
  // RULE 5: EMAIL OTP PASSWORD RESET LIFECYCLE
  // ----------------------------------------------------
  describe('Rule 5: Email OTP Password Reset Lifecycle', () => {
    let devGeneratedOtp;
    let singleUseResetToken;
    const newResetPassword = 'BrandNewPassword@2026';

    it('MANDATORY RULE: Unregistered email returns warning to provide a valid registered email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password-otp')
        .send({ email: 'nonexistent.user.9999@furnicraft.com' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not registered');
      expect(res.body.message).toContain('valid registered email');
    });

    it('MANDATORY RULE: Owner account CANNOT be recovered via public email OTP (protected)', async () => {
      const owner = await User.findOne({ role: 'OWNER' });
      if (owner && owner.email) {
        await OtpRecord.deleteMany({ userId: owner._id, purpose: 'PASSWORD_RESET' });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password-otp')
          .send({ email: owner.email });

        // Must return generic message without dispatching OTP or creating OtpRecord
        expect(res.status).toBe(200);
        expect(res.body.message).toContain('If an eligible account is registered');

        const otpCheck = await OtpRecord.findOne({ userId: owner._id, purpose: 'PASSWORD_RESET' });
        expect(otpCheck).toBeNull();
      }
    });

    it('MANDATORY RULE: Eligible Thekedar/Worker receives 6-digit OTP to email and plain OTP is NOT stored', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password-otp')
        .send({ email: testThekedarEmail });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If an eligible account is registered');

      // devOtp is surfaced only in test/dev environment for deterministic verification
      devGeneratedOtp = res.body.devOtp;
      expect(devGeneratedOtp).toMatch(/^\d{6}$/);

      // Verify DB storage: OtpRecord must exist with SHA-256 hash, NOT plain OTP
      const otpRecord = await OtpRecord.findOne({
        email: testThekedarEmail.toLowerCase(),
        purpose: 'PASSWORD_RESET',
      }).select('+otpHash');

      expect(otpRecord).toBeDefined();
      expect(otpRecord.otpHash).toBeDefined();
      expect(otpRecord.otpHash).not.toBe(devGeneratedOtp); // Must be securely hashed!
      expect(otpRecord.otpHash.length).toBe(64); // SHA-256 hex string length

      // Verify hash equivalence
      const expectedHash = crypto.createHash('sha256').update(devGeneratedOtp).digest('hex');
      expect(otpRecord.otpHash).toBe(expectedHash);
    });

    it('MANDATORY RULE: Enforce resend cooldown (submitting before 60s is rejected)', async () => {
      const resCooldown = await request(app)
        .post('/api/v1/auth/forgot-password-otp')
        .send({ email: testThekedarEmail });

      expect(resCooldown.status).toBe(400);
      expect(resCooldown.body.message).toContain('wait');
    });

    it('MANDATORY RULE: Incorrect OTP decrements remaining attempts and rejects', async () => {
      const resWrong = await request(app)
        .post('/api/v1/auth/verify-reset-otp')
        .send({
          email: testThekedarEmail,
          otp: '000000',
        });

      expect(resWrong.status).toBe(400);
      expect(resWrong.body.message).toContain('Invalid verification code');
      expect(resWrong.body.message).toContain('attempts remaining');

      const otpRecord = await OtpRecord.findOne({
        email: testThekedarEmail.toLowerCase(),
        purpose: 'PASSWORD_RESET',
      });
      expect(otpRecord.attempts).toBe(1);
    });

    it('MANDATORY RULE: Valid OTP issues single-use reset token and nullifies OTP hash to prevent OTP reuse', async () => {
      const resValid = await request(app)
        .post('/api/v1/auth/verify-reset-otp')
        .send({
          email: testThekedarEmail,
          otp: devGeneratedOtp,
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.status).toBe('success');
      expect(resValid.body.resetToken).toBeDefined();

      singleUseResetToken = resValid.body.resetToken;

      // Verify in DB that otpHash is now null (cannot be verified again)
      const otpRecord = await OtpRecord.findOne({
        email: testThekedarEmail.toLowerCase(),
        purpose: 'PASSWORD_RESET',
      }).select('+otpHash +resetTokenHash');

      expect(otpRecord.otpHash).toBeNull();
      expect(otpRecord.resetTokenHash).toBeDefined();
      expect(otpRecord.resetTokenHash.length).toBe(64);
    });

    it('MANDATORY RULE: Re-verifying the same OTP fails (prevent OTP reuse)', async () => {
      const resReverify = await request(app)
        .post('/api/v1/auth/verify-reset-otp')
        .send({
          email: testThekedarEmail,
          otp: devGeneratedOtp,
        });

      expect(resReverify.status).toBe(400);
    });

    it('MANDATORY RULE: Resetting password with invalid/tampered token fails', async () => {
      const resTampered = await request(app)
        .post('/api/v1/auth/reset-password-otp')
        .send({
          email: testThekedarEmail,
          resetToken: 'tampered-or-expired-token-1234567890',
          newPassword: newResetPassword,
        });

      expect(resTampered.status).toBe(400);
      expect(resTampered.body.message).toContain('Invalid or expired');
    });

    it('MANDATORY RULE: Resetting password with valid token updates password, revokes sessions, and preserves role', async () => {
      const userBefore = await User.findById(createdThekedarId);
      const tokenVersionBefore = userBefore.tokenVersion || 0;

      const resReset = await request(app)
        .post('/api/v1/auth/reset-password-otp')
        .send({
          email: testThekedarEmail,
          resetToken: singleUseResetToken,
          newPassword: newResetPassword,
        });

      expect(resReset.status).toBe(200);
      expect(resReset.body.status).toBe('success');
      expect(resReset.body.message).toContain('reset successfully');

      // Verify user in DB
      const userAfter = await User.findById(createdThekedarId).select('+password');
      expect(userAfter.role).toBe('THEKEDAR'); // Role MUST remain THEKEDAR
      expect(userAfter.tokenVersion).toBeGreaterThan(tokenVersionBefore); // Session revocation

      // Password must be changed
      const isNewMatch = await userAfter.comparePassword(newResetPassword);
      expect(isNewMatch).toBe(true);

      const isOldMatch = await userAfter.comparePassword(testPassword);
      expect(isOldMatch).toBe(false);
    });

    it('MANDATORY RULE: Reusing the same reset token is prevented (single-use token)', async () => {
      const resReuse = await request(app)
        .post('/api/v1/auth/reset-password-otp')
        .send({
          email: testThekedarEmail,
          resetToken: singleUseResetToken,
          newPassword: 'AnotherPassword@2026',
        });

      expect(resReuse.status).toBe(400);
      expect(resReuse.body.message).toContain('Invalid or expired');
    });

    it('should successfully log in with new password and fail with old password', async () => {
      // 1. Old password fails
      const resOld = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testThekedarEmail,
          password: testPassword,
        });
      expect(resOld.status).toBe(401);

      // 2. New password succeeds
      const resNew = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testThekedarEmail,
          password: newResetPassword,
        });
      expect(resNew.status).toBe(200);
      expect(resNew.body.data.user.role).toBe('THEKEDAR');
    });
  });

  afterAll(async () => {
    // Clean up test user & OTP records
    if (createdThekedarId) {
      await User.findByIdAndDelete(createdThekedarId);
    }
    await OtpRecord.deleteMany({
      $or: [
        { email: testThekedarEmail.toLowerCase() },
        { phone: { $regex: testThekedarPhone } },
      ],
    });
  }, 60000);
});
