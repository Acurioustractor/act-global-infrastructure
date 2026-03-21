/**
 * Meeting context — pre-load everything needed before walking into a meeting.
 *
 * Given attendees and/or a project, gathers: contact details, project health,
 * recent meetings, open actions, grant deadlines, and recent decisions.
 */
import type { SupabaseQueryClient, ProjectHealthResult } from '../types.js';
import type { OutstandingInvoicesResult } from '../finance/outstanding-invoices.js';
import { type ContactSearchResult } from '../contacts/search.js';
import { type MeetingActionsResult } from '../meetings/actions.js';
import { type MeetingSearchResult } from '../meetings/search.js';
import { type GrantDeadlinesResult } from '../grants/deadlines.js';
export interface MeetingContextOptions {
    /** Project code for this meeting */
    project_code?: string;
    /** Attendee names to look up */
    attendees?: string[];
    /** Days of meeting history to include (default 30) */
    history_days?: number;
}
export interface MeetingContextResult {
    project_code: string | null;
    attendee_profiles: ContactSearchResult[];
    project_health: ProjectHealthResult | null;
    recent_meetings: MeetingSearchResult;
    open_actions: MeetingActionsResult;
    upcoming_grant_deadlines: GrantDeadlinesResult;
    outstanding_invoices: OutstandingInvoicesResult | null;
    talking_points: string[];
}
export declare function fetchMeetingContext(supabase: SupabaseQueryClient, opts?: MeetingContextOptions): Promise<MeetingContextResult>;
//# sourceMappingURL=meeting-context.d.ts.map