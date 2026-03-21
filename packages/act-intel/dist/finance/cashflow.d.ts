/**
 * Cashflow — current month actuals, projections, and outstanding invoices.
 *
 * Merges agent-tools forecast (snapshots + invoices + scenarios) and
 * Notion Workers summary (v_cashflow_summary view).
 */
import type { SupabaseQueryClient, CashflowResult } from '../types.js';
export interface CashflowOptions {
    monthsAhead?: number;
    monthsHistory?: number;
}
export declare function fetchCashflow(supabase: SupabaseQueryClient, opts?: CashflowOptions): Promise<CashflowResult>;
//# sourceMappingURL=cashflow.d.ts.map