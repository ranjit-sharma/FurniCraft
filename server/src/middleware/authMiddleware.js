import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { User, RevokedToken } from '../models/index.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { USER_STATUS } from '../config/constants.js';

export const requireAuthentication = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization: Bearer token header first, fallback to HTTP-only cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      token = req.cookies?.[COOKIE_NAME];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required: No session token provided');
    }

    // Check if token is in RevokedToken blacklist
    const isRevoked = await RevokedToken.findOne({ token });
    if (isRevoked) {
      throw new UnauthorizedError('Session has expired or was revoked. Please log in again.');
    }

    // Verify JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication session');
    }

    // Load active user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    // Validate account status
    if (user.status === USER_STATUS.SUSPENDED) {
      throw new ForbiddenError('Account is suspended. Please contact administrator.');
    }

    // Check token version to handle password changes or administrative session revocations
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      throw new UnauthorizedError('Session has been revoked due to a security update.');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${req.user.role}' is not authorized for this resource`
        )
      );
    }

    next();
  };
};
