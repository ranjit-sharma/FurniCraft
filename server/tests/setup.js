import { beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    const testUri = process.env.MONGODB_URI || env.MONGODB_URI;
    await connectDB(testUri);
  }
});
