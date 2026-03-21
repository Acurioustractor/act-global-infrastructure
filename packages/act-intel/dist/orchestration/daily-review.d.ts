/**
 * Daily review — proactive orchestration that combines multiple intelligence
 * sources into a single actionable morning digest.
 *
 * Composes: briefing + grant deadlines + overdue finance actions + contacts
 * needing attention + unanswered emails + receipt pipeline status.
 */
import type { SupabaseQueryClient, DailyBriefingResult, ReceiptPipelineResult } from '../types.js';
import { type GrantDeadlinesResult } from '../grants/deadlines.js';
import { type OverdueActionsResult } from '../finance/overdue-actions.js';
import { type ContactAttentionResult } from '../contacts/attention.js';
import { type UnansweredEmailsResult } from '../emails/search.js';
import { type OutstandingInvoicesResult } from '../finance/outstanding-invoices.js';
export interface DailyReviewOptions {
    /** Only include items for this project */
    project_code?: string;
    /** Grant deadline lookahead in days (default 14) */
    grant_days_ahead?: number;
    /** Max contacts to surface (default 5) */
    contact_limit?: number;
    /** Max unanswered emails (default 10) */
    email_limit?: number;
}
export interface DailyReviewResult {
    date: string;
    briefing: DailyBriefingResult;
    grant_deadlines: GrantDeadlinesResult;
    finance_actions: OverdueActionsResult;
    contacts_needing_attention: ContactAttentionResult;
    unanswered_emails: UnansweredEmailsResult;
    receipt_pipeline: ReceiptPipelineResult;
    outstanding_invoices: OutstandingInvoicesResult;
    priority_summary: PrioritySummary;
}
export interface PrioritySummary {
    critical_items: PriorityItem[];
    attention_items: PriorityItem[];
    info_items: PriorityItem[];
}
export interface PriorityItem {
    category: 'grant' | 'finance' | 'contact' | 'email' | 'action' | 'receipt';
    urgency: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    detail: string;
}
export declare function fetchDailyReview(supabase: SupabaseQueryClient, opts?: DailyReviewOptions): Promise<DailyReviewResult>;
//# sourceMappingURL=daily-review.d.ts.map