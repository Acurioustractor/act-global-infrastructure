/**
 * Grant suggestions — match ACT projects to grant opportunities based on
 * themes, eligibility, and readiness signals.
 *
 * Composes: grant pipeline + project health + grant readiness data.
 */
import { loadProjectCodes } from '../util/projects.js';
export async function fetchGrantSuggestions(supabase, opts = {}) {
    const limitPerProject = opts.limit_per_project ?? 5;
    const minReadiness = opts.min_readiness ?? 0;
    // 1. Load active projects
    const allProjectsMap = await loadProjectCodes(supabase);
    const activeProjects = Object.values(allProjectsMap).filter((p) => p.status === 'active' && (!opts.project_code || p.code === opts.project_code));
    // 2. Get all open grant opportunities
    const { data: opportunities } = await supabase
        .from('grant_opportunities')
        .select('id, name, provider, amount_max, closes_at, themes, eligibility_summary, focus_areas, status')
        .in('status', ['open', 'upcoming', 'rolling'])
        .order('closes_at', { ascending: true })
        .limit(200);
    // 3. Get existing applications to avoid suggesting already-applied grants
    const { data: existingApps } = await supabase
        .from('grant_applications')
        .select('opportunity_id, project_code, status')
        .not('status', 'eq', 'withdrawn');
    const appliedMap = new Map();
    for (const app of (existingApps || [])) {
        const oppId = app.opportunity_id;
        if (!appliedMap.has(oppId))
            appliedMap.set(oppId, new Set());
        appliedMap.get(oppId).add(app.project_code);
    }
    // 4. Get readiness scores
    const { data: readinessData } = await supabase
        .from('grant_applications')
        .select('opportunity_id, project_code, readiness_score')
        .not('readiness_score', 'is', null);
    const readinessMap = new Map();
    for (const r of (readinessData || [])) {
        readinessMap.set(`${r.opportunity_id}-${r.project_code}`, r.readiness_score);
    }
    const now = new Date();
    const opps = (opportunities || []);
    const results = [];
    let totalSuggestions = 0;
    for (const project of activeProjects) {
        const projectThemes = project.themes || [];
        const projectKeywords = [
            project.code.toLowerCase(),
            project.name.toLowerCase(),
            ...projectThemes.map((t) => t.toLowerCase()),
        ];
        const suggestions = [];
        let alreadyApplied = 0;
        for (const opp of opps) {
            const oppId = opp.id;
            const oppThemes = opp.themes || [];
            const focusAreas = opp.focus_areas || [];
            const eligibility = opp.eligibility_summary || '';
            const closesAt = opp.closes_at;
            // Skip if already applied for this project
            if (appliedMap.get(oppId)?.has(project.code)) {
                alreadyApplied++;
                continue;
            }
            // Match scoring
            const matchReasons = [];
            // Theme overlap
            const oppKeywords = [
                ...oppThemes.map((t) => t.toLowerCase()),
                ...focusAreas.map((f) => f.toLowerCase()),
                eligibility.toLowerCase(),
            ].join(' ');
            for (const theme of projectThemes) {
                if (oppKeywords.includes(theme.toLowerCase())) {
                    matchReasons.push(`Theme match: ${theme}`);
                }
            }
            // Keyword matching in name/focus
            const oppName = opp.name.toLowerCase();
            if (oppName.includes('indigenous') && projectKeywords.some((k) => k.includes('indigenous'))) {
                matchReasons.push('Indigenous focus alignment');
            }
            if (oppName.includes('youth') && projectKeywords.some((k) => k.includes('justice') || k.includes('youth'))) {
                matchReasons.push('Youth focus alignment');
            }
            if (oppName.includes('community') || oppName.includes('social')) {
                matchReasons.push('Community/social focus');
            }
            if (oppName.includes('innovation') || oppName.includes('technology')) {
                matchReasons.push('Innovation/technology focus');
            }
            // Skip if no match reasons
            if (matchReasons.length === 0)
                continue;
            // Check readiness
            const readinessKey = `${oppId}-${project.code}`;
            const readiness = readinessMap.get(readinessKey) ?? null;
            if (readiness !== null && readiness < minReadiness)
                continue;
            // Calculate days until close
            let daysUntilClose = null;
            if (closesAt) {
                daysUntilClose = Math.ceil((new Date(closesAt).getTime() - now.getTime()) / 86400000);
                if (daysUntilClose < 0)
                    continue; // Already closed
            }
            suggestions.push({
                opportunity_id: oppId,
                opportunity_name: opp.name,
                provider: opp.provider,
                amount_max: opp.amount_max,
                closes_at: closesAt,
                days_until_close: daysUntilClose,
                themes: oppThemes,
                match_reasons: matchReasons,
                readiness_score: readiness,
                existing_application: false,
            });
        }
        // Sort by: most match reasons first, then by deadline urgency
        suggestions.sort((a, b) => {
            const reasonDiff = b.match_reasons.length - a.match_reasons.length;
            if (reasonDiff !== 0)
                return reasonDiff;
            // Then by deadline (sooner first, null last)
            const aClose = a.days_until_close ?? 999;
            const bClose = b.days_until_close ?? 999;
            return aClose - bClose;
        });
        const topSuggestions = suggestions.slice(0, limitPerProject);
        totalSuggestions += topSuggestions.length;
        results.push({
            project_code: project.code,
            project_name: project.name,
            project_themes: projectThemes,
            suggestions: topSuggestions,
            already_applied: alreadyApplied,
        });
    }
    return {
        generated_at: now.toISOString(),
        projects: results.filter((r) => r.suggestions.length > 0),
        total_suggestions: totalSuggestions,
        total_opportunities_scanned: opps.length,
    };
}
//# sourceMappingURL=grant-suggestions.js.map