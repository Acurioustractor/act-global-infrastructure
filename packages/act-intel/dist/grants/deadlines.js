/**
 * Grant deadlines — upcoming deadlines with milestone progress and urgency.
 *
 * Merges agent-tools (executeGetGrantOpportunities with deadlines) and
 * Notion Workers (check_grant_deadlines).
 */
export async function fetchGrantDeadlines(supabase, opts = {}) {
    const daysAhead = opts.days_ahead ?? 30;
    let query = supabase
        .from('grant_applications')
        .select(`
      id, application_name, status, amount_requested, milestones, project_code,
      grant_opportunities!grant_applications_opportunity_id_fkey (
        closes_at, name, provider
      )
    `)
        .in('status', ['draft', 'in_progress', 'submitted', 'under_review']);
    if (opts.project_code) {
        query = query.eq('project_code', opts.project_code);
    }
    const { data: apps, error } = await query;
    if (error)
        throw new Error(`Grant deadlines query failed: ${error.message}`);
    const now = new Date();
    const deadlines = [];
    for (const app of (apps || [])) {
        const opp = app.grant_opportunities;
        if (!opp?.closes_at)
            continue;
        const deadline = new Date(opp.closes_at);
        const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
        if (daysRemaining > daysAhead || daysRemaining < -7)
            continue;
        const milestones = app.milestones || [];
        const completed = milestones.filter((m) => m.completed).length;
        const total = milestones.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const overdue = milestones
            .filter((m) => !m.completed && m.due && new Date(m.due) < now)
            .map((m) => m.name);
        const urgency = daysRemaining <= 1 ? 'CRITICAL' :
            daysRemaining <= 3 ? 'URGENT' :
                daysRemaining <= 7 ? 'SOON' :
                    daysRemaining <= 14 ? 'UPCOMING' : 'PLANNED';
        deadlines.push({
            id: app.id,
            application_name: app.application_name,
            provider: opp.provider,
            opportunity_name: opp.name,
            project_code: app.project_code,
            deadline: opp.closes_at,
            days_remaining: daysRemaining,
            amount_requested: app.amount_requested,
            urgency,
            progress: { total, completed, pct },
            overdue_milestones: overdue,
        });
    }
    // Sort by days remaining (most urgent first)
    deadlines.sort((a, b) => a.days_remaining - b.days_remaining);
    return { days_ahead: daysAhead, count: deadlines.length, deadlines };
}
//# sourceMappingURL=deadlines.js.map