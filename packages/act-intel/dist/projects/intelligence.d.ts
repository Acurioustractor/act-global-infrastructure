/**
 * Project intelligence — comprehensive project summary with financials,
 * health scores, focus areas, relationships, grants, and recent knowledge.
 *
 * Merges agent-tools (executeGetProject360) and
 * Notion Workers (get_project_intelligence).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ProjectIntelligenceOptions {
    project_code: string;
}
export interface ProjectIntelligenceResult {
    project_code: string;
    financials: {
        fy_revenue: number;
        fy_expenses: number;
        fy_net: number;
        monthly_burn_rate: number | null;
        pipeline_value: number | null;
        outstanding_amount: number | null;
        grants_won: number | null;
        grants_pending: number | null;
    } | null;
    health: {
        health_score: number;
        momentum_score: number;
        engagement_score: number;
        financial_score: number;
        timeline_score: number;
        calculated_at: string | null;
    } | null;
    focus_areas: Array<{
        title: string;
        description: string | null;
        status: string;
        priority: number | null;
        target_date: string | null;
    }>;
    relationships: Array<{
        contact_name: string;
        company_name: string | null;
        temperature: number | null;
        temperature_trend: string | null;
        last_contact_at: string | null;
    }>;
    grants: Array<{
        application_name: string;
        status: string;
        amount_requested: number | null;
    }>;
    recent_knowledge: Array<{
        title: string;
        knowledge_type: string;
        importance: string | null;
        recorded_at: string;
        action_required: boolean | null;
        follow_up_date: string | null;
    }>;
    recent_wins: string[];
    blockers: string[];
}
export declare function fetchProjectIntelligence(supabase: SupabaseQueryClient, opts: ProjectIntelligenceOptions): Promise<ProjectIntelligenceResult>;
//# sourceMappingURL=intelligence.d.ts.map