import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'furnicraft_token';

export const signToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.isProduction, // True in production HTTPS
    sameSite: env.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
  };
};

export const clearCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'strict' : 'lax',
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
  };
};
