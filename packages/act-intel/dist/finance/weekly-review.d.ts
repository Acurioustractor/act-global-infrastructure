/**
 * Weekly financial review — comprehensive weekly finance overview.
 *
 * Extracted from Notion Workers Tool 22 (run_weekly_financial_review).
 * This is the largest single query function, pulling from ~10 tables.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface WeeklyReviewOptions {
    weekAgoDate?: string;
}
export interface WeeklyReviewCashPosition {
    balance: number;
    balanceChange: number;
    burnRate: number;
    runway: number;
}
export interface WeeklyReviewThisWeek {
    income: number;
    expenses: number;
    net: number;
    topIncome: Array<[string, number]>;
    topExpenses: Array<[string, number]>;
    transactionCount: number;
}
export interface WeeklyReviewOverdueInvoice {
    contact_name: string | null;
    amount_due: number;
    days_overdue: number;
    invoice_number: string | null;
}
export interface WeeklyReviewOverdueInvoices {
    count: number;
    totalDue: number;
    buckets: {
        current: number;
        '1-30d': number;
        '31-60d': number;
        '61-90d': number;
        '90d+': number;
    };
    items: WeeklyReviewOverdueInvoice[];
}
export interface WeeklyReviewReceiptGap {
    score: number;
    matched: number;
    total: number;
    missing: number;
}
export interface WeeklyReviewProjectSpend {
    code: string;
    amount: number;
}
export interface WeeklyReviewGrantDeadline {
    application_name: string;
    milestone_name: string;
    days_remaining: number;
}
export interface WeeklyReviewRdSpend {
    thisWeek: number;
    ytd: number;
    offset435: number;
}
export interface WeeklyReviewDataQuality {
    coverage: number;
    untagged: number;
    total: number;
}
export interface WeeklyReviewActionItem {
    type: string;
    description: string;
}
export interface WeeklyFinancialReviewResult {
    weekOf: string;
    cashPosition: WeeklyReviewCashPosition;
    thisWeek: WeeklyReviewThisWeek;
    overdueInvoices: WeeklyReviewOverdueInvoices;
    receiptGap: WeeklyReviewReceiptGap;
    projectSpend: WeeklyReviewProjectSpend[];
    grantDeadlines: WeeklyReviewGrantDeadline[];
    rdSpend: WeeklyReviewRdSpend;
    dataQuality: WeeklyReviewDataQuality;
    actionItems: WeeklyReviewActionItem[];
}
export declare function fetchWeeklyFinancialReview(supabase: SupabaseQueryClient, opts?: WeeklyReviewOptions): Promise<WeeklyFinancialReviewResult>;
//# sourceMappingURL=weekly-review.d.ts.map