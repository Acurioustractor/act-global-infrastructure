/**
 * Data freshness — sync status and staleness for all integrations.
 *
 * Extracted from Notion Workers Tool 11 (get_data_freshness).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface DataFreshnessOptions {
    integration?: string;
}
export interface IntegrationStatus {
    name: string;
    status: string;
    last_sync: string | null;
    hours_ago: number | null;
    record_count: number | null;
    last_error: string | null;
    is_stale: boolean;
}
export interface DataFreshnessResult {
    staleCount: number;
    integrations: IntegrationStatus[];
}
export declare function fetchDataFreshness(supabase: SupabaseQueryClient, opts?: DataFreshnessOptions): Promise<DataFreshnessResult>;
//# sourceMappingURL=freshness.d.ts.map