/**
 * Pipeline value — weighted pipeline value by type and stage.
 *
 * Extracted from Notion Workers Tool 17 (get_pipeline_value).
 */
import type { SupabaseQueryClient } from '../types.js';
export interface PipelineValueOptions {
    type?: string;
}
export interface PipelineValueResult {
    totalWeighted: number;
    totalUnweighted: number;
    totalCount: number;
    byType: Record<string, {
        weighted: number;
        total: number;
        count: number;
    }>;
    byStage: Record<string, {
        weighted: number;
        total: number;
        count: number;
    }>;
}
export declare function fetchPipelineValue(supabase: SupabaseQueryClient, opts?: PipelineValueOptions): Promise<PipelineValueResult>;
//# sourceMappingURL=pipeline-value.d.ts.map