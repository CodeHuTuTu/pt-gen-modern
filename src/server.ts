import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { logger } from './logger';
import { initCache, closeCache } from './utils/cache';
import { apiKeyAuth } from './middleware/auth';
import apiRoutes from './routes/api';
import webRoutes from './routes/web';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('src/public'));

// Logging middleware
app.use((req, express, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API key authentication
app.use(apiKeyAuth);

// Routes
app.use('/api', apiRoutes);
app.use('/', webRoutes);

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
