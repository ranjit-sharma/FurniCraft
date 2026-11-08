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
import { apiLimiter } from './middleware/rateLimiter.js';
import { NotFoundError } from './utils/errors.js';
import { noSqlSanitizeMiddleware } from './utils/sanitize.js';

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
import supportRoutes from './routes/supportRoutes.js';
import quotationRoutes from './routes/quotationRoutes.js';

export const createApp = () => {
  const app = express();

  // Trust reverse proxy (Render, Nginx, Cloudflare) for accurate client IP identification
  app.set('trust proxy', 1);

  // Compress HTTP responses with gzip/deflate (reduces payload by 70-80% for high concurrency)
  app.use(compression());

  // Security headers: Enable Content Security Policy in production while supporting SPA requirements
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", 'wss:', 'ws:', 'https:'],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration: Restrict to explicit verified client domains with dynamic onrender.com support
  const allowedOrigins = [
    env.CLIENT_URL,
    'https://furnicraft.onrender.com',
    'https://furnicraft-erp.onrender.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  const isOriginAllowed = (origin) => {
    if (!origin) return true;
    if (!env.isProduction) return true;
    if (allowedOrigins.includes(origin)) return true;
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.onrender.com')) return true;
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    } catch {
      return false;
    }
    return false;
  };

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id', 'Accept-Language', 'x-custom-lang'],
    })
  );

  // Parsers - production-hardened payload limits (1MB is safe & generous for JSON APIs)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Global NoSQL query operator injection protection
  app.use(noSqlSanitizeMiddleware);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'FurniCraft Management API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Mount API modules with global API rate limiter protection
  const apiRouter = express.Router();
  apiRouter.use(apiLimiter);
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
  apiRouter.use('/support', supportRoutes);
  apiRouter.use('/quotations', quotationRoutes);

  // Mount primary API router under both /api/v1 and /api for backward and session compatibility
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  const clientPublicPath = path.resolve(__dirname, '../../client/public');

  // Dedicated Sitemap.xml endpoint with strict XML MIME type (prevents SPA HTML fallback)
  app.get('/sitemap.xml', (req, res) => {
    const sitemapDist = path.join(clientDistPath, 'sitemap.xml');
    const sitemapPublic = path.join(clientPublicPath, 'sitemap.xml');
    const targetFile = fs.existsSync(sitemapDist)
      ? sitemapDist
      : fs.existsSync(sitemapPublic)
      ? sitemapPublic
      : null;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (targetFile) {
      return res.sendFile(targetFile);
    }

    const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://furnicraft-erp.onrender.com/</loc>
    <lastmod>2026-11-07</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`.trim();

    return res.status(200).send(defaultSitemap);
  });

  // Dedicated Robots.txt endpoint with strict text/plain MIME type
  app.get('/robots.txt', (req, res) => {
    const robotsDist = path.join(clientDistPath, 'robots.txt');
    const robotsPublic = path.join(clientPublicPath, 'robots.txt');
    const targetFile = fs.existsSync(robotsDist)
      ? robotsDist
      : fs.existsSync(robotsPublic)
      ? robotsPublic
      : null;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (targetFile) {
      return res.sendFile(targetFile);
    }

    const defaultRobots = `# FurniCraft ERP Robots Configuration
User-agent: *
Allow: /
Disallow: /api/
Disallow: /api/v1/
Disallow: /login
Disallow: /register-thekedar
Disallow: /register
Disallow: /dashboard
Disallow: /projects
Disallow: /workers
Disallow: /expenses
Disallow: /audit
Disallow: /members
Disallow: /transactions

# Sitemap location
Sitemap: https://furnicraft-erp.onrender.com/sitemap.xml`.trim();

    return res.status(200).send(defaultRobots);
  });

  // Serve frontend static build in production or when client/dist exists
  if (fs.existsSync(clientDistPath)) {
    app.use(
      express.static(clientDistPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.xml')) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
          } else if (filePath.endsWith('.txt')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );

    // Handle React SPA client-side routing fallback: any non-API GET route returns index.html
    app.get('*', (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.path.endsWith('.xml') || req.path.endsWith('.txt')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
