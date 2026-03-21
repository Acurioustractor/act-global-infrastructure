/**
 * Weekly cleanup — find stale, orphaned, and incomplete items across all databases.
 *
 * Designed to run on Mondays to surface data hygiene issues before the week starts.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface WeeklyCleanupOptions {
    /** Days before an action is considered stale (default 14) */
    stale_threshold_days?: number;
    /** Days before a contact is considered inactive (default 30) */
    contact_inactive_days?: number;
}
export interface StaleAction {
    id: string;
    title: string;
    project_code: string | null;
    follow_up_date: string | null;
    days_overdue: number;
    importance: string | null;
}
export interface OrphanedItem {
    id: string;
    title: string;
    knowledge_type: string;
    recorded_at: string;
    reason: string;
}
export interface IncompleteContact {
    id: string;
    name: string;
    missing_fields: string[];
    engagement_status: string | null;
}
export interface StaleProject {
    code: string;
    name: string;
    days_since_activity: number;
    open_actions: number;
}
export interface WeeklyCleanupResult {
    generated_at: string;
    stale_actions: StaleAction[];
    orphaned_items: OrphanedItem[];
    incomplete_contacts: IncompleteContact[];
    stale_projects: StaleProject[];
    summary: {
        total_issues: number;
        stale_action_count: number;
        orphaned_count: number;
        incomplete_contact_count: number;
        stale_project_count: number;
    };
}
export declare function fetchWeeklyCleanup(supabase: SupabaseQueryClient, opts?: WeeklyCleanupOptions): Promise<WeeklyCleanupResult>;
//# sourceMappingURL=weekly-cleanup.d.ts.map