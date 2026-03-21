/**
 * Grant deadlines — upcoming deadlines with milestone progress and urgency.
 *
 * Merges agent-tools (executeGetGrantOpportunities with deadlines) and
 * Notion Workers (check_grant_deadlines).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantDeadlinesOptions {
    days_ahead?: number;
    project_code?: string;
}
export interface GrantDeadlineEntry {
    id: string;
    application_name: string;
    provider: string;
    opportunity_name: string;
    project_code: string | null;
    deadline: string;
    days_remaining: number;
    amount_requested: number | null;
    urgency: 'CRITICAL' | 'URGENT' | 'SOON' | 'UPCOMING' | 'PLANNED';
    progress: {
        total: number;
        completed: number;
        pct: number;
    };
    overdue_milestones: string[];
}
export interface GrantDeadlinesResult {
    days_ahead: number;
    count: number;
    deadlines: GrantDeadlineEntry[];
}
export declare function fetchGrantDeadlines(supabase: SupabaseQueryClient, opts?: GrantDeadlinesOptions): Promise<GrantDeadlinesResult>;
//# sourceMappingURL=deadlines.d.ts.map