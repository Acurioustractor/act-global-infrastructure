/**
 * Grant readiness — aggregated readiness scores with requirement breakdowns
 * and available reusable assets.
 *
 * Merges agent-tools (executeGetGrantReadiness) and
 * Notion Workers (get_grant_readiness).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantReadinessOptions {
    application_id?: string;
    grant_name?: string;
    min_readiness?: number;
    status?: string;
}
export interface GrantReadinessEntry {
    grant_name: string;
    provider: string | null;
    status: string | null;
    readiness_pct: number;
    days_until_close: number | null;
    closes_at: string | null;
    total_requirements: number;
    ready_count: number;
    needed_count: number;
    missing_docs: Array<{
        type: string;
        notes: string | null;
    }>;
    ready_docs: string[];
    available_assets: Array<{
        name: string;
        category: string | null;
        type: string | null;
        expires: string | null;
    }>;
    milestones: {
        total: number;
        completed: number;
    };
    fit_score: number | null;
    amount_max: number | null;
    lead_contact: string | null;
    assigned_to: string | null;
    priority: string | null;
}
export interface GrantReadinessResult {
    count: number;
    ready_count: number;
    applications: GrantReadinessEntry[];
}
export declare function fetchGrantReadiness(supabase: SupabaseQueryClient, opts?: GrantReadinessOptions): Promise<GrantReadinessResult>;
//# sourceMappingURL=readiness.d.ts.map