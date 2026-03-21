/**
 * Weekly project pulse — Monday morning overview per active project.
 *
 * Extracted from Notion Workers Tool 31 (get_weekly_project_pulse).
 * This is the second-largest query function.
 */
// Archived/meta project codes to exclude from pulse
const ARCHIVED_OR_META_CODES = new Set([
    'ACT-DG', 'ACT-MR', 'ACT-MN', 'ACT-FN', 'ACT-SS', 'ACT-ER',
    'ACT-TN', 'ACT-10', 'ACT-SH', 'ACT-SE', 'ACT-QF', 'ACT-DD',
    'ACT-BM', 'ACT-AI', 'ACT-BV', 'ACT-WJ', 'ACT-YC', 'ACT-TW',
    'ACT-HS', 'ACT-DH', 'ACT-MM', 'ACT-MU', 'ACT-BR', 'ACT-CC',
    'ACT-FP', 'ACT-FA', 'ACT-SF', 'ACT-SX', 'ACT-WE', 'ACT-RP',
    'ACT-OE', 'ACT-OS', 'ACT-GCC', 'ACT-EFI', 'ACT-APO', 'ACT-AMT',
    'ACT-MISC', '_WEEKLY',
]);
export async function fetchWeeklyProjectPulse(supabase, opts = {}) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekFromNow = new Date(now);
    weekFromNow.setDate(now.getDate() + 7);
    const includeFinancials = opts.include_financials !== false;
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const cutoff60 = sixtyDaysAgo.toISOString();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const cutoff7 = sevenDaysAgo.toISOString();
    // Determine which projects to report on
    let projectCodes;
    if (opts.project_code) {
        projectCodes = [opts.project_code];
    }
    else {
        // Get active projects with recent activity (last 60 days)
        const { data: recentKnowledge } = await supabase
            .from('project_knowledge')
            .select('project_code')
            .gte('recorded_at', cutoff60)
            .not('project_code', 'is', null);
        const { data: recentGrants } = await supabase
            .from('grant_applications')
            .select('project_code')
            .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful'])
            .not('project_code', 'is', null);
        const codes = new Set();
        for (const k of (recentKnowledge || [])) {
            if (k.project_code && !ARCHIVED_OR_META_CODES.has(k.project_code))
                codes.add(k.project_code);
        }
        for (const g of (recentGrants || [])) {
            if (g.project_code && !ARCHIVED_OR_META_CODES.has(g.project_code))
                codes.add(g.project_code);
        }
        projectCodes = [...codes].sort();
    }
    if (projectCodes.length === 0) {
        return {
            date: today,
            projects: [],
            summary: { totalProjects: 0, totalOpenActions: 0, totalPendingDecisions: 0, totalActiveGrants: 0 },
            untaggedActionCount: null,
        };
    }
    // Parallel data fetch
    const [{ data: allActions }, { data: allDecisions }, { data: allMeetings }, { data: allGrants }, { data: allInvoices }, { data: allContacts }, { data: allHealth },] = await Promise.all([
        supabase
            .from('project_knowledge')
            .select('project_code, title, recorded_at, importance, action_required')
            .eq('action_required', true)
            .in('project_code', projectCodes)
            .order('recorded_at', { ascending: false })
            .limit(200),
        supabase
            .from('project_knowledge')
            .select('project_code, title, recorded_at, decision_status')
            .eq('knowledge_type', 'decision')
            .in('decision_status', ['pending', 'proposed'])
            .in('project_code', projectCodes)
            .limit(100),
        supabase
            .from('project_knowledge')
            .select('project_code, title, recorded_at')
            .eq('knowledge_type', 'meeting')
            .in('project_code', projectCodes)
            .order('recorded_at', { ascending: false })
            .limit(200),
        supabase
            .from('grant_applications')
            .select('project_code, application_name, status, amount_requested, milestones')
            .in('status', ['draft', 'in_progress', 'submitted', 'under_review', 'successful'])
            .in('project_code', projectCodes),
        includeFinancials
            ? supabase
                .from('xero_invoices')
                .select('contact_name, amount_due, due_date, status, tracking_category')
                .in('status', ['AUTHORISED', 'SENT'])
                .gt('amount_due', 0)
            : Promise.resolve({ data: [] }),
        supabase
            .from('ghl_contacts')
            .select('full_name, temperature, temperature_trend, engagement_status, projects')
            .not('full_name', 'is', null)
            .not('projects', 'is', null)
            .limit(200),
        supabase
            .from('project_health')
            .select('project_code, health_score, computed_at')
            .in('project_code', projectCodes)
            .order('computed_at', { ascending: false })
            .limit(100),
    ]);
    const projects = [];
    for (const code of projectCodes) {
        // Actions
        const actions = (allActions || []).filter((a) => a.project_code === code);
        const overdueActions = actions.filter((a) => a.recorded_at && new Date(a.recorded_at) < new Date(cutoff7));
        const upcomingActions = actions.filter((a) => !overdueActions.includes(a));
        // Decisions
        const decisions = (allDecisions || []).filter((d) => d.project_code === code);
        // Last meeting
        const meetings = (allMeetings || []).filter((m) => m.project_code === code);
        const lastMeeting = meetings[0];
        const daysSinceMeeting = lastMeeting
            ? Math.floor((now.getTime() - new Date(lastMeeting.recorded_at).getTime()) / 86400000)
            : null;
        // Grants
        const grants = (allGrants || []).filter((g) => g.project_code === code);
        const grantPipelineValue = grants.reduce((s, g) => s + (g.amount_requested || 0), 0);
        let nextGrantDeadline = null;
        for (const g of grants) {
            for (const m of (g.milestones || [])) {
                if (m.due && m.due >= today && !m.completed) {
                    if (!nextGrantDeadline || m.due < nextGrantDeadline)
                        nextGrantDeadline = m.due;
                }
            }
        }
        const nextDeadlineDays = nextGrantDeadline
            ? Math.ceil((new Date(nextGrantDeadline).getTime() - now.getTime()) / 86400000)
            : null;
        // Invoices (match by tracking_category)
        const invoices = includeFinancials
            ? (allInvoices || []).filter((inv) => inv.tracking_category?.includes(code))
            : [];
        const totalOutstanding = invoices.reduce((s, inv) => s + (Number(inv.amount_due) || 0), 0);
        // Contacts
        const contacts = (allContacts || []).filter((c) => {
            const projs = Array.isArray(c.projects) ? c.projects : [];
            return projs.some((p) => p.includes(code));
        });
        const warmContacts = contacts
            .filter((c) => c.temperature_trend === 'warming' || (c.temperature && c.temperature >= 70))
            .slice(0, 2)
            .map((c) => ({ name: c.full_name, temperature: c.temperature }));
        const coolingContacts = contacts
            .filter((c) => c.temperature_trend === 'cooling')
            .slice(0, 2)
            .map((c) => ({ name: c.full_name, temperature: c.temperature }));
        // Health
        const healthEntries = (allHealth || []).filter((h) => h.project_code === code);
        const latestHealth = healthEntries[0];
        // Last activity
        const allDates = [
            ...(actions.map((a) => a.recorded_at)),
            ...(decisions.map((d) => d.recorded_at)),
            ...(meetings.map((m) => m.recorded_at)),
        ].filter(Boolean).map((d) => new Date(d).getTime());
        const lastActivityMs = allDates.length > 0 ? Math.max(...allDates) : 0;
        const daysSinceActivity = lastActivityMs > 0 ? Math.floor((now.getTime() - lastActivityMs) / 86400000) : null;
        const statusLabel = daysSinceActivity !== null && daysSinceActivity <= 7 ? 'ACTIVE'
            : daysSinceActivity !== null && daysSinceActivity <= 30 ? 'QUIET'
                : 'STALE';
        projects.push({
            code,
            statusLabel,
            daysSinceActivity,
            healthScore: latestHealth ? Number(latestHealth.health_score) : null,
            overdueActions: overdueActions.length,
            openActions: upcomingActions.length,
            pendingDecisions: decisions.length,
            lastMeetingDate: lastMeeting ? new Date(lastMeeting.recorded_at).toISOString().split('T')[0] : null,
            daysSinceMeeting,
            grants: {
                count: grants.length,
                pipelineValue: grantPipelineValue,
                nextDeadline: nextGrantDeadline,
                nextDeadlineDays,
            },
            invoices: {
                count: invoices.length,
                totalOutstanding,
            },
            contacts: { warm: warmContacts, cooling: coolingContacts },
        });
    }
    // Check for untagged/misc actions
    let untaggedActionCount = null;
    if (!opts.project_code) {
        const { count } = await supabase
            .from('project_knowledge')
            .select('id', { count: 'exact', head: true })
            .eq('action_required', true)
            .or('project_code.is.null,project_code.eq.ACT-MISC');
        untaggedActionCount = count || 0;
    }
    return {
        date: today,
        projects,
        summary: {
            totalProjects: projectCodes.length,
            totalOpenActions: (allActions || []).length,
            totalPendingDecisions: (allDecisions || []).length,
            totalActiveGrants: (allGrants || []).length,
        },
        untaggedActionCount,
    };
}
//# sourceMappingURL=weekly-pulse.js.map