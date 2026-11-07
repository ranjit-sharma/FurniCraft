import { connectDB, disconnectDB } from '../config/db.js';
import { AttendanceRuleVersion } from '../models/index.js';

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('[Init] Ensuring essential system attendance rules exist...');

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
          'P2/5': 2.5,
          PPP: 3.0,
          ABSENT: 0.0,
          LEAVE: 0.0,
        },
        description: 'Standard modern furniture shop rule (P=1.0, HALF=0.5, P1/5=1.5, PP=2.0, P2/5=2.5, PPP=3.0)',
        effectiveDate: new Date('2026-01-01'),
        isCurrent: true,
      });
      console.log('[Init] Default Attendance Rule Version 1 created.');
    } else {
      console.log('[Init] Attendance Rule Version 1 verified.');
    }

    console.log('[Init] System initialization complete.');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('[Init] Error:', err);
    process.exit(1);
  }
};

seedDatabase();
