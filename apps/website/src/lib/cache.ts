/**
 * Simple in-memory cache with TTL for API responses
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const age = Date.now() - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const apiCache = new SimpleCache();

/**
 * Cached fetch wrapper with TTL
 */
export async function cachedFetch<T = any>(
  url: string,
  options?: RequestInit,
  ttlMs: number = 60000
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;

  // Check cache first
  const cached = apiCache.get<T>(cacheKey);
  if (cached !== null) {
    console.log(`Cache hit: ${url}`);
    return cached;
  }

  // Fetch and cache
  console.log(`Cache miss: ${url}`);
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  apiCache.set(cacheKey, data, ttlMs);

  return data;
}

/**
 * Cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    size: apiCache.size(),
    keys: Array.from((apiCache as any).cache.keys()),
  };
}
