import { connectDB, disconnectDB } from '../src/config/db.js';
import { FinancialTransaction, WorkerProfile, Attendance, User } from '../src/models/index.js';

async function run() {
  await connectDB();

  const user = await User.findOne({ phone: '+91 99222 33445' });
  if (!user) {
    console.log('User not found');
    await disconnectDB();
    return;
  }

  // 1. Delete the 2 test net payments
  const delRes = await FinancialTransaction.deleteMany({
    workerId: user._id,
    category: 'SALARY_PAYMENT',
  });
  console.log('Deleted test salary payments:', delRes.deletedCount);

  // 2. Reset WorkerProfile
  await WorkerProfile.updateOne(
    { userId: user._id },
    {
      $set: {
        outstandingAdvanceBalance: 10000,
        totalAdvancesDisbursed: 10000,
        totalAdvancesRecovered: 0,
        totalSalaryPaid: 0,
        outstandingSalaryBalance: 0,
      },
    }
  );
  console.log('Reset WorkerProfile to 10,000 advance and 0 salary paid.');

  // 3. Reset 5 attendances to isPayrollProcessed: false
  const attRes = await Attendance.updateMany(
    { workerId: user._id },
    { $set: { isPayrollProcessed: false } }
  );
  console.log('Reset attendances isPayrollProcessed to false:', attRes.modifiedCount);

  await disconnectDB();
}

run().catch(console.error);
