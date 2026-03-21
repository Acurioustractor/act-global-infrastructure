/**
 * Project configuration loader with session-level caching.
 * Loads project codes from the projects table once per process lifetime.
 */

import type { SupabaseQueryClient } from '../types.js'
import type { ProjectConfig } from '../types.js'

let _cache: Record<string, ProjectConfig> | null = null

/** Load all project codes from the projects table (cached per process) */
export async function loadProjectCodes(
  supabase: SupabaseQueryClient
): Promise<Record<string, ProjectConfig>> {
  if (_cache) return _cache

  try {
    const { data } = await supabase
      .from('projects')
      .select('*')

    const projects: Record<string, ProjectConfig> = {}
    for (const row of data || []) {
      projects[row.code] = row as ProjectConfig
    }
    _cache = projects
    return projects
  } catch {
    _cache = {}
    return {}
  }
}

/** Clear the project codes cache (useful for testing or long-running processes) */
export function clearProjectCodesCache(): void {
  _cache = null
}
