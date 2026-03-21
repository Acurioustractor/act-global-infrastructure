/**
 * Meeting actions — open action items from AI transcription and LLM extraction.
 *
 * Extracted from Notion Workers Tool 24 (get_meeting_actions).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface MeetingActionsOptions {
    project_code?: string;
    days_back?: number;
    include_completed?: boolean;
}
export interface AiActionGroup {
    meeting_title: string;
    date: string;
    project_code: string | null;
    source_url: string | null;
    items: Array<{
        action: string;
        completed: boolean;
    }>;
}
export interface ExtractedAction {
    title: string;
    date: string;
    project_code: string | null;
    assignee: string | null;
    importance: string | null;
}
export interface MeetingActionsResult {
    aiActions: AiActionGroup[];
    extractedActions: ExtractedAction[];
    totalCount: number;
}
export declare function fetchMeetingActions(supabase: SupabaseQueryClient, opts?: MeetingActionsOptions): Promise<MeetingActionsResult>;
//# sourceMappingURL=actions.d.ts.map