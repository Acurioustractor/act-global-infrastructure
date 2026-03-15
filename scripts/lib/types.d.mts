/**
 * JSDoc Type Definitions for ACT Script Libraries
 *
 * Provides IntelliSense and type checking for the top script lib modules.
 * Usage: Reference via JSDoc @type or @import in .mjs files.
 *
 * Example:
 *   /** @type {import('./types.d.mts').SyncStats} *​/
 *   const stats = createSyncStats();
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// supabase-client.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SupabaseClientOptions {
  prefix?: string
  required?: boolean
}

export function getSupabase(options?: SupabaseClientOptions): SupabaseClient
export function getSupabaseOptional(options?: Omit<SupabaseClientOptions, 'required'>): SupabaseClient | null

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// sync-base.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SyncStats {
  created: number
  updated: number
  skipped: number
  errors: number
  total: number
  startTime: number
}

export interface SyncRunResult {
  success: boolean
  stats: SyncStats
  durationMs: number
  error?: string
}

export interface PaginateOptions {
  pageSize?: number
  maxPages?: number
  startCursor?: string | null
}

export interface PaginateResult<T> {
  data: T[]
  hasMore: boolean
  cursor?: string | null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// contact-matcher.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Contact {
  id?: string
  name?: string
  full_name?: string
  display_name?: string
  first_name?: string
  last_name?: string
  email?: string
  primary_email?: string
  emails?: string[]
  ghl_contact_id?: string
  organization?: string
  tags?: string[]
}

export interface MatchResult {
  contact: Contact | null
  matchedOn: string | null
  confidence: number
}

export interface BatchMatchResult {
  record: Record<string, unknown>
  contact: Contact | null
  matchedOn: string | null
  confidence: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// date-utils.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DateFormatOptions {
  format?: 'short' | 'long' | 'date' | 'time' | 'datetime'
}

export interface NotionDateRange {
  start: Date | null
  end: Date | null
}

export function parseXeroDate(xeroDate: string): Date | null
export function toBrisbane(date: Date | string, options?: DateFormatOptions): string
export function formatRelative(date: Date | string): string
export function toISODate(date: Date | string): string
export function startOfDayBrisbane(date?: Date): Date
export function parseNotionDate(notionDate: string | { start?: string; end?: string }): NotionDateRange
export function daysBetween(dateA: Date | string, dateB: Date | string): number
export function isWithinHours(date: Date | string, hours: number): boolean

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// project-loader.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Project {
  name: string
  code: string
  description?: string
  category?: string
  tier?: 'ecosystem' | 'studio' | 'satellite'
  importance_weight?: number
  status: 'active' | 'ideation' | 'sunsetting' | 'archived' | 'transferred'
  priority?: string
  leads?: string[]
  notion_page_id?: string
  notion_pages?: string[]
  ghl_tags?: string[]
  xero_tracking?: string
  dext_category?: string
  alma_program?: string
  lcaa_themes?: string[]
  cultural_protocols?: boolean
  parent_project?: string
  metadata?: Record<string, unknown>
}

export interface ProjectMatch {
  code: string
  name: string
  matchedOn: string
  score: number
}

export function loadProjects(options?: { supabase?: SupabaseClient; forceRefresh?: boolean }): Promise<Record<string, Project>>
export function getProjectByCode(code: string, options?: object): Promise<Project | null>
export function matchProjectFromText(text: string, options?: { activeOnly?: boolean }): Promise<ProjectMatch[]>
export function loadProjectsConfig(options?: object): Promise<{ projects: Record<string, Project> }>
export function clearCache(): void

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// llm-client.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LLMUsageEntry {
  provider: 'openai' | 'anthropic'
  model: string
  endpoint: string
  input_tokens: number
  output_tokens: number
  estimated_cost: number
  script_name: string
  agent_id?: string
  operation?: string
  latency_ms?: number
}

export interface EmbedOptions {
  model?: string
  dimensions?: number
}

export interface CompletionOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export function embed(text: string, options?: EmbedOptions): Promise<number[]>
export function complete(prompt: string, options?: CompletionOptions): Promise<string>
export function trackedEmbedding(text: string, scriptName: string, options?: EmbedOptions): Promise<number[]>
export function trackedCompletion(prompt: string, scriptName: string, options?: CompletionOptions): Promise<string>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// sync-status.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SyncStatusRecord {
  integration_name: string
  status: 'healthy' | 'error'
  last_success_at: string | null
  last_attempt_at: string | null
  last_error: string | null
  record_count?: number
  avg_duration_ms?: number
  is_stale: boolean
}

export function recordSyncStatus(
  supabase: SupabaseClient,
  integrationName: string,
  opts: { success: boolean; recordCount?: number; error?: string; durationMs?: number }
): Promise<void>

export function getSyncStatuses(supabase: SupabaseClient): Promise<SyncStatusRecord[]>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// audit.mjs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AuditOptions {
  targetId?: string
  userContext?: string
  triggerSource?: string
  inputSummary?: string | object
  outputSummary?: string | object
  culturalDataAccessed?: boolean
  metadata?: Record<string, unknown>
}

export interface Auditor {
  agentId: string
  action<T>(actionType: string, targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  read<T>(targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  write<T>(targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  sync<T>(targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  embed<T>(targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  delete<T>(targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  apiCall<T>(apiName: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  llmCall<T>(model: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  culturalAction<T>(actionType: string, targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
  log(actionType: string, targetTable: string, details?: Record<string, unknown>): Promise<void>
}

export function auditAction<T>(agentId: string, action: string, targetTable: string, fn: () => Promise<T>, options?: AuditOptions): Promise<T>
export function createAuditor(agentId: string, defaultOptions?: AuditOptions): Auditor
export function withAudit(agentId: string, action: string, targetTable: string): (fn: () => Promise<unknown>, options?: AuditOptions) => Promise<unknown>
export function getRecentAuditLogs(agentId: string, limit?: number): Promise<Array<Record<string, unknown>>>
export function getAgentHealth(hours?: number): Promise<Array<Record<string, unknown>>>
export function getRecentErrors(hours?: number): Promise<Array<Record<string, unknown>>>
