/**
 * Knowledge search — text search across project_knowledge with optional
 * knowledge_links graph enrichment.
 *
 * Merges agent-tools (executeSearchKnowledge) and
 * Notion Workers (search_knowledge_graph).
 */
export async function searchKnowledge(supabase, opts) {
    const { query, limit = 10, includeLinks = false } = opts;
    const searchTerm = `%${query}%`;
    let dbQuery = supabase
        .from('project_knowledge')
        .select('id, project_code, knowledge_type, title, summary, content, key_points, participants, action_required, follow_up_date, importance, recorded_at, topics')
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},summary.ilike.${searchTerm},key_points.ilike.${searchTerm}`)
        .order('recorded_at', { ascending: false })
        .limit(limit);
    if (opts.project_code) {
        dbQuery = dbQuery.eq('project_code', opts.project_code.toUpperCase());
    }
    const { data, error } = await dbQuery;
    if (error)
        throw new Error(`Knowledge search failed: ${error.message}`);
    const rows = (data || []);
    // Optionally fetch knowledge_links for top results
    let linksMap = {};
    if (includeLinks && rows.length > 0) {
        const topIds = rows.slice(0, 3).map((d) => d.id);
        const { data: links } = await supabase
            .from('knowledge_links')
            .select('source_id, target_id, link_type, reason')
            .or(`source_id.in.(${topIds.join(',')}),target_id.in.(${topIds.join(',')})`)
            .limit(10);
        for (const link of (links || [])) {
            const sourceId = link.source_id;
            const targetId = link.target_id;
            const entry = { link_type: link.link_type, reason: link.reason };
            for (const id of topIds) {
                if (sourceId === id || targetId === id) {
                    if (!linksMap[id])
                        linksMap[id] = [];
                    linksMap[id].push(entry);
                }
            }
        }
    }
    const items = rows.map((k) => ({
        id: k.id,
        project_code: k.project_code,
        type: k.knowledge_type,
        title: k.title,
        summary: k.summary,
        key_points: k.key_points,
        content_preview: k.content ? k.content.substring(0, 200) : null,
        participants: k.participants,
        action_required: k.action_required,
        follow_up_date: k.follow_up_date,
        importance: k.importance,
        recorded_at: k.recorded_at,
        topics: k.topics,
        links: linksMap[k.id] || null,
    }));
    return {
        query,
        project_code: opts.project_code || 'all',
        count: items.length,
        items,
    };
}
//# sourceMappingURL=search.js.map