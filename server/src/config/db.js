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
  if (!uri || (!uri.includes('mongodb.net') && !uri.startsWith('mongodb+srv://'))) {
    const errorMsg = '[MongoDB] Only MongoDB Atlas connection is permitted. Local database connections are disabled.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
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
          serverSelectionTimeoutMS: 15000, // Resilient timeout for replica-set discovery
          connectTimeoutMS: 15000,
          maxPoolSize: 50, // Resilient pool budget preventing Atlas free/shared tier exhaustion
          minPoolSize: 2,  // Sensible baseline avoiding hoarding 30+ idle connections on replica sets
          maxIdleTimeMS: 45000, // Clean up idle pool sockets before Atlas firewall TCP reset
          heartbeatFrequencyMS: 10000, // 10s ping keeps NAT firewalls from dropping idle sockets
          socketTimeoutMS: 45000,
          family: 4, // Force IPv4 to prevent dual-stack DNS delays
          autoIndex: !env.isProduction, // Disable runtime index builds in production
        });

        dbConnectedAt = new Date();
        lastDbError = null;
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

/**
 * Ensures required indexes are initialized on startup without blocking server performance
 */
export const ensureIndexes = async () => {
  try {
    const { User, SupportTicket, FinancialTransaction, OtpRecord, Project, ProjectExpense } = await import('../models/index.js');
    await Promise.allSettled([
      User.init(),
      SupportTicket.init(),
      FinancialTransaction.init(),
      OtpRecord.init(),
      Project.init(),
      ProjectExpense.init(),
    ]);
    console.log('[MongoDB] Schema indexes verified successfully');
  } catch (err) {
    console.warn('[MongoDB] Index verification note:', err.message);
  }
};

let dbConnectedAt = null;
let dbDisconnectedAt = null;
let lastDbError = null;

// Attach real-time connection event listeners
mongoose.connection.on('connected', () => {
  dbConnectedAt = new Date();
  lastDbError = null;
  console.log('[MongoDB] Connection state: Connected');
});

mongoose.connection.on('disconnected', () => {
  dbDisconnectedAt = new Date();
  console.warn('[MongoDB] Connection state: Disconnected. Driver is attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  dbConnectedAt = new Date();
  lastDbError = null;
  console.log('[MongoDB] Connection state: Reconnected successfully');
});

mongoose.connection.on('error', (err) => {
  // Sanitize error: scrub credentials, password, and host IPs
  lastDbError = err?.message
    ? err.message.replace(/mongodb(\+srv)?:\/\/[^@]+@/, 'mongodb://***:***@')
    : 'Database connection issue';
  console.error('[MongoDB] Connection error:', lastDbError);
});

/**
 * Perform real-time lightweight database health check
 * Safe for Owner dashboard: Never exposes connection strings, IPs, or credentials
 */
export const getDatabaseHealth = async () => {
  const readyStateNames = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const stateCode = mongoose.connection.readyState;
  const status = readyStateNames[stateCode] || 'Unknown';
  const isConnected = stateCode === 1;

  let latencyMs = null;
  let pingError = null;

  if (isConnected && mongoose.connection.db) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      latencyMs = Date.now() - startTime;
    } catch (err) {
      pingError = 'Ping failed or timed out';
    }
  }

  // Calculate connection uptime in seconds
  let uptimeSeconds = 0;
  if (dbConnectedAt && isConnected) {
    uptimeSeconds = Math.max(0, Math.floor((Date.now() - dbConnectedAt.getTime()) / 1000));
  }

  return {
    status,
    isConnected,
    databaseName: mongoose.connection.name || 'furnicraft_db',
    lastCheck: new Date().toISOString(),
    uptimeSeconds,
    latencyMs,
    lastError: lastDbError || pingError || null,
    availability: isConnected && !pingError ? '100% Operational' : (isConnected ? 'Degraded' : 'Unavailable'),
  };
};

