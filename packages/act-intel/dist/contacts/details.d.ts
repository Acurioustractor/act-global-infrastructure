/**
 * Contact details — comprehensive contact card with health signals,
 * recent communications, pipeline, and next meeting.
 *
 * Extracted from agent-tools executeGetContactDetails.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ContactDetailsOptions {
    contact_id: string;
}
export interface ContactDetailsResult {
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
    relationship: {
        temperature: number;
        trend: string | null;
        last_change: string | null;
        lcaa_stage: string | null;
        risk_flags: string[];
        signals: {
            email: number;
            calendar: number;
            financial: number;
            pipeline: number;
            knowledge: number;
        };
    } | null;
    open_pipeline: {
        count: number;
        total_value: number;
        opportunities: Array<{
            name: string;
            value: number | null;
            stage: string | null;
        }>;
    };
    next_meeting: {
        title: string;
        date: string;
    } | null;
    recent_communications: Array<{
        direction: string;
        channel: string;
        subject: string | null;
        summary: string | null;
        date: string;
    }>;
}
export declare function fetchContactDetails(supabase: SupabaseQueryClient, opts: ContactDetailsOptions): Promise<ContactDetailsResult | null>;
//# sourceMappingURL=details.d.ts.map