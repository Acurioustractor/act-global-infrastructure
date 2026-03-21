/**
 * Project P&L — monthly profit & loss for a specific project.
 *
 * Extracted from Notion Workers Tool 16 (get_project_pnl).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface ProjectPnlOptions {
    project_code: string;
    months?: number;
}
export interface ProjectPnlMonth {
    month: string;
    revenue: number;
    expenses: number;
    net: number;
    expense_breakdown: Record<string, number>;
    fy_ytd_revenue: number | null;
    fy_ytd_expenses: number | null;
    fy_ytd_net: number | null;
}
export interface ProjectPnlResult {
    project_code: string;
    months: ProjectPnlMonth[];
    totalRevenue: number;
    totalExpenses: number;
}
export declare function fetchProjectPnl(supabase: SupabaseQueryClient, opts: ProjectPnlOptions): Promise<ProjectPnlResult>;
//# sourceMappingURL=project-pnl.d.ts.map