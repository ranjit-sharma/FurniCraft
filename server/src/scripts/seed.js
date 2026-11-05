import { connectDB, disconnectDB } from '../config/db.js';
import { User, AttendanceRuleVersion } from '../models/index.js';
import { ROLES, USER_STATUS } from '../config/constants.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Init] Ensuring essential system rules and accounts exist...');

    // 1. Ensure Attendance Rule Version 1 exists (never deletes existing data)
    let rule = await AttendanceRuleVersion.findOne({ versionNumber: 1 });
    if (!rule) {
      rule = await AttendanceRuleVersion.create({
        versionNumber: 1,
        multipliers: {
          P: 1.0,
          HALF: 0.5,
          'P1/5': 1.5,
          PP: 2.0,
          ABSENT: 0.0,
          LEAVE: 0.0,
        },
        description: 'Standard modern furniture shop rule (P=1.0, HALF=0.5, P1/5=1.5, PP=2.0)',
        effectiveDate: new Date('2026-01-01'),
        isCurrent: true,
      });
      console.log('[Init] Default Attendance Rule Version 1 created.');
    } else {
      console.log('[Init] Attendance Rule Version 1 verified.');
    }

    // 2. Ensure Owner Admin exists
    let owner = await User.findOne({ email: 'furnicraft.erp@gmail.com' });
    if (!owner) {
      owner = await User.create({
        name: 'Admin',
        email: 'furnicraft.erp@gmail.com',
        phone: '7482869029',
        password: 'Furnicraft@3948',
        role: ROLES.OWNER,
        status: USER_STATUS.ACTIVE,
      });
      console.log('[Init] Created Owner Admin account.');
    } else {
      console.log('[Init] Owner Admin account verified.');
    }

    console.log('[Init] System initialization complete. Real user data preserved.');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Init] Error:', err);
    process.exit(1);
  }
};

seedDatabase();
