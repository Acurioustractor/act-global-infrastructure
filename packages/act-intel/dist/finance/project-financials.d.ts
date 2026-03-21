/**
 * Project financials — FY income/expenses/receivables from the v_project_financials view.
 */
import type { SupabaseQueryClient, ProjectFinancialsResult } from '../types.js';
export interface ProjectFinancialsOptions {
    projectCode?: string;
}
export declare function fetchProjectFinancials(supabase: SupabaseQueryClient, opts?: ProjectFinancialsOptions): Promise<ProjectFinancialsResult>;
//# sourceMappingURL=project-financials.d.ts.map