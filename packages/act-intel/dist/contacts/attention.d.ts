/**
 * Contacts needing attention — finds contacts with falling relationship
 * temperature or active risk flags, with fallback to date threshold.
 *
 * Extracted from agent-tools executeGetContactsNeedingAttention.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ContactAttentionOptions {
    limit?: number;
    project?: string;
}
export interface ContactAttentionEntry {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string | null;
    tags: string[];
    projects: string[];
    last_contact: string | null;
    days_since_contact: number | null;
    temperature: number | null;
    trend: string | null;
    temperature_change: string | null;
    risk_flags: string[];
    recommended_action: string;
}
export interface ContactAttentionResult {
    description: string;
    count: number;
    contacts: ContactAttentionEntry[];
}
export declare function fetchContactsNeedingAttention(supabase: SupabaseQueryClient, opts?: ContactAttentionOptions): Promise<ContactAttentionResult>;
//# sourceMappingURL=attention.d.ts.map