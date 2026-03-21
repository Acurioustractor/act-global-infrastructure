/**
 * Project configuration loader with session-level caching.
 * Loads project codes from the projects table once per process lifetime.
 */
import type { SupabaseQueryClient } from '../types.js';
import type { ProjectConfig } from '../types.js';
/** Load all project codes from the projects table (cached per process) */
export declare function loadProjectCodes(supabase: SupabaseQueryClient): Promise<Record<string, ProjectConfig>>;
/** Clear the project codes cache (useful for testing or long-running processes) */
export declare function clearProjectCodesCache(): void;
//# sourceMappingURL=projects.d.ts.map