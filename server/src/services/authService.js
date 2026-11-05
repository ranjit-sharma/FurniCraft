import crypto from 'crypto';
import { User, WorkerProfile, RevokedToken, WageAgreement, OtpRecord } from '../models/index.js';
import { signToken, getCookieOptions, clearCookieOptions, COOKIE_NAME } from '../utils/jwt.js';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { recordAuditLog } from './auditService.js';
import { ROLES, USER_STATUS } from '../config/constants.js';
import { sendPasswordEmail, sendOtpEmail } from './emailService.js';
import { normalizePhone, findUserByIdentifier } from '../utils/phone.js';
import { sendOtpSms } from './smsService.js';
import { generateUniqueWorkerCode } from '../utils/codeGenerator.js';

export const loginUser = async ({ email, identifier, phone, password, req, res }) => {
  // Use generic error message to prevent account enumeration
  const invalidCredentialsMsg = 'Invalid email or password';
  const loginId = identifier || email || phone;

  if (!loginId) {
    throw new BadRequestError('Email address or mobile number is required');
  }

  const user = await findUserByIdentifier(loginId, { includePassword: true });
  if (!user) {
    throw new UnauthorizedError(invalidCredentialsMsg);
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw new UnauthorizedError('Account is suspended. Please contact administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError(invalidCredentialsMsg);
  }

  // Strict Rule: Workers cannot log in to the portal; all management is performed by Thekedars
  if (user.role === ROLES.WORKER) {
    throw new ForbiddenError('Worker login is disabled. Worker profiles and operations are managed directly by Thekedars.');
  }

  // Update last login and increment visit count
  user.lastLoginAt = new Date();
  user.visitCount = (user.visitCount || 0) + 1;
  await user.save();

  // Create JWT
  const token = signToken({
    id: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  // Set HTTP-only cookie
  if (res) {
    res.cookie(COOKIE_NAME, token, getCookieOptions());
  }

  // Record audit log
  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'USER_LOGIN',
    targetType: 'User',
    targetId: user._id,
  });

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      preferredLanguage: user.preferredLanguage || 'en',
    },
    token,
  };
};

export const registerUser = async ({ data, creatorUser, req }) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  // Assign thekedar if worker
  let assignedThekedar = null;
  if (data.role === ROLES.WORKER) {
    if (creatorUser && creatorUser.role === ROLES.THEKEDAR) {
      assignedThekedar = creatorUser._id;
    } else if (data.assignedThekedar) {
      assignedThekedar = data.assignedThekedar;
    }
  }

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    password: data.password,
    role: data.role,
    assignedThekedar,
    status: USER_STATUS.ACTIVE,
  });

  // If worker, create WorkerProfile and initial WageAgreement
  if (user.role === ROLES.WORKER) {
    try {
      const workerCode = await generateUniqueWorkerCode('FC-WRK');
      const defaultWage = data.defaultDailyWage || 700;

      await WorkerProfile.create({
        userId: user._id,
        thekedarId: assignedThekedar || creatorUser?._id || user._id,
        workerCode,
        defaultDailyWage: defaultWage,
      });

      await WageAgreement.create({
        workerId: user._id,
        thekedarId: assignedThekedar || creatorUser?._id || user._id,
        dailyWage: defaultWage,
        effectiveFrom: new Date(),
        createdBy: creatorUser?._id || user._id,
        notes: 'Initial standard wage agreement on registration',
      });
    } catch (workerErr) {
      await User.deleteOne({ _id: user._id }).catch(() => {});
      throw workerErr;
    }
  }

  await recordAuditLog({
    req,
    actorId: creatorUser?._id,
    actorName: creatorUser?.name,
    actorRole: creatorUser?.role,
    action: 'USER_REGISTERED',
    targetType: 'User',
    targetId: user._id,
    newValues: { name: user.name, email: user.email, role: user.role },
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferredLanguage || 'en',
  };
};

export const logoutUser = async ({ user, token, req, res }) => {
  if (token) {
    // Add token to RevokedToken table with 7 day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RevokedToken.create({
      token,
      userId: user?._id,
      reason: 'LOGOUT',
      expiresAt,
    });
  }

  if (res) {
    res.clearCookie(COOKIE_NAME, clearCookieOptions());
  }

  if (user) {
    await recordAuditLog({
      req,
      actorId: user._id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_LOGOUT',
      targetType: 'User',
      targetId: user._id,
    });
  }

  return { message: 'Logged out successfully' };
};

export const changePassword = async ({ userId, currentPassword, newPassword, req, res }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new NotFoundError('User not found');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new BadRequestError('Current password is incorrect');
  }

  user.password = newPassword;
  user.tokenVersion += 1; // Invalidate all prior sessions
  user.passwordChangedAt = new Date();
  await user.save();

  if (res) {
    res.clearCookie(COOKIE_NAME, clearCookieOptions());
  }

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_CHANGED',
    targetType: 'User',
    targetId: user._id,
  });

  return { message: 'Password changed successfully. Please log in again.' };
};

export const revokeUserSessions = async ({ userId, reason, req }) => {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  user.tokenVersion += 1;
  await user.save();

  await recordAuditLog({
    req,
    action: 'SESSIONS_REVOKED',
    targetType: 'User',
    targetId: user._id,
    reason,
  });

  return { message: `All active sessions for user ${user.name} have been revoked.` };
};

export const forgotPassword = async ({ email, req }) => {
  if (!email) {
    throw new BadRequestError('Email address is required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new NotFoundError('This email address is not registered with FurniCraft. Please provide a valid registered email address.');
  }

  // Generate a secure temporary password
  const randomPin = Math.floor(100000 + Math.random() * 900000);
  const tempPassword = `Furni#${randomPin}`;

  user.password = tempPassword;
  user.tokenVersion += 1;
  user.passwordChangedAt = new Date();
  await user.save();

  // Send the password directly to their email
  await sendPasswordEmail({
    to: user.email,
    name: user.name,
    newPassword: tempPassword,
  });

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_RESET_EMAILED',
    targetType: 'User',
    targetId: user._id,
  });

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    message: `Your password has been sent to ${user.email}. Please check your inbox.`,
    email: user.email,
    tempPassword: !isProduction ? tempPassword : undefined,
    devPassword: !isProduction ? tempPassword : undefined,
  };
};

export const resetPassword = async ({ email, tempPassword, newPassword, req, res }) => {
  if (!email || !tempPassword || !newPassword) {
    throw new BadRequestError('Email, temporary password, and new password are required');
  }
  if (newPassword.length < 6) {
    throw new BadRequestError('New password must be at least 6 characters');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    throw new NotFoundError('No account found with this email address');
  }

  const isMatch = await user.comparePassword(tempPassword);
  if (!isMatch) {
    throw new BadRequestError('Invalid temporary password. Please double check the temporary password or request a new one.');
  }

  user.password = newPassword;
  user.tokenVersion += 1; // Invalidate all prior sessions
  user.passwordChangedAt = new Date();
  await user.save();

  // Create JWT for immediate session login
  const token = signToken({
    id: user._id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  if (res) {
    res.cookie(COOKIE_NAME, token, getCookieOptions());
  }

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_RESET_COMPLETED',
    targetType: 'User',
    targetId: user._id,
  });

  return {
    message: 'Your permanent password has been set successfully! You are now logged in.',
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
    token,
  };
};

/**
 * Public Thekedar self-registration
 * Assigns THEKEDAR role strictly on backend; rejects worker or owner roles.
 */
export const registerThekedar = async ({ data, req }) => {
  const email = data.email.toLowerCase().trim();
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new ConflictError('An account with this email address already exists');
  }

  const normalizedPhone = normalizePhone(data.phone);
  const existingPhone = await User.findOne({
    $or: [
      { phone: data.phone.trim() },
      { phone: normalizedPhone },
    ],
  });
  if (existingPhone) {
    throw new ConflictError('An account with this mobile number already exists');
  }

  // If mobile OTP verification is enforced by configuration policy
  if (process.env.REQUIRE_REGISTRATION_OTP === 'true') {
    if (!data.otp) {
      throw new BadRequestError('Mobile verification OTP is required by registration policy');
    }
    const otpCandidateHash = crypto.createHash('sha256').update(data.otp.trim()).digest('hex');
    const otpRecord = await OtpRecord.findOne({
      phone: normalizedPhone,
      purpose: 'THEKEDAR_REGISTRATION',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).select('+otpHash');

    if (!otpRecord) {
      throw new BadRequestError('Registration OTP has expired or is invalid. Please request a new OTP.');
    }
    const isOtpValid = crypto.timingSafeEqual(
      Buffer.from(otpCandidateHash, 'hex'),
      Buffer.from(otpRecord.otpHash, 'hex')
    );
    if (!isOtpValid) {
      throw new BadRequestError('Invalid registration OTP code.');
    }
    otpRecord.isUsed = true;
    await otpRecord.save();
  }

  // ALWAYS strictly assign THEKEDAR role on backend; never accept from frontend
  const user = await User.create({
    name: data.name.trim(),
    email,
    phone: normalizedPhone,
    password: data.password,
    role: ROLES.THEKEDAR,
    status: USER_STATUS.ACTIVE,
  });

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'THEKEDAR_SELF_REGISTERED',
    targetType: 'User',
    targetId: user._id,
  });

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  };
};

/**
 * Dispatch registration OTP for mobile verification
 */
export const sendRegistrationOtp = async ({ phone }) => {
  const normalizedPhone = normalizePhone(phone);
  const existing = await User.findOne({
    $or: [{ phone: phone.trim() }, { phone: normalizedPhone }],
  });
  if (existing) {
    throw new ConflictError('An account with this mobile number already exists');
  }

  const existingOtp = await OtpRecord.findOne({
    phone: normalizedPhone,
    purpose: 'THEKEDAR_REGISTRATION',
    isUsed: false,
  });
  if (existingOtp && existingOtp.resendAfter > new Date()) {
    const waitSec = Math.ceil((existingOtp.resendAfter - Date.now()) / 1000);
    throw new BadRequestError(`Please wait ${waitSec} seconds before requesting a new OTP.`);
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  await OtpRecord.deleteMany({ phone: normalizedPhone, purpose: 'THEKEDAR_REGISTRATION' });
  await OtpRecord.create({
    phone: normalizedPhone,
    purpose: 'THEKEDAR_REGISTRATION',
    otpHash,
    attempts: 0,
    resendAfter: new Date(Date.now() + 60 * 1000),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const smsResult = await sendOtpSms({
    phone: normalizedPhone,
    otp,
    purpose: 'THEKEDAR_REGISTRATION',
    name: 'Thekedar Applicant',
  });

  return {
    status: 'success',
    message: 'Registration verification OTP sent via SMS.',
    devOtp: smsResult.devOtp,
  };
};

/**
 * Request password recovery OTP via registered email address
 * Security Rules:
 * - Never disclose if email exists (generic response)
 * - Owner/Admin accounts CANNOT be recovered via public OTP
 * - Enforces 60-second resend cooldown and 5-minute expiry
 * - Securely stores SHA-256 hash of OTP
 * - Sends 6-digit verification code to registered email address
 */
export const requestPasswordResetOtp = async ({ email, phone, req }) => {
  const genericResponse = {
    status: 'success',
    message: 'If an eligible account is registered with this email address, a 6-digit verification code has been sent. Please also check your Spam or Junk folder.',
  };

  const trimmedEmail = (email || '').trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    throw new BadRequestError('Password reset OTP can only be sent to a registered email address. Mobile numbers cannot receive reset OTPs.');
  }

  const user = await findUserByIdentifier(trimmedEmail);

  // If user is not found, warn the user to provide a valid registered email address
  if (!user) {
    const maskedEmail = trimmedEmail.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => a + '***' + c);
    console.warn(`[Auth - Password Reset Warning] Requested password reset for "${maskedEmail}", but user is NOT found in database.`);
    throw new NotFoundError('This email address is not registered with FurniCraft. Please provide a valid registered email address.');
  }

  // Account suspended check
  if (user.status === USER_STATUS.SUSPENDED) {
    throw new BadRequestError('This account is suspended. Please contact your contractor or administrator.');
  }

  // Security rule: Owner account CANNOT be recovered via public email OTP (protected administrative account)
  if (user.role !== ROLES.THEKEDAR && user.role !== ROLES.WORKER) {
    return genericResponse;
  }

  const userEmail = (user.email || trimmedEmail)?.toLowerCase()?.trim();
  if (!userEmail) {
    throw new BadRequestError('No email address registered for this account. Please contact your contractor or administrator.');
  }

  // Enforce 60-second resend cooldown
  const cooldownQuery = { email: userEmail, purpose: 'PASSWORD_RESET', isUsed: false };

  const existingOtp = await OtpRecord.findOne(cooldownQuery);
  if (existingOtp && existingOtp.resendAfter > new Date()) {
    const waitSec = Math.ceil((existingOtp.resendAfter - Date.now()) / 1000);
    throw new BadRequestError(`Please wait ${waitSec} seconds before requesting a new verification code.`);
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = String(crypto.randomInt(100000, 1000000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // Clear previous pending OTPs
  await OtpRecord.deleteMany({ email: userEmail, purpose: 'PASSWORD_RESET' });

  await OtpRecord.create({
    email: userEmail,
    purpose: 'PASSWORD_RESET',
    userId: user._id,
    otpHash,
    attempts: 0,
    resendAfter: new Date(Date.now() + 60 * 1000),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
  });

  let dispatchResult;
  try {
    dispatchResult = await sendOtpEmail({
      to: userEmail,
      otp,
      purpose: 'PASSWORD_RESET',
      name: user.name,
    });
  } catch (err) {
    // Nothing was delivered: drop the code so the 60s resend cooldown doesn't block an immediate retry.
    await OtpRecord.deleteMany({ userId: user._id, purpose: 'PASSWORD_RESET' });
    throw err;
  }

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_RESET_OTP_REQUESTED',
    targetType: 'User',
    targetId: user._id,
  });

  return {
    ...genericResponse,
    devOtp: (process.env.NODE_ENV !== 'production' ? dispatchResult?.devOtp : undefined),
  };
};

/**
 * Verify 6-digit OTP and issue single-use short-lived reset token
 * Security: Max 5 attempts, constant-time compare, OTP nullified after verification
 */
export const verifyPasswordResetOtp = async ({ email, otp, req }) => {
  if (!email || !otp) {
    throw new BadRequestError('Registered email address and 6-digit verification code are required');
  }

  const query = {
    email: email.toLowerCase().trim(),
    purpose: 'PASSWORD_RESET',
    isUsed: false,
    resetTokenHash: null,
  };

  const record = await OtpRecord.findOne(query).select('+otpHash');

  if (!record || record.expiresAt < new Date()) {
    throw new BadRequestError('Verification code has expired or is invalid. Please request a new code.');
  }

  // Attempt limit: 5 attempts
  if (record.attempts >= 5) {
    await OtpRecord.deleteOne({ _id: record._id });
    throw new BadRequestError('Maximum verification attempts exceeded. Please request a new verification code.');
  }

  record.attempts += 1;
  const candidateHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');

  if (!record.otpHash) {
    throw new BadRequestError('Verification code has already been used or is invalid. Please request a new code.');
  }

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(candidateHash, 'hex'),
    Buffer.from(record.otpHash, 'hex')
  );

  if (!isMatch) {
    await record.save();
    const remaining = 5 - record.attempts;
    throw new BadRequestError(`Invalid verification code. You have ${remaining} attempts remaining.`);
  }

  // Success: issue single-use reset token and nullify OTP hash to prevent reuse
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  record.otpHash = null; // Prevent OTP reuse!
  record.resetTokenHash = resetTokenHash;
  record.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  record.isVerified = true;
  await record.save();

  await recordAuditLog({
    req,
    actorId: record.userId,
    action: 'PASSWORD_RESET_OTP_VERIFIED',
    targetType: 'User',
    targetId: record.userId,
  });

  return {
    status: 'success',
    message: 'Verification code confirmed successfully. Please set your new password.',
    resetToken,
  };
};

/**
 * Reset password using single-use reset token
 * Security: Consumes token, increments user.tokenVersion (session invalidation), preserves role
 */
export const resetPasswordWithOtp = async ({ email, resetToken, newPassword, req }) => {
  if (!email || !resetToken || !newPassword) {
    throw new BadRequestError('Registered email address, reset token, and new password are required');
  }
  if (newPassword.length < 6) {
    throw new BadRequestError('New password must be at least 6 characters');
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');

  const query = {
    email: email.toLowerCase().trim(),
    purpose: 'PASSWORD_RESET',
    resetTokenHash: tokenHash,
    isUsed: false,
    resetTokenExpiresAt: { $gt: new Date() },
  };

  const record = await OtpRecord.findOne(query);

  if (!record) {
    throw new BadRequestError('Invalid or expired password reset token. Please restart password recovery.');
  }

  const user = await User.findById(record.userId).select('+password');
  if (!user) {
    throw new NotFoundError('User account not found');
  }

  // Enforce rule: Role MUST NOT change during password reset
  const preservedRole = user.role;

  // Save new password (pre-save hook hashes with bcrypt)
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all prior sessions
  user.passwordChangedAt = new Date();
  user.role = preservedRole;
  await user.save();

  // Consume reset token so it can NEVER be reused
  record.isUsed = true;
  record.resetTokenHash = null;
  await record.save();

  await recordAuditLog({
    req,
    actorId: user._id,
    actorName: user.name,
    actorRole: user.role,
    action: 'PASSWORD_RESET_OTP_COMPLETED',
    targetType: 'User',
    targetId: user._id,
  });

  return {
    status: 'success',
    message: 'Your password has been reset successfully. Please log in with your new password.',
  };
};

