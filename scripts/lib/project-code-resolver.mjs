/**
 * Project-code resolver: tag → canonical ACT-XX code.
 *
 * Single source of truth for mapping GHL contact tags to project codes.
 * Used by:
 *   - scripts/backfill-ghl-contact-projects.mjs
 *   - scripts/sync-ghl-to-supabase.mjs
 *
 * Lookup precedence:
 *   1. Direct match against projects.ghl_tags (lowercased)
 *   2. Direct match against ACT-XX code itself (case-insensitive)
 *   3. Prefix rule (goods-* → ACT-GD, etc.)
 *   4. Legacy slug aliases (the-harvest → ACT-HV, act-farm → ACT-FM, act-studio → ACT-CORE)
 */

export const PREFIX_RULES = [
  ['goods-', 'ACT-GD'],
  ['harvest-', 'ACT-HV'],
  ['contained-', 'ACT-CN'],
  ['picc-', 'ACT-PI'],
  ['justicehub-', 'ACT-JH'],
  ['el-', 'ACT-EL'],
  ['empathy-', 'ACT-EL'],
  ['bcv-', 'ACT-BV'],
  ['black-cockatoo-', 'ACT-BV'],
  ['farm-', 'ACT-FM'],
  ['the-farm-', 'ACT-FM']
];

const LEGACY_SLUG_ALIASES = {
  'the-harvest': 'ACT-HV',
  'act-farm': 'ACT-FM',
  'act-studio': 'ACT-CORE',
  'goods-on-country': 'ACT-GD',
  'bcv-residencies': 'ACT-BV'
};

/**
 * Build the tag → code lookup map from the projects table.
 * @param {SupabaseClient} supabase - Supabase client
 * @returns {Promise<{directMap: Map<string,string>, codeMeta: Map<string,{name:string,status:string}>}>}
 */
export async function buildProjectTagMap(supabase) {
  const { data, error } = await supabase
    .from('projects')
    .select('code, name, ghl_tags, status');
  if (error) throw error;

  const directMap = new Map();
  const codeMeta = new Map();

  for (const p of data) {
    codeMeta.set(p.code, { name: p.name, status: p.status });
    // ACT-XX code maps to itself (case-insensitive)
    directMap.set(p.code.toLowerCase(), p.code);
    for (const t of p.ghl_tags || []) {
      const key = String(t).toLowerCase();
      if (directMap.has(key) && directMap.get(key) !== p.code) continue;
      directMap.set(key, p.code);
    }
  }
  // Legacy aliases (predate canonical codes)
  for (const [slug, code] of Object.entries(LEGACY_SLUG_ALIASES)) {
    if (!directMap.has(slug)) directMap.set(slug, code);
  }
  return { directMap, codeMeta };
}

/**
 * Derive canonical ACT-XX codes from a contact's tag set.
 * @param {string[]} tags
 * @param {Map<string,string>} directMap
 * @returns {string[]} sorted canonical codes
 */
export function deriveProjectCodes(tags, directMap) {
  const codes = new Set();
  for (const raw of tags || []) {
    if (!raw) continue;
    const tag = String(raw).toLowerCase();
    if (directMap.has(tag)) {
      codes.add(directMap.get(tag));
      continue;
    }
    for (const [prefix, code] of PREFIX_RULES) {
      if (tag.startsWith(prefix)) {
        codes.add(code);
        break;
      }
    }
  }
  return [...codes].sort();
}
