#!/usr/bin/env node
/**
 * migrate-ghl-project-tags-2026-06-08.mjs — Phase B bucket 2 (project:). Dry-run default.
 *
 * Maps legacy/flat project tags → canonical project: namespace (+ source: where the
 * flat-tag map says so). Per the map (thoughts/shared/reviews/ghl-flat-tag-map-2026-06-08.md):
 *   act-gd/goods/project-goods/GOODS            -> project:act-gd
 *   act-hv/harvest/the harvest/the-harvest      -> project:act-hv
 *   harvest-website                              -> project:act-hv + source:website
 *   act-jh/justicehub                            -> project:act-jh
 *   act-el/empathy ledger/empathy-ledger         -> project:act-el
 *   world-tour/world-tour-partner                -> project:act-el + source:world-tour
 *   act-cn/civicgraph                            -> project:act-cn
 *   act-in                                       -> project:act-in
 *   act-regenerative-studio                      -> project:act-core
 *
 * project: tags are identity-only — NO send risk (no comms: touched). Worklist from the
 * mirror; verify-first against live GHL at apply (mirror ids drift — bucket-1 lesson).
 * Idempotent: add canonical only if absent, remove legacy only if present. Per-tag
 * add/remove (never blind overwrite). Logs before/after + UNDO. Rate-limited 1.1s.
 *
 * Usage:
 *   node scripts/migrate-ghl-project-tags-2026-06-08.mjs           # dry-run (mirror worklist + GHL tag-lib reconcile)
 *   node scripts/migrate-ghl-project-tags-2026-06-08.mjs --tracer  # write the FIRST live contact, verify, stop
 *   node scripts/migrate-ghl-project-tags-2026-06-08.mjs --apply   # verify + write ALL
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const LIVE = APPLY || TRACER;
const LOG = 'thoughts/shared/reviews/bucket2-project-apply-2026-06-08.md';
const SLEEP_MS = 1100;

// legacy tags (matched case-insensitively) -> canonical tags to add
const RULES = [
  { legacy: ['act-gd', 'goods', 'project-goods'], add: ['project:act-gd'] },
  { legacy: ['act-hv', 'harvest', 'the harvest', 'the-harvest'], add: ['project:act-hv'] },
  { legacy: ['harvest-website'], add: ['project:act-hv', 'source:website'] },
  { legacy: ['act-jh', 'justicehub'], add: ['project:act-jh'] },
  { legacy: ['act-el', 'empathy ledger', 'empathy-ledger'], add: ['project:act-el'] },
  { legacy: ['world-tour', 'world-tour-partner'], add: ['project:act-el', 'source:world-tour'] },
  { legacy: ['act-cn', 'civicgraph'], add: ['project:act-cn'] },
  { legacy: ['act-in'], add: ['project:act-in'] },
  { legacy: ['act-regenerative-studio'], add: ['project:act-core'] },
];
const ALL_LEGACY = RULES.flatMap((r) => r.legacy);
const ALL_LEGACY_LC = ALL_LEGACY.map((t) => t.toLowerCase());
const ALL_CANONICAL = [...new Set(RULES.flatMap((r) => r.add))];

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNotFound = (m) => /not found|404|400/i.test(String(m || ''));

// Given a contact's tags, compute {adds:Set, removes:[exact strings]}.
function plan(tags) {
  const lc = (tags || []).map((t) => String(t).toLowerCase());
  const adds = new Set();
  const removes = [];
  for (const rule of RULES) {
    const hit = (tags || []).filter((t) => rule.legacy.includes(String(t).toLowerCase()));
    if (!hit.length) continue;
    for (const a of rule.add) if (!lc.includes(a.toLowerCase())) adds.add(a);
    for (const h of hit) removes.push(h); // exact legacy string present
  }
  return { adds: [...adds], removes };
}

// ---- Build worklist from mirror (paginate; exclude gone-from-ghl) ----
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, tags')
    .overlaps('tags', ALL_LEGACY)
    .not('ghl_id', 'is', null)
    .range(from, from + 999);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const isGone = (r) => (r.tags || []).some((t) => String(t).startsWith('gone-from-ghl'));
const live = rows.filter((r) => !isGone(r));
const candidates = live.map((r) => ({ ...r, ...plan(r.tags) })).filter((r) => r.adds.length || r.removes.length);

log(`\n# bucket-2 project: migration — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY RUN)'}`);
log(`Rows overlapping legacy project tags: ${rows.length} · gone-from-ghl excluded: ${rows.length - live.length} · live: ${live.length} · need work: ${candidates.length}`);

// Per-legacy-tag live counts
log(`\n--- live contacts per legacy project tag (mirror) ---`);
for (const t of ALL_LEGACY) {
  const n = live.filter((r) => (r.tags || []).some((x) => String(x).toLowerCase() === t.toLowerCase())).length;
  if (n) log(`  ${t.padEnd(24)} ${n}`);
}
// Aggregate adds/removes
const addTally = {}, remTally = {};
let totalAdds = 0, totalRem = 0;
for (const c of candidates) {
  for (const a of c.adds) { addTally[a] = (addTally[a] || 0) + 1; totalAdds++; }
  for (const r of c.removes) { remTally[r.toLowerCase()] = (remTally[r.toLowerCase()] || 0) + 1; totalRem++; }
}
log(`\n--- canonical ADDs (contacts gaining each tag; already-present excluded) ---`);
for (const a of ALL_CANONICAL.sort()) log(`  +${a.padEnd(22)} ${addTally[a] || 0}`);
log(`\n--- legacy REMOVEs (by tag) ---`);
for (const t of Object.keys(remTally).sort()) log(`  -${t.padEnd(22)} ${remTally[t]}`);
log(`\nTOTAL: ${candidates.length} contacts · ${totalAdds} adds · ${totalRem} removes`);

if (!LIVE) {
  // Reconcile tag-library: do canonical defs already exist? legacy defs present?
  try {
    const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
    const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
    const r = await fetch(`https://services.leadconnectorhq.com/locations/${LOC}/tags`, { headers: { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json' } });
    const defs = new Set(((await r.json()).tags || []).map((t) => t.name.trim().toLowerCase()));
    log(`\n--- GHL tag-library reconciliation ---`);
    log(`  canonical defs already in GHL: ${ALL_CANONICAL.filter((a) => defs.has(a.toLowerCase())).join(', ') || '(none)'}`);
    log(`  canonical defs MISSING (auto-created on first add): ${ALL_CANONICAL.filter((a) => !defs.has(a.toLowerCase())).join(', ') || '(none)'}`);
    log(`  legacy defs still in GHL: ${ALL_LEGACY.filter((t) => defs.has(t.toLowerCase())).join(', ') || '(none)'}`);
    log(`  legacy defs absent (mirror-only / already cleaned): ${ALL_LEGACY.filter((t) => !defs.has(t.toLowerCase())).join(', ') || '(none)'}`);
  } catch (e) { log(`  (tag-library reconcile skipped: ${e.message})`); }
  // Sample 5 candidate plans
  log(`\n--- sample candidate plans (first 5) ---`);
  for (const c of candidates.slice(0, 5)) log(`  ${c.full_name || '(no name)'} ${c.ghl_id}: +[${c.adds.join(', ')}] -[${c.removes.join(', ')}]`);
  log(`\n(DRY RUN — no writes. Run --tracer for the first live contact, then --apply.)`);
  process.exit(0);
}

// ---- LIVE: verify-first per contact, idempotent add/remove ----
let touched = 0, added = 0, removed = 0, notInGhl = 0, errors = 0;
for (const c of candidates) {
  let liveC;
  try { liveC = await ghl.getContactById(c.ghl_id); }
  catch (e) {
    if (isNotFound(e.message)) { notInGhl++; log(`- skip (not in GHL): ${c.full_name || ''} ${c.ghl_id}`); await sleep(SLEEP_MS); continue; }
    errors++; log(`  ⚠ ERROR get ${c.ghl_id}: ${e.message}`); await sleep(SLEEP_MS); continue;
  }
  if (!liveC) { notInGhl++; log(`- skip (not in GHL): ${c.ghl_id}`); await sleep(SLEEP_MS); continue; }

  // recompute from LIVE tags (mirror may be stale)
  const p = plan(liveC.tags);
  const who = liveC.contactName || `${liveC.firstName || ''} ${liveC.lastName || ''}`.trim() || c.full_name || '(no name)';
  if (!p.adds.length && !p.removes.length) { log(`- ${who} ${c.ghl_id}: already canonical (no-op)`); await sleep(SLEEP_MS); continue; }

  try {
    if (TRACER) log(`\n## TRACER ${who} (${c.ghl_id})\n- before: [${(liveC.tags || []).join(', ')}]`);
    for (const a of p.adds) { await ghl.addTagToContact(c.ghl_id, a); added++; }
    for (const r of p.removes) { await ghl.removeTagFromContact(c.ghl_id, r); removed++; }
    touched++;
    if (TRACER) {
      const after = await ghl.getContactById(c.ghl_id);
      const at = (after.tags || []).map((t) => String(t).toLowerCase());
      const ok = p.adds.every((a) => at.includes(a.toLowerCase())) && !p.removes.some((r) => at.includes(r.toLowerCase()));
      log(`- after:  [${(after.tags || []).join(', ')}]\n- verify: ${ok ? '✅ canonical present + legacy gone' : '⚠ CHECK'}`);
      log(`\nTRACER done on 1 contact. Rerun with --apply for all ${candidates.length}.`);
      log(`UNDO: remove [${p.adds.join(', ')}]; re-add [${p.removes.join(', ')}] on ${c.ghl_id}`);
      process.exit(0);
    }
    log(`- ${who} ${c.ghl_id}: +[${p.adds.join(', ')}] -[${p.removes.join(', ')}]`);
  } catch (e) { errors++; log(`  ⚠ ERROR write ${c.ghl_id}: ${e.message}`); }
  await sleep(SLEEP_MS);
}
log(`\nDone. contacts ${touched} · adds ${added} · removes ${removed} · not-in-GHL ${notInGhl} · errors ${errors}. ${LIVE ? '(LIVE)' : '(dry)'}`);
if (LIVE) log(`UNDO: per line — remove the +canonical tags, re-add the -legacy tags.`);
