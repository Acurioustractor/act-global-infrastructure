/**
 * Untagged summary — untagged transactions grouped by vendor with suggested codes.
 *
 * Extracted from Notion Workers Tool 35 (get_untagged_summary).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface UntaggedSummaryOptions {
    limit?: number;
}
export interface UntaggedVendorGroup {
    name: string;
    count: number;
    total: number;
    dateRange: string;
    suggestedCode: string | null;
}
export interface UntaggedSummaryResult {
    totalTransactions: number;
    totalVendors: number;
    totalValue: number;
    vendors: UntaggedVendorGroup[];
}
export declare function fetchUntaggedSummary(supabase: SupabaseQueryClient, opts?: UntaggedSummaryOptions): Promise<UntaggedSummaryResult>;
//# sourceMappingURL=untagged-summary.d.ts.map