import { SearchResponse, MediaInfo } from '../types';
import { logger } from '../logger';
import { getCache, setCache } from '../utils/cache';

export abstract class BaseService {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  abstract search(query: string): Promise<SearchResponse>;
  abstract getInfo(sid: string): Promise<MediaInfo>;

  protected async getFromCache<T>(key: string): Promise<T | null> {
    return getCache(key);
  }

  protected async saveToCache<T>(key: string, data: T, ttl?: number): Promise<void> {
    await setCache(key, data, ttl);
  }

  protected getCacheKey(type: 'search' | 'info', query: string): string {
    return `${this.name}:${type}:${query}`;
  }

  protected handleError(error: unknown, operation: string): string {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`${this.name} ${operation} error:`, { message, error });
    return message;
  }
}
