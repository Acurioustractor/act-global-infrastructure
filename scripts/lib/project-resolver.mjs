/**
 * project-resolver.mjs — THE ONE shared project-code resolver.
 *
 * Maps a record's available signals → { code, confidence, source } under a fixed precedence.
 * The single place tag→code logic lives, consolidating what was scattered across
 * project-code-resolver.mjs (contact prefix rules), align-ghl-opportunities.mjs (keyword scorer),
 * apps/command-center pileForOpp, and the Xero vendor taggers.
 *
 * Decision: wiki/decisions/2026-06-03-unified-project-code-resolver.md
 * Concept:  wiki/concepts/project-code-resolution.md
 *
 * Precedence (highest → lowest):
 *   manual override → authoritative system tag (Xero tracking / direct ACT-XX) → linked-record code
 *   → registry direct (exact ghl_tag/alias) → vendor rule → prefix rule → pipeline hint → name/keyword fuzzy
 * Legacy wrappers (ACT-CG→ACT-CS, ACT-HQ→ACT-CORE, ACT-PC→ACT-PI) are normalised throughout.
 *
 * PURE given (signals, index): no DB. Build the index once with buildResolverIndex(loadedProjects).
 */

/** Retained non-canonical codes that fold to a canonical one on resolve. */
export const LEGACY_WRAPPERS = { 'ACT-CG': 'ACT-CS', 'ACT-HQ': 'ACT-CORE', 'ACT-PC': 'ACT-PI' };

/** tag prefix → code (from the contact resolver). */
export const PREFIX_RULES = [
  ['goods-', 'ACT-GD'], ['harvest-', 'ACT-HV'], ['contained-', 'ACT-CN'], ['picc-', 'ACT-PI'],
  ['justicehub-', 'ACT-JH'], ['el-', 'ACT-EL'], ['empathy-', 'ACT-EL'], ['bcv-', 'ACT-BV'],
  ['black-cockatoo-', 'ACT-BV'], ['farm-', 'ACT-FM'], ['the-farm-', 'ACT-FM'],
];

/** GHL pipeline-name substring → code (from align-ghl PIPELINE_MAP, used as substring hints). */
export const PIPELINE_HINTS = [
  ['a curious tractor', 'ACT-CA'], ['goods', 'ACT-GD'], ['festivals', 'ACT-CE'], ['act events', 'ACT-CE'],
  ['empathy ledger', 'ACT-EL'], ['justicehub', 'ACT-JH'], ['photo studio', 'ACT-PS'], ['radical scoops', 'ACT-RA'],
  ['picc', 'ACT-PI'], ['the harvest', 'ACT-HV'], ['harvest', 'ACT-HV'], ['campfire', 'ACT-CM'],
  ['community capital', 'ACT-CP'], ['confit', 'ACT-CT'], ['smart stories', 'ACT-SM'], ['marriage celebrant', 'ACT-MC'],
];

/** Confidence by source. >= AUTO_APPLY_THRESHOLD may auto-write; below it goes to the review queue. */
export const CONFIDENCE = {
  manual: 1, system: 0.98, linked: 0.95, registry: 0.9, vendor: 0.85, prefix: 0.82, pipeline: 0.8,
  keyword_exact: 0.7, keyword_partial: 0.5,
};
export const AUTO_APPLY_THRESHOLD = 0.8;

/** Uppercase/trim a code and fold any legacy wrapper to its canonical code. */
export function normalizeCode(code) {
  if (!code) return null;
  const up = String(code).trim().toUpperCase();
  if (!up) return null;
  return LEGACY_WRAPPERS[up] || up;
}

/**
 * Build the lookup index from the registry (config/project-codes.json `projects`, or the projects table).
 * @param {Record<string, {name?:string, ghl_tags?:string[], xero_tracking?:string, xero_tracking_aliases?:string[]}>} projects
 */
export function buildResolverIndex(projects) {
  const tagToCode = new Map(); // exact tag/alias/code (lowercased) → canonical code
  const validCodes = new Set();
  const keywordEntries = []; // { code, kw, weight } for fuzzy free-text matching
  for (const [rawCode, p] of Object.entries(projects || {})) {
    const code = normalizeCode(rawCode);
    if (!code) continue;
    validCodes.add(code);
    tagToCode.set(code.toLowerCase(), code);
    for (const t of p.ghl_tags || []) {
      const k = String(t).toLowerCase();
      if (!tagToCode.has(k)) tagToCode.set(k, code);
      keywordEntries.push({ code, kw: k, weight: 1.0 });
    }
    if (p.name) keywordEntries.push({ code, kw: String(p.name).toLowerCase(), weight: 0.9 });
    if (p.xero_tracking) {
      const k = String(p.xero_tracking).toLowerCase();
      if (!tagToCode.has(k)) tagToCode.set(k, code);
    }
    for (const a of p.xero_tracking_aliases || []) {
      const k = String(a).toLowerCase();
      if (!tagToCode.has(k)) tagToCode.set(k, code);
    }
  }
  return { tagToCode, validCodes, keywordEntries };
}

const validOrNull = (code, index) => {
  const c = normalizeCode(code);
  return c && index.validCodes.has(c) ? c : null;
};

function matchTagExact(tags, index) {
  for (const raw of tags || []) {
    const t = String(raw || '').toLowerCase().trim();
    if (t && index.tagToCode.has(t)) return { code: index.tagToCode.get(t), source: 'registry', confidence: CONFIDENCE.registry };
  }
  return null;
}

function matchTagPrefix(tags, index) {
  for (const raw of tags || []) {
    const t = String(raw || '').toLowerCase().trim();
    for (const [prefix, code] of PREFIX_RULES) {
      if (t.startsWith(prefix)) {
        const c = validOrNull(code, index);
        if (c) return { code: c, source: 'prefix', confidence: CONFIDENCE.prefix };
      }
    }
  }
  return null;
}

function matchPipeline(pipelineName, index) {
  const pl = String(pipelineName || '').toLowerCase();
  if (!pl) return null;
  for (const [kw, code] of PIPELINE_HINTS) {
    if (pl.includes(kw)) {
      const c = validOrNull(code, index);
      if (c) return { code: c, source: 'pipeline', confidence: CONFIDENCE.pipeline };
    }
  }
  return null;
}

function matchKeyword(text, index) {
  const s = String(text || '').toLowerCase();
  if (!s) return null;
  let best = null;
  for (const { code, kw, weight } of index.keywordEntries) {
    if (kw.length > 3 && s.includes(kw)) {
      const confidence = weight >= 1.0 ? CONFIDENCE.keyword_exact : CONFIDENCE.keyword_partial;
      if (!best || confidence > best.confidence) best = { code, confidence, source: 'keyword' };
    }
  }
  return best;
}

/**
 * Resolve a record's signals to a project code.
 * @param {object} signals  { manualCode, systemCode, linkedCode, tags[], vendorName, pipelineName, text }
 * @param {ReturnType<typeof buildResolverIndex>} index
 * @param {object} [opts]   { vendorRules: Map<string lowercased vendor, code> }
 * @returns {{code: string|null, confidence: number, source: string}}
 */
export function resolveProjectCode(signals = {}, index, opts = {}) {
  const vendorRules = opts.vendorRules || new Map();

  // 1. manual override — a human decision, trusted after normalisation (authoritative).
  const manual = normalizeCode(signals.manualCode);
  if (manual) return { code: manual, confidence: CONFIDENCE.manual, source: 'manual' };

  // 2. authoritative system tag (Xero tracking / a directly-set ACT-XX) — must be a real code.
  const system = validOrNull(signals.systemCode, index);
  if (system) return { code: system, confidence: CONFIDENCE.system, source: 'system' };

  // 3. linked-record code (e.g. an opp's paid Xero invoice).
  const linked = validOrNull(signals.linkedCode, index);
  if (linked) return { code: linked, confidence: CONFIDENCE.linked, source: 'linked' };

  // 4. registry direct (exact ghl_tag/alias) → vendor rule → prefix → pipeline hint.
  const exact = matchTagExact(signals.tags, index);
  if (exact) return exact;

  if (signals.vendorName) {
    const v = validOrNull(vendorRules.get(String(signals.vendorName).toLowerCase().trim()), index);
    if (v) return { code: v, confidence: CONFIDENCE.vendor, source: 'vendor' };
  }

  const prefix = matchTagPrefix(signals.tags, index);
  if (prefix) return prefix;

  const pipeline = matchPipeline(signals.pipelineName, index);
  if (pipeline) return pipeline;

  // 5. name/keyword fuzzy — last, low-confidence (→ review queue).
  const kw = matchKeyword(signals.text, index);
  if (kw) return kw;

  return { code: null, confidence: 0, source: 'none' };
}
