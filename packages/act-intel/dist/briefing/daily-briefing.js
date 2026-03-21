/**
 * Daily briefing — unified query logic for morning digest.
 *
 * Returns typed data. Consumers (Telegram bot, Notion Workers) format for their interface.
 */
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset, daysAgoISO } from '../util/dates.js';
export async function fetchDailyBriefing(supabase, opts = {}) {
    const days = opts.lookbackDays ?? 7;
    const now = getBrisbaneNow();
    const today = getBrisbaneDate();
    const futureDate = getBrisbaneDateOffset(days);
    const lookback = daysAgoISO(days);
    const pc = opts.projectCode;
    // 1. Overdue actions
    let overdueQ = supabase
        .from('project_knowledge')
        .select('project_code, title, follow_up_date, importance')
        .eq('action_required', true)
        .lt('follow_up_date', today)
        .order('follow_up_date', { ascending: true })
        .limit(20);
    if (pc)
        overdueQ = overdueQ.eq('project_code', pc);
    // 2. Upcoming follow-ups
    let upcomingQ = supabase
        .from('project_knowledge')
        .select('project_code, title, follow_up_date, importance')
        .eq('action_required', true)
        .gte('follow_up_date', today)
        .lte('follow_up_date', futureDate)
        .order('follow_up_date', { ascending: true })
        .limit(20);
    if (pc)
        upcomingQ = upcomingQ.eq('project_code', pc);
    // 3. Recent meetings
    let meetingsQ = supabase
        .from('project_knowledge')
        .select('project_code, title, summary, recorded_at, participants')
        .eq('knowledge_type', 'meeting')
        .gte('recorded_at', lookback)
        .order('recorded_at', { ascending: false })
        .limit(10);
    if (pc)
        meetingsQ = meetingsQ.eq('project_code', pc);
    // 4. Recent decisions
    let decisionsQ = supabase
        .from('project_knowledge')
        .select('project_code, title, decision_status, recorded_at')
        .eq('knowledge_type', 'decision')
        .gte('recorded_at', lookback)
        .order('recorded_at', { ascending: false })
        .limit(10);
    if (pc)
        decisionsQ = decisionsQ.eq('project_code', pc);
    // 7. Active projects (last 30 days activity count)
    let projectActivityQ = supabase
        .from('project_knowledge')
        .select('project_code')
        .gte('recorded_at', new Date(now.getTime() - 30 * 86400000).toISOString());
    if (pc)
        projectActivityQ = projectActivityQ.eq('project_code', pc);
    // Run all queries in parallel
    const [overdueRes, upcomingRes, meetingsRes, decisionsRes, relationshipsRes, alertsRes, projectActivityRes] = await Promise.all([
        overdueQ,
        upcomingQ,
        meetingsQ,
        decisionsQ,
        // 5. Stale relationships (active/prospect not contacted in 30+ days)
        supabase
            .from('ghl_contacts')
            .select('full_name, email, company_name, engagement_status, last_contact_date')
            .in('engagement_status', ['active', 'prospect'])
            .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
            .order('last_contact_date', { ascending: true })
            .limit(10),
        // 6. Relationship alerts (falling temperature)
        supabase
            .from('relationship_health')
            .select('ghl_contact_id, temperature, temperature_trend, risk_flags')
            .eq('temperature_trend', 'falling')
            .order('temperature', { ascending: true })
            .limit(10),
        projectActivityQ,
    ]);
    // Resolve contact names for relationship alerts
    let relationshipAlerts = [];
    const alertData = alertsRes.data || [];
    if (alertData.length > 0) {
        const ghlIds = alertData.map((a) => a.ghl_contact_id);
        const { data: contacts } = await supabase
            .from('ghl_contacts')
            .select('ghl_id, full_name, email, company_name')
            .in('ghl_id', ghlIds);
        const contactMap = new Map((contacts || []).map((c) => [c.ghl_id, c]));
        relationshipAlerts = alertData.map((a) => {
            const c = contactMap.get(a.ghl_contact_id);
            return {
                contact_name: c?.full_name || c?.email || 'Unknown',
                email: c?.email || null,
                company: c?.company_name || null,
                temperature: a.temperature,
                temperature_trend: a.temperature_trend,
            };
        });
    }
    // Count project activity
    const projectCounts = {};
    for (const row of projectActivityRes.data || []) {
        const code = row.project_code;
        projectCounts[code] = (projectCounts[code] || 0) + 1;
    }
    return {
        generated_at: now.toISOString(),
        lookback_days: days,
        overdue_actions: (overdueRes.data || []),
        upcoming_followups: (upcomingRes.data || []),
        recent_meetings: (meetingsRes.data || []),
        recent_decisions: (decisionsRes.data || []),
        stale_relationships: (relationshipsRes.data || []),
        relationship_alerts: relationshipAlerts,
        active_projects: Object.entries(projectCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([code, count]) => ({ code, activity_count: count })),
    };
}
//# sourceMappingURL=daily-briefing.js.map