/**
 * Meeting context — pre-load everything needed before walking into a meeting.
 *
 * Given attendees and/or a project, gathers: contact details, project health,
 * recent meetings, open actions, grant deadlines, and recent decisions.
 */
import { searchContacts } from '../contacts/search.js';
import { fetchProjectHealth } from '../projects/health.js';
import { fetchMeetingActions } from '../meetings/actions.js';
import { searchMeetings } from '../meetings/search.js';
import { fetchGrantDeadlines } from '../grants/deadlines.js';
import { fetchOutstandingInvoices } from '../finance/outstanding-invoices.js';
export async function fetchMeetingContext(supabase, opts = {}) {
    const pc = opts.project_code || null;
    const historyDays = opts.history_days ?? 30;
    // Build parallel queries
    const promises = [];
    // 1. Look up each attendee
    const attendeePromises = (opts.attendees || []).map((name) => searchContacts(supabase, { query: name, limit: 1 }));
    promises.push(Promise.all(attendeePromises));
    // 2. Project health (if project specified)
    promises.push(pc ? fetchProjectHealth(supabase, { projectCode: pc }) : Promise.resolve(null));
    // 3. Recent meetings for this project
    promises.push(searchMeetings(supabase, {
        project_code: pc || undefined,
        days_back: historyDays,
        limit: 5,
    }));
    // 4. Open action items
    promises.push(fetchMeetingActions(supabase, {
        project_code: pc || undefined,
        days_back: historyDays,
    }));
    // 5. Grant deadlines for this project
    promises.push(fetchGrantDeadlines(supabase, {
        project_code: pc || undefined,
        days_ahead: 30,
    }));
    // 6. Outstanding invoices
    promises.push(pc ? fetchOutstandingInvoices(supabase, { project_code: pc }) : Promise.resolve(null));
    const [attendeeProfiles, projectHealth, recentMeetings, openActions, grantDeadlines, invoices,] = await Promise.all(promises);
    // Generate talking points from gathered context
    const talkingPoints = [];
    // Open actions to follow up on
    if (openActions.totalCount > 0) {
        talkingPoints.push(`${openActions.totalCount} open action items to review`);
    }
    // Grant deadlines
    const urgentGrants = grantDeadlines.deadlines.filter((g) => g.urgency === 'CRITICAL' || g.urgency === 'URGENT');
    if (urgentGrants.length > 0) {
        talkingPoints.push(`${urgentGrants.length} urgent grant deadline${urgentGrants.length > 1 ? 's' : ''}: ${urgentGrants.map((g) => g.application_name).join(', ')}`);
    }
    // Project health signals
    if (projectHealth?.projects?.length) {
        const project = projectHealth.projects[0];
        if (project.health === 'stale' || project.health === 'dormant') {
            talkingPoints.push(`Project health: ${project.health} — ${project.days_since_activity ?? '?'} days since last activity`);
        }
        if (project.open_actions > 5) {
            talkingPoints.push(`${project.open_actions} open actions across the project`);
        }
    }
    // Outstanding invoices
    if (invoices && invoices.count > 0) {
        talkingPoints.push(`${invoices.count} overdue invoices ($${invoices.totalDue.toLocaleString()})`);
    }
    // Attendee context
    for (const profile of attendeeProfiles) {
        if (profile.contacts.length > 0) {
            const contact = profile.contacts[0];
            if (contact.last_contact) {
                const daysSince = Math.floor((Date.now() - new Date(contact.last_contact).getTime()) / 86400000);
                if (daysSince > 30) {
                    talkingPoints.push(`Haven't connected with ${contact.name} in ${daysSince} days`);
                }
            }
        }
    }
    return {
        project_code: pc,
        attendee_profiles: attendeeProfiles,
        project_health: projectHealth,
        recent_meetings: recentMeetings,
        open_actions: openActions,
        upcoming_grant_deadlines: grantDeadlines,
        outstanding_invoices: invoices,
        talking_points: talkingPoints,
    };
}
//# sourceMappingURL=meeting-context.js.map