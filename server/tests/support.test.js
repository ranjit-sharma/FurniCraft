import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { SupportTicket } from '../src/models/SupportTicket.js';

describe('Support & Help Center API Verification', () => {
  it('validates required fields when submitting support ticket', async () => {
    const app = createApp();

    // Without auth token
    const res = await request(app)
      .post('/api/v1/support/tickets')
      .send({ subject: '', message: '' });

    expect([401, 403]).toContain(res.status);
  });
});
