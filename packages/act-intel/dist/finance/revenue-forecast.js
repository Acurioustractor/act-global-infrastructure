/**
 * Revenue forecast — 10-year revenue scenarios.
 *
 * Extracted from Notion Workers Tool 18 (get_revenue_forecast).
 */
export async function fetchRevenueForecast(supabase, opts = {}) {
    let query = supabase
        .from('revenue_scenarios')
        .select('*')
        .order('name');
    if (opts.scenario) {
        query = query.eq('name', opts.scenario.toLowerCase());
    }
    const { data, error } = await query;
    if (error)
        throw new Error(`Failed to fetch revenue forecast: ${error.message}`);
    if (!data?.length) {
        return { scenarios: [] };
    }
    const scenarios = data.map((s) => ({
        name: s.name,
        description: s.description || null,
        annual_targets: s.annual_targets || {},
        assumptions: s.assumptions || {},
    }));
    return { scenarios };
}
//# sourceMappingURL=revenue-forecast.js.map