import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';

beforeAll(async () => {
  // Connect to configured MongoDB Atlas database
  const testUri = process.env.MONGODB_URI || env.MONGODB_URI;
  await connectDB(testUri);
});

afterAll(async () => {
  await disconnectDB();
});
