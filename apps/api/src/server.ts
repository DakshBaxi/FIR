import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis } from './config/redis';
import { prisma } from './config/database';
import { globalRateLimit } from './middleware/rateLimit.middleware';
import { errorHandler, notFound } from './middleware/errorHandler.middleware';
import routes from './routes/index';

const app = express();

// Security headers
app.use(helmet());

// CORS: allow frontend origin with credentials
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// HTTP request logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Global rate limiting
app.use(globalRateLimit);

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

async function start() {
  try {
    await connectRedis();
    await prisma.$connect();
    logger.info('Database connected');

    app.listen(env.API_PORT, () => {
      logger.info(`API server running on http://localhost:${env.API_PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

start();
