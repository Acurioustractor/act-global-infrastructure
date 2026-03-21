/**
 * Contact search — find contacts by name/email/company and enrich with
 * last interaction and open pipeline value.
 *
 * Merges agent-tools (executeSearchContacts) and
 * Notion Workers (lookup_contact).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ContactSearchOptions {
    query: string;
    limit?: number;
}
export interface ContactSearchEntry {
    id: string;
    ghl_id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    status: string | null;
    tags: string[];
    projects: string[];
    last_contact: string | null;
    days_since_contact: number | null;
    last_interaction_topic: string | null;
    last_interaction_date: string | null;
    open_pipeline_value: number | null;
    temperature: number | null;
    temperature_trend: string | null;
    signals: {
        email: number;
        calendar: number;
        financial: number;
        pipeline: number;
    } | null;
    risk_flags: unknown[] | null;
    recent_comms_30d: number | null;
}
export interface ContactSearchResult {
    query: string;
    count: number;
    contacts: ContactSearchEntry[];
}
export declare function searchContacts(supabase: SupabaseQueryClient, opts: ContactSearchOptions): Promise<ContactSearchResult>;
//# sourceMappingURL=search.d.ts.map