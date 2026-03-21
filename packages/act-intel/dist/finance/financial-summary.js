/**
 * Financial summary — pipeline, API costs, subscriptions, and spend by project.
 *
 * Merges agent-tools (pipeline + API costs + subscriptions) and
 * Notion Workers (spend by project + untagged + grant pipeline) into one function.
 */
export async function fetchFinancialSummary(supabase, opts = {}) {
    const days = opts.days ?? 30;
    const months = opts.months ?? 3;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const sinceDate = since.toISOString().split('T')[0];
    // Build transaction query with optional project filter
    let txQuery = supabase
        .from('xero_transactions')
        .select('project_code, total, date, contact_name, type')
        .gte('date', sinceDate);
    if (opts.projectCode) {
        txQuery = txQuery.eq('project_code', opts.projectCode);
    }
    const [pipelineRes, apiCostsRes, subscriptionsRes, txRes, grantsRes] = await Promise.all([
        supabase
            .from('ghl_opportunities')
            .select('status, monetary_value, pipeline_name, stage_name'),
        supabase
            .from('api_usage')
            .select('provider, model, estimated_cost, created_at')
            .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
            .order('created_at', { ascending: false })
            .limit(100),
        supabase
            .from('subscriptions')
            .select('vendor, amount_aud, billing_cycle, category, status')
            .eq('status', 'active')
            .order('amount_aud', { ascending: false })
            .limit(30),
        txQuery,
        supabase
            .from('grant_applications')
            .select('project_code, amount_requested, status')
            .in('status', ['submitted', 'under_review']),
    ]);
    // Pipeline aggregation
    let openValue = 0, wonValue = 0, lostValue = 0;
    const pipelineData = pipelineRes.data || [];
    for (const row of pipelineData) {
        const val = parseFloat(row.monetary_value) || 0;
        const status = row.status;
        if (status === 'open')
            openValue += val;
        else if (status === 'won')
            wonValue += val;
        else if (status === 'lost')
            lostValue += val;
    }
    // API costs aggregation
    let totalApiCost = 0;
    const costsByModel = {};
    for (const row of apiCostsRes.data || []) {
        const r = row;
        const cost = parseFloat(r.estimated_cost) || 0;
        totalApiCost += cost;
        const key = `${r.provider}/${r.model}`;
        costsByModel[key] = (costsByModel[key] || 0) + cost;
    }
    // Subscriptions aggregation
    let monthlySubscriptionTotal = 0;
    for (const sub of subscriptionsRes.data || []) {
        const s = sub;
        const amount = parseFloat(s.amount_aud) || 0;
        if (s.billing_cycle === 'monthly')
            monthlySubscriptionTotal += amount;
        else if (s.billing_cycle === 'yearly')
            monthlySubscriptionTotal += amount / 12;
    }
    // Spend by project + untagged
    const byProject = new Map();
    let untaggedCount = 0;
    let untaggedAmount = 0;
    for (const tx of txRes.data || []) {
        const t = tx;
        const code = t.project_code || 'UNTAGGED';
        if (code === 'UNTAGGED') {
            untaggedCount++;
            untaggedAmount += Math.abs(t.total || 0);
            continue;
        }
        if (!byProject.has(code))
            byProject.set(code, { spend: 0, income: 0, count: 0 });
        const p = byProject.get(code);
        p.count++;
        if ((t.total || 0) < 0) {
            p.spend += Math.abs(t.total || 0);
        }
        else {
            p.income += t.total || 0;
        }
    }
    // Grant pipeline total
    let grantPipelineTotal = 0;
    for (const g of grantsRes.data || []) {
        const gr = g;
        if (opts.projectCode && gr.project_code !== opts.projectCode)
            continue;
        grantPipelineTotal += gr.amount_requested || 0;
    }
    return {
        period_days: days,
        pipeline: {
            total_opportunities: pipelineData.length,
            open_value: openValue,
            won_value: wonValue,
            lost_value: lostValue,
            total_value: openValue + wonValue + lostValue,
        },
        api_costs: {
            total_usd: Math.round(totalApiCost * 100) / 100,
            by_model: costsByModel,
            call_count: (apiCostsRes.data || []).length,
        },
        subscriptions: {
            active_count: (subscriptionsRes.data || []).length,
            monthly_total_aud: Math.round(monthlySubscriptionTotal * 100) / 100,
            items: (subscriptionsRes.data || []).slice(0, 15).map(s => ({
                vendor: s.vendor,
                amount_aud: parseFloat(s.amount_aud) || 0,
                billing_cycle: s.billing_cycle,
                category: s.category,
                status: s.status,
            })),
        },
        spend_by_project: [...byProject.entries()]
            .sort((a, b) => b[1].spend - a[1].spend)
            .map(([project_code, p]) => ({ project_code, ...p })),
        untagged: { count: untaggedCount, amount: untaggedAmount },
        grant_pipeline_total: grantPipelineTotal,
    };
}
//# sourceMappingURL=financial-summary.js.map