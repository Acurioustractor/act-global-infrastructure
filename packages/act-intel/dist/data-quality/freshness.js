/**
 * Data freshness — sync status and staleness for all integrations.
 *
 * Extracted from Notion Workers Tool 11 (get_data_freshness).
 */
const STALE_HOURS = 12;
export async function fetchDataFreshness(supabase, opts = {}) {
    let query = supabase
        .from('sync_status')
        .select('integration_name, status, last_success_at, last_attempt_at, record_count, last_error, avg_duration_ms')
        .order('integration_name');
    if (opts.integration) {
        query = query.ilike('integration_name', `%${opts.integration}%`);
    }
    const { data, error } = await query;
    if (error)
        throw new Error(`Failed to fetch data freshness: ${error.message}`);
    if (!data?.length) {
        return { staleCount: 0, integrations: [] };
    }
    const now = Date.now();
    const rows = data;
    const integrations = rows.map((s) => {
        const lastSync = s.last_success_at ? new Date(s.last_success_at) : null;
        const hoursAgo = lastSync ? Math.round((now - lastSync.getTime()) / 3600000) : null;
        const isStale = hoursAgo === null || hoursAgo > STALE_HOURS;
        return {
            name: s.integration_name,
            status: s.status === 'healthy' && !isStale ? 'OK' : s.status === 'error' ? 'ERR' : isStale ? 'STALE' : 'OK',
            last_sync: lastSync ? lastSync.toISOString() : null,
            hours_ago: hoursAgo,
            record_count: s.record_count ?? null,
            last_error: s.last_error || null,
            is_stale: isStale,
        };
    });
    const staleCount = integrations.filter((i) => i.is_stale).length;
    return { staleCount, integrations };
}
//# sourceMappingURL=freshness.js.map