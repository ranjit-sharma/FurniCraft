import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Initialize Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Optional Real-time Socket.IO Server
    const io = new SocketIOServer(server, {
      cors: {
        origin: [env.CLIENT_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'],
        credentials: true,
      },
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

    // 4. Start Listening
    server.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(` FurniCraft Server running on http://localhost:${env.PORT}`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` Ready for Modern Furniture Workforce Operations`);
      console.log(`====================================================`);
    });

    // 5. Graceful Shutdown Handlers
    const handleShutdown = (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
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
