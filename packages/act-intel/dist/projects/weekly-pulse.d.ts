/**
 * Weekly project pulse — Monday morning overview per active project.
 *
 * Extracted from Notion Workers Tool 31 (get_weekly_project_pulse).
 * This is the second-largest query function.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface WeeklyPulseOptions {
    project_code?: string;
    include_financials?: boolean;
}
export interface ProjectPulseEntry {
    code: string;
    statusLabel: 'ACTIVE' | 'QUIET' | 'STALE';
    daysSinceActivity: number | null;
    healthScore: number | null;
    overdueActions: number;
    openActions: number;
    pendingDecisions: number;
    lastMeetingDate: string | null;
    daysSinceMeeting: number | null;
    grants: {
        count: number;
        pipelineValue: number;
        nextDeadline: string | null;
        nextDeadlineDays: number | null;
    };
    invoices: {
        count: number;
        totalOutstanding: number;
    };
    contacts: {
        warm: Array<{
            name: string;
            temperature: number | null;
        }>;
        cooling: Array<{
            name: string;
            temperature: number | null;
        }>;
    };
}
export interface WeeklyProjectPulseResult {
    date: string;
    projects: ProjectPulseEntry[];
    summary: {
        totalProjects: number;
        totalOpenActions: number;
        totalPendingDecisions: number;
        totalActiveGrants: number;
    };
    untaggedActionCount: number | null;
}
export declare function fetchWeeklyProjectPulse(supabase: SupabaseQueryClient, opts?: WeeklyPulseOptions): Promise<WeeklyProjectPulseResult>;
//# sourceMappingURL=weekly-pulse.d.ts.map