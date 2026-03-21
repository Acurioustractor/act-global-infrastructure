/**
 * Project summary — pre-generated daily summaries from project_summaries table.
 *
 * Extracted from agent-tools executeGetProjectSummary.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ProjectSummaryOptions {
    project_code: string;
}
export interface ProjectSummaryResult {
    project_code: string;
    summary: string;
    data_sources: string[] | null;
    stats: Record<string, unknown> | null;
    generated_at: string;
}
export declare function fetchProjectSummary(supabase: SupabaseQueryClient, opts: ProjectSummaryOptions): Promise<ProjectSummaryResult | null>;
//# sourceMappingURL=summary.d.ts.map