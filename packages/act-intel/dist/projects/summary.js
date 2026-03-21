/**
 * Project summary — pre-generated daily summaries from project_summaries table.
 *
 * Extracted from agent-tools executeGetProjectSummary.
 */
export async function fetchProjectSummary(supabase, opts) {
    const projectCode = opts.project_code.toUpperCase();
    const { data: summary, error } = await supabase
        .from('project_summaries')
        .select('*')
        .eq('project_code', projectCode)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error)
        throw new Error(`Project summary query failed: ${error.message}`);
    if (!summary)
        return null;
    const s = summary;
    return {
        project_code: s.project_code,
        summary: s.summary_text,
        data_sources: s.data_sources_used,
        stats: s.stats,
        generated_at: s.generated_at,
    };
}
//# sourceMappingURL=summary.js.map