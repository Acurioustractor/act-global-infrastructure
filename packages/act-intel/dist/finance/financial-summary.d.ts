/**
 * Financial summary — pipeline, API costs, subscriptions, and spend by project.
 *
 * Merges agent-tools (pipeline + API costs + subscriptions) and
 * Notion Workers (spend by project + untagged + grant pipeline) into one function.
 */
import type { SupabaseQueryClient, FinancialSummaryResult } from '../types.js';
export interface FinancialSummaryOptions {
    days?: number;
    months?: number;
    projectCode?: string;
}
export declare function fetchFinancialSummary(supabase: SupabaseQueryClient, opts?: FinancialSummaryOptions): Promise<FinancialSummaryResult>;
//# sourceMappingURL=financial-summary.d.ts.map