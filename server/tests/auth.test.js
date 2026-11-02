import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/index.js';

const app = createApp();

describe('Authentication API Tests', () => {
  it('should authenticate valid user and set HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'thekedar.rajesh@furnicraft.com',
        password: 'Thekedar@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.role).toBe('THEKEDAR');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('furnicraft_token');
  });

  it('should reject invalid password with generic error message', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'thekedar.rajesh@furnicraft.com',
        password: 'WrongPassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should reject non-existent user with identical generic error message', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ghost@furnicraft.com',
        password: 'SomePassword123',
      });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should prevent suspended user from logging in', async () => {
    // Create a temporary suspended user
    const tempEmail = `suspended.${Date.now()}@furnicraft.com`;
    await User.create({
      name: 'Suspended Worker',
      email: tempEmail,
      phone: '9998887776',
      password: 'Password123',
      role: 'WORKER',
      status: 'SUSPENDED',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: tempEmail,
        password: 'Password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Account is suspended');
  });

  it('should successfully log out and clear cookie', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@furnicraft.com',
        password: 'FurniOwner@2026',
      });

    const token = loginRes.body.data.token;
    const cookies = loginRes.headers['set-cookie'];

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .set('Authorization', `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toContain('Logged out');
  });
});
