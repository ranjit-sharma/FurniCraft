import { env } from '../config/env.js';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong on our side. Please try again.';
const DB_UNAVAILABLE_MESSAGE = 'The service is temporarily unavailable. Please try again in a moment.';

const isDatabaseUnavailable = (err) =>
  ['MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(err.name) ||
  /buffering timed out/i.test(err.message || '');

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || GENERIC_ERROR_MESSAGE;
  let details = err.details || null;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'The requested record could not be found. Please check the link and try again.';
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `A record with this ${field} already exists.` : 'This record already exists.';
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 422;
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = `Please check the entered details (${details.map((d) => `${d.field}: ${d.message}`).join('; ')})`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  }

  // Body parser errors (malformed JSON / oversized payload)
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'The submitted data could not be read. Please try again.';
  }
  if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'The submitted data is too large.';
  }

  if (isDatabaseUnavailable(err)) {
    statusCode = 503;
    message = DB_UNAVAILABLE_MESSAGE;
  }

  // Unexpected (programming / infrastructure) errors: log everything, show the user nothing internal.
  const isUnexpected = statusCode >= 500 && !err.isOperational && statusCode !== 503;
  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl} -> ${statusCode}:`, err);
  }
  if (isUnexpected) {
    message = GENERIC_ERROR_MESSAGE;
  }

  const response = {
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    message,
  };

  if (details) {
    response.details = details;
  }

  if (!env.isProduction && statusCode >= 500) {
    response.debug = { message: err.message, stack: err.stack };
  }

  res.status(statusCode).json(response);
};
