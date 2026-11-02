import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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
import toolRoutes from './routes/toolRoutes.js';
import furnitureTaskRoutes from './routes/furnitureTaskRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import disputeRoutes from './routes/disputeRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

export const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id'],
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
  apiRouter.use('/tools', toolRoutes);
  apiRouter.use('/furniture-tasks', furnitureTaskRoutes);
  apiRouter.use('/expenses', expenseRoutes);
  apiRouter.use('/reports', reportRoutes);
  apiRouter.use('/disputes', disputeRoutes);
  apiRouter.use('/audit', auditRoutes);

  app.use('/api/v1', apiRouter);

  // Catch-all 404 handler
  app.use('*', (req, res, next) => {
    next(new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp();
