import * as authService from '../services/authService.js';
import { ForbiddenError } from '../utils/errors.js';

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser({
      email: req.body.email,
      identifier: req.body.identifier,
      phone: req.body.phone,
      password: req.body.password,
      req,
      res,
    });
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser({
      data: req.body,
      creatorUser: req.user,
      req,
    });
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const result = await authService.logoutUser({
      user: req.user,
      token: req.token,
      req,
      res,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    if (req.user.role === 'WORKER') {
      throw new ForbiddenError('Worker accounts are managed entities and cannot access the application.');
    }
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          status: req.user.status,
          assignedThekedar: req.user.assignedThekedar,
          preferredLanguage: req.user.preferredLanguage || 'en',
          businessName: req.user.businessName || '',
          thekedarCode: req.user.thekedarCode || '',
          logoUrl: req.user.logoUrl || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword({
      userId: req.user._id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
      req,
      res,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSessions = async (req, res, next) => {
  try {
    const result = await authService.revokeUserSessions({
      userId: req.params.userId,
      reason: req.body.reason || 'Admin session revocation',
      req,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword({
      email: req.body.email,
      req,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword({
      email: req.body.email,
      tempPassword: req.body.tempPassword,
      newPassword: req.body.newPassword,
      req,
      res,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const registerThekedar = async (req, res, next) => {
  try {
    const result = await authService.registerThekedar({
      data: req.body,
      req,
    });
    res.status(201).json({
      status: 'success',
      message: 'Thekedar account registered successfully. Please sign in.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const sendRegistrationOtp = async (req, res, next) => {
  try {
    const result = await authService.sendRegistrationOtp({
      phone: req.body.phone,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const requestPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.requestPasswordResetOtp({
      email: req.body.email,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyPasswordResetOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyPasswordResetOtp({
      email: req.body.email,
      otp: req.body.otp,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPasswordWithOtp = async (req, res, next) => {
  try {
    const result = await authService.resetPasswordWithOtp({
      email: req.body.email,
      resetToken: req.body.resetToken,
      newPassword: req.body.newPassword,
      req,
    });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const inviteThekedar = async (req, res, next) => {
  try {
    const result = await authService.inviteThekedar({
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      customMessage: req.body.customMessage,
      inviter: req.user,
      req,
    });
    res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

