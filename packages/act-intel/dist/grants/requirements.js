/**
 * Grant requirements — eligibility, criteria, documents, readiness.
 *
 * Extracted from Notion Workers Tool 27 (get_grant_requirements).
 */
export async function fetchGrantRequirements(supabase, opts) {
    const { data: grants, error } = await supabase
        .from('grant_opportunities')
        .select('id, name, provider, closes_at, amount_max, application_status, url, act_readiness, aligned_projects')
        .ilike('name', `%${opts.grant_name}%`)
        .limit(3);
    if (error)
        throw new Error(`Failed to fetch grant requirements: ${error.message}`);
    if (!grants?.length) {
        return { grants: [] };
    }
    const results = [];
    for (const grant of grants) {
        // Get requirements from enrichment
        const { data: reqs } = await supabase
            .from('grant_application_requirements')
            .select('requirement_type, description, is_met')
            .eq('opportunity_id', grant.id)
            .order('requirement_type');
        const allReqs = (reqs || []);
        const eligibility = allReqs
            .filter((r) => r.requirement_type === 'eligibility')
            .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }));
        const assessment = allReqs
            .filter((r) => r.requirement_type === 'assessment')
            .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }));
        const documents = allReqs
            .filter((r) => r.requirement_type === 'document')
            .map((r) => ({ requirement_type: r.requirement_type, description: r.description, is_met: !!r.is_met }));
        const totalReqs = allReqs.length;
        const metReqs = allReqs.filter((r) => r.is_met).length;
        const readiness_pct = totalReqs > 0 ? Math.round((metReqs / totalReqs) * 100) : 0;
        // Parse act_readiness JSONB
        let act_readiness = null;
        if (grant.act_readiness && typeof grant.act_readiness === 'object') {
            const ar = grant.act_readiness;
            act_readiness = {
                score: ar.score != null ? Number(ar.score) : null,
                gaps: Array.isArray(ar.gaps) ? ar.gaps : [],
            };
        }
        results.push({
            name: grant.name,
            provider: grant.provider || null,
            status: grant.application_status || null,
            deadline: grant.closes_at || null,
            amount: grant.amount_max ? Number(grant.amount_max) : null,
            url: grant.url || null,
            aligned_projects: grant.aligned_projects || [],
            eligibility,
            assessment,
            documents,
            readiness_pct,
            act_readiness,
        });
    }
    return { grants: results };
}
//# sourceMappingURL=requirements.js.map