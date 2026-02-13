/**
 * Project Loader: Shared module for loading project codes from Supabase
 *
 * Replaces all `JSON.parse(readFileSync('config/project-codes.json'))` calls.
 * Loads from the canonical `projects` table with 5-min in-memory cache.
 * Falls back to config/project-codes.json if DB is unavailable.
 *
 * Usage:
 *   import { loadProjects, getProjectByCode, matchProjectFromText } from './lib/project-loader.mjs';
 *
 *   const projects = await loadProjects();          // { 'ACT-JH': { ... }, ... }
 *   const project = await getProjectByCode('ACT-JH');
 *   const matches = await matchProjectFromText('JusticeHub meeting notes');
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

// Cache
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Load all projects from Supabase projects table.
 * Returns an object keyed by project code, matching the old JSON config format.
 *
 * @param {object} [options]
 * @param {object} [options.supabase] - Optional pre-existing supabase client
 * @param {boolean} [options.forceRefresh] - Bypass cache
 * @returns {Promise<Record<string, object>>} Projects keyed by code
 */
export async function loadProjects(options = {}) {
  const now = Date.now();
  if (_cache && !options.forceRefresh && (now - _cacheTime) < CACHE_TTL) {
    return _cache;
  }

  try {
    const sb = options.supabase || getSupabase();
    const { data, error } = await sb
      .from('projects')
      .select('*')
      .order('importance_weight', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No projects returned from DB');

    const projects = {};
    for (const row of data) {
      projects[row.code] = {
        name: row.name,
        code: row.code,
        description: row.description,
        category: row.category,
        tier: row.tier,
        importance_weight: row.importance_weight,
        status: row.status,
        priority: row.priority,
        leads: row.leads || [],
        notion_page_id: row.notion_page_id,
        notion_pages: row.notion_pages || [],
        ghl_tags: row.ghl_tags || [],
        xero_tracking: row.xero_tracking,
        dext_category: row.dext_category,
        alma_program: row.alma_program,
        lcaa_themes: row.lcaa_themes || [],
        cultural_protocols: row.cultural_protocols || false,
        parent_project: row.parent_project,
        metadata: row.metadata || {},
      };
    }

    _cache = projects;
    _cacheTime = now;
    return projects;
  } catch (err) {
    console.warn('[ProjectLoader] DB load failed, falling back to JSON config:', err.message);
    return loadFromJson();
  }
}

/**
 * Fallback: load from config/project-codes.json
 */
function loadFromJson() {
  try {
    const filePath = join(__dirname, '../../config/project-codes.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    _cache = raw.projects;
    _cacheTime = Date.now();
    return raw.projects;
  } catch (err) {
    console.error('[ProjectLoader] JSON fallback also failed:', err.message);
    return {};
  }
}

/**
 * Get a single project by code
 *
 * @param {string} code - e.g. 'ACT-JH'
 * @param {object} [options] - Same as loadProjects options
 * @returns {Promise<object|null>}
 */
export async function getProjectByCode(code, options = {}) {
  const projects = await loadProjects(options);
  return projects[code] || null;
}

/**
 * Match project codes from free text using ghl_tags and notion_pages keywords
 *
 * @param {string} text - Text to match against
 * @param {object} [options]
 * @param {boolean} [options.activeOnly] - Only return active projects (default: true)
 * @returns {Promise<Array<{code: string, name: string, matchedOn: string, score: number}>>}
 */
export async function matchProjectFromText(text, options = {}) {
  const activeOnly = options.activeOnly !== false;
  const projects = await loadProjects(options);
  const textLower = text.toLowerCase();
  const matches = [];

  for (const [code, proj] of Object.entries(projects)) {
    if (activeOnly && proj.status === 'archived') continue;

    let bestScore = 0;
    let matchedOn = '';

    // Check project name
    if (textLower.includes(proj.name.toLowerCase())) {
      bestScore = 0.9;
      matchedOn = `name:${proj.name}`;
    }

    // Check ghl_tags
    for (const tag of proj.ghl_tags || []) {
      if (textLower.includes(tag.toLowerCase())) {
        const score = tag.length > 4 ? 0.8 : 0.6; // Longer tags = higher confidence
        if (score > bestScore) {
          bestScore = score;
          matchedOn = `tag:${tag}`;
        }
      }
    }

    // Check notion_pages
    for (const page of proj.notion_pages || []) {
      if (textLower.includes(page.toLowerCase())) {
        const score = 0.85;
        if (score > bestScore) {
          bestScore = score;
          matchedOn = `notion:${page}`;
        }
      }
    }

    // Check xero_tracking
    if (proj.xero_tracking && textLower.includes(proj.xero_tracking.toLowerCase())) {
      const score = 0.75;
      if (score > bestScore) {
        bestScore = score;
        matchedOn = `xero:${proj.xero_tracking}`;
      }
    }

    if (bestScore > 0) {
      matches.push({ code, name: proj.name, matchedOn, score: bestScore });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Get the full projects object in the legacy JSON config format (with _meta, categories, etc.)
 * Useful for scripts that need the full config structure.
 */
export async function loadProjectsConfig(options = {}) {
  const projects = await loadProjects(options);
  return { projects };
}

/**
 * Clear the in-memory cache
 */
export function clearCache() {
  _cache = null;
  _cacheTime = 0;
}

export default { loadProjects, getProjectByCode, matchProjectFromText, loadProjectsConfig, clearCache };
