/**
 * Grant readiness — aggregated readiness scores with requirement breakdowns
 * and available reusable assets.
 *
 * Merges agent-tools (executeGetGrantReadiness) and
 * Notion Workers (get_grant_readiness).
 */
export async function fetchGrantReadiness(supabase, opts = {}) {
    let query = supabase
        .from('v_grant_readiness')
        .select('*')
        .order('readiness_pct', { ascending: true });
    if (opts.application_id) {
        query = query.eq('application_id', opts.application_id);
    }
    else if (opts.grant_name) {
        query = query.ilike('grant_name', `%${opts.grant_name}%`);
    }
    if (opts.min_readiness !== undefined && opts.min_readiness !== null) {
        query = query.gte('readiness_pct', opts.min_readiness);
    }
    if (opts.status) {
        query = query.eq('application_status', opts.status);
    }
    const { data: readiness, error } = await query.limit(20);
    if (error)
        throw new Error(`Grant readiness query failed: ${error.message}`);
    const rows = (readiness || []);
    const applications = await Promise.all(rows.map(async (app) => {
        const appId = app.application_id;
        // Parallel: requirements breakdown + reusable assets
        const [reqResult, assetResult] = await Promise.all([
            supabase
                .from('grant_application_requirements')
                .select('requirement_type, status, notes')
                .eq('application_id', appId),
            supabase
                .from('grant_assets')
                .select('name, category, asset_type, is_current, expires_at')
                .eq('is_current', true)
                .limit(20),
        ]);
        const requirements = (reqResult.data || []);
        const missing = requirements.filter((r) => r.status === 'needed');
        const ready = requirements.filter((r) => r.status === 'ready' || r.status === 'submitted');
        const daysUntilClose = app.closes_at
            ? Math.floor((new Date(app.closes_at).getTime() - Date.now()) / 86400000)
            : null;
        return {
            grant_name: app.grant_name,
            provider: app.provider,
            status: app.application_status,
            readiness_pct: Number(app.readiness_pct || 0),
            days_until_close: daysUntilClose,
            closes_at: app.closes_at,
            total_requirements: Number(app.total_requirements || 0),
            ready_count: Number(app.ready_count || 0),
            needed_count: Number(app.needed_count || missing.length),
            missing_docs: missing.map((m) => ({
                type: m.requirement_type,
                notes: m.notes,
            })),
            ready_docs: ready.map((r) => r.requirement_type),
            available_assets: (assetResult.data || []).map((a) => ({
                name: a.name,
                category: a.category,
                type: a.asset_type,
                expires: a.expires_at,
            })),
            milestones: {
                total: Number(app.total_milestones || 0),
                completed: Number(app.completed_milestones || 0),
            },
            fit_score: app.fit_score,
            amount_max: app.amount_max,
            lead_contact: app.lead_contact,
            assigned_to: app.assigned_to,
            priority: app.priority,
        };
    }));
    const readyCount = applications.filter((a) => a.readiness_pct >= 100).length;
    return { count: applications.length, ready_count: readyCount, applications };
}
//# sourceMappingURL=readiness.js.map