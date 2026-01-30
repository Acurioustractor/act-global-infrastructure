/**
 * Redis Client for Caching
 * Connects to Synology NAS Redis instance
 */

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://nas.local:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis on NAS');
});

/**
 * Get cached value with automatic JSON parsing
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value with automatic JSON stringification
 * @param key Cache key
 * @param value Value to cache
 * @param ttl Time to live in seconds (default: 5 minutes)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
  }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Redis delete error for key ${key}:`, error);
  }
}

/**
 * Cache wrapper for expensive operations
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached;
  }

  console.log(`❌ Cache MISS: ${key} - fetching...`);

  // Cache miss - fetch and cache
  const data = await fetcher();
  await setCached(key, data, ttl);

  return data;
}

export default redis;
