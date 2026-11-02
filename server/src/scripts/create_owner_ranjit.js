import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { ROLES, USER_STATUS } from '../config/constants.js';

async function createOwner() {
  await connectDB();

  const email = 'ranjitsharma7520@gmail.com'.toLowerCase().trim();
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = 'Ranjit Sharma';
    existing.password = 'ranjit@7520';
    existing.role = ROLES.OWNER;
    existing.status = USER_STATUS.ACTIVE;
    existing.phone = '+91 98765 75200';
    await existing.save();
    console.log('Updated existing user to Owner:', existing._id, existing.email, existing.role);
  } else {
    const user = await User.create({
      name: 'Ranjit Sharma',
      email,
      phone: '+91 98765 75200',
      password: 'ranjit@7520',
      role: ROLES.OWNER,
      status: USER_STATUS.ACTIVE,
    });
    console.log('Created new Owner account successfully:', user._id, user.name, user.email, user.role);
  }

  // Verify comparePassword works
  const verifyUser = await User.findOne({ email }).select('+password');
  const isMatch = await verifyUser.comparePassword('ranjit@7520');
  console.log('Password verification check:', isMatch ? 'PASSED (Password match)' : 'FAILED');

  await disconnectDB();
}

createOwner().catch((err) => {
  console.error('Failed to create owner:', err);
  process.exit(1);
});
