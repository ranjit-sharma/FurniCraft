import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB, disconnectDB, ensureIndexes } from './config/db.js';
import { env } from './config/env.js';
import { verifyEmailTransport } from './services/emailService.js';
import { verifyToken } from './utils/jwt.js';

// Last-resort logging so a stray rejection never fails silently; uncaught exceptions leave the process unsafe, so exit and let the host restart it.
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception, shutting down:', err);
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Connect to Database & verify core schema indexes
    await connectDB();
    await ensureIndexes();

    // Log whether OTP email can actually be sent (does not block startup)
    verifyEmailTransport();

    // 2. Initialize Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. High-concurrency Real-time Socket.IO Server (optimized for 500+ active connections)
    const allowedSocketOrigins = [
      env.CLIENT_URL,
      'https://furnicraft.onrender.com',
      'https://furnicraft-erp.onrender.com',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ].filter(Boolean);

    const isSocketOriginAllowed = (origin) => {
      if (!origin) return true;
      if (!env.isProduction) return true;
      if (allowedSocketOrigins.includes(origin)) return true;
      try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.onrender.com')) return true;
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
      } catch {
        return false;
      }
      return false;
    };

    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (isSocketOriginAllowed(origin)) {
            return callback(null, true);
          }
          return callback(new Error('CORS not allowed for this origin'), false);
        },
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB payload limit
      transports: ['websocket', 'polling'],
    });

    // Handshake authentication middleware for real-time WebSocket security
    io.use((socket, next) => {
      try {
        const rawAuth = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        const token = rawAuth ? rawAuth.replace(/^Bearer\s+/i, '') : null;
        if (token) {
          socket.user = verifyToken(token);
        }
        next();
      } catch (err) {
        return next(new Error('Unauthorized socket connection'));
      }
    });

    io.on('connection', (socket) => {
      // Scoped user room joining: only authenticated user can join their own user room (or Owner)
      socket.on('join_user_room', (userId) => {
        if (!socket.user || !userId) return;
        if (socket.user.id === String(userId) || socket.user.role === 'OWNER') {
          socket.join(`user_${userId}`);
        }
      });

      // Scoped project room joining: only authenticated users
      socket.on('join_project_room', (projectId) => {
        if (!socket.user || !projectId) return;
        socket.join(`project_${projectId}`);
      });
    });

    // Make io accessible in requests if needed
    app.set('io', io);

    // 4. Start Listening (bind 0.0.0.0 for containerized / cloud hosting e.g. Render)
    server.listen(env.PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` FurniCraft Server running on http://localhost:${env.PORT}`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` Ready for Modern Furniture Workforce Operations`);
      console.log(`====================================================`);
    });

    // 5. Graceful Shutdown Handlers (Proper zero-downtime order: stop HTTP/Sockets first, then close DB)
    const handleShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);

      // Set a hard timeout in case keep-alive connections do not drain
      const forceExitTimer = setTimeout(() => {
        console.error('[Process] Forcefully exiting after shutdown timeout (10s)');
        process.exit(1);
      }, 10000);

      // Stop Socket.IO from accepting incoming packets
      try {
        io.close();
      } catch (e) {
        // ignore
      }

      // Close HTTP server so in-flight requests finish cleanly before DB disconnection
      server.close(async () => {
        clearTimeout(forceExitTimer);
        console.log('[HTTP] Server closed to new connections.');
        try {
          await disconnectDB();
          console.log('[MongoDB] Connection closed cleanly.');
        } catch (err) {
          console.error('[MongoDB] Error disconnecting:', err);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
