/**
 * Grant suggestions — match ACT projects to grant opportunities based on
 * themes, eligibility, and readiness signals.
 *
 * Composes: grant pipeline + project health + grant readiness data.
 */
import type { SupabaseQueryClient } from '../types.js';
export interface GrantSuggestionsOptions {
    /** Only suggest for this project (default: all active projects) */
    project_code?: string;
    /** Minimum readiness score to include (default 0) */
    min_readiness?: number;
    /** Max suggestions per project (default 5) */
    limit_per_project?: number;
}
export interface GrantMatch {
    opportunity_id: string;
    opportunity_name: string;
    provider: string;
    amount_max: number | null;
    closes_at: string | null;
    days_until_close: number | null;
    themes: string[];
    match_reasons: string[];
    readiness_score: number | null;
    existing_application: boolean;
}
export interface ProjectGrantSuggestions {
    project_code: string;
    project_name: string;
    project_themes: string[];
    suggestions: GrantMatch[];
    already_applied: number;
}
export interface GrantSuggestionsResult {
    generated_at: string;
    projects: ProjectGrantSuggestions[];
    total_suggestions: number;
    total_opportunities_scanned: number;
}
export declare function fetchGrantSuggestions(supabase: SupabaseQueryClient, opts?: GrantSuggestionsOptions): Promise<GrantSuggestionsResult>;
//# sourceMappingURL=grant-suggestions.d.ts.map