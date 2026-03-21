/**
 * Meeting actions — open action items from AI transcription and LLM extraction.
 *
 * Extracted from Notion Workers Tool 24 (get_meeting_actions).
 */
export async function fetchMeetingActions(supabase, opts = {}) {
    const daysBack = opts.days_back || 30;
    const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
    const includeCompleted = opts.include_completed ?? false;
    // 1. Get meetings with AI action items
    let meetingQuery = supabase
        .from('project_knowledge')
        .select('id, title, recorded_at, project_code, ai_action_items, participants, source_url')
        .eq('knowledge_type', 'meeting')
        .not('ai_action_items', 'is', null)
        .gte('recorded_at', cutoff)
        .order('recorded_at', { ascending: false })
        .limit(50);
    if (opts.project_code) {
        meetingQuery = meetingQuery.eq('project_code', opts.project_code);
    }
    const { data: meetings } = await meetingQuery;
    // 2. Get LLM-extracted action items linked to meetings
    let actionQuery = supabase
        .from('project_knowledge')
        .select('id, title, content, project_code, recorded_at, participants, action_items, importance')
        .eq('knowledge_type', 'action')
        .eq('source_type', 'meeting_extraction')
        .gte('recorded_at', cutoff)
        .order('recorded_at', { ascending: false })
        .limit(50);
    if (opts.project_code) {
        actionQuery = actionQuery.eq('project_code', opts.project_code);
    }
    const { data: extractedActionsData } = await actionQuery;
    // Build AI action groups
    const aiActions = [];
    let aiActionCount = 0;
    if (meetings?.length) {
        for (const m of meetings) {
            if (!m.ai_action_items?.length)
                continue;
            const items = includeCompleted
                ? m.ai_action_items
                : m.ai_action_items.filter((a) => !a.completed);
            if (!items.length)
                continue;
            const date = new Date(m.recorded_at).toISOString().split('T')[0];
            aiActions.push({
                meeting_title: m.title || 'Untitled',
                date,
                project_code: m.project_code || null,
                source_url: m.source_url || null,
                items: items.map((item) => ({
                    action: item.action || '',
                    completed: !!item.completed,
                })),
            });
            aiActionCount += items.length;
        }
    }
    // Build extracted actions
    const extractedActions = (extractedActionsData || []).map((a) => ({
        title: a.title,
        date: new Date(a.recorded_at).toISOString().split('T')[0],
        project_code: a.project_code || null,
        assignee: a.action_items?.[0]?.assignee || null,
        importance: a.importance || null,
    }));
    const totalCount = aiActionCount + extractedActions.length;
    return { aiActions, extractedActions, totalCount };
}
//# sourceMappingURL=actions.js.map