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
  // If COOKIE_DOMAIN is 'localhost' or contains '127.0.0.1', omit domain so browser handles host-only cookie
  const rawDomain = env.COOKIE_DOMAIN;
  const domain = (rawDomain && rawDomain !== 'localhost' && !rawDomain.includes('127.0.0.1')) ? rawDomain : undefined;

  // For cross-origin production clients, 'none' with secure:true is required; otherwise 'lax' allows refresh & new tabs
  const isProd = env.isProduction;
  const isCrossOrigin = isProd && env.CLIENT_URL && !env.CLIENT_URL.includes('onrender.com');

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
    domain,
  };
};

export const clearCookieOptions = () => {
  const rawDomain = env.COOKIE_DOMAIN;
  const domain = (rawDomain && rawDomain !== 'localhost' && !rawDomain.includes('127.0.0.1')) ? rawDomain : undefined;
  const isProd = env.isProduction;
  const isCrossOrigin = isProd && env.CLIENT_URL && !env.CLIENT_URL.includes('onrender.com');

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    path: '/',
    domain,
  };
};
