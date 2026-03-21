/**
 * Project configuration loader with session-level caching.
 * Loads project codes from the projects table once per process lifetime.
 */
let _cache = null;
/** Load all project codes from the projects table (cached per process) */
export async function loadProjectCodes(supabase) {
    if (_cache)
        return _cache;
    try {
        const { data } = await supabase
            .from('projects')
            .select('*');
        const projects = {};
        for (const row of data || []) {
            projects[row.code] = row;
        }
        _cache = projects;
        return projects;
    }
    catch {
        _cache = {};
        return {};
    }
}
/** Clear the project codes cache (useful for testing or long-running processes) */
export function clearProjectCodesCache() {
    _cache = null;
}
//# sourceMappingURL=projects.js.map