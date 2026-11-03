import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler, GENERIC_ERROR_MESSAGE } from '../src/middleware/errorHandler.js';
import { NotFoundError } from '../src/utils/errors.js';

// Tiny app that throws a given error so we can see what the user receives.
const appThrowing = (makeError) => {
  const app = express();
  app.use(express.json());
  app.post('/boom', () => {
    throw makeError();
  });
  app.use(errorHandler);
  return app;
};

describe('errorHandler user-facing messages', () => {
  it('keeps the message of operational (AppError) errors', async () => {
    const res = await request(appThrowing(() => new NotFoundError('Worker not found'))).post('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 'fail', message: 'Worker not found' });
  });

  it('hides internal details of unexpected errors behind a friendly message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appThrowing(() => new TypeError("Cannot read properties of undefined (reading 'x')"))).post('/boom');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(res.body.message).not.toMatch(/undefined/);
  });

  it('reports a database outage as 503', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = Object.assign(new Error('Operation `users.findOne()` buffering timed out after 10000ms'), { name: 'MongooseError' });
    const res = await request(appThrowing(() => err)).post('/boom');
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/temporarily unavailable/i);
  });

  it('turns malformed JSON into a readable 400', async () => {
    const res = await request(appThrowing(() => new Error('unreachable')))
      .post('/boom')
      .set('Content-Type', 'application/json')
      .send('{"amount": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('The submitted data could not be read. Please try again.');
  });

  it('turns an invalid record id into a friendly 400', async () => {
    const err = Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError', path: '_id' });
    const res = await request(appThrowing(() => err)).post('/boom');
    expect(res.status).toBe(400);
    expect(res.body.message).not.toMatch(/ObjectId|_id/);
  });
});
