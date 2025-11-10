import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './logger.js';
import { initCache, closeCache } from './utils/cache.js';
import { apiKeyAuth } from './middleware/auth.js';
import apiRoutes from './routes/api.js';
import webRoutes from './routes/web.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, express, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API key authentication
app.use(apiKeyAuth);

// Routes - API routes must come before web routes to match / endpoint
app.use('/', apiRoutes);
app.use('/', webRoutes);

// Static files served last, with index disabled to prevent conflicting with routes
app.use(express.static('src/public', { index: false }));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

async function start() {
  try {
    // Initialize cache
    await initCache();

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await closeCache();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await closeCache();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
