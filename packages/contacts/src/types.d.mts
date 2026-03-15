/**
 * @act/contacts — TypeScript Type Definitions
 *
 * Full interface definitions for TypeScript consumers.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Core Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Contact {
  id?: string
  ghl_id?: string
  ghl_contact_id?: string
  name?: string
  full_name?: string
  display_name?: string
  first_name?: string
  last_name?: string
  email?: string
  primary_email?: string
  emails?: string[]
  phone?: string
  company_name?: string
  organization?: string
  city?: string
  state?: string
  country?: string
  tags?: string[]
  source?: string
  auto_created?: boolean
  enrichment_status?: 'pending' | 'enriched' | 'failed'
  enriched_at?: string
  enrichment_data?: Record<string, unknown>
  enrichment_sources?: string[]
  enriched_role?: string
  enriched_sector?: string
  enriched_bio?: string
  enriched_website?: string
  enriched_projects?: ProjectMatch[]
  canonical_entity_id?: string
  metadata?: Record<string, unknown>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Matching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MatchResult {
  contact: Contact | null
  matchedOn: 'id' | 'email' | 'name' | null
  confidence: number
}

export interface BatchMatchResult {
  record: Record<string, unknown>
  contact: Contact | null
  matchedOn: string | null
  confidence: number
}

export interface MatcherStats {
  totalContacts: number
  emailIndex: number
  nameIndex: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Enrichment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Sector =
  | 'technology' | 'education' | 'arts' | 'government' | 'nonprofit'
  | 'health' | 'environment' | 'finance' | 'social-enterprise'
  | 'indigenous' | 'community' | 'legal' | 'media' | 'other'

export interface EnrichmentResult {
  status: 'enriched' | 'skipped' | 'error'
  contact?: string
  name?: string
  sources?: string[]
  data?: EnrichmentData
  projectMatches?: ProjectMatch[]
  error?: string
  reason?: string
}

export interface EnrichmentData {
  organization?: string
  role?: string
  sector?: Sector
  location?: string
  bio?: string
  website?: string
  interests?: string[]
  social_profiles?: { linkedin?: string; twitter?: string; github?: string }
  confidence: 'high' | 'medium' | 'low'
}

export interface EnrichmentOptions {
  limit?: number
  status?: string
  includeStale?: boolean
}

export interface ProjectMatch {
  code: string
  name: string
  score: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Relationships
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RelationshipScore {
  contactId: string
  contactName: string
  score: number
  trend: 'growing' | 'stable' | 'cooling' | 'dormant'
  daysSinceContact: number
  totalInteractions: number
  sharedProjects: string[]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Repository
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ContactSearchOptions {
  query?: string
  tags?: string[]
  sector?: Sector
  enrichmentStatus?: 'pending' | 'enriched' | 'failed'
  project?: string
  limit?: number
  offset?: number
  orderBy?: string
}

export interface ContactRepository {
  getById(id: string): Promise<Contact | null>
  getByEmail(email: string): Promise<Contact | null>
  search(options: ContactSearchOptions): Promise<Contact[]>
  upsert(contact: Partial<Contact>): Promise<Contact>
  updateEnrichment(id: string, data: Partial<Contact>): Promise<void>
  getEnrichmentQueue(limit?: number): Promise<Contact[]>
  recordInteraction(contactId: string, interaction: Record<string, unknown>): Promise<void>
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Class Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export declare class ContactMatcher {
  constructor(contacts?: Contact[])
  readonly contacts: Contact[]
  readonly stats: MatcherStats
  findByEmail(email: string): Contact | null
  findById(id: string): Contact | null
  findByName(name: string): Contact | null
  findBestMatch(criteria: { email?: string; name?: string; id?: string }): MatchResult
  batchMatch(records: Record<string, unknown>[], options?: { emailField?: string; nameField?: string }): BatchMatchResult[]
  static fromSupabase(supabase?: SupabaseClient, options?: { table?: string; select?: string }): Promise<ContactMatcher>
}

export declare class ContactEnricher {
  constructor(options?: { supabase?: SupabaseClient; verbose?: boolean; dryRun?: boolean; llmFn?: Function; projectMatchFn?: Function })
  readonly stats: { enriched: number; skipped: number; errors: number; total: number }
  enrichContact(contactId: string): Promise<EnrichmentResult>
  enrichByEmail(email: string): Promise<EnrichmentResult>
  enrichBatch(options?: EnrichmentOptions): Promise<{ status: string; stats: object; results: EnrichmentResult[] }>
  getEnrichmentStats(): Promise<Record<string, number>>
}

export declare class SupabaseContactRepository {
  constructor(supabase: SupabaseClient)
  getById(id: string): Promise<Contact | null>
  getByEmail(email: string): Promise<Contact | null>
  search(options?: ContactSearchOptions): Promise<Contact[]>
  upsert(contact: Partial<Contact>): Promise<Contact>
  updateEnrichment(id: string, data: Partial<Contact>): Promise<void>
  getEnrichmentQueue(limit?: number): Promise<Contact[]>
  recordInteraction(contactId: string, interaction: Record<string, unknown>): Promise<void>
}

export declare class RelationshipAnalyzer {
  constructor(supabase: SupabaseClient)
  scoreRelationship(contactId: string): Promise<RelationshipScore>
  getTopRelationships(limit?: number): Promise<RelationshipScore[]>
  getStaleRelationships(daysSince?: number): Promise<RelationshipScore[]>
  getRelationshipsByProject(projectCode: string): Promise<RelationshipScore[]>
}
