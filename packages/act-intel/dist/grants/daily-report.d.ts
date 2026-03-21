/**
 * Daily grant report — urgency-grouped landscape with milestones, new opps, writing tasks.
 *
 * Extracted from Notion Workers Tool 33 (get_daily_grant_report).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface DailyGrantReportOptions {
    project_code?: string;
}
export interface ClosingGrant {
    name: string;
    days_left: number;
    amount_max: number | null;
    fit_score: number | null;
    application_status: string;
    aligned_projects: string[];
}
export interface ActiveApplication {
    application_name: string;
    project_code: string | null;
    status: string;
    amount_requested: number | null;
    completion_pct: number;
    next_milestone: string | null;
    next_milestone_due: string | null;
    next_milestone_days: number | null;
}
export interface NewOpportunity {
    name: string;
    provider: string | null;
    amount_max: number | null;
    fit_score: number | null;
    closes_at: string | null;
}
export interface WritingTask {
    application_name: string;
    milestone_name: string | null;
    due: string | null;
}
export interface AwardedGrant {
    application_name: string;
    amount_requested: number | null;
}
export interface DailyGrantReportResult {
    date: string;
    closingThisWeek: ClosingGrant[];
    closingThisMonth: ClosingGrant[];
    activeApplications: ActiveApplication[];
    pipelineValue: number;
    newlyDiscovered: NewOpportunity[];
    writingTasks: WritingTask[];
    awarded: AwardedGrant[];
    awardedValue: number;
    totalApplications: number;
    totalOpportunities: number;
}
export declare function fetchDailyGrantReport(supabase: SupabaseQueryClient, opts?: DailyGrantReportOptions): Promise<DailyGrantReportResult>;
//# sourceMappingURL=daily-report.d.ts.map