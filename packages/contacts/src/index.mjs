/**
 * @act/contacts — Unified Contact Management for ACT Ecosystem
 *
 * Provides matching, enrichment, repository, and relationship analysis
 * for contacts across any ACT codebase.
 *
 * Usage:
 *   // Full import
 *   import { ContactMatcher, ContactEnricher, SupabaseContactRepository, RelationshipAnalyzer } from '@act/contacts';
 *
 *   // Subpath imports (tree-shakeable)
 *   import { ContactMatcher } from '@act/contacts/matching';
 *   import { ContactEnricher } from '@act/contacts/enrichment';
 *   import { SupabaseContactRepository } from '@act/contacts/repository';
 *   import { RelationshipAnalyzer } from '@act/contacts/relationships';
 *   import { SECTORS, MATCH_CONFIDENCE } from '@act/contacts/types';
 */

// Core modules
export { ContactMatcher } from './matching/index.mjs';
export { ContactEnricher, searchTavily, fetchWebsite, lookupGitHub, crossRefLinkedIn, isPersonalEmail } from './enrichment/index.mjs';
export { SupabaseContactRepository } from './repository/index.mjs';
export { RelationshipAnalyzer } from './relationships/index.mjs';

// Types and constants
export { SECTORS, ENRICHMENT_STATUSES, MATCH_CONFIDENCE } from './types.mjs';
