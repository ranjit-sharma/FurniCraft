import { connectDB, disconnectDB } from '../src/config/db.js';
import { WorkerProfile, Attendance, AdvanceRequest, User } from '../src/models/index.js';
import { ATTENDANCE_STATUS, ADVANCE_REQUEST_STATUS } from '../src/config/constants.js';

async function run() {
  await connectDB();

  const workerProfiles = await WorkerProfile.find({})
    .populate('userId', 'name email phone status')
    .populate('thekedarId', 'name phone');

  const workerUserIds = workerProfiles.map((w) => w.userId?._id).filter(Boolean);
  const attendanceAgg = await Attendance.aggregate([
    {
      $match: {
        workerId: { $in: workerUserIds },
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
        isPayrollProcessed: false,
      },
    },
    {
      $group: {
        _id: '$workerId',
        totalEarned: { $sum: '$calculatedEarnings' },
        approvedDaysCount: { $sum: 1 },
      },
    },
  ]);

  const earnedMap = new Map();
  attendanceAgg.forEach((a) => {
    earnedMap.set(a._id.toString(), {
      totalEarned: a.totalEarned,
      approvedDaysCount: a.approvedDaysCount,
    });
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const currentMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const currentMonthAgg = await Attendance.aggregate([
    {
      $match: {
        workerId: { $in: workerUserIds },
        date: { $gte: currentMonthStart, $lt: currentMonthEnd },
        approvalStatus: ATTENDANCE_STATUS.APPROVED,
      },
    },
    {
      $group: {
        _id: '$workerId',
        monthWorkedDays: { $sum: 1 },
        monthDehadi: { $sum: '$wageMultiplier' },
        monthEarnings: { $sum: '$calculatedEarnings' },
      },
    },
  ]);

  const monthStatsMap = new Map();
  currentMonthAgg.forEach((m) => {
    monthStatsMap.set(m._id.toString(), {
      monthWorkedDays: m.monthWorkedDays,
      monthDehadi: m.monthDehadi,
      monthEarnings: m.monthEarnings,
    });
  });

  workerProfiles.forEach((w) => {
    const earnedStats = earnedMap.get(w.userId?._id?.toString()) || { totalEarned: 0, approvedDaysCount: 0 };
    const mStats = monthStatsMap.get(w.userId?._id?.toString()) || { monthWorkedDays: 0, monthDehadi: 0, monthEarnings: 0 };
    const totalEarned = earnedStats.totalEarned + (w.outstandingSalaryBalance || 0);
    const advance = w.outstandingAdvanceBalance || 0;
    const netBalance = totalEarned - advance;

    console.log(`Worker: ${w.userId?.name} (${w.workerCode})`);
    console.log(`  Daily Wage: ₹${w.defaultDailyWage}`);
    console.log(`  Worked This Month: ${mStats.monthDehadi} Dehadi (${mStats.monthWorkedDays}d) -> ₹${mStats.monthEarnings}`);
    console.log(`  Total Income (Earned): ₹${totalEarned} (${earnedStats.approvedDaysCount} shifts)`);
    console.log(`  Advance Balance: ₹${advance}`);
    console.log(`  Net Balance: ₹${netBalance} (Formula: ${totalEarned} - ${advance} = ${netBalance})`);
  });

  await disconnectDB();
}

run().catch(console.error);
