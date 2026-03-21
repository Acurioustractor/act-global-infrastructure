/**
 * Overdue actions — aggregated overdue items across 5 finance sources.
 *
 * Extracted from Notion Workers Tool 36 (get_overdue_actions).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface OverdueActionItem {
    type: string;
    priority: 'critical' | 'high' | 'medium';
    title: string;
    description: string;
    estimatedMinutes: number;
}
export interface OverdueActionsResult {
    actions: OverdueActionItem[];
}
export declare function fetchOverdueActions(supabase: SupabaseQueryClient): Promise<OverdueActionsResult>;
//# sourceMappingURL=overdue-actions.d.ts.map