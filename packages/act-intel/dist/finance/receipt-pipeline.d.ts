/**
 * Receipt pipeline — funnel status from missing → forwarded → processed → reconciled.
 *
 * Merges agent-tools (v_receipt_pipeline_funnel view + stuck items) and
 * Notion Workers (receipt_pipeline_status table + alerts).
 */
import type { SupabaseQueryClient, ReceiptPipelineResult } from '../types.js';
export interface ReceiptPipelineOptions {
    includeStuck?: boolean;
    stage?: string;
}
export declare function fetchReceiptPipeline(supabase: SupabaseQueryClient, opts?: ReceiptPipelineOptions): Promise<ReceiptPipelineResult>;
//# sourceMappingURL=receipt-pipeline.d.ts.map