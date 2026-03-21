/**
 * Receipt pipeline — funnel status from missing → forwarded → processed → reconciled.
 *
 * Merges agent-tools (v_receipt_pipeline_funnel view + stuck items) and
 * Notion Workers (receipt_pipeline_status table + alerts).
 */
export async function fetchReceiptPipeline(supabase, opts = {}) {
    const includeStuck = opts.includeStuck !== false;
    // Try the view first, fall back to raw table
    let stages = [];
    let stuckItems = [];
    const alerts = [];
    // Query raw pipeline data for full analysis
    let pipelineQuery = supabase
        .from('receipt_pipeline_status')
        .select('stage, amount, transaction_date, vendor_name, updated_at');
    if (opts.stage)
        pipelineQuery = pipelineQuery.eq('stage', opts.stage);
    const { data: pipeline } = await pipelineQuery;
    const stageOrder = ['missing_receipt', 'forwarded_to_dext', 'dext_processed', 'xero_bill_created', 'reconciled'];
    const now = Date.now();
    const stuckThreshold = 14 * 86400000;
    const stageCounts = {};
    for (const s of stageOrder) {
        stageCounts[s] = { count: 0, amount: 0, stuck: 0 };
    }
    for (const row of pipeline || []) {
        const r = row;
        const s = r.stage;
        if (!stageCounts[s])
            stageCounts[s] = { count: 0, amount: 0, stuck: 0 };
        stageCounts[s].count++;
        stageCounts[s].amount += Math.abs(parseFloat(String(r.amount || 0)));
        if (r.transaction_date && now - new Date(r.transaction_date).getTime() > stuckThreshold) {
            stageCounts[s].stuck++;
        }
    }
    let totalCount = 0;
    stages = stageOrder.map(s => {
        const sc = stageCounts[s];
        totalCount += sc.count;
        return {
            stage: s,
            count: sc.count,
            amount: sc.amount,
            stuck_count: sc.stuck,
        };
    });
    const reconciledCount = stageCounts.reconciled?.count || 0;
    const reconciliationRate = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;
    // Alerts
    if (stageCounts.missing_receipt?.stuck > 0) {
        alerts.push(`${stageCounts.missing_receipt.stuck} receipts stuck > 14 days`);
    }
    if (stageCounts.forwarded_to_dext?.stuck > 0) {
        alerts.push(`${stageCounts.forwarded_to_dext.stuck} Dext forwarding may have failed (> 14 days)`);
    }
    // High-value unreconciled
    const highValue = (pipeline || []).filter((r) => {
        const row = r;
        return row.stage !== 'reconciled' && Math.abs(parseFloat(String(row.amount || 0))) > 500;
    });
    if (highValue.length > 0) {
        alerts.push(`${highValue.length} unreconciled transactions > $500`);
    }
    // Stuck items detail
    if (includeStuck) {
        const { data: stuck } = await supabase
            .from('receipt_pipeline_status')
            .select('vendor_name, amount, transaction_date, stage, updated_at')
            .not('stage', 'eq', 'reconciled')
            .lt('updated_at', new Date(now - stuckThreshold).toISOString())
            .order('transaction_date', { ascending: true })
            .limit(15);
        stuckItems = (stuck || []).map(item => ({
            vendor: item.vendor_name || 'Unknown',
            amount: Math.abs(parseFloat(String(item.amount || 0))),
            date: item.transaction_date,
            stage: item.stage,
            days_stuck: Math.floor((now - new Date(item.updated_at).getTime()) / 86400000),
        }));
    }
    return {
        total_items: totalCount,
        reconciliation_rate: reconciliationRate,
        stages,
        stuck_items: stuckItems,
        alerts,
    };
}
//# sourceMappingURL=receipt-pipeline.js.map