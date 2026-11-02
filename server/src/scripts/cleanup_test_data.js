import { connectDB, disconnectDB } from '../config/db.js';
import { FinancialTransaction, WorkerProfile, AdvanceRequest, Attendance } from '../models/index.js';

async function cleanup() {
  await connectDB();

  // Delete all test-generated transactions
  const resTxns = await FinancialTransaction.deleteMany({});
  console.log('Deleted transactions:', resTxns.deletedCount);

  // Clean test advance requests
  const resAdv = await AdvanceRequest.deleteMany({
    $or: [
      { reason: { $regex: 'test', $options: 'i' } },
      { reason: { $regex: 'cap', $options: 'i' } },
      { reason: { $regex: 'exceed', $options: 'i' } },
      { reason: { $regex: 'advance for tool', $options: 'i' } },
    ]
  });
  console.log('Deleted test advance requests:', resAdv.deletedCount);

  // Reset worker balances so only real earned attendance wages remain
  const profiles = await WorkerProfile.find({});
  for (const p of profiles) {
    p.totalSalaryPaid = 0;
    p.totalAdvancesDisbursed = 0;
    p.totalAdvancesRecovered = 0;
    p.outstandingAdvanceBalance = 0;
    // Calculate accurate outstandingSalaryBalance from unpaid approved attendance
    const approvedAtt = await Attendance.find({
      workerId: p.userId,
      approvalStatus: 'APPROVED',
      isPayrollProcessed: false,
    });
    const earned = approvedAtt.reduce((sum, a) => sum + (a.calculatedEarnings || 0), 0);
    p.outstandingSalaryBalance = earned;
    await p.save();
    console.log(`Worker ${p.workerCode}: outstanding earned wages = ₹${earned}, paid = ₹0`);
  }

  await disconnectDB();
  console.log('Database cleanup completed successfully.');
}

cleanup().catch(console.error);
