/**
 * Projects needing attention — from v_projects_needing_attention view.
 *
 * Extracted from Notion Workers Tool 7 (get_attention_items).
 */
export async function fetchProjectsNeedingAttention(supabase, opts = {}) {
    let query = supabase
        .from('v_projects_needing_attention')
        .select('project_code, project_name, overall_score, health_status, momentum_score, alerts, calculated_at, time_since_calculation')
        .order('overall_score', { ascending: true });
    if (opts.project_code) {
        query = query.eq('project_code', opts.project_code);
    }
    const { data, error } = await query;
    if (error)
        throw new Error(`Failed to fetch projects needing attention: ${error.message}`);
    if (!data?.length) {
        return { count: 0, projects: [] };
    }
    const projects = data.map((p) => ({
        project_code: p.project_code,
        project_name: p.project_name,
        overall_score: Number(p.overall_score || 0),
        health_status: p.health_status || 'unknown',
        momentum_score: Number(p.momentum_score || 0),
        alerts: Array.isArray(p.alerts) ? p.alerts : [],
        calculated_at: p.calculated_at || null,
    }));
    return { count: projects.length, projects };
}
//# sourceMappingURL=attention.js.map