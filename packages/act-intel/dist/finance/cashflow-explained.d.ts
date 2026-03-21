/**
 * Cashflow explained — monthly cash flow with variance explanations.
 *
 * Extracted from Notion Workers Tool 15 (explain_cashflow).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface CashflowExplainedOptions {
    months?: number;
}
export interface CashflowExplainedMonth {
    month: string;
    income: number;
    expenses: number;
    net: number;
    closing_balance: number;
    income_change: number | null;
    expense_change: number | null;
    explanations: Array<{
        explanation: string;
    }> | null;
}
export interface CashflowExplainedResult {
    months: CashflowExplainedMonth[];
}
export declare function fetchCashflowExplained(supabase: SupabaseQueryClient, opts?: CashflowExplainedOptions): Promise<CashflowExplainedResult>;
//# sourceMappingURL=cashflow-explained.d.ts.map