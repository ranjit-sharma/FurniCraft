import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Project, Attendance, User, WorkerProfile, WageAgreement } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Attendance & Calculation Engine API Tests', () => {
  let workerToken, thekedarToken, project, workerUser;

  it('should authenticate actors and locate seed project', async () => {
    const resW = await request(app).post('/api/v1/auth/login').send({
      email: 'worker.ramesh@furnicraft.com',
      password: 'Worker@2026',
    });
    expect(resW.status).toBe(403);
    expect(resW.body.message).toContain('Worker login is disabled');

    workerUser = await User.findOne({ email: 'worker.ramesh@furnicraft.com' });
    workerToken = signToken({ id: workerUser._id, role: 'WORKER' });

    // Ensure worker's standard wage is set to 800 for consistent rule testing
    await WorkerProfile.updateOne(
      { userId: workerUser._id },
      { $set: { defaultDailyWage: 800 } }
    );
    await WageAgreement.updateMany(
      { workerId: workerUser._id },
      { $set: { dailyWage: 800 } }
    );

    const resT = await request(app).post('/api/v1/auth/login').send({
      email: 'thekedar.rajesh@furnicraft.com',
      password: 'Thekedar@2026',
    });
    thekedarToken = resT.body.data.token;

    const wp = await WorkerProfile.findOne({ userId: workerUser._id });
    project = await Project.findOne({ thekedarId: wp?.thekedarId });
    if (!project && wp) {
      project = await Project.create({
        name: 'Test Workshop Project',
        projectCode: `FURN-TEST-${Date.now().toString().slice(-4)}`,
        thekedarId: wp.thekedarId,
        clientName: 'Test Client',
        siteAddress: 'Workshop Plot 4, Industrial Area',
        status: 'IN_PROGRESS',
        budget: 50000,
        startDate: new Date('2026-01-01'),
      });
    }
    expect(project).toBeDefined();

  });

  it('RULE: P code computes 1.0x daily wage (₹800)', async () => {
    const testDate = '2026-10-25';
    // Clear any existing test record
    await Attendance.deleteMany({ workerId: workerUser._id, date: testDate });

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
    await Attendance.deleteMany({ workerId: workerUser._id, date: testDate });

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
    await Attendance.deleteMany({ workerId: workerUser._id, date: testDate });

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
    await Attendance.deleteMany({ workerId: workerUser._id, date: testDate });

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

  afterAll(async () => {
    if (workerUser) {
      await Attendance.deleteMany({
        workerId: workerUser._id,
        date: { $in: ['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28'] },
      });
    }
  });
});
