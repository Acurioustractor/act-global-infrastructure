/**
 * Meeting search — search meetings by project, participant, date, keyword.
 *
 * Extracted from Notion Workers Tool 23 (query_meeting_notes).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface MeetingSearchOptions {
    query?: string;
    project_code?: string;
    participant?: string;
    days_back?: number;
    include_transcript?: boolean;
    limit?: number;
}
export interface MeetingSearchEntry {
    id: string;
    title: string | null;
    date: string;
    duration: number | null;
    project_code: string | null;
    participants: string[];
    summary: string | null;
    ai_action_items: Array<{
        action: string;
        completed: boolean;
    }> | null;
    strategic_relevance: string | null;
    transcript: string | null;
    source_url: string | null;
}
export interface MeetingSearchResult {
    count: number;
    meetings: MeetingSearchEntry[];
}
export declare function searchMeetings(supabase: SupabaseQueryClient, opts?: MeetingSearchOptions): Promise<MeetingSearchResult>;
//# sourceMappingURL=search.d.ts.map