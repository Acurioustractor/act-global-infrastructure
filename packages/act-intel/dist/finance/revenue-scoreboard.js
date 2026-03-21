/**
 * Revenue scoreboard — targets, pipeline, receivables, and scenarios.
 */
export async function fetchRevenueScoreboard(supabase) {
    const [streamsRes, pipelineRes, scenariosRes, projectsRes] = await Promise.all([
        supabase.from('revenue_streams').select('*').eq('status', 'active'),
        supabase.from('fundraising_pipeline').select('*'),
        supabase.from('revenue_scenarios').select('*'),
        supabase.from('projects').select('name, code, status'),
    ]);
    const streams = (streamsRes.data || []);
    const pipeline = (pipelineRes.data || []);
    const scenarios = (scenariosRes.data || []);
    const projects = (projectsRes.data || []);
    const totalMonthlyTarget = streams.reduce((sum, s) => sum + parseFloat(s.target_monthly || '0'), 0);
    // Pipeline analysis
    let totalPipelineValue = 0;
    let totalWeightedValue = 0;
    let totalReceivables = 0;
    const pipelineByStatus = {};
    for (const item of pipeline) {
        const amount = parseFloat(item.amount || '0');
        const probability = parseFloat(item.probability || '0');
        const weighted = amount * probability;
        const status = item.status || 'unknown';
        if (!pipelineByStatus[status])
            pipelineByStatus[status] = { count: 0, totalValue: 0, weightedValue: 0 };
        pipelineByStatus[status].count++;
        pipelineByStatus[status].totalValue += amount;
        pipelineByStatus[status].weightedValue += weighted;
        if (item.type === 'receivable') {
            totalReceivables += amount;
        }
        else {
            totalPipelineValue += amount;
            totalWeightedValue += weighted;
        }
    }
    const topOpportunities = pipeline
        .filter(p => p.type !== 'receivable')
        .map(p => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || '0'),
        probability: parseFloat(p.probability || '0'),
        weighted: parseFloat(p.amount || '0') * parseFloat(p.probability || '0'),
        status: p.status,
        expectedDate: p.expected_date,
        projects: p.project_codes || [],
    }))
        .sort((a, b) => b.weighted - a.weighted)
        .slice(0, 10);
    const receivables = pipeline
        .filter(p => p.type === 'receivable')
        .map(p => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || '0'),
        notes: p.notes,
    }));
    const activeProjects = projects.filter(p => p.status === 'active');
    return {
        timestamp: new Date().toISOString(),
        streams: {
            items: streams.map(s => ({
                name: s.name,
                code: s.code,
                category: s.category,
                monthlyTarget: parseFloat(s.target_monthly || '0'),
            })),
            totalMonthlyTarget,
            totalAnnualTarget: totalMonthlyTarget * 12,
        },
        pipeline: {
            byStatus: pipelineByStatus,
            totalValue: totalPipelineValue,
            weightedValue: totalWeightedValue,
            topOpportunities,
            count: pipeline.filter(p => p.type !== 'receivable').length,
        },
        receivables: { total: totalReceivables, items: receivables },
        scenarios: scenarios.map(s => ({
            name: s.name,
            description: s.description,
            targets: s.annual_targets || {},
        })),
        projects: { active: activeProjects.length, total: projects.length },
    };
}
//# sourceMappingURL=revenue-scoreboard.js.map