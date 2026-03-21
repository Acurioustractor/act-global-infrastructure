/**
 * Reconciliation status — tagged %, reconciled %, receipt coverage, stuck items.
 *
 * Extracted from Notion Workers Tool 34 (get_reconciliation_status).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ReconciliationOptions {
    days_back?: number;
}
export interface UntaggedVendor {
    name: string;
    count: number;
    total: number;
}
export interface StuckItem {
    date: string | null;
    contact_name: string | null;
    total: number;
}
export interface ReconciliationResult {
    period: string;
    total: number;
    tagged: number;
    reconciled: number;
    withReceipt: number;
    topUntaggedVendors: UntaggedVendor[];
    stuckItems: StuckItem[];
}
export declare function fetchReconciliationStatus(supabase: SupabaseQueryClient, opts?: ReconciliationOptions): Promise<ReconciliationResult>;
//# sourceMappingURL=reconciliation.d.ts.map