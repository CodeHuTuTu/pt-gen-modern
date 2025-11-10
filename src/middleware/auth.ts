import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.APIKEY;

  if (!apiKey) {
    // No API key required
    return next();
  }

  const providedKey = req.query.apikey as string || req.headers['x-api-key'] as string;

  if (!providedKey || providedKey !== apiKey) {
    logger.warn('Invalid API key attempt');
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
    });
  }

  next();
}

export function searchEnabled(req: Request, res: Response, next: NextFunction) {
  if (process.env.DISABLE_SEARCH === 'true') {
    return res.status(403).json({
      success: false,
      error: 'Search is disabled',
    });
  }

  next();
}
