/**
 * Project intelligence — comprehensive project summary with financials,
 * health scores, focus areas, relationships, grants, and recent knowledge.
 *
 * Merges agent-tools (executeGetProject360) and
 * Notion Workers (get_project_intelligence).
 */
export async function fetchProjectIntelligence(supabase, opts) {
    const code = opts.project_code.toUpperCase();
    const [snapshot, focusAreas, health, knowledge, relationships, grants] = await Promise.all([
        supabase
            .from('project_intelligence_snapshots')
            .select('*')
            .eq('project_code', code)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from('project_focus_areas')
            .select('title, description, status, priority, target_date')
            .eq('project_code', code)
            .in('status', ['current', 'upcoming', 'blocked'])
            .order('priority'),
        supabase
            .from('project_health')
            .select('health_score, momentum_score, engagement_score, financial_score, timeline_score, calculated_at')
            .eq('project_code', code)
            .maybeSingle(),
        supabase
            .from('project_knowledge')
            .select('title, knowledge_type, importance, recorded_at, action_required, follow_up_date')
            .eq('project_code', code)
            .order('recorded_at', { ascending: false })
            .limit(10),
        supabase
            .from('v_project_relationships')
            .select('contact_name, company_name, temperature, temperature_trend, last_contact_at')
            .eq('project_code', code)
            .order('temperature', { ascending: false, nullsFirst: false })
            .limit(8),
        supabase
            .from('grant_applications')
            .select('application_name, status, amount_requested, project_code')
            .eq('project_code', code)
            .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),
    ]);
    const s = snapshot.data;
    const h = health.data;
    return {
        project_code: code,
        financials: s ? {
            fy_revenue: Number(s.fy_revenue || 0),
            fy_expenses: Number(s.fy_expenses || 0),
            fy_net: Number(s.fy_net || 0),
            monthly_burn_rate: s.monthly_burn_rate ? Number(s.monthly_burn_rate) : null,
            pipeline_value: s.pipeline_value ? Number(s.pipeline_value) : null,
            outstanding_amount: s.outstanding_amount ? Number(s.outstanding_amount) : null,
            grants_won: s.grants_won,
            grants_pending: s.grants_pending,
        } : null,
        health: h ? {
            health_score: Number(h.health_score || 0),
            momentum_score: Number(h.momentum_score || 0),
            engagement_score: Number(h.engagement_score || 0),
            financial_score: Number(h.financial_score || 0),
            timeline_score: Number(h.timeline_score || 0),
            calculated_at: h.calculated_at,
        } : null,
        focus_areas: (focusAreas.data || []).map((f) => ({
            title: f.title,
            description: f.description,
            status: f.status,
            priority: f.priority,
            target_date: f.target_date,
        })),
        relationships: (relationships.data || []).map((r) => ({
            contact_name: r.contact_name,
            company_name: r.company_name,
            temperature: r.temperature,
            temperature_trend: r.temperature_trend,
            last_contact_at: r.last_contact_at,
        })),
        grants: (grants.data || []).map((g) => ({
            application_name: g.application_name,
            status: g.status,
            amount_requested: g.amount_requested,
        })),
        recent_knowledge: (knowledge.data || []).map((k) => ({
            title: k.title,
            knowledge_type: k.knowledge_type,
            importance: k.importance,
            recorded_at: k.recorded_at,
            action_required: k.action_required,
            follow_up_date: k.follow_up_date,
        })),
        recent_wins: s?.recent_wins ? s.recent_wins : [],
        blockers: s?.blockers ? s.blockers : [],
    };
}
//# sourceMappingURL=intelligence.js.map