import { beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';

beforeAll(async () => {
  // Connect to local test database
  const testUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/furnicraft_db';
  await connectDB(testUri);
});

afterAll(async () => {
  await disconnectDB();
});
