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
export { GrantEngine } from './engine.ts';

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
} from './types.ts';

// Source plugins
export { createWebSearchPlugin } from './sources/web-search.ts';
export { createLLMKnowledgePlugin } from './sources/llm-knowledge.ts';
export { createGrantConnectPlugin } from './sources/grantconnect.ts';
export { SourceRegistry } from './sources/registry.ts';

// Utilities
export { normalize, normalizeDate, normalizeAmount, normalizeCategories, generateDedupKey } from './normalizer.ts';
export { deduplicateGrants, filterExisting } from './deduplicator.ts';
export { GrantRepository } from './storage/repository.ts';
