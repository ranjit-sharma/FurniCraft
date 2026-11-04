import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, PushSubscription } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Attendance Alarm & Mobile Push Notification API Tests', () => {
  let thekedarUser, thekedarToken;
  const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-thekedar-device-' + Date.now();

  it('RULE: VAPID public key is exposed publicly for browser PushManager registration', async () => {
    const res = await request(app).get('/api/v1/notifications/vapid-public-key');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.publicKey).toBeDefined();
    expect(typeof res.body.data.publicKey).toBe('string');
  });

  it('RULE: Thekedar can register mobile push subscription with customized alarm time and ring settings', async () => {
    thekedarUser = await User.findOne({ email: 'thekedar.rajesh@furnicraft.com' });
    expect(thekedarUser).toBeDefined();
    thekedarToken = signToken({ id: thekedarUser._id, role: 'THEKEDAR' });

    const res = await request(app)
      .post('/api/v1/notifications/push-subscription')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        endpoint: testEndpoint,
        keys: {
          p256dh: 'BN4aYgiIKCZLtbu3hJOGP-test-p256dh-key',
          auth: 'auth-secret-test-key-2026',
        },
        alarmEnabled: true,
        alarmTime: '10:15',
        alarmSound: true,
        ringDuration: 30,
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.subscription).toBeDefined();
    expect(res.body.data.subscription.alarmTime).toBe('10:15');
    expect(res.body.data.subscription.ringDuration).toBe(30);

    // Verify record in database
    const subRecord = await PushSubscription.findOne({ endpoint: testEndpoint });
    expect(subRecord).toBeDefined();
    expect(subRecord.userId.toString()).toBe(thekedarUser._id.toString());
  });

  it('RULE: Thekedar can query and update customized alarm preferences', async () => {
    // 1. Get settings
    const getRes = await request(app)
      .get('/api/v1/notifications/alarm-settings')
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.alarmTime).toBe('10:15');
    expect(getRes.body.data.hasActiveSubscription).toBe(true);

    // 2. Update settings to custom 08:45 and 60 seconds ring
    const patchRes = await request(app)
      .patch('/api/v1/notifications/alarm-settings')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        alarmTime: '08:45',
        ringDuration: 60,
        alarmSound: true,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.alarmTime).toBe('08:45');
    expect(patchRes.body.data.ringDuration).toBe(60);

    // Verify updated in DB
    const updated = await PushSubscription.findOne({ endpoint: testEndpoint });
    expect(updated.alarmTime).toBe('08:45');
    expect(updated.ringDuration).toBe(60);
  });

  it('RULE: Thekedar can unsubscribe device endpoint cleanly', async () => {
    const unsubRes = await request(app)
      .delete('/api/v1/notifications/push-subscription')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({ endpoint: testEndpoint });

    expect(unsubRes.status).toBe(200);
    expect(unsubRes.body.message).toContain('removed successfully');

    const check = await PushSubscription.findOne({ endpoint: testEndpoint });
    expect(check).toBeNull();
  });
});
