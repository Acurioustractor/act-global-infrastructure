/**
 * Active Projects Resolver
 *
 * Replaces the static config/active-projects.json with a dynamic resolver
 * that derives active projects from the canonical project-codes.json / Supabase projects table.
 *
 * This eliminates the data duplication between active-projects.json and project-codes.json.
 *
 * Usage:
 *   import { getActiveProjects, getActiveProjectSlugs } from './lib/active-projects.mjs';
 *
 *   const active = await getActiveProjects();
 *   // [{ name: 'JusticeHub', code: 'ACT-JH', slug: 'justicehub', ... }, ...]
 */

import { loadProjects } from './project-loader.mjs';

/**
 * Derive the active projects list from the canonical projects source.
 * No more separate active-projects.json needed.
 *
 * @param {object} [options]
 * @param {boolean} [options.includeIdeation] - Include 'ideation' status projects (default: false)
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.supabase] - Optional supabase client
 * @returns {Promise<Array<object>>}
 */
export async function getActiveProjects(options = {}) {
  const { includeIdeation = false } = options;
  const projects = await loadProjects({ supabase: options.supabase });
  const validStatuses = ['active'];
  if (includeIdeation) validStatuses.push('ideation');

  return Object.values(projects)
    .filter(p => validStatuses.includes(p.status))
    .map(p => ({
      name: p.name,
      code: p.code,
      slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      category: p.category,
      tier: p.tier,
      priority: p.priority,
      description: p.description,
      leads: p.leads || [],
      lcaa_themes: p.lcaa_themes || [],
      cultural_protocols: p.cultural_protocols || false,
      parent_project: p.parent_project || null,
    }))
    .sort((a, b) => {
      // Sort by tier (ecosystem first), then by name
      const tierOrder = { ecosystem: 0, studio: 1, satellite: 2 };
      const tierDiff = (tierOrder[a.tier] || 3) - (tierOrder[b.tier] || 3);
      if (tierDiff !== 0) return tierDiff;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Get just the active project codes.
 *
 * @param {object} [options] - Same as getActiveProjects
 * @returns {Promise<string[]>}
 */
export async function getActiveProjectCodes(options = {}) {
  const active = await getActiveProjects(options);
  return active.map(p => p.code);
}

/**
 * Check if a project code is currently active.
 *
 * @param {string} code - Project code (e.g. 'ACT-JH')
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
export async function isProjectActive(code, options = {}) {
  const codes = await getActiveProjectCodes(options);
  return codes.includes(code);
}

export default { getActiveProjects, getActiveProjectCodes, isProjectActive };
