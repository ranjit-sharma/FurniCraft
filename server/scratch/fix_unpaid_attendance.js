import { connectDB, disconnectDB } from '../src/config/db.js';
import { Attendance } from '../src/models/index.js';

async function run() {
  await connectDB();
  const res = await Attendance.updateMany(
    { payrollId: null },
    { $set: { isPayrollProcessed: false } }
  );
  console.log('Reset isPayrollProcessed to false for unpaid attendances count:', res.modifiedCount);
  await disconnectDB();
}

run().catch(console.error);
