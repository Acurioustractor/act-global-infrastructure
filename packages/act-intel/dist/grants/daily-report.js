/**
 * Daily grant report — urgency-grouped landscape with milestones, new opps, writing tasks.
 *
 * Extracted from Notion Workers Tool 33 (get_daily_grant_report).
 */
export async function fetchDailyGrantReport(supabase, opts = {}) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const monthEnd = new Date(now);
    monthEnd.setDate(now.getDate() + 30);
    const monthEndStr = monthEnd.toISOString().split('T')[0];
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();
    // Fetch applications + opportunities in parallel
    let appQuery = supabase
        .from('grant_applications')
        .select('id, application_name, project_code, status, amount_requested, milestones, created_at, updated_at')
        .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful']);
    if (opts.project_code) {
        appQuery = appQuery.eq('project_code', opts.project_code);
    }
    let oppQuery = supabase
        .from('grant_opportunities')
        .select('id, name, provider, closes_at, amount_max, fit_score, relevance_score, application_status, aligned_projects, created_at')
        .not('application_status', 'in', '(not_relevant,unsuccessful)');
    if (opts.project_code) {
        oppQuery = oppQuery.contains('aligned_projects', [opts.project_code]);
    }
    const [{ data: applications }, { data: opportunities }] = await Promise.all([appQuery, oppQuery]);
    const apps = (applications || []);
    const opps = (opportunities || []);
    // Closing this week
    const closingThisWeek = opps
        .filter((o) => o.closes_at && o.closes_at >= today && o.closes_at <= weekEndStr)
        .sort((a, b) => a.closes_at.localeCompare(b.closes_at))
        .map((o) => ({
        name: o.name,
        days_left: Math.ceil((new Date(o.closes_at).getTime() - now.getTime()) / 86400000),
        amount_max: o.amount_max ? Number(o.amount_max) : null,
        fit_score: o.fit_score ? Number(o.fit_score) : null,
        application_status: o.application_status || 'not_applied',
        aligned_projects: o.aligned_projects || [],
    }));
    // Closing this month (after this week)
    const closingThisMonth = opps
        .filter((o) => o.closes_at && o.closes_at > weekEndStr && o.closes_at <= monthEndStr)
        .sort((a, b) => a.closes_at.localeCompare(b.closes_at))
        .map((o) => ({
        name: o.name,
        days_left: Math.ceil((new Date(o.closes_at).getTime() - now.getTime()) / 86400000),
        amount_max: o.amount_max ? Number(o.amount_max) : null,
        fit_score: o.fit_score ? Number(o.fit_score) : null,
        application_status: o.application_status || 'not_applied',
        aligned_projects: o.aligned_projects || [],
    }));
    // Active applications
    let pipelineValue = 0;
    const activeApplications = apps
        .filter((a) => a.status !== 'successful')
        .map((app) => {
        pipelineValue += app.amount_requested || 0;
        const totalMilestones = (app.milestones || []).length;
        const completedMilestones = (app.milestones || []).filter((m) => m.completed).length;
        const pct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
        let nextMilestone = null;
        let nextMilestoneDue = null;
        for (const m of (app.milestones || [])) {
            if (!m.completed && m.due) {
                if (!nextMilestoneDue || m.due < nextMilestoneDue) {
                    nextMilestone = m.name || 'Milestone';
                    nextMilestoneDue = m.due;
                }
            }
        }
        const nextMilestoneDays = nextMilestoneDue
            ? Math.ceil((new Date(nextMilestoneDue).getTime() - now.getTime()) / 86400000)
            : null;
        return {
            application_name: app.application_name,
            project_code: app.project_code || null,
            status: app.status,
            amount_requested: app.amount_requested ? Number(app.amount_requested) : null,
            completion_pct: pct,
            next_milestone: nextMilestone,
            next_milestone_due: nextMilestoneDue,
            next_milestone_days: nextMilestoneDays,
        };
    });
    // Newly discovered (last 24h)
    const newlyDiscovered = opps
        .filter((o) => o.created_at && o.created_at >= yesterdayStr)
        .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0))
        .slice(0, 10)
        .map((o) => ({
        name: o.name,
        provider: o.provider || null,
        amount_max: o.amount_max ? Number(o.amount_max) : null,
        fit_score: o.fit_score ? Number(o.fit_score) : null,
        closes_at: o.closes_at || null,
    }));
    // Writing tasks
    const writingTasks = [];
    const draftApps = apps.filter((a) => a.status === 'draft' || a.status === 'in_progress');
    for (const app of draftApps) {
        const incompleteMilestones = (app.milestones || []).filter((m) => !m.completed && m.name?.toLowerCase().includes('writ'));
        if (incompleteMilestones.length > 0) {
            for (const m of incompleteMilestones) {
                writingTasks.push({
                    application_name: app.application_name,
                    milestone_name: m.name || null,
                    due: m.due || null,
                });
            }
        }
        else {
            writingTasks.push({
                application_name: app.application_name,
                milestone_name: null,
                due: null,
            });
        }
    }
    // Awarded pending payment
    const awardedApps = apps.filter((a) => a.status === 'successful');
    const awarded = awardedApps.map((a) => ({
        application_name: a.application_name,
        amount_requested: a.amount_requested ? Number(a.amount_requested) : null,
    }));
    const awardedValue = awardedApps.reduce((s, a) => s + (a.amount_requested || 0), 0);
    return {
        date: today,
        closingThisWeek,
        closingThisMonth,
        activeApplications,
        pipelineValue,
        newlyDiscovered,
        writingTasks,
        awarded,
        awardedValue,
        totalApplications: apps.length,
        totalOpportunities: opps.length,
    };
}
//# sourceMappingURL=daily-report.js.map