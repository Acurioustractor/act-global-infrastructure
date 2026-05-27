/**
 * Relationship Pipeline Populator
 * -------------------------------
 * Refreshes the `relationship_pipeline` table that backs the /pipeline
 * relationship-cultivation kanban (apps/command-center/src/app/api/pipeline/route.ts).
 *
 * The table froze in March 2026 because no populator ever existed. This script
 * rebuilds the cultivation board from the now-fresh canonical sources.
 *
 * SOURCES (entity_type → query)
 *   opportunity  ← opportunities_unified WHERE opportunity_type='deal'
 *                    AND stage IN ('pursuing','identified','researching')   (~430 active deals)
 *   grant        ← opportunities_unified WHERE opportunity_type='grant'
 *                    AND array_length(project_codes,1) > 0                   (aligned grants)
 *                    AND actual_close IS NULL                                (not yet closed)
 *                    capped to top GRANT_CAP by value_mid desc (board-size guard)
 *   foundation   ← foundations whose id appears in
 *                    grant_opportunities.foundation_id (foundations we are engaged with)
 *                    Fallback: top 40 by total_giving_annual WHERE has_dgr=true
 *
 * SCORE FORMULAS (all 0-5, stored as smallint)
 *   money_score:     bucket by value_high (fallback value_mid):
 *                      <$10k→0, <$50k→1, <$100k→2, <$500k→3, <$1M→4, ≥$1M→5
 *   urgency_score:   from expected_close proximity (today = process date):
 *                      overdue or ≤7d → 5, ≤30d → 4, ≤90d → 3, ≤180d → 2,
 *                      future/none → 1; foundations (no close) → 0
 *   strategic_score: project_codes non-empty → base 3; + metadata.fit_score OR
 *                      metadata.relevance_score (≥70 → +2, ≥50 → +1). Cap 5.
 *                      Foundations → 2 (strategic cultivation).
 *   love_score:      linked GHL contact (opportunities_unified.contact_ids[0]) looked
 *                      up in relationship_health by ghl_contact_id, mapped from
 *                      `temperature`. Foundations → 0 (no contact link).
 *
 *      ⚠ DEVIATION FROM SPEC (verified against live data 2026-05-27):
 *      - relationship_health.temperature is a NUMERIC 0-100 score, NOT a text
 *        label (hot/warm/cold). We therefore bucket the number:
 *          ≥60 → 5 (hot), ≥40 → 3 (warm), ≥20 → 1 (cold), else 0.
 *      - opportunities_unified.contact_ids is EMPTY for ALL 15,539 deals+grants
 *        in the live DB, so love_score resolves to 0 for every row today. The
 *        lookup path is implemented so it lights up automatically if/when
 *        contact_ids gets populated.
 *
 * STAGE MAPPING
 *   deals:        pursuing→active, identified/researching→warm,
 *                 realized→engaged, lost→lost (else warm)
 *   grants:       default→warm; actual_close set→engaged
 *   foundations:  cold
 *   (On the real run, stage is only set for NEW rows — existing rows keep their
 *    human-edited stage. See MANUAL-EDIT PRESERVATION below.)
 *
 * last_contact_date: relationship_health.last_contact_at (if linked) else null.
 * color:             always null (left for the UI / human).
 *
 * MANUAL-EDIT PRESERVATION (real run only)
 *   Users edit stage, notes, next_action, next_action_date via the kanban POST.
 *   For rows that ALREADY exist (same entity_type,entity_id) we UPDATE only the
 *   computed columns and NEVER touch those 4 human-workflow fields. New rows are
 *   INSERTed with the computed stage default.
 *
 * CLI
 *   node scripts/populate-relationship-pipeline.mjs --dry-run   (default; writes NOTHING)
 *   node scripts/populate-relationship-pipeline.mjs --apply     (real write path)
 *
 * SAFETY: the --dry-run path NEVER calls insert/update/upsert. It only reads.
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GRANT_CAP = 400; // board-size guard: top N aligned+open grants by value_mid
const FOUNDATION_FALLBACK_LIMIT = 40;
const ROW_GATE = 2000; // if would-upsert exceeds this, stop and report

const HUMAN_FIELDS = ['stage', 'notes', 'next_action', 'next_action_date'];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY; // dry-run is the default

// ---------------------------------------------------------------------------
// Supabase (shared operational DB)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** money_score 0-5 from value_high (fallback value_mid) */
function moneyScore(valueHigh, valueMid) {
  const v = num(valueHigh) ?? num(valueMid);
  if (v === null) return 0;
  if (v < 10_000) return 0;
  if (v < 50_000) return 1;
  if (v < 100_000) return 2;
  if (v < 500_000) return 3;
  if (v < 1_000_000) return 4;
  return 5;
}

/** urgency_score 0-5 from expected_close proximity. isFoundation → 0. */
function urgencyScore(expectedClose, isFoundation) {
  if (isFoundation) return 0;
  if (!expectedClose) return 1; // none
  const close = new Date(expectedClose);
  if (Number.isNaN(close.getTime())) return 1;
  close.setHours(0, 0, 0, 0);
  const days = Math.floor((close.getTime() - TODAY.getTime()) / 86_400_000);
  if (days <= 7) return 5; // overdue or within a week
  if (days <= 30) return 4;
  if (days <= 90) return 3;
  if (days <= 180) return 2;
  return 1; // future
}

/** strategic_score 0-5. */
function strategicScore({ projectCodes, metadata, isFoundation }) {
  if (isFoundation) return 2;
  const hasCodes = Array.isArray(projectCodes) && projectCodes.length > 0;
  let s = hasCodes ? 3 : 0;
  const fit = num(metadata?.fit_score) ?? num(metadata?.relevance_score);
  if (fit !== null) {
    if (fit >= 70) s += 2;
    else if (fit >= 50) s += 1;
  }
  return Math.min(s, 5);
}

/** love_score 0-5 from relationship_health.temperature (numeric 0-100). */
function loveScoreFromTemperature(temperature) {
  const t = num(temperature);
  if (t === null) return 0;
  if (t >= 60) return 5; // hot
  if (t >= 40) return 3; // warm
  if (t >= 20) return 1; // cold
  return 0;
}

function dealStage(stage) {
  switch (stage) {
    case 'pursuing': return 'active';
    case 'identified':
    case 'researching': return 'warm';
    case 'realized': return 'engaged';
    case 'lost': return 'lost';
    default: return 'warm';
  }
}

function grantStage(actualClose) {
  return actualClose ? 'engaged' : 'warm';
}

const clampSmallint = (n) => Math.max(0, Math.min(5, Math.round(n || 0)));

// ---------------------------------------------------------------------------
// Source loaders (paginate past PostgREST 1000-row cap)
// ---------------------------------------------------------------------------
async function withRetry(fn, label, tries = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < tries) {
        const wait = 400 * attempt;
        console.warn(`  …retry ${attempt}/${tries - 1} on ${label} (${e.message}) after ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

async function fetchAll(buildQuery, label = 'query') {
  const PAGE = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const { data, error } = await withRetry(
      () => buildQuery().range(from, from + PAGE - 1),
      `${label}[${from}]`
    );
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function loadDeals() {
  return fetchAll(() =>
    supabase
      .from('opportunities_unified')
      .select('id,title,value_low,value_mid,value_high,expected_close,actual_close,stage,project_codes,url,contact_name,contact_ids,metadata')
      .eq('opportunity_type', 'deal')
      .in('stage', ['pursuing', 'identified', 'researching']),
    'deals'
  );
}

async function loadGrants() {
  // aligned (project_codes non-empty) AND not yet closed; cap by value_mid desc
  const rows = await fetchAll(() =>
    supabase
      .from('opportunities_unified')
      .select('id,title,value_low,value_mid,value_high,expected_close,actual_close,stage,project_codes,url,contact_name,contact_ids,metadata')
      .eq('opportunity_type', 'grant')
      .not('project_codes', 'is', null)
      .is('actual_close', null)
      .order('value_mid', { ascending: false, nullsFirst: false }),
    'grants'
  );
  // PostgREST can't express array_length>0; enforce non-empty here, then cap.
  const aligned = rows.filter((r) => Array.isArray(r.project_codes) && r.project_codes.length > 0);
  const capped = aligned.slice(0, GRANT_CAP);
  return { capped, alignedCount: aligned.length, capApplied: aligned.length > GRANT_CAP };
}

async function loadEngagedFoundations() {
  // distinct foundation_id from grant_opportunities
  const goRows = await fetchAll(
    () => supabase.from('grant_opportunities').select('foundation_id').not('foundation_id', 'is', null),
    'grant_opportunities.foundation_id'
  );
  const ids = [...new Set(goRows.map((r) => r.foundation_id).filter(Boolean))];

  if (ids.length === 0) {
    // FALLBACK: top 40 foundations by total_giving_annual desc, has_dgr=true
    const fallback = await fetchAll(() =>
      supabase
        .from('foundations')
        .select('id,name,website,total_giving_annual,grant_range_max')
        .eq('has_dgr', true)
        .order('total_giving_annual', { ascending: false, nullsFirst: false })
        .limit(FOUNDATION_FALLBACK_LIMIT)
    );
    return { foundations: fallback.slice(0, FOUNDATION_FALLBACK_LIMIT), usedFallback: true };
  }

  // fetch foundations in id batches. Keep batch small: UUID .in() lists go in the
  // URL (PostgREST GET), and ~500 UUIDs overflow the request line → "fetch failed".
  const foundations = [];
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const { data, error } = await withRetry(
      () =>
        supabase
          .from('foundations')
          .select('id,name,website,total_giving_annual,grant_range_max')
          .in('id', slice),
      `foundations.in[${i}]`
    );
    if (error) throw new Error(error.message);
    foundations.push(...(data || []));
  }
  return { foundations, usedFallback: false };
}

/** Batch-load relationship_health for a set of ghl_contact_ids. */
async function loadHealthByContactIds(contactIds) {
  const map = new Map();
  const unique = [...new Set(contactIds.filter(Boolean))];
  if (unique.length === 0) return map;
  const BATCH = 100; // .in() ids ride in the URL; keep small to avoid "fetch failed"
  for (let i = 0; i < unique.length; i += BATCH) {
    const slice = unique.slice(i, i + BATCH);
    const { data, error } = await withRetry(
      () =>
        supabase
          .from('relationship_health')
          .select('ghl_contact_id,temperature,last_contact_at')
          .in('ghl_contact_id', slice),
      `relationship_health.in[${i}]`
    );
    if (error) throw new Error(error.message);
    for (const r of data || []) map.set(r.ghl_contact_id, r);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Row builders → computed pipeline rows
// ---------------------------------------------------------------------------
function buildOpportunityRow(o, entityType, healthMap) {
  const contactId = Array.isArray(o.contact_ids) && o.contact_ids.length > 0 ? o.contact_ids[0] : null;
  const health = contactId ? healthMap.get(contactId) : null;
  const isGrant = entityType === 'grant';

  const valueHigh = num(o.value_high) ?? num(o.value_mid);
  const valueLow = num(o.value_low);

  return {
    entity_type: entityType,
    entity_id: String(o.id),
    entity_name: o.title || '(untitled)',
    // stage only used for NEW rows on real run
    stage: isGrant ? grantStage(o.actual_close) : dealStage(o.stage),
    money_score: clampSmallint(moneyScore(o.value_high, o.value_mid)),
    urgency_score: clampSmallint(urgencyScore(o.expected_close, false)),
    strategic_score: clampSmallint(
      strategicScore({ projectCodes: o.project_codes, metadata: o.metadata, isFoundation: false })
    ),
    love_score: clampSmallint(loveScoreFromTemperature(health?.temperature)),
    value_low: valueLow,
    value_high: valueHigh,
    subtitle: o.url || null,
    project_codes: Array.isArray(o.project_codes) ? o.project_codes : [],
    key_contact: o.contact_name || null,
    last_contact_date: health?.last_contact_at ? health.last_contact_at.slice(0, 10) : null,
    color: null,
  };
}

function buildFoundationRow(f) {
  const valueHigh = num(f.total_giving_annual) ?? num(f.grant_range_max);
  return {
    entity_type: 'foundation',
    entity_id: String(f.id),
    entity_name: f.name || '(unnamed foundation)',
    stage: 'cold',
    money_score: clampSmallint(moneyScore(valueHigh, null)),
    urgency_score: 0,
    strategic_score: 2,
    love_score: 0,
    value_low: null,
    value_high: valueHigh,
    subtitle: f.website || null,
    project_codes: [],
    key_contact: null,
    last_contact_date: null,
    color: null,
  };
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------
function tally(rows, keyFn) {
  const m = {};
  for (const r of rows) {
    const k = keyFn(r);
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

function printScoreDist(label, rows, field) {
  const dist = tally(rows, (r) => r[field]);
  const parts = [0, 1, 2, 3, 4, 5].map((lvl) => `${lvl}:${dist[lvl] || 0}`).join('  ');
  console.log(`  ${label.padEnd(10)} ${parts}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!supabase) throw new Error('Supabase client not configured (check env)');

  console.log('\n=== Relationship Pipeline Populator ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'APPLY (real write)'}`);
  console.log(`Date: ${TODAY.toISOString().slice(0, 10)}`);
  console.log(`Grant cap: top ${GRANT_CAP} by value_mid · Row gate: ${ROW_GATE}\n`);

  // --- Load sources ---
  console.log('Loading sources...');
  const deals = await loadDeals();
  console.log(`  deals (active):            ${deals.length}`);

  const { capped: grants, alignedCount, capApplied } = await loadGrants();
  console.log(`  grants (aligned+open):     ${alignedCount}${capApplied ? ` → capped to ${grants.length}` : ''}`);

  const { foundations, usedFallback } = await loadEngagedFoundations();
  console.log(`  foundations (engaged):     ${foundations.length}${usedFallback ? ' [FALLBACK: top-40 DGR]' : ''}`);

  // --- Batch relationship_health for love_score ---
  const contactIds = [...deals, ...grants]
    .map((o) => (Array.isArray(o.contact_ids) && o.contact_ids.length > 0 ? o.contact_ids[0] : null))
    .filter(Boolean);
  const healthMap = await loadHealthByContactIds(contactIds);
  console.log(`  linked GHL contacts:       ${contactIds.length} (health rows found: ${healthMap.size})\n`);

  // --- Build computed rows ---
  const rows = [
    ...deals.map((o) => buildOpportunityRow(o, 'opportunity', healthMap)),
    ...grants.map((o) => buildOpportunityRow(o, 'grant', healthMap)),
    ...foundations.map(buildFoundationRow),
  ];

  // --- Gate check ---
  if (rows.length > ROW_GATE) {
    console.error(`\n✗ STOP: would-upsert count ${rows.length} exceeds gate ${ROW_GATE}.`);
    console.error('  Grant filter is too loose. Tighten GRANT_CAP / foundation scope and re-run.');
    process.exit(1);
  }

  // --- Determine existing rows (preservation accounting) ---
  const existing = await fetchAll(
    () => supabase.from('relationship_pipeline').select('entity_type,entity_id'),
    'relationship_pipeline.existing'
  );
  const existingKeys = new Set(existing.map((r) => `${r.entity_type}::${r.entity_id}`));
  const wouldUpdate = rows.filter((r) => existingKeys.has(`${r.entity_type}::${r.entity_id}`));
  const wouldInsert = rows.filter((r) => !existingKeys.has(`${r.entity_type}::${r.entity_id}`));

  // --- Report ---
  console.log('=== WOULD-UPSERT SUMMARY ===');
  console.log(`Total rows:                ${rows.length}`);
  const byType = tally(rows, (r) => r.entity_type);
  console.log(`By entity_type:            opportunity=${byType.opportunity || 0}  grant=${byType.grant || 0}  foundation=${byType.foundation || 0}`);
  const byStage = tally(rows, (r) => r.stage);
  console.log(`By computed stage:         ${Object.entries(byStage).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  console.log(`Existing in table:         ${existing.length} (${wouldUpdate.length} of our rows match → human fields PRESERVED)`);
  console.log(`New inserts:               ${wouldInsert.length}`);
  console.log(`Human fields preserved on UPDATE: ${HUMAN_FIELDS.join(', ')}\n`);

  console.log('Score distributions (level:count):');
  printScoreDist('money', rows, 'money_score');
  printScoreDist('urgency', rows, 'urgency_score');
  printScoreDist('love', rows, 'love_score');
  printScoreDist('strategic', rows, 'strategic_score');

  console.log('\nSample rows (5):');
  for (const r of rows.slice(0, 5)) {
    const name = (r.entity_name || '').slice(0, 48);
    console.log(
      `  [${r.entity_type}] ${name.padEnd(48)} stage=${(r.stage || '').padEnd(7)} ` +
        `m${r.money_score} u${r.urgency_score} l${r.love_score} s${r.strategic_score} ` +
        `val_high=${r.value_high ?? '–'}`
    );
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: NO database writes performed. Done.\n');
    return;
  }

  // Clear superseded machine-generated rows so the board doesn't accumulate the stale March
  // snapshot alongside the fresh set. Predicate = "untouched auto": never given a next_action,
  // never Notion-synced, and never re-saved after creation (updated_at within 60s of created_at —
  // the updated_at trigger bumps on any human edit incl. a stage move via the kanban POST). Any
  // human-curated row is preserved. (exec_sql is SELECT-only, so delete by id via supabase-js.)
  const existingRows = await fetchAll(() =>
    supabase
      .from('relationship_pipeline')
      .select('id, created_at, updated_at, next_action, last_synced_to_notion'),
  );
  const TOUCH_TOLERANCE_MS = 60_000;
  const staleIds = existingRows
    .filter(
      (r) =>
        !r.next_action &&
        !r.last_synced_to_notion &&
        new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() < TOUCH_TOLERANCE_MS,
    )
    .map((r) => r.id);
  let cleared = 0;
  for (let i = 0; i < staleIds.length; i += 200) {
    const batch = staleIds.slice(i, i + 200);
    const { error } = await supabase.from('relationship_pipeline').delete().in('id', batch);
    if (error) throw new Error(`stale-clear failed: ${error.message}`);
    cleared += batch.length;
  }
  console.log(`Cleared ${cleared} stale untouched auto-rows (preserved ${existingRows.length - cleared}).`);

  // Re-split against the POST-clear table (only human-curated rows can survive the clear).
  const { data: survivors } = await supabase
    .from('relationship_pipeline')
    .select('entity_type,entity_id');
  const survivorKeys = new Set((survivors || []).map((r) => `${r.entity_type}::${r.entity_id}`));
  const toUpdate = rows.filter((r) => survivorKeys.has(`${r.entity_type}::${r.entity_id}`));
  const toInsert = rows.filter((r) => !survivorKeys.has(`${r.entity_type}::${r.entity_id}`));

  // -------------------------------------------------------------------------
  // REAL WRITE PATH (--apply) — manual-edit preservation
  //   INSERT new rows (with computed stage default).
  //   UPDATE existing rows: refresh computed columns ONLY, never the 4 human fields.
  // -------------------------------------------------------------------------
  const nowIso = new Date().toISOString();

  // Computed columns to refresh on UPDATE (everything EXCEPT the human-workflow fields).
  const computedCols = (r) => ({
    entity_name: r.entity_name,
    money_score: r.money_score,
    urgency_score: r.urgency_score,
    strategic_score: r.strategic_score,
    love_score: r.love_score,
    value_low: r.value_low,
    value_high: r.value_high,
    subtitle: r.subtitle,
    project_codes: r.project_codes,
    key_contact: r.key_contact,
    last_contact_date: r.last_contact_date,
    color: r.color,
    updated_at: nowIso,
  });

  let inserted = 0;
  let updated = 0;

  // Inserts (batch) — include stage default + created_at
  if (toInsert.length) {
    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const slice = toInsert.slice(i, i + BATCH).map((r) => ({
        ...computedCols(r),
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        stage: r.stage, // default stage for NEW rows only
        created_at: nowIso,
      }));
      const { error } = await supabase.from('relationship_pipeline').insert(slice);
      if (error) throw new Error(`insert batch failed: ${error.message}`);
      inserted += slice.length;
    }
  }

  // Updates — computed cols only, matched on (entity_type, entity_id)
  for (const r of toUpdate) {
    const { error } = await supabase
      .from('relationship_pipeline')
      .update(computedCols(r))
      .eq('entity_type', r.entity_type)
      .eq('entity_id', r.entity_id);
    if (error) throw new Error(`update failed for ${r.entity_type}:${r.entity_id}: ${error.message}`);
    updated += 1;
  }

  console.log(`\n--apply complete: inserted ${inserted}, updated ${updated} (human fields preserved).\n`);
}

main().catch((e) => {
  console.error('\n✗ Error:', e.message);
  if (process.env.DEBUG_TRACE) console.error(e.stack);
  process.exit(1);
});
// DEBUG_TRACE=1 prints the stack trace on error.
