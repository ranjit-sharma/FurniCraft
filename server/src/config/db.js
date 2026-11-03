import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

const DIRECT_REPLICA_URI = process.env.MONGODB_DIRECT_URI || '';

// Configure public DNS servers to prevent Windows local router DNS timeouts on SRV queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (err) {
  console.warn('[DNS] Warning setting DNS servers:', err.message);
}

export const connectDB = async (uri = env.MONGODB_URI, retries = 3) => {
  let lastError;
  const targetUris = [uri].filter(Boolean);
  if (DIRECT_REPLICA_URI && uri && uri.startsWith('mongodb+srv://') && !targetUris.includes(DIRECT_REPLICA_URI)) {
    targetUris.push(DIRECT_REPLICA_URI);
  }

  for (const connectionUri of targetUris) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (connectionUri && connectionUri.startsWith('mongodb+srv://')) {
          try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
          } catch {}
        }

        const conn = await mongoose.connect(connectionUri, {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 10000,
          maxPoolSize: 150, // Concurrency connection pool for 500+ users
          minPoolSize: 10,  // Pre-warmed pool for zero cold-start spikes
          socketTimeoutMS: 45000,
          family: 4, // Force IPv4 to prevent dual-stack DNS delays
          autoIndex: !env.isProduction, // Disable runtime index builds in production
        });

        console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (error) {
        lastError = error;
        console.warn(`[MongoDB] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, 1500));
        }
      }
    }
  }

  console.error(`[MongoDB] Final connection failure: ${lastError?.message}`);
  if (env.isProduction) {
    process.exit(1);
  }
  throw lastError;
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
};

