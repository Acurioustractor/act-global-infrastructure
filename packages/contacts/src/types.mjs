/**
 * @act/contacts — Type Definitions (JSDoc)
 *
 * Shared types for contact management across all ACT codebases.
 * Import via: import { } from '@act/contacts/types'
 *
 * For TypeScript projects, see types.d.mts for full interface definitions.
 */

/**
 * @typedef {Object} Contact
 * @property {string} [id] - Internal UUID
 * @property {string} [ghl_id] - GoHighLevel contact ID
 * @property {string} [ghl_contact_id] - Alias for ghl_id
 * @property {string} [name] - Display name
 * @property {string} [full_name] - Full name
 * @property {string} [display_name] - Preferred display name
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [email] - Primary email
 * @property {string} [primary_email] - Alias for primary email
 * @property {string[]} [emails] - All known emails
 * @property {string} [phone]
 * @property {string} [company_name] - Organization/company
 * @property {string} [organization] - Alias for company
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [country]
 * @property {string[]} [tags]
 * @property {string} [source] - Where contact was created from
 * @property {boolean} [auto_created] - Whether auto-created from email/webhook
 * @property {string} [enrichment_status] - 'pending' | 'enriched' | 'failed'
 * @property {string} [enriched_at] - ISO timestamp of last enrichment
 * @property {Object} [enrichment_data] - Full enrichment JSONB blob
 * @property {string[]} [enrichment_sources] - Sources used for enrichment
 * @property {string} [enriched_role] - Job title from enrichment
 * @property {string} [enriched_sector] - Sector classification
 * @property {string} [enriched_bio] - Professional summary
 * @property {string} [enriched_website] - Website URL
 * @property {Object[]} [enriched_projects] - Matched ACT projects
 * @property {string} [canonical_entity_id] - Cross-source dedup ID
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} MatchResult
 * @property {Contact|null} contact - Matched contact or null
 * @property {string|null} matchedOn - 'id' | 'email' | 'name' | null
 * @property {number} confidence - 0.0 to 1.0
 */

/**
 * @typedef {Object} BatchMatchResult
 * @property {Object} record - Original input record
 * @property {Contact|null} contact
 * @property {string|null} matchedOn
 * @property {number} confidence
 */

/**
 * @typedef {Object} EnrichmentResult
 * @property {string} status - 'enriched' | 'skipped' | 'error'
 * @property {string} [contact] - Contact ID
 * @property {string} [name] - Contact name
 * @property {string[]} [sources] - Data sources used
 * @property {Object} [data] - Extracted enrichment data
 * @property {Object[]} [projectMatches] - ACT project alignment
 * @property {string} [error] - Error message if failed
 * @property {string} [reason] - Skip reason if skipped
 */

/**
 * @typedef {Object} EnrichmentData
 * @property {string} [organization] - Company/org name
 * @property {string} [role] - Job title
 * @property {string} [sector] - Sector classification
 * @property {string} [location] - City, Country
 * @property {string} [bio] - Professional summary
 * @property {string} [website] - URL
 * @property {string[]} [interests] - Topics of interest
 * @property {Object} [social_profiles] - { linkedin, twitter, github }
 * @property {string} confidence - 'high' | 'medium' | 'low'
 */

/**
 * @typedef {Object} RelationshipScore
 * @property {string} contactId
 * @property {string} contactName
 * @property {number} score - 0-100 relationship health
 * @property {string} trend - 'growing' | 'stable' | 'cooling' | 'dormant'
 * @property {number} daysSinceContact - Days since last interaction
 * @property {number} totalInteractions
 * @property {string[]} sharedProjects - ACT projects in common
 */

/**
 * @typedef {Object} ContactSearchOptions
 * @property {string} [query] - Free-text search
 * @property {string[]} [tags] - Filter by tags
 * @property {string} [sector] - Filter by enriched sector
 * @property {string} [enrichmentStatus] - 'pending' | 'enriched' | 'failed'
 * @property {string} [project] - Filter by linked project code
 * @property {number} [limit] - Max results (default: 50)
 * @property {number} [offset] - Pagination offset
 * @property {string} [orderBy] - Sort field
 */

export const SECTORS = [
  'technology', 'education', 'arts', 'government', 'nonprofit',
  'health', 'environment', 'finance', 'social-enterprise',
  'indigenous', 'community', 'legal', 'media', 'other',
];

export const ENRICHMENT_STATUSES = ['pending', 'enriched', 'failed'];

export const MATCH_CONFIDENCE = {
  ID: 1.0,
  EMAIL: 0.95,
  NAME_EXACT: 0.85,
  NAME_FUZZY: 0.7,
  NONE: 0,
};
