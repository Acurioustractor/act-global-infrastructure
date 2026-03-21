/**
 * Project health — unified query logic for project status and activity.
 *
 * Merges agent-tools (financials, comms, health status) and
 * Notion Workers (knowledge breakdown, grants pipeline) into one function.
 */
import type { SupabaseQueryClient } from '../types.js';
import type { ProjectHealthResult } from '../types.js';
export interface ProjectHealthOptions {
    projectCode?: string;
}
export declare function fetchProjectHealth(supabase: SupabaseQueryClient, opts?: ProjectHealthOptions): Promise<ProjectHealthResult>;
//# sourceMappingURL=health.d.ts.map