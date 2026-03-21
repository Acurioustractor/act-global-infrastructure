/**
 * Grants summary — pipeline dashboard with counts, deadlines, and value.
 *
 * Extracted from Notion Workers Tool 29 (get_grants_summary).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantsSummaryOptions {
    project_code?: string;
}
export interface ClosingSoonGrant {
    name: string;
    days_left: number;
    amount_max: number | null;
    aligned_projects: string[];
    application_status: string;
}
export interface RecentlyUpdatedGrant {
    name: string;
    application_status: string;
    updated_at: string;
}
export interface GrantsSummaryResult {
    total: number;
    pipelineValue: number;
    statusCounts: Record<string, number>;
    closingSoon: ClosingSoonGrant[];
    recentlyUpdated: RecentlyUpdatedGrant[];
    byProject: Record<string, number>;
}
export declare function fetchGrantsSummary(supabase: SupabaseQueryClient, opts?: GrantsSummaryOptions): Promise<GrantsSummaryResult>;
//# sourceMappingURL=summary.d.ts.map