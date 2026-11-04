import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { verifyEmailTransport } from './services/emailService.js';
import { startAttendanceAlarmScheduler, stopAttendanceAlarmScheduler } from './services/attendanceAlarmScheduler.js';

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
    // 1. Connect to Database
    await connectDB();

    // Log whether OTP email can actually be sent (does not block startup)
    verifyEmailTransport();

    // 2. Initialize Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. High-concurrency Real-time Socket.IO Server (optimized for 500+ active connections)
    const io = new SocketIOServer(server, {
      cors: {
        origin: [env.CLIENT_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      },
      pingTimeout: 30000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB payload limit
      transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
      // Optional user room joining for live notifications
      socket.on('join_user_room', (userId) => {
        if (userId) socket.join(`user_${userId}`);
      });

      socket.on('join_project_room', (projectId) => {
        if (projectId) socket.join(`project_${projectId}`);
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

      // Start Attendance Alarm Background Scheduler
      startAttendanceAlarmScheduler();
    });

    // 5. Graceful Shutdown Handlers (Proper zero-downtime order: stop HTTP/Sockets first, then close DB)
    const handleShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      stopAttendanceAlarmScheduler();

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
