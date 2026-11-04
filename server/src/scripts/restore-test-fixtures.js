import { connectDB, disconnectDB } from '../config/db.js';
import { User, WorkerProfile, WageAgreement } from '../models/index.js';
import { ROLES, USER_STATUS } from '../config/constants.js';

async function restoreTestUsers() {
  await connectDB();
  console.log('[Restore] Connected to DB.');

  // Find thekedar Rajesh
  const thekedar = await User.findOne({ email: 'thekedar.rajesh@furnicraft.com' });
  if (!thekedar) {
    console.error('Thekedar Rajesh not found!');
    process.exit(1);
  }

  // 1. Owner Vikramaditya Sharma
  let owner = await User.findOne({ email: 'owner@furnicraft.com' });
  if (!owner) {
    owner = await User.create({
      name: 'Vikramaditya Sharma',
      email: 'owner@furnicraft.com',
      phone: '+91 98765 43210',
      password: 'FurniOwner@2026',
      role: ROLES.OWNER,
      status: USER_STATUS.ACTIVE,
    });
    console.log('[Restore] Created owner@furnicraft.com');
  } else {
    owner.password = 'FurniOwner@2026';
    owner.status = USER_STATUS.ACTIVE;
    await owner.save();
    console.log('[Restore] Updated owner@furnicraft.com password and status');
  }

  // 2. Worker Ramesh
  let worker1 = await User.findOne({ email: 'worker.ramesh@furnicraft.com' });
  if (!worker1) {
    worker1 = await User.create({
      name: 'Ramesh Carpenter',
      email: 'worker.ramesh@furnicraft.com',
      phone: '+91 99222 33445',
      password: 'Worker@2026',
      role: ROLES.WORKER,
      assignedThekedar: thekedar._id,
      status: USER_STATUS.ACTIVE,
    });
    console.log('[Restore] Created worker.ramesh@furnicraft.com');
  } else {
    worker1.password = 'Worker@2026';
    worker1.status = USER_STATUS.ACTIVE;
    await worker1.save();
    console.log('[Restore] Updated worker.ramesh@furnicraft.com password and status');
  }

  // 3. WorkerProfile for Ramesh
  let wp1 = await WorkerProfile.findOne({ $or: [{ userId: worker1._id }, { workerCode: 'WRK-0001' }] });
  if (!wp1) {
    wp1 = await WorkerProfile.create({
      userId: worker1._id,
      thekedarId: thekedar._id,
      workerCode: 'WRK-0001',
      skills: ['Cabinet Making', 'Modular Assembly', 'Panel Saw Cutting'],
      defaultDailyWage: 800,
      bankDetails: {
        upiId: 'ramesh@upi',
        accountNumber: '112233445566',
        ifscCode: 'SBIN0001234',
        bankName: 'State Bank of India',
      },
      outstandingAdvanceBalance: 1500,
      totalAdvancesDisbursed: 5000,
      totalAdvancesRecovered: 3500,
      outstandingSalaryBalance: 4800,
    });
    console.log('[Restore] Created WorkerProfile for Ramesh');
  } else {
    wp1.userId = worker1._id;
    wp1.thekedarId = thekedar._id;
    wp1.outstandingAdvanceBalance = 1500;
    wp1.outstandingSalaryBalance = 4800;
    wp1.defaultDailyWage = 800;
    await wp1.save();
    console.log('[Restore] Updated WorkerProfile for Ramesh with active balances');
  }

  // 4. WageAgreement for Ramesh
  let wage = await WageAgreement.findOne({ workerId: worker1._id });
  if (!wage) {
    await WageAgreement.create({
      workerId: worker1._id,
      thekedarId: thekedar._id,
      dailyWage: 800,
      effectiveFrom: new Date('2026-01-01'),
      createdBy: thekedar._id,
      notes: 'Initial contractual wage agreement for Master Craftsman',
    });
    console.log('[Restore] Created WageAgreement for Ramesh');
  }

  // 5. Worker Suresh (needed for authorization tests)
  let worker2 = await User.findOne({ email: 'worker.suresh@furnicraft.com' });
  if (!worker2) {
    worker2 = await User.create({
      name: 'Suresh Modular Specialist',
      email: 'worker.suresh@furnicraft.com',
      phone: '+91 99333 44556',
      password: 'Worker@2026',
      role: ROLES.WORKER,
      assignedThekedar: thekedar._id,
      status: USER_STATUS.ACTIVE,
    });
    console.log('[Restore] Created worker.suresh@furnicraft.com');
  } else {
    worker2.password = 'Worker@2026';
    worker2.status = USER_STATUS.ACTIVE;
    await worker2.save();
    console.log('[Restore] Updated worker.suresh@furnicraft.com password and status');
  }

  let wp2 = await WorkerProfile.findOne({ $or: [{ userId: worker2._id }, { workerCode: 'WRK-0002' }] });
  if (!wp2) {
    await WorkerProfile.create({
      userId: worker2._id,
      thekedarId: thekedar._id,
      workerCode: 'WRK-0002',
      skills: ['Modular Assembly'],
      defaultDailyWage: 750,
      outstandingAdvanceBalance: 0,
      totalAdvancesDisbursed: 0,
      totalAdvancesRecovered: 0,
      outstandingSalaryBalance: 0,
    });
    console.log('[Restore] Created WorkerProfile for Suresh');
  } else {
    wp2.userId = worker2._id;
    wp2.thekedarId = thekedar._id;
    await wp2.save();
    console.log('[Restore] Updated WorkerProfile for Suresh');
  }

  console.log('[Restore] Done.');
  await disconnectDB();
  process.exit(0);
}

restoreTestUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
