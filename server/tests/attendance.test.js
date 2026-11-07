import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Project, Attendance, User, WorkerProfile, WageAgreement } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Attendance & Calculation Engine API Tests', () => {
  const ts = Date.now();
  let workerToken, thekedarToken, project, workerUser, thekedarUser;
  const testThekedarEmail = `thekedar.att.${ts}@furnicraft.com`;
  const testWorkerEmail = `worker.att.${ts}@furnicraft.com`;

  beforeAll(async () => {
    thekedarUser = await User.create({
      name: 'Attendance Test Thekedar',
      email: testThekedarEmail,
      phone: `9${String(ts).slice(-9)}`,
      password: 'Thekedar@2026',
      role: 'THEKEDAR',
      status: 'ACTIVE',
    });
    thekedarToken = signToken({ id: thekedarUser._id, role: 'THEKEDAR' });

    workerUser = await User.create({
      name: 'Attendance Test Worker',
      email: testWorkerEmail,
      phone: `8${String(ts).slice(-9)}`,
      password: 'Worker@2026',
      role: 'WORKER',
      status: 'ACTIVE',
    });
    workerToken = signToken({ id: workerUser._id, role: 'WORKER' });

    await WorkerProfile.create({
      userId: workerUser._id,
      thekedarId: thekedarUser._id,
      workerCode: `WRK-ATT-${String(ts).slice(-4)}`,
      trade: 'Mistry',
      defaultDailyWage: 800,
      outstandingAdvanceBalance: 0,
      totalAdvancesDisbursed: 0,
    });

    project = await Project.create({
      name: 'Test Workshop Project',
      projectCode: `FURN-TEST-${String(ts).slice(-4)}`,
      thekedarId: thekedarUser._id,
      clientName: 'Test Client',
      siteAddress: 'Workshop Plot 4, Industrial Area',
      status: 'IN_PROGRESS',
      budget: 50000,
      startDate: new Date('2026-01-01'),
    });
  });

  afterAll(async () => {
    if (workerUser) {
      await Attendance.deleteMany({ workerId: workerUser._id });
      await WorkerProfile.deleteOne({ userId: workerUser._id });
      await User.deleteOne({ _id: workerUser._id });
    }
    if (thekedarUser) {
      await Project.deleteMany({ thekedarId: thekedarUser._id });
      await User.deleteOne({ _id: thekedarUser._id });
    }
  });

  it('should authenticate actors and enforce worker login block', async () => {
    const resW = await request(app).post('/api/v1/auth/login').send({
      email: testWorkerEmail,
      password: 'Worker@2026',
    });
    expect(resW.status).toBe(403);
    expect(resW.body.message).toContain('Worker login is disabled');

    const resT = await request(app).post('/api/v1/auth/login').send({
      email: testThekedarEmail,
      password: 'Thekedar@2026',
    });
    expect(resT.status).toBe(200);
    thekedarToken = resT.body.data.token;
  });

  it('RULE: P code computes 1.0x daily wage (₹800)', async () => {
    const testDate = '2026-10-25';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'P',
        checkInTime: '09:00',
        checkOutTime: '18:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(800);
    expect(res.body.data.attendance.wageMultiplier).toBe(1.0);
  });

  it('RULE: HALF code computes 0.5x daily wage (₹400)', async () => {
    const testDate = '2026-10-26';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'HALF',
        checkInTime: '09:00',
        checkOutTime: '13:30',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(400);
    expect(res.body.data.attendance.wageMultiplier).toBe(0.5);
  });

  it('RULE: P1/5 code computes 1.5x daily wage total (₹1200)', async () => {
    const testDate = '2026-10-27';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'P1/5',
        checkInTime: '09:00',
        checkOutTime: '21:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(1200);
    expect(res.body.data.attendance.wageMultiplier).toBe(1.5);
  });

  it('RULE: PP code computes 2.0x daily wage total (₹1600)', async () => {
    const testDate = '2026-10-28';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'PP',
        checkInTime: '09:00',
        checkOutTime: '00:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(1600);
    expect(res.body.data.attendance.wageMultiplier).toBe(2.0);
  });

  it('RULE: P2/5 or 2.5 shift computes 2.5x daily wage total (₹2000)', async () => {
    const testDate = '2026-10-29';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'P2/5',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(2000);
    expect(res.body.data.attendance.wageMultiplier).toBe(2.5);
    expect(res.body.data.attendance.code).toBe('P2/5');
  });

  it('RULE: PPP or 3 shift computes 3.0x daily wage total (₹2400)', async () => {
    const testDate = '2026-10-30';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: '3',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.attendance.calculatedEarnings).toBe(2400);
    expect(res.body.data.attendance.wageMultiplier).toBe(3.0);
    expect(res.body.data.attendance.code).toBe('PPP');
  });

  it('RULE: Re-marking attendance on same day by thekedar updates entry in-place', async () => {
    const testDate = '2026-10-28';
    const res = await request(app)
      .post('/api/v1/attendance/submit')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id,
        projectId: project._id.toString(),
        date: testDate,
        code: 'P',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(true);
  });
});
