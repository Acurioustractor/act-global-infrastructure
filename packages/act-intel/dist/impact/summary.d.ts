/**
 * Impact summary — aggregated impact metrics across projects.
 *
 * Extracted from Notion Workers Tool 20 (get_impact_summary).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ImpactSummaryOptions {
    project_code?: string;
}
export interface ImpactMetricGroup {
    type: string;
    total: number;
    unit: string;
    count: number;
    projects: string[];
}
export interface ImpactSummaryResult {
    totalMetrics: number;
    verifiedCount: number;
    metrics: ImpactMetricGroup[];
}
export declare function fetchImpactSummary(supabase: SupabaseQueryClient, opts?: ImpactSummaryOptions): Promise<ImpactSummaryResult>;
//# sourceMappingURL=summary.d.ts.map