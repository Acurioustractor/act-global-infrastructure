/**
 * Projects needing attention — from v_projects_needing_attention view.
 *
 * Extracted from Notion Workers Tool 7 (get_attention_items).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ProjectAttentionOptions {
    project_code?: string;
}
export interface ProjectAttentionEntry {
    project_code: string;
    project_name: string;
    overall_score: number;
    health_status: string;
    momentum_score: number;
    alerts: Array<string | {
        message: string;
    }>;
    calculated_at: string | null;
}
export interface ProjectAttentionResult {
    count: number;
    projects: ProjectAttentionEntry[];
}
export declare function fetchProjectsNeedingAttention(supabase: SupabaseQueryClient, opts?: ProjectAttentionOptions): Promise<ProjectAttentionResult>;
//# sourceMappingURL=attention.d.ts.map