import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, WorkerProfile, Project } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Authorization & RBAC API Tests', () => {
  const ts = Date.now();
  let workerToken, workerUser;
  let otherWorkerToken, otherWorkerUser;
  let thekedarToken, thekedarUser;
  let ownerToken, ownerUser;
  let ephemeralIds = [];

  beforeAll(async () => {
    // 1. Owner
    ownerUser = await User.findOne({ role: 'OWNER' });
    if (!ownerUser) {
      ownerUser = await User.create({
        name: 'Test Owner',
        email: `owner.auth.${ts}@furnicraft.com`,
        phone: `9${String(ts).slice(-9)}`,
        password: 'Password@2026',
        role: 'OWNER',
        status: 'ACTIVE',
      });
      ephemeralIds.push(ownerUser._id);
    }
    ownerToken = signToken({ id: ownerUser._id, role: 'OWNER' });

    // 2. Thekedar
    thekedarUser = await User.findOne({ role: 'THEKEDAR', status: 'ACTIVE' });
    if (!thekedarUser) {
      thekedarUser = await User.create({
        name: 'Test Thekedar',
        email: `thekedar.auth.${ts}@furnicraft.com`,
        phone: `8${String(ts).slice(-9)}`,
        password: 'Password@2026',
        role: 'THEKEDAR',
        status: 'ACTIVE',
      });
      ephemeralIds.push(thekedarUser._id);
    }
    thekedarToken = signToken({ id: thekedarUser._id, role: 'THEKEDAR' });

    // 3. Ephemeral Workers with known test credentials
    workerUser = await User.create({
      name: 'Auth Test Worker 1',
      email: `worker1.auth.${ts}@furnicraft.com`,
      phone: `7${String(ts).slice(-9)}`,
      password: 'Worker@2026',
      role: 'WORKER',
      status: 'ACTIVE',
    });
    ephemeralIds.push(workerUser._id);
    await WorkerProfile.create({
      userId: workerUser._id,
      thekedarId: thekedarUser._id,
      workerCode: `WRK-T1-${String(ts).slice(-4)}`,
      defaultDailyWage: 750,
    });

    otherWorkerUser = await User.create({
      name: 'Auth Test Worker 2',
      email: `worker2.auth.${ts}@furnicraft.com`,
      phone: `6${String(ts).slice(-9)}`,
      password: 'Worker@2026',
      role: 'WORKER',
      status: 'ACTIVE',
    });
    ephemeralIds.push(otherWorkerUser._id);
    await WorkerProfile.create({
      userId: otherWorkerUser._id,
      thekedarId: thekedarUser._id,
      workerCode: `WRK-T2-${String(ts).slice(-4)}`,
      defaultDailyWage: 800,
    });

    workerToken = signToken({ id: workerUser._id, role: 'WORKER' });
    otherWorkerToken = signToken({ id: otherWorkerUser._id, role: 'WORKER' });
  });

  afterAll(async () => {
    if (ephemeralIds.length > 0) {
      await WorkerProfile.deleteMany({ userId: { $in: ephemeralIds } });
      await User.deleteMany({ _id: { $in: ephemeralIds } });
    }
  });

  it('should authenticate test actors and enforce worker login block', async () => {
    // 1. Worker login must be rejected with 403 Forbidden
    const resW1 = await request(app).post('/api/v1/auth/login').send({
      email: workerUser.email,
      password: 'Worker@2026',
    });
    expect(resW1.status).toBe(403);
    expect(resW1.body.message).toContain('Worker login is disabled');

    // 2. Second Worker login must be rejected with 403 Forbidden
    const resW2 = await request(app).post('/api/v1/auth/login').send({
      email: otherWorkerUser.email,
      password: 'Worker@2026',
    });
    expect(resW2.status).toBe(403);

    expect(workerToken).toBeDefined();
    expect(otherWorkerToken).toBeDefined();
    expect(thekedarToken).toBeDefined();
    expect(ownerToken).toBeDefined();
  });

  it('MANDATORY RULE: Worker cannot access another worker ledger', async () => {
    const res = await request(app)
      .get(`/api/v1/finance/ledger/${otherWorkerUser._id}`)
      .set('Authorization', `Bearer ${workerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });

  it('MANDATORY RULE: Worker cannot alter their own wage rate', async () => {
    const res = await request(app)
      .put(`/api/v1/users/workers/${workerUser._id}/wage`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ dailyWageRate: 1500 });

    expect(res.status).toBe(403);
  });

  it('MANDATORY RULE: Worker cannot approve an advance request', async () => {
    const res = await request(app)
      .patch('/api/v1/finance/advance-requests/666000111222333444555666/review')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(403);
  });

  it('MANDATORY RULE: Ordinary user cannot view audit logs (Owner-only)', async () => {
    const resWorker = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(resWorker.status).toBe(403);

    const resThekedar = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${thekedarToken}`);
    expect(resThekedar.status).toBe(403);
  });

  it('MANDATORY RULE: Owner can view projects but cannot edit or create projects (Read-Only)', async () => {
    // 1. Owner can view project list
    const resList = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resList.status).toBe(200);
    expect(Array.isArray(resList.body.data.projects)).toBe(true);

    // 2. Owner CANNOT create a project
    const resCreate = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Unauthorized Owner Project',
        clientName: 'Test Client',
        siteAddress: '123 Site Road',
        projectType: 'MODULAR_KITCHEN',
      });
    expect(resCreate.status).toBe(403);
    expect(resCreate.body.message).toContain('Access forbidden');

    // 3. Owner CANNOT edit an existing project
    if (resList.body.data.projects.length > 0) {
      const projId = resList.body.data.projects[0]._id;
      const resEdit = await request(app)
        .put(`/api/v1/projects/${projId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Tampered Name' });
      expect(resEdit.status).toBe(403);
    }
  });

  it('MANDATORY RULE: Worker cannot access project money views or financial summaries', async () => {
    // 1. Worker listing projects should not contain totalMoneyReceived, paymentsCount, estimatedBudget, totalExpense
    const resList = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(resList.status).toBe(200);
    const projects = resList.body.data.projects;
    expect(Array.isArray(projects)).toBe(true);
    if (projects.length > 0) {
      const proj = projects[0];
      expect(proj.totalMoneyReceived).toBeUndefined();
      expect(proj.paymentsCount).toBeUndefined();
      expect(proj.estimatedBudget).toBeUndefined();
      expect(proj.totalExpense).toBeUndefined();

      // 2. Worker accessing single project dashboard details should have financialSummary stripped and moneyReceived empty
      const resDetail = await request(app)
        .get(`/api/v1/projects/${proj._id}`)
        .set('Authorization', `Bearer ${workerToken}`);
      expect(resDetail.status).toBe(200);
      expect(resDetail.body.data.financialSummary).toBeNull();
      expect(resDetail.body.data.moneyReceived).toEqual([]);
      expect(resDetail.body.data.project.estimatedBudget).toBeUndefined();

      // 3. Worker cannot access project money received endpoint (403 Forbidden)
      const resMoney = await request(app)
        .get(`/api/v1/projects/${proj._id}/money-received`)
        .set('Authorization', `Bearer ${workerToken}`);
      expect(resMoney.status).toBe(403);
      expect(resMoney.body.message).toContain('Access forbidden');
    }

    // 4. Worker cannot access all money received endpoint (403 Forbidden)
    const resAllMoney = await request(app)
      .get('/api/v1/projects/money-received/all')
      .set('Authorization', `Bearer ${workerToken}`);
    expect(resAllMoney.status).toBe(403);
    expect(resAllMoney.body.message).toContain('Access forbidden');
  });

  it('MANDATORY RULE: Worker can ONLY be deleted when net balance is exactly 0', async () => {
    // 1. Worker with outstanding advance balance (> 0) -> Delete must fail with 400 Bad Request
    const balanceEmail = `test.balance.${Date.now()}@furnicraft.com`;
    const resRegBal = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        name: 'Balance Worker',
        email: balanceEmail,
        phone: `9898${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Worker@2026',
        role: 'WORKER',
        defaultDailyWage: 800,
      });
    expect(resRegBal.status).toBe(201);
    const balWorkerId = resRegBal.body.data.user._id;
    await WorkerProfile.updateOne({ userId: balWorkerId }, { outstandingAdvanceBalance: 500 });

    const resFail = await request(app)
      .delete(`/api/v1/users/workers/${balWorkerId}`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(resFail.status).toBe(400);
    expect(resFail.body.message).toContain('Net balance must be exactly ₹0');

    // 2. Register a brand new worker with 0 earnings and 0 advance (Net Balance = 0)
    const uniqueEmail = `test.zero.${Date.now()}@furnicraft.com`;
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        name: 'Zero Balance Worker',
        email: uniqueEmail,
        phone: `9899${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Worker@2026',
        role: 'WORKER',
        defaultDailyWage: 800,
      });

    expect(resReg.status).toBe(201);
    const newWorkerId = resReg.body.data.user._id;

    // 3. Deleting worker with Net Balance = 0 must succeed
    const resDel = await request(app)
      .delete(`/api/v1/users/workers/${newWorkerId}`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(resDel.status).toBe(200);
    expect(resDel.body.message).toContain('deleted successfully');

    // Clean up balWorker
    await WorkerProfile.deleteOne({ userId: balWorkerId });
    await User.deleteOne({ _id: balWorkerId });
  });

  it('MANDATORY RULE: Owner can activate and suspend Thekedar accounts, and suspended Thekedars cannot log in', async () => {
    // Use dedicated ephemeral thekedar to preserve database state
    const tempThekedarEmail = `temp.thekedar.${Date.now()}@furnicraft.com`;
    const tempThekedar = await User.create({
      name: 'Temp Suspension Thekedar',
      email: tempThekedarEmail,
      phone: `9${String(Date.now()).slice(-9)}`,
      password: 'Thekedar@2026',
      role: 'THEKEDAR',
      status: 'ACTIVE',
    });

    // 1. Owner suspends Thekedar
    const resSuspend = await request(app)
      .patch(`/api/v1/users/thekedars/${tempThekedar._id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'SUSPENDED' });

    expect(resSuspend.status).toBe(200);
    expect(resSuspend.body.message).toContain('deactivated/suspended');
    expect(resSuspend.body.data.user.status).toBe('SUSPENDED');

    // 2. Suspended Thekedar attempts login -> Rejected with 401
    const resLoginBlocked = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: tempThekedarEmail,
        password: 'Thekedar@2026',
      });

    expect(resLoginBlocked.status).toBe(401);
    expect(resLoginBlocked.body.message).toContain('suspended');

    // 3. Owner reactivates Thekedar
    const resActivate = await request(app)
      .patch(`/api/v1/users/thekedars/${tempThekedar._id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'ACTIVE' });

    expect(resActivate.status).toBe(200);
    expect(resActivate.body.message).toContain('activated');
    expect(resActivate.body.data.user.status).toBe('ACTIVE');

    // 4. Activated Thekedar can log in again
    const resLoginSuccess = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: tempThekedarEmail,
        password: 'Thekedar@2026',
      });

    expect(resLoginSuccess.status).toBe(200);
    expect(resLoginSuccess.body.data.token).toBeDefined();

    // Clean up temp thekedar
    await User.deleteOne({ _id: tempThekedar._id });
  });

  it('MANDATORY RULE: Owner can ONLY manage Thekedar accounts (cannot alter Worker or Owner statuses)', async () => {
    // 1. Owner trying to suspend Worker -> 403 Forbidden
    const resWorker = await request(app)
      .patch(`/api/v1/users/${workerUser._id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'SUSPENDED' });

    expect(resWorker.status).toBe(403);
    expect(resWorker.body.message).toContain('Owner can only manage Thekedar accounts');

    // 2. Owner trying to suspend another Owner -> 403 Forbidden
    const resOwner = await request(app)
      .patch(`/api/v1/users/${ownerUser._id}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'SUSPENDED' });

    expect(resOwner.status).toBe(403);
    expect(resOwner.body.message).toContain('Owner can only manage Thekedar accounts');

    // 3. Thekedar or Worker trying to call status update on Thekedar -> 403 Forbidden
    const resThekedarUnauth = await request(app)
      .patch(`/api/v1/users/${thekedarUser._id}/status`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({ status: 'SUSPENDED' });

    expect(resThekedarUnauth.status).toBe(403);
  });

  it('MANDATORY RULE: Thekedar can activate and suspend Workers under their supervision', async () => {
    // Create dedicated ephemeral worker to test supervision suspend & activate
    const tempWorkerEmail = `temp.supervisor.wrk.${Date.now()}@furnicraft.com`;
    const tempWorker = await User.create({
      name: 'Supervised Worker',
      email: tempWorkerEmail,
      phone: `9${String(Date.now()).slice(-9)}`,
      password: 'Worker@2026',
      role: 'WORKER',
      assignedThekedar: thekedarUser._id,
      status: 'ACTIVE',
    });
    await WorkerProfile.create({
      userId: tempWorker._id,
      thekedarId: thekedarUser._id,
      workerCode: `WRK-SUP-${String(Date.now()).slice(-4)}`,
      defaultDailyWage: 700,
    });

    // 1. Thekedar suspends Worker
    const resSuspendWorker = await request(app)
      .patch(`/api/v1/users/workers/${tempWorker._id}/status`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({ status: 'SUSPENDED' });

    expect(resSuspendWorker.status).toBe(200);
    expect(resSuspendWorker.body.message).toContain('Worker account deactivated/suspended');
    expect(resSuspendWorker.body.data.user.status).toBe('SUSPENDED');

    // 2. Suspended worker cannot log in
    const resWorkerLoginBlocked = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: tempWorkerEmail,
        password: 'Worker@2026',
      });

    expect(resWorkerLoginBlocked.status).toBe(401);
    expect(resWorkerLoginBlocked.body.message).toContain('suspended');

    // 3. Thekedar reactivates Worker
    const resActivateWorker = await request(app)
      .patch(`/api/v1/users/workers/${tempWorker._id}/status`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({ status: 'ACTIVE' });

    expect(resActivateWorker.status).toBe(200);
    expect(resActivateWorker.body.message).toContain('Worker account activated');
    expect(resActivateWorker.body.data.user.status).toBe('ACTIVE');

    // 4. Worker login remains blocked even when active (workers are managed records)
    const resWorkerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: tempWorkerEmail,
        password: 'Worker@2026',
      });

    expect(resWorkerLogin.status).toBe(403);
    expect(resWorkerLogin.body.message).toContain('Worker login is disabled');

    // 5. Worker cannot change anyone's status
    const resWorkerUnauth = await request(app)
      .patch(`/api/v1/users/${tempWorker._id}/status`)
      .set('Authorization', `Bearer ${workerToken}`)
      .send({ status: 'SUSPENDED' });

    expect([401, 403]).toContain(resWorkerUnauth.status);

    // Clean up temp worker
    await WorkerProfile.deleteOne({ userId: tempWorker._id });
    await User.deleteOne({ _id: tempWorker._id });
  });

  it('allows Owner to fetch members overview successfully and verifies summary structure', async () => {
    const res = await request(app)
      .get('/api/v1/reports/members-overview')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.totalMembers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.visitsByRole).toBeDefined();
    expect(res.body.data.summary.visitsByRole.WORKER).toBe(0);
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });
});
