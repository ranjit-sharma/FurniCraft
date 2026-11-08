import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

beforeAll(async () => {
  if (process.env.SKIP_DB === 'true') return;
  if (process.env.USE_LIVE_DB === 'true') {
    const testUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(testUri);
  } else {
    // Isolated in-memory database: guarantees tests NEVER touch, pollute, or delete live production data
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
});
