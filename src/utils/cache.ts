import { createClient, RedisClientType } from 'redis';
import { logger } from '../logger';

let redisClient: RedisClientType | null = null;

export async function initCache() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    await redisClient.connect();
    logger.info('Redis cache connected');
    return redisClient;
  } catch (error) {
    logger.warn('Redis cache initialization failed, using in-memory cache', error);
    return null;
  }
}

// In-memory fallback cache
const memoryCache = new Map<string, { data: any; expiry: number }>();

export async function getCache(key: string): Promise<any | null> {
  try {
    if (redisClient) {
      const data = await redisClient.get(key);
      if (data) {
        return JSON.parse(data);
      }
    } else {
      const cached = memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data;
      }
      memoryCache.delete(key);
    }
  } catch (error) {
    logger.error('Cache get error:', { key, error });
  }
  return null;
}

export async function setCache(key: string, data: any, ttl?: number): Promise<void> {
  try {
    const cacheTtl = ttl || parseInt(process.env.CACHE_TTL || '172800'); // 2 days default

    if (redisClient) {
      await redisClient.setEx(key, cacheTtl, JSON.stringify(data));
    } else {
      memoryCache.set(key, {
        data,
        expiry: Date.now() + cacheTtl * 1000,
      });
    }
  } catch (error) {
    logger.error('Cache set error:', { key, error });
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (error) {
    logger.error('Cache delete error:', { key, error });
  }
}

export async function closeCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
  }
}
