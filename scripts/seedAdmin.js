// Run with `npm run seed:admin`. Creates the first admin account from the ADMIN_* values in .env.
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/modules/users/user.model.js';

(async () => {
  const { MONGO_URI, ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`User ${ADMIN_EMAIL} already exists (role: ${existing.role})`);
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
    console.log(`Admin ${ADMIN_EMAIL} created`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
