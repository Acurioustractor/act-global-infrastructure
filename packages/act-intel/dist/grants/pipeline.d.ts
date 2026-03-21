/**
 * Grants pipeline — active grant applications and funding opportunities.
 *
 * Merges agent-tools (executeGetGrantPipeline + executeGetGrantOpportunities)
 * and Notion Workers (get_funding_pipeline).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantPipelineOptions {
    status?: string;
    limit?: number;
}
export interface GrantApplicationEntry {
    id: string;
    name: string;
    amount_requested: number | null;
    status: string;
    started_at: string | null;
    submitted_at: string | null;
    outcome_at: string | null;
    lead_contact: string | null;
    team: string[];
    project_code: string | null;
    outcome_amount: number | null;
    outcome_notes: string | null;
}
export interface GrantPipelineResult {
    status_filter: string;
    count: number;
    applications: GrantApplicationEntry[];
}
export declare function fetchGrantPipeline(supabase: SupabaseQueryClient, opts?: GrantPipelineOptions): Promise<GrantPipelineResult>;
export interface GrantOpportunitiesOptions {
    status?: string;
    limit?: number;
    days_ahead?: number;
    category?: string;
}
export interface GrantOpportunityEntry {
    id: string;
    name: string;
    provider: string;
    program: string | null;
    amount_range: string;
    amount_min: number | null;
    amount_max: number | null;
    opens_at: string | null;
    closes_at: string | null;
    days_until_close: number | null;
    status: string;
    fit_score: number | null;
    fit_notes: string | null;
    aligned_projects: string[];
    categories: string[];
    url: string | null;
    funder_name: string | null;
    focus_areas: string[] | null;
}
export interface GrantOpportunitiesResult {
    status_filter: string;
    count: number;
    grants: GrantOpportunityEntry[];
}
export declare function fetchGrantOpportunities(supabase: SupabaseQueryClient, opts?: GrantOpportunitiesOptions): Promise<GrantOpportunitiesResult>;
export interface FundingPipelineOptions {
    days_ahead?: number;
    category?: string;
}
export interface FundingPipelineEntry {
    name: string;
    funder_name: string | null;
    category: string | null;
    total_pool_amount: number | null;
    min_grant_amount: number | null;
    max_grant_amount: number | null;
    deadline: string | null;
    days_until_deadline: number | null;
    focus_areas: string[] | null;
    relevance_score: number | null;
    application_count: number | null;
    status: string | null;
}
export interface FundingPipelineResult {
    count: number;
    max_days: number;
    opportunities: FundingPipelineEntry[];
}
export declare function fetchFundingPipeline(supabase: SupabaseQueryClient, opts?: FundingPipelineOptions): Promise<FundingPipelineResult>;
//# sourceMappingURL=pipeline.d.ts.map