/**
 * Email search — unanswered emails and triage from Supabase views.
 *
 * Note: Gmail API direct search stays in agent-tools.ts (Google SDK dependency).
 * This module handles the Supabase-backed email views used by both consumers.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface UnansweredEmailsOptions {
    limit?: number;
}
export interface UnansweredEmailEntry {
    contact_name: string | null;
    contact_email: string | null;
    subject: string;
    summary: string | null;
    days_since: number | null;
    sentiment: string | null;
    topics: string[] | null;
}
export interface UnansweredEmailsResult {
    count: number;
    emails: UnansweredEmailEntry[];
}
export declare function fetchUnansweredEmails(supabase: SupabaseQueryClient, opts?: UnansweredEmailsOptions): Promise<UnansweredEmailsResult>;
export interface EmailTriageOptions {
    limit?: number;
}
export interface EmailTriageEntry {
    id: string;
    ghl_contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    subject: string;
    summary: string | null;
    days_since: number | null;
    sentiment: string | null;
    topics: string[] | null;
    tier: 1 | 2 | 3;
}
export interface EmailTriageResult {
    total: number;
    tier1: EmailTriageEntry[];
    tier2: EmailTriageEntry[];
    tier3: EmailTriageEntry[];
}
export declare function triageEmails(supabase: SupabaseQueryClient, opts?: EmailTriageOptions): Promise<EmailTriageResult>;
//# sourceMappingURL=search.d.ts.map