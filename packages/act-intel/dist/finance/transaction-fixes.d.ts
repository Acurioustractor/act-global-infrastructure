/**
 * Transaction fixes — unmapped transactions, duplicate subscriptions, critical variances.
 *
 * Extracted from Notion Workers Tool 19 (suggest_transaction_fixes).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface TransactionFixesOptions {
    limit?: number;
}
export interface UnmappedTransaction {
    date: string | null;
    contact_name: string | null;
    total: number;
    suggested_project: string | null;
    suggested_category: string | null;
}
export interface DuplicateSubscription {
    contact_name: string;
    count: number;
    total: number;
}
export interface CriticalVariance {
    project_code: string | null;
    month: string | null;
    variance_type: string | null;
    explanation: string | null;
}
export interface TransactionFixesResult {
    unmapped: {
        total: number;
        withSuggestion: Array<{
            date: string | null;
            contact_name: string | null;
            total: number;
            suggested_project: string | null;
            suggested_category: string | null;
        }>;
        withoutSuggestion: Array<{
            date: string | null;
            contact_name: string | null;
            total: number;
        }>;
    };
    duplicates: DuplicateSubscription[];
    criticalVariances: CriticalVariance[];
}
export declare function fetchTransactionFixes(supabase: SupabaseQueryClient, opts?: TransactionFixesOptions): Promise<TransactionFixesResult>;
//# sourceMappingURL=transaction-fixes.d.ts.map