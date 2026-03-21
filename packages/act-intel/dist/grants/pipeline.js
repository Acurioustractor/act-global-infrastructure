/**
 * Grants pipeline — active grant applications and funding opportunities.
 *
 * Merges agent-tools (executeGetGrantPipeline + executeGetGrantOpportunities)
 * and Notion Workers (get_funding_pipeline).
 */
export async function fetchGrantPipeline(supabase, opts = {}) {
    const limit = opts.limit || 20;
    let query = supabase
        .from('grant_applications')
        .select('id, application_name, amount_requested, status, started_at, submitted_at, outcome_at, milestones, lead_contact, team_members, project_code, outcome_amount, outcome_notes, opportunity_id')
        .order('started_at', { ascending: false });
    if (opts.status) {
        query = query.eq('status', opts.status);
    }
    else {
        query = query.in('status', ['draft', 'in_progress', 'submitted', 'under_review']);
    }
    const { data, error } = await query.limit(limit);
    if (error)
        throw new Error(`Grant pipeline query failed: ${error.message}`);
    const applications = (data || []).map((a) => ({
        id: a.id,
        name: a.application_name,
        amount_requested: a.amount_requested,
        status: a.status,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        outcome_at: a.outcome_at,
        lead_contact: a.lead_contact,
        team: a.team_members || [],
        project_code: a.project_code,
        outcome_amount: a.outcome_amount,
        outcome_notes: a.outcome_notes,
    }));
    return {
        status_filter: opts.status || 'active',
        count: applications.length,
        applications,
    };
}
export async function fetchGrantOpportunities(supabase, opts = {}) {
    const status = opts.status || 'open';
    const limit = opts.limit || 10;
    const { data, error } = await supabase
        .from('grant_opportunities')
        .select('id, name, provider, program, amount_min, amount_max, opens_at, closes_at, status, fit_score, fit_notes, aligned_projects, categories, url')
        .eq('status', status)
        .order('closes_at', { ascending: true })
        .limit(limit);
    if (error)
        throw new Error(`Grant opportunities query failed: ${error.message}`);
    const now = new Date();
    const grants = (data || []).map((g) => {
        const amountMin = g.amount_min;
        const amountMax = g.amount_max;
        const amountRange = amountMin && amountMax
            ? `$${Number(amountMin).toLocaleString()} - $${Number(amountMax).toLocaleString()}`
            : amountMax
                ? `Up to $${Number(amountMax).toLocaleString()}`
                : 'Not specified';
        return {
            id: g.id,
            name: g.name,
            provider: g.provider,
            program: g.program,
            amount_range: amountRange,
            amount_min: amountMin,
            amount_max: amountMax,
            opens_at: g.opens_at,
            closes_at: g.closes_at,
            days_until_close: g.closes_at
                ? Math.ceil((new Date(g.closes_at).getTime() - now.getTime()) / 86400000)
                : null,
            status: g.status,
            fit_score: g.fit_score,
            fit_notes: g.fit_notes,
            aligned_projects: g.aligned_projects || [],
            categories: g.categories || [],
            url: g.url,
            funder_name: null,
            focus_areas: null,
        };
    });
    return { status_filter: status, count: grants.length, grants };
}
export async function fetchFundingPipeline(supabase, opts = {}) {
    const maxDays = opts.days_ahead ?? 90;
    let query = supabase
        .from('v_funding_pipeline')
        .select('name, funder_name, category, total_pool_amount, min_grant_amount, max_grant_amount, deadline, days_until_deadline, focus_areas, relevance_score, application_count, status')
        .not('deadline', 'is', null)
        .gte('days_until_deadline', 0)
        .lte('days_until_deadline', maxDays)
        .order('days_until_deadline', { ascending: true });
    if (opts.category) {
        query = query.ilike('category', `%${opts.category}%`);
    }
    const { data, error } = await query;
    if (error)
        throw new Error(`Funding pipeline query failed: ${error.message}`);
    const opportunities = (data || []).map((o) => ({
        name: o.name,
        funder_name: o.funder_name,
        category: o.category,
        total_pool_amount: o.total_pool_amount,
        min_grant_amount: o.min_grant_amount,
        max_grant_amount: o.max_grant_amount,
        deadline: o.deadline,
        days_until_deadline: o.days_until_deadline,
        focus_areas: o.focus_areas,
        relevance_score: o.relevance_score,
        application_count: o.application_count,
        status: o.status,
    }));
    return { count: opportunities.length, max_days: maxDays, opportunities };
}
//# sourceMappingURL=pipeline.js.map