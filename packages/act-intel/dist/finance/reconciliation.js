/**
 * Reconciliation status — tagged %, reconciled %, receipt coverage, stuck items.
 *
 * Extracted from Notion Workers Tool 34 (get_reconciliation_status).
 */
export async function fetchReconciliationStatus(supabase, opts = {}) {
    const lookback = opts.days_back ?? 90;
    const now = new Date();
    const sinceDate = new Date(now);
    sinceDate.setDate(now.getDate() - lookback);
    const since = sinceDate.toISOString().split('T')[0];
    // Total counts (parallel)
    const [{ count: totalCount }, { count: taggedCount }, { count: reconciledCount }, { count: withReceiptCount },] = await Promise.all([
        supabase
            .from('xero_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('date', since),
        supabase
            .from('xero_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('date', since)
            .not('project_code', 'is', null),
        supabase
            .from('xero_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('date', since)
            .eq('is_reconciled', true),
        supabase
            .from('xero_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('date', since)
            .not('dext_document_id', 'is', null),
    ]);
    const total = totalCount || 0;
    const tagged = taggedCount || 0;
    const reconciled = reconciledCount || 0;
    const withReceipt = withReceiptCount || 0;
    // Top untagged vendors
    const { data: untaggedTxns } = await supabase
        .from('xero_transactions')
        .select('contact_name, total, type')
        .gte('date', since)
        .is('project_code', null)
        .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")');
    const vendorTotals = new Map();
    for (const tx of (untaggedTxns || [])) {
        const name = tx.contact_name || '(No contact)';
        const existing = vendorTotals.get(name) || { count: 0, total: 0 };
        existing.count++;
        existing.total += Math.abs(Number(tx.total) || 0);
        vendorTotals.set(name, existing);
    }
    const topUntaggedVendors = [...vendorTotals.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, info]) => ({ name, count: info.count, total: Math.round(info.total) }));
    // Stuck items (>14 days untagged)
    const stuckSince = new Date(now);
    stuckSince.setDate(now.getDate() - 14);
    const stuckSinceStr = stuckSince.toISOString().split('T')[0];
    const { data: stuck } = await supabase
        .from('xero_transactions')
        .select('contact_name, total, date')
        .is('project_code', null)
        .lt('date', stuckSinceStr)
        .gte('date', since)
        .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
        .order('total', { ascending: true })
        .limit(10);
    const stuckItems = (stuck || []).map((s) => ({
        date: s.date || null,
        contact_name: s.contact_name || null,
        total: Math.abs(Number(s.total || 0)),
    }));
    return {
        period: `last ${lookback} days (since ${since})`,
        total,
        tagged,
        reconciled,
        withReceipt,
        topUntaggedVendors,
        stuckItems,
    };
}
//# sourceMappingURL=reconciliation.js.map