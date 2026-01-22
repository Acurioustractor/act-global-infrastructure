/**
 * Caching Layer for API Calls
 * Layer 8: Cost & Latency Optimization
 *
 * Provides Redis-based caching for embeddings and LLM responses.
 * Falls back to in-memory cache if Redis unavailable.
 *
 * Supports:
 * - Upstash Redis (serverless) - recommended
 * - Local Redis
 * - In-memory fallback
 *
 * Usage:
 *   import { cachedEmbedding, cachedCompletion, cache } from './lib/cache.mjs';
 *
 *   const embedding = await cachedEmbedding('Hello world', 'my-script.mjs');
 *   const response = await cachedCompletion(messages, 'my-script.mjs');
 */

import '../../lib/load-env.mjs';
import { createHash } from 'crypto';
import { trackedEmbedding, trackedCompletion, trackedClaudeCompletion } from './llm-client.mjs';
import { createClient } from '@supabase/supabase-js';

// Supabase for logging cache hits (support both NEXT_PUBLIC_ and non-prefixed vars)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE BACKENDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.name = 'memory';
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expires && item.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 86400) {
    this.store.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key) {
    this.store.delete(key);
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(this.store.keys()).filter(k => regex.test(k));
  }

  async flushAll() {
    this.store.clear();
  }

  stats() {
    return {
      backend: 'memory',
      keys: this.store.size
    };
  }
}

class RedisCache {
  constructor(client, name = 'redis') {
    this.client = client;
    this.name = name;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Redis get error:', err.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 86400) {
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('Redis set error:', err.message);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis del error:', err.message);
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      console.error('Redis keys error:', err.message);
      return [];
    }
  }

  async flushAll() {
    try {
      await this.client.flushall();
    } catch (err) {
      console.error('Redis flush error:', err.message);
    }
  }

  stats() {
    return {
      backend: this.name,
      connected: true
    };
  }
}

class UpstashCache {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.name = 'upstash';
  }

  async _request(command) {
    try {
      const response = await fetch(`${this.url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        throw new Error(`Upstash error: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (err) {
      console.error('Upstash request error:', err.message);
      return null;
    }
  }

  async get(key) {
    const value = await this._request(['GET', key]);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlSeconds = 86400) {
    await this._request(['SETEX', key, ttlSeconds, JSON.stringify(value)]);
  }

  async del(key) {
    await this._request(['DEL', key]);
  }

  async keys(pattern) {
    return await this._request(['KEYS', pattern]) || [];
  }

  async flushAll() {
    await this._request(['FLUSHALL']);
  }

  stats() {
    return {
      backend: 'upstash',
      connected: true
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE INITIALIZATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let cacheInstance = null;

async function initCache() {
  if (cacheInstance) return cacheInstance;

  // Try Upstash first (serverless Redis)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      cacheInstance = new UpstashCache(
        process.env.UPSTASH_REDIS_REST_URL,
        process.env.UPSTASH_REDIS_REST_TOKEN
      );
      // Test connection
      await cacheInstance.set('_test', 'ok', 10);
      console.log('Cache: Using Upstash Redis');
      return cacheInstance;
    } catch (err) {
      console.warn('Upstash init failed, trying local Redis:', err.message);
    }
  }

  // Try local Redis
  if (process.env.REDIS_URL) {
    try {
      const Redis = (await import('ioredis')).default;
      const client = new Redis(process.env.REDIS_URL);
      cacheInstance = new RedisCache(client);
      // Test connection
      await client.ping();
      console.log('Cache: Using local Redis');
      return cacheInstance;
    } catch (err) {
      console.warn('Local Redis init failed:', err.message);
    }
  }

  // Fall back to memory
  console.log('Cache: Using in-memory (no Redis configured)');
  cacheInstance = new MemoryCache();
  return cacheInstance;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function hashText(text) {
  return createHash('sha256').update(text).digest('hex').substring(0, 32);
}

function hashMessages(messages) {
  const content = messages.map(m => `${m.role}:${m.content}`).join('|');
  return hashText(content);
}

async function logCacheHit(provider, model, endpoint, scriptName, cacheKey) {
  try {
    await supabase.from('api_usage').insert({
      provider,
      model,
      endpoint,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
      script_name: scriptName,
      cache_hit: true,
      cache_key: cacheKey,
      latency_ms: 0
    });
  } catch (err) {
    // Silent fail for logging
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHED OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get embedding with caching
 * Embeddings are highly cacheable - same text = same vector
 *
 * @param {string} text - Text to embed
 * @param {string} scriptName - Calling script for tracking
 * @param {Object} options - Options including ttlSeconds
 * @returns {Promise<number[]>} Embedding vector
 */
export async function cachedEmbedding(text, scriptName, options = {}) {
  const cache = await initCache();
  const model = options.model || 'text-embedding-3-small';
  const ttl = options.ttlSeconds || 86400 * 7;  // 7 days default
  const key = `emb:${model}:${hashText(text)}`;

  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    await logCacheHit('openai', model, 'embeddings', scriptName, key);
    return cached;
  }

  // Generate and cache
  const embedding = await trackedEmbedding(text, scriptName, {
    ...options,
    cacheKey: key
  });
  await cache.set(key, embedding, ttl);

  return embedding;
}

/**
 * Get batch embeddings with caching
 * Only calls API for uncached texts
 *
 * @param {string[]} texts - Texts to embed
 * @param {string} scriptName - Calling script
 * @param {Object} options - Options
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function cachedBatchEmbedding(texts, scriptName, options = {}) {
  const cache = await initCache();
  const model = options.model || 'text-embedding-3-small';
  const ttl = options.ttlSeconds || 86400 * 7;

  const results = new Array(texts.length);
  const uncached = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const key = `emb:${model}:${hashText(texts[i])}`;
    const cached = await cache.get(key);
    if (cached) {
      results[i] = cached;
      await logCacheHit('openai', model, 'embeddings', scriptName, key);
    } else {
      uncached.push({ index: i, text: texts[i], key });
    }
  }

  // Batch embed uncached texts
  if (uncached.length > 0) {
    const { trackedBatchEmbedding } = await import('./llm-client.mjs');
    const embeddings = await trackedBatchEmbedding(
      uncached.map(u => u.text),
      scriptName,
      options
    );

    // Cache and store results
    for (let i = 0; i < uncached.length; i++) {
      results[uncached[i].index] = embeddings[i];
      await cache.set(uncached[i].key, embeddings[i], ttl);
    }
  }

  return results;
}

/**
 * Get OpenAI completion with caching
 * Cache hit depends on exact same messages
 *
 * @param {Array} messages - Chat messages
 * @param {string} scriptName - Calling script
 * @param {Object} options - Options
 * @returns {Promise<string>} Completion text
 */
export async function cachedCompletion(messages, scriptName, options = {}) {
  const cache = await initCache();
  const model = options.model || 'gpt-4o-mini';
  const ttl = options.ttlSeconds || 3600;  // 1 hour default
  const key = `cmp:${model}:${hashMessages(messages)}`;

  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    await logCacheHit('openai', model, 'chat', scriptName, key);
    return cached;
  }

  // Generate and cache
  const completion = await trackedCompletion(messages, scriptName, options);
  await cache.set(key, completion, ttl);

  return completion;
}

/**
 * Get Claude completion with caching
 */
export async function cachedClaudeCompletion(prompt, scriptName, options = {}) {
  const cache = await initCache();
  const model = options.model || 'claude-3-5-haiku-20241022';
  const ttl = options.ttlSeconds || 3600;

  const messages = Array.isArray(prompt)
    ? prompt
    : [{ role: 'user', content: prompt }];
  const key = `claude:${model}:${hashMessages(messages)}`;

  // Check cache
  const cached = await cache.get(key);
  if (cached) {
    await logCacheHit('anthropic', model, 'chat', scriptName, key);
    return cached;
  }

  // Generate and cache
  const completion = await trackedClaudeCompletion(prompt, scriptName, options);
  await cache.set(key, completion, ttl);

  return completion;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CACHE MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get cache instance for direct access
 */
export async function getCache() {
  return initCache();
}

/**
 * Invalidate cached embedding
 */
export async function invalidateEmbedding(text, model = 'text-embedding-3-small') {
  const cache = await initCache();
  const key = `emb:${model}:${hashText(text)}`;
  await cache.del(key);
}

/**
 * Clear all cached embeddings
 */
export async function clearEmbeddingCache() {
  const cache = await initCache();
  const keys = await cache.keys('emb:*');
  for (const key of keys) {
    await cache.del(key);
  }
  return keys.length;
}

/**
 * Clear all cached completions
 */
export async function clearCompletionCache() {
  const cache = await initCache();
  const keys = await cache.keys('cmp:*');
  const claudeKeys = await cache.keys('claude:*');
  const allKeys = [...keys, ...claudeKeys];
  for (const key of allKeys) {
    await cache.del(key);
  }
  return allKeys.length;
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const cache = await initCache();
  const stats = cache.stats();

  const embKeys = await cache.keys('emb:*');
  const cmpKeys = await cache.keys('cmp:*');
  const claudeKeys = await cache.keys('claude:*');

  return {
    ...stats,
    embeddings: embKeys.length,
    completions: cmpKeys.length,
    claudeCompletions: claudeKeys.length,
    total: embKeys.length + cmpKeys.length + claudeKeys.length
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'test') {
    console.log('Testing cache...\n');

    const cache = await initCache();
    console.log(`Cache backend: ${cache.name}\n`);

    // Test embedding cache
    console.log('Testing embedding cache...');
    const text = 'Hello world test ' + Date.now();

    console.time('First embedding (no cache)');
    const emb1 = await cachedEmbedding(text, 'cache-test');
    console.timeEnd('First embedding (no cache)');

    console.time('Second embedding (cached)');
    const emb2 = await cachedEmbedding(text, 'cache-test');
    console.timeEnd('Second embedding (cached)');

    console.log(`✓ Embeddings match: ${emb1.length === emb2.length}\n`);

    // Test completion cache
    console.log('Testing completion cache...');
    const messages = [{ role: 'user', content: 'Say hi in 3 words' }];

    console.time('First completion (no cache)');
    const comp1 = await cachedCompletion(messages, 'cache-test');
    console.timeEnd('First completion (no cache)');

    console.time('Second completion (cached)');
    const comp2 = await cachedCompletion(messages, 'cache-test');
    console.timeEnd('Second completion (cached)');

    console.log(`✓ Completions match: ${comp1 === comp2}\n`);

    // Stats
    const stats = await getCacheStats();
    console.log('Cache stats:', stats);

  } else if (command === 'stats') {
    const stats = await getCacheStats();
    console.log('Cache Statistics');
    console.log('━'.repeat(40));
    console.log(`Backend: ${stats.backend}`);
    console.log(`Embeddings cached: ${stats.embeddings}`);
    console.log(`Completions cached: ${stats.completions}`);
    console.log(`Claude cached: ${stats.claudeCompletions}`);
    console.log(`Total entries: ${stats.total}`);

  } else if (command === 'clear') {
    const type = process.argv[3];

    if (type === 'embeddings') {
      const count = await clearEmbeddingCache();
      console.log(`Cleared ${count} embedding cache entries`);
    } else if (type === 'completions') {
      const count = await clearCompletionCache();
      console.log(`Cleared ${count} completion cache entries`);
    } else if (type === 'all') {
      const cache = await initCache();
      await cache.flushAll();
      console.log('Cleared all cache entries');
    } else {
      console.log('Usage: node scripts/lib/cache.mjs clear [embeddings|completions|all]');
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/lib/cache.mjs test                  - Run cache tests');
    console.log('  node scripts/lib/cache.mjs stats                 - Show cache statistics');
    console.log('  node scripts/lib/cache.mjs clear [type]          - Clear cache (embeddings|completions|all)');
  }
}

export default {
  cachedEmbedding,
  cachedBatchEmbedding,
  cachedCompletion,
  cachedClaudeCompletion,
  getCache,
  invalidateEmbedding,
  clearEmbeddingCache,
  clearCompletionCache,
  getCacheStats
};
