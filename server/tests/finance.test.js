import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User, WorkerProfile, Payroll, AdvanceRequest, FinancialTransaction, Attendance } from '../src/models/index.js';
import { signToken } from '../src/utils/jwt.js';

const app = createApp();

describe('Finance, Ledger & Immutable Payroll API Tests', () => {
  let workerToken, thekedarToken, workerUser, thekedarUser;
  let initialWorkerAdvanceBalance = 0;
  const createdAdvanceIds = [];

  it('should authenticate actors and enforce worker login block', async () => {
    const resW = await request(app).post('/api/v1/auth/login').send({
      email: 'worker.ramesh@furnicraft.com',
      password: 'Worker@2026',
    });
    expect(resW.status).toBe(403);
    expect(resW.body.message).toContain('Worker login is disabled');

    workerUser = await User.findOne({ email: 'worker.ramesh@furnicraft.com' });
    workerToken = signToken({ id: workerUser._id, role: 'WORKER' });

    const resT = await request(app).post('/api/v1/auth/login').send({
      email: 'thekedar.rajesh@furnicraft.com',
      password: 'Thekedar@2026',
    });
    thekedarToken = resT.body.data.token;
    thekedarUser = resT.body.data.user;

    const currentProfile = await WorkerProfile.findOne({ userId: workerUser._id });
    initialWorkerAdvanceBalance = currentProfile?.outstandingAdvanceBalance || 0;

    // Reset worker advance balance so cumulative test runs don't exceed MAX_ADVANCE_LIMIT
    await WorkerProfile.updateOne({ userId: workerUser._id }, { outstandingAdvanceBalance: 0 });
  });

  it('RULE: Advance request does not disburse until actual payment is recorded', async () => {
    // 1. Worker submits advance request
    const reqRes = await request(app)
      .post('/api/v1/finance/advance-requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        amount: 1000,
        reason: '[TEST] Automated Vitest Advance Verification',
      });

    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data.advanceRequest._id;
    createdAdvanceIds.push(requestId);
    expect(reqRes.body.data.advanceRequest.status).toBe('PENDING');

    // 2. Thekedar approves the request
    const reviewRes = await request(app)
      .patch(`/api/v1/finance/advance-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({ status: 'APPROVED' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.advanceRequest.status).toBe('APPROVED');

    // Worker profile outstanding balance should NOT have increased yet!
    const profileBefore = await WorkerProfile.findOne({ userId: workerUser._id });
    const balBefore = profileBefore.outstandingAdvanceBalance;

    // 3. Thekedar records actual disbursement
    const disbRes = await request(app)
      .post(`/api/v1/finance/advance-requests/${requestId}/disburse`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        paymentMethod: 'UPI',
        receiptReference: 'TEST-UPI-UTR-999',
      });

    expect(disbRes.status).toBe(201);

    // Now worker outstanding advance balance MUST have increased by 1000
    const profileAfter = await WorkerProfile.findOne({ userId: workerUser._id });
    expect(profileAfter.outstandingAdvanceBalance).toBe(balBefore + 1000);
  });

  it('RULE: Cannot duplicate finalization for same worker and period', async () => {
    // Ensure payroll for period is finalized first
    const existing = await Payroll.findOne({ workerId: workerUser._id, periodMonth: 9, periodYear: 2026 });
    if (!existing) {
      await request(app)
        .post('/api/v1/payroll/finalize')
        .set('Authorization', `Bearer ${thekedarToken}`)
        .send({
          workerId: workerUser._id.toString(),
          periodMonth: 9,
          periodYear: 2026,
        });
    }

    const res = await request(app)
      .post('/api/v1/payroll/finalize')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        workerId: workerUser._id.toString(),
        periodMonth: 9, // Sep 2026 was already seeded as finalized
        periodYear: 2026,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Duplicate finalization is prevented');
  });

  it('RULE: Partial salary payments against finalized payroll are recorded correctly', async () => {
    let payroll = await Payroll.findOne({ workerId: workerUser._id, periodMonth: 9, periodYear: 2026 });
    expect(payroll).toBeDefined();

    payroll.balanceRemaining = 5000;
    payroll.status = 'FINALIZED';
    await payroll.save();

    const initialRemaining = payroll.balanceRemaining;
    const partialAmount = 1000;

    const payRes = await request(app)
      .post('/api/v1/finance/salary-payments')
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        payrollId: payroll._id.toString(),
        amount: partialAmount,
        paymentMethod: 'BANK_TRANSFER',
        receiptReference: 'NEFT-PARTIAL-1234',
        notes: 'Partial payment',
      });

    expect(payRes.status).toBe(201);

    const updatedPayroll = await Payroll.findById(payroll._id);
    expect(updatedPayroll.balanceRemaining).toBe(initialRemaining - partialAmount);
  });

  it('RULE: Direct net payment correctly deducts advance, adds additional wages, and settles worker net pay', async () => {
    const profileBefore = await WorkerProfile.findOne({ userId: workerUser._id });
    const advanceBefore = profileBefore.outstandingAdvanceBalance || 0;

    const baseEarned = 3000;
    const advanceDeduction = Math.min(1000, advanceBefore);
    const additionalWages = 200;
    const expectedNet = baseEarned - advanceDeduction + additionalWages;

    const payRes = await request(app)
      .post(`/api/v1/finance/workers/${workerUser._id}/pay-net`)
      .set('Authorization', `Bearer ${thekedarToken}`)
      .send({
        baseEarned,
        advanceDeduction,
        additionalWages,
        paymentMethod: 'UPI',
        receiptReference: 'UPI-DIRECT-NET-888',
        notes: 'Direct weekly settlement',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.status).toBe('success');
    expect(payRes.body.data.netPaid).toBe(expectedNet);

    const profileAfter = await WorkerProfile.findOne({ userId: workerUser._id });
    expect(profileAfter.outstandingAdvanceBalance).toBe(advanceBefore - advanceDeduction);
  });

  it('RULE: Thekedar can delete worker from workforce with proper cleanup', async () => {
    // Create a temporary worker under Rajesh Thekedar
    const tempEmail = `temp.worker.${Date.now()}@furnicraft.com`;
    const tempUser = await User.create({
      name: 'Temp Carpenter',
      email: tempEmail,
      phone: '9888877777',
      password: 'Worker@2026',
      role: 'WORKER',
      assignedThekedar: thekedarUser._id,
      status: 'ACTIVE',
    });

    await WorkerProfile.create({
      userId: tempUser._id,
      thekedarId: thekedarUser._id,
      workerCode: `WRK-TMP-${Date.now().toString().slice(-4)}`,
      defaultDailyWage: 700,
      outstandingAdvanceBalance: 500,
    });

    // 1. Deleting with non-zero net balance must fail (400)
    const delFail = await request(app)
      .delete(`/api/v1/users/workers/${tempUser._id}`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(delFail.status).toBe(400);
    expect(delFail.body.message).toContain('Net balance must be exactly ₹0');

    // 2. Clear advance balance to 0 so Net Balance = 0
    await WorkerProfile.updateOne({ userId: tempUser._id }, { outstandingAdvanceBalance: 0 });

    // 3. Delete the worker with Net Balance = 0 (200)
    const delRes = await request(app)
      .delete(`/api/v1/users/workers/${tempUser._id}`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.status).toBe('success');
    expect(delRes.body.message).toContain('deleted successfully');

    // Confirm user and profile no longer exist
    const userCheck = await User.findById(tempUser._id);
    expect(userCheck).toBeNull();
    const profileCheck = await WorkerProfile.findOne({ userId: tempUser._id });
    expect(profileCheck).toBeNull();
  });

  it('RULE: Worker with ₹25,000 or more advance cannot request more advance', async () => {
    const profile = await WorkerProfile.findOne({ userId: workerUser._id });
    const originalBal = profile.outstandingAdvanceBalance;
    await WorkerProfile.updateOne({ userId: workerUser._id }, { outstandingAdvanceBalance: 25000 });

    // Worker attempts to request advance when at 25000
    const resOver = await request(app)
      .post('/api/v1/finance/advance-requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        amount: 500,
        reason: 'Should be rejected due to 25k cap',
      });

    expect(resOver.status).toBe(400);
    expect(resOver.body.message).toContain('25,000');

    // Test exceeding total limit when balance is 24000 and requesting 2000
    await WorkerProfile.updateOne({ userId: workerUser._id }, { outstandingAdvanceBalance: 24000 });
    const resExceed = await request(app)
      .post('/api/v1/finance/advance-requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        amount: 2000,
        reason: 'Should exceed 25k total',
      });

    expect(resExceed.status).toBe(400);
    expect(resExceed.body.message).toContain('25,000');

    // Test single request of 30000 even with 0 balance
    await WorkerProfile.updateOne({ userId: workerUser._id }, { outstandingAdvanceBalance: 0 });
    const resSingleOver = await request(app)
      .post('/api/v1/finance/advance-requests')
      .set('Authorization', `Bearer ${workerToken}`)
      .send({
        amount: 30000,
        reason: 'Should be rejected for exceeding 25k limit',
      });

    expect([400, 422]).toContain(resSingleOver.status);
    expect(resSingleOver.body.message).toContain('25,000');

    // Restore original balance
    await WorkerProfile.updateOne({ userId: workerUser._id }, { outstandingAdvanceBalance: originalBal });
  });

  it('RULE: Bulk attendance export without workerId is rejected (individual craftsman statement only)', async () => {
    const res = await request(app)
      .get('/api/v1/reports/export/attendance')
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('A specific worker must be selected');
  });

  it('RULE: Attendance export endpoint returns styled PDF for individual craftsman with contractor details', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/export/attendance?workerId=${workerUser._id}`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/pdf');
    expect(res.header['content-disposition']).toContain('.pdf');
    expect(res.header['content-disposition']).toContain(workerUser.name.replace(/\s+/g, '_'));
    expect(res.body.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('RULE: After payment by thekedar, official bill PDF can be generated and downloaded', async () => {
    const txn = await FinancialTransaction.findOne({ category: 'SALARY_PAYMENT' }).sort({ createdAt: -1 });
    expect(txn).toBeDefined();

    const res = await request(app)
      .get(`/api/v1/finance/transactions/${txn._id}/bill`)
      .set('Authorization', `Bearer ${thekedarToken}`);

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toBe('application/pdf');
    expect(res.header['content-disposition']).toContain('.pdf');
    expect(res.body.toString('utf8', 0, 4)).toBe('%PDF');
  });

  afterAll(async () => {
    // 1. Delete all advance requests created during this test or matching test signatures
    await AdvanceRequest.deleteMany({
      $or: [
        { _id: { $in: createdAdvanceIds } },
        { reason: { $regex: /Festive season|test|cap|exceed|weekly|Automated Vitest/i } },
      ],
    });

    // 2. Delete test transactions created with test references (do not wipe legitimate DB transactions)
    await FinancialTransaction.deleteMany({
      $or: [
        { receiptReference: { $in: ['TEST-UPI-UTR-999', 'NEFT-PARTIAL-1234', 'UPI-DIRECT-NET-888'] } },
        { notes: { $regex: /test|partial payment|direct weekly/i } },
      ],
    });

    // 3. Restore worker advance balance and attendance state to original state
    if (workerUser) {
      await WorkerProfile.updateOne(
        { userId: workerUser._id },
        { outstandingAdvanceBalance: initialWorkerAdvanceBalance }
      );
      await Attendance.updateMany(
        { workerId: workerUser._id, payrollId: null },
        { $set: { isPayrollProcessed: false } }
      );
    }
  });
});
