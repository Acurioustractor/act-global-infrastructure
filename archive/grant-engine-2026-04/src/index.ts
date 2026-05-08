/**
 * GrantScope — Open Source Grant Discovery Engine
 *
 * Pluggable source architecture for discovering grants from:
 * - Government portals (GrantConnect, QLD, etc.)
 * - AI web search (Anthropic web_search)
 * - LLM knowledge (Claude training data)
 * - APIs (grants.gov, etc.)
 *
 * Usage:
 *   import { GrantEngine } from '@act/grant-engine';
 *
 *   const engine = new GrantEngine({ supabase, sources: ['grantconnect', 'web-search'] });
 *   const result = await engine.discover({ geography: ['AU'], categories: ['arts'] });
 */

// Core engine
export { GrantEngine } from './engine.js';

// Types
export type {
  SourcePlugin,
  SourcePluginConfig,
  DiscoveryQuery,
  DiscoveryRunResult,
  DiscoveryRunStats,
  RawGrant,
  CanonicalGrant,
  GrantSource,
  ScoredGrant,
  GrantScorer,
  GrantEngineConfig,
  ExistingGrantRecord,
} from './types.js';

// Source plugins
export { createWebSearchPlugin } from './sources/web-search.js';
export { createLLMKnowledgePlugin } from './sources/llm-knowledge.js';
export { createGrantConnectPlugin } from './sources/grantconnect.js';
export { SourceRegistry } from './sources/registry.js';

// Utilities
export { normalize, normalizeDate, normalizeAmount, normalizeCategories, generateDedupKey } from './normalizer.js';
export { deduplicateGrants, filterExisting } from './deduplicator.js';
export { GrantRepository } from './storage/repository.js';
