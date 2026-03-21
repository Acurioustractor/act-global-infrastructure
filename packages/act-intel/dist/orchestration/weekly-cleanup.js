/**
 * Weekly cleanup — find stale, orphaned, and incomplete items across all databases.
 *
 * Designed to run on Mondays to surface data hygiene issues before the week starts.
 */
import { getBrisbaneNow, daysAgoISO } from '../util/dates.js';
export async function fetchWeeklyCleanup(supabase, opts = {}) {
    const staleThreshold = opts.stale_threshold_days ?? 14;
    const contactInactiveDays = opts.contact_inactive_days ?? 30;
    const now = getBrisbaneNow();
    const staleCutoff = daysAgoISO(staleThreshold);
    const contactCutoff = daysAgoISO(contactInactiveDays);
    // Run all queries in parallel
    const [staleRes, orphanedRes, contactRes, projectRes] = await Promise.all([
        // 1. Stale actions: action_required = true, follow_up_date in the past
        supabase
            .from('project_knowledge')
            .select('id, title, project_code, follow_up_date, importance')
            .eq('action_required', true)
            .lt('follow_up_date', staleCutoff)
            .order('follow_up_date', { ascending: true })
            .limit(30),
        // 2. Orphaned items: no project_code assigned
        supabase
            .from('project_knowledge')
            .select('id, title, knowledge_type, recorded_at')
            .is('project_code', null)
            .in('knowledge_type', ['meeting', 'decision', 'action', 'communication'])
            .gte('recorded_at', daysAgoISO(90))
            .order('recorded_at', { ascending: false })
            .limit(20),
        // 3. Incomplete contacts: missing email or last_contact_date
        supabase
            .from('ghl_contacts')
            .select('id, full_name, email, phone, engagement_status, last_contact_date, company_name')
            .in('engagement_status', ['active', 'prospect', 'warm'])
            .limit(100),
        // 4. Stale projects: no activity in 30+ days
        supabase
            .from('project_health')
            .select('project_code, health_score, days_since_activity, open_actions, last_activity_date')
            .gt('days_since_activity', 30)
            .order('days_since_activity', { ascending: false })
            .limit(15),
    ]);
    // Process stale actions
    const staleActions = (staleRes.data || []).map((a) => {
        const followUp = a.follow_up_date;
        const daysOverdue = followUp
            ? Math.floor((now.getTime() - new Date(followUp).getTime()) / 86400000)
            : 0;
        return {
            id: a.id,
            title: a.title,
            project_code: a.project_code,
            follow_up_date: followUp,
            days_overdue: daysOverdue,
            importance: a.importance,
        };
    });
    // Process orphaned items
    const orphanedItems = (orphanedRes.data || []).map((o) => ({
        id: o.id,
        title: o.title || 'Untitled',
        knowledge_type: o.knowledge_type,
        recorded_at: o.recorded_at,
        reason: 'No project code assigned',
    }));
    // Process incomplete contacts
    const incompleteContacts = [];
    for (const c of (contactRes.data || [])) {
        const missing = [];
        if (!c.email)
            missing.push('email');
        if (!c.phone)
            missing.push('phone');
        if (!c.company_name)
            missing.push('organization');
        if (!c.last_contact_date)
            missing.push('last_contact_date');
        else {
            const lastContact = new Date(c.last_contact_date);
            if (lastContact < new Date(contactCutoff)) {
                missing.push(`last contact ${Math.floor((now.getTime() - lastContact.getTime()) / 86400000)}d ago`);
            }
        }
        if (missing.length >= 2) {
            incompleteContacts.push({
                id: c.id,
                name: c.full_name || 'Unknown',
                missing_fields: missing,
                engagement_status: c.engagement_status,
            });
        }
    }
    // Sort by most missing fields first
    incompleteContacts.sort((a, b) => b.missing_fields.length - a.missing_fields.length);
    const topIncomplete = incompleteContacts.slice(0, 15);
    // Process stale projects (join with projects table for names)
    const staleCodes = (projectRes.data || []).map((p) => p.project_code);
    let staleProjects = [];
    if (staleCodes.length > 0) {
        const { data: projectNames } = await supabase
            .from('projects')
            .select('code, name')
            .in('code', staleCodes);
        const nameMap = new Map((projectNames || []).map((p) => [p.code, p.name]));
        staleProjects = (projectRes.data || []).map((p) => ({
            code: p.project_code,
            name: nameMap.get(p.project_code) || p.project_code,
            days_since_activity: p.days_since_activity,
            open_actions: p.open_actions || 0,
        }));
    }
    const totalIssues = staleActions.length + orphanedItems.length + topIncomplete.length + staleProjects.length;
    return {
        generated_at: now.toISOString(),
        stale_actions: staleActions,
        orphaned_items: orphanedItems,
        incomplete_contacts: topIncomplete,
        stale_projects: staleProjects,
        summary: {
            total_issues: totalIssues,
            stale_action_count: staleActions.length,
            orphaned_count: orphanedItems.length,
            incomplete_contact_count: topIncomplete.length,
            stale_project_count: staleProjects.length,
        },
    };
}
//# sourceMappingURL=weekly-cleanup.js.map