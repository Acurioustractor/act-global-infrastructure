/**
 * Outstanding invoices — unpaid invoices from the v_outstanding_invoices view.
 *
 * Extracted from Notion Workers Tool 10 (get_outstanding_invoices).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface OutstandingInvoicesOptions {
    project_code?: string;
}
export interface OutstandingInvoice {
    invoice_number: string | null;
    contact_name: string | null;
    project_code: string | null;
    type: string | null;
    total: number;
    amount_due: number;
    amount_paid: number;
    due_date: string | null;
    aging_bucket: string | null;
    days_overdue: number;
}
export interface OutstandingInvoicesResult {
    count: number;
    totalDue: number;
    invoices: OutstandingInvoice[];
}
export declare function fetchOutstandingInvoices(supabase: SupabaseQueryClient, opts?: OutstandingInvoicesOptions): Promise<OutstandingInvoicesResult>;
//# sourceMappingURL=outstanding-invoices.d.ts.map