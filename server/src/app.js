import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

export const createApp = () => {
  const app = express();

  // Trust reverse proxy (Render, Nginx, Cloudflare) for accurate client IP identification
  app.set('trust proxy', 1);

  // Compress HTTP responses with gzip/deflate (reduces payload by 70-80% for high concurrency)
  app.use(compression());

  // Security headers (allow inline theme script and CDN fonts for SPA)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.vercel.app') ||
          !env.isProduction
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id', 'Accept-Language', 'x-custom-lang'],
    })
  );

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'FurniCraft Management API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Mount API modules
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/projects', projectRoutes);
  apiRouter.use('/attendance', attendanceRoutes);
  apiRouter.use('/payroll', payrollRoutes);
  apiRouter.use('/finance', financeRoutes);
  apiRouter.use('/expenses', expenseRoutes);
  apiRouter.use('/reports', reportRoutes);
  apiRouter.use('/audit', auditRoutes);
  apiRouter.use('/system', systemRoutes);

  // Mount primary API router under both /api/v1 and /api for backward and session compatibility
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Serve frontend static build in production or when client/dist exists
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDistPath = path.resolve(__dirname, '../../client/dist');

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // Handle React SPA client-side routing fallback: any non-API GET route returns index.html
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Catch-all 404 handler for API routes or when static build is not present
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp();
