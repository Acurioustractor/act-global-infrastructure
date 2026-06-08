#!/usr/bin/env node
/**
 * migrate-ghl-role-tags-2026-06-08.mjs — Phase B bucket 3 (role:). Dry-run default.
 *
 * Maps legacy/flat role tags → canonical role: namespace (+ lane:community for the
 * community-line, + interest:/place:/source:/project: where a resolved ruling says so).
 * Built FRESH from the authoritative flat-tag map + RESOLVED orphan rulings
 * (thoughts/shared/reviews/ghl-flat-tag-map-2026-06-08.md) — NOT from the older
 * migrate-ghl-tags.mjs / ghl-taxonomy-migrate.mjs, which conflict with the rulings.
 *
 * Canonical role enum (taxonomy §3): funder partner supplier buyer supporter storyteller
 * advisor community community-controlled elder gov council land-council researcher media
 * health-service housing-provider.
 *
 * ⚠️ OCAP: storyteller / community / community-controlled / elder get lane:community (the
 * protective no-auto-comms marker). This script NEVER adds a comms: tag. It only adds
 * role:/lane:/interest:/place:/source:/project: and removes the legacy role tag.
 *
 * Worklist from mirror; verify-first against live GHL at apply (mirror ids drift).
 * Idempotent per-tag add/remove. Logs before/after + UNDO. Rate-limited 1.1s.
 *
 * Usage:
 *   node scripts/migrate-ghl-role-tags-2026-06-08.mjs           # dry-run
 *   node scripts/migrate-ghl-role-tags-2026-06-08.mjs --tracer  # first live contact, verify, stop
 *   node scripts/migrate-ghl-role-tags-2026-06-08.mjs --apply   # all
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
const LOG = 'thoughts/shared/reviews/bucket3-role-apply-2026-06-08.md';
const SLEEP_MS = 1100;

// legacy tags (matched case-insensitively) -> canonical tags to add. Faithful to the
// flat-tag map + resolved rulings. Community-line rules carry lane:community.
const RULES = [
  // Storyteller (community-line) — 'storyteller' covers 'Storyteller' (ci match)
  { legacy: ['storyteller', 'audience-storyteller', 'featured storyteller', 'story-feature'], add: ['role:storyteller', 'lane:community'] },
  // Partner
  { legacy: ['audience-partner', 'partner', 'goods-partner', 'goods-key-partner', 'goods-partner-lead', 'potential-partner'], add: ['role:partner'] },
  { legacy: ['njp'], add: ['role:partner', 'interest:justice-reform'] },
  { legacy: ['conference-host'], add: ['role:partner', 'interest:justice-reform'] },
  { legacy: ['venue-partner'], add: ['role:partner', 'interest:venue'] },
  { legacy: ['goods-gmail-partner'], add: ['role:partner', 'source:gmail-discovery'] },
  // Funder / gov
  { legacy: ['audience-funder', 'funder', 'goods-funder'], add: ['role:funder'] },
  { legacy: ['goods-gmail-funder'], add: ['role:funder', 'source:gmail-discovery'] },
  { legacy: ['grant'], add: ['role:funder'] }, // gov subset flagged for manual role:gov (see report)
  { legacy: ['tour-funding'], add: ['role:funder'] },
  { legacy: ['goods-government-grant'], add: ['role:funder', 'role:gov', 'project:act-gd'] },
  { legacy: ['government'], add: ['role:gov'] },
  { legacy: ['goods-gmail-government'], add: ['role:gov', 'source:gmail-discovery'] },
  // Supporter
  { legacy: ['goods-supporter'], add: ['role:supporter'] },
  // Supplier / vendor (all explicit per the map)
  { legacy: ['goods-supplier', 'goods-supplier-active', 'goods-supplier-pending', 'goods-role-store', 'goods-vendor', 'shop-produce', 'shop-maker',
    'supplier-plant5', 'supplier-steel5', 'supplier-hdpe2', 'supplier-canvas', 'supplier-fasteners', 'supplier-product4', 'supplier-hdpe-bulk',
    'vendor-services5', 'vendor-print2', 'vendor-freight', 'vendor-tech'], add: ['role:supplier'] },
  // Buyer
  { legacy: ['goods-customer', 'goods-bed-order'], add: ['role:buyer'] },
  // Community / community-controlled (community-line)
  { legacy: ['goods-communitycontrolled'], add: ['role:community-controlled', 'lane:community'] },
  { legacy: ['goods-community', 'community', 'indigenous-led'], add: ['role:community', 'lane:community'] },
  { legacy: ['goods-gmail-community'], add: ['role:community', 'lane:community', 'source:gmail-discovery'] },
  // Elder (community-line)
  { legacy: ['elder'], add: ['role:elder', 'lane:community'] },
  // Goods-role specific (canonical enum names)
  { legacy: ['goods-role-council'], add: ['role:council'] },
  { legacy: ['goods-role-landcouncil'], add: ['role:land-council'] },
  { legacy: ['goods-role-health', 'goods-role-health_service'], add: ['role:health-service'] },
  { legacy: ['goods-role-housing', 'goods-role-housing_provider'], add: ['role:housing-provider'] },
  { legacy: ['goods-advisory'], add: ['role:advisor'] },
  // goods-role-corp → DROP (Ben 2026-06-08): no canonical 'corporate' role; the 4 holders
  // are already role:partner. (Non-canonical role:corporate to be swept separately.)
  { legacy: ['goods-role-corp'], add: [] },
  // Media / researcher / advisor
  { legacy: ['media', 'goods-media'], add: ['role:media'] },
  { legacy: ['goods-gmail-media'], add: ['role:media', 'source:gmail-discovery'] },
  { legacy: ['research'], add: ['role:researcher'] },
  { legacy: ['uwa-law'], add: ['role:researcher', 'place:perth'] },
  { legacy: ['collaborator'], add: ['role:advisor'] },
];

// NOT auto-mapped — flagged for Ben (no canonical target / deferred to another bucket)
const NEEDS_RULING = [];   // goods-role-corp resolved (DROP, Ben 2026-06-08)
const DEFERRED = ['goods-gmail-active'];     // source-only → bucket 5

const COMMUNITY_ADDS = new Set(['lane:community']);
const ALL_LEGACY = RULES.flatMap((r) => r.legacy);
const ALL_CANONICAL = [...new Set(RULES.flatMap((r) => r.add))];

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNotFound = (m) => /not found|404|400/i.test(String(m || ''));

function plan(tags) {
  const lc = (tags || []).map((t) => String(t).toLowerCase());
  const adds = new Set();
  const removes = [];
  for (const rule of RULES) {
    const hit = (tags || []).filter((t) => rule.legacy.includes(String(t).toLowerCase()));
    if (!hit.length) continue;
    for (const a of rule.add) if (!lc.includes(a.toLowerCase())) adds.add(a);
    for (const h of hit) removes.push(h);
  }
  return { adds: [...adds], removes };
}

// ---- worklist from mirror (paginate; exclude gone-from-ghl) ----
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
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

log(`\n# bucket-3 role: migration — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY RUN)'}`);
log(`Rows overlapping legacy role tags: ${rows.length} · gone-from-ghl excluded: ${rows.length - live.length} · live: ${live.length} · need work: ${candidates.length}`);

// per-legacy live counts
log(`\n--- live contacts per legacy role tag (mirror; only nonzero) ---`);
for (const t of ALL_LEGACY) {
  const n = live.filter((r) => (r.tags || []).some((x) => String(x).toLowerCase() === t.toLowerCase())).length;
  if (n) log(`  ${t.padEnd(26)} ${n}`);
}
// aggregate adds/removes
const addTally = {}, remTally = {};
let totalAdds = 0, totalRem = 0;
for (const c of candidates) {
  for (const a of c.adds) { addTally[a] = (addTally[a] || 0) + 1; totalAdds++; }
  for (const r of c.removes) { remTally[r.toLowerCase()] = (remTally[r.toLowerCase()] || 0) + 1; totalRem++; }
}
log(`\n--- canonical ADDs (already-present excluded) ---`);
for (const a of ALL_CANONICAL.sort()) log(`  +${a.padEnd(26)} ${addTally[a] || 0}`);
log(`\n--- legacy REMOVEs (by tag) ---`);
for (const t of Object.keys(remTally).sort()) log(`  -${t.padEnd(26)} ${remTally[t]}`);
log(`\nTOTAL: ${candidates.length} contacts · ${totalAdds} adds · ${totalRem} removes`);

// OCAP — lane:community adds + comms exposure
const laneAdds = candidates.filter((c) => c.adds.includes('lane:community'));
const laneCommsExposed = laneAdds.filter((c) => (c.tags || []).some((t) => String(t).toLowerCase().startsWith('comms:')));
log(`\n--- OCAP ---`);
log(`  contacts gaining lane:community: ${laneAdds.length}`);
log(`  …of those still carrying a comms:* tag (info — consented opt-ins may legitimately keep one): ${laneCommsExposed.length}`);
if (laneCommsExposed.length) for (const c of laneCommsExposed.slice(0, 10)) log(`    ${c.full_name || '(no name)'} ${c.ghl_id}: comms=[${(c.tags || []).filter((t) => String(t).toLowerCase().startsWith('comms:')).join(', ')}]`);

if (!LIVE) {
  // flags
  log(`\n--- NEEDS RULING (not auto-mapped) ---`);
  for (const t of NEEDS_RULING) {
    const n = live.filter((r) => (r.tags || []).some((x) => String(x).toLowerCase() === t.toLowerCase())).length;
    log(`  ${t}: ${n} live contacts — no canonical role in enum. Decide target.`);
  }
  for (const t of DEFERRED) {
    const n = live.filter((r) => (r.tags || []).some((x) => String(x).toLowerCase() === t.toLowerCase())).length;
    if (n) log(`  ${t}: ${n} live — DEFERRED to bucket 5 (source:gmail-discovery only).`);
  }
  // grant gov subset detection
  const grantHolders = live.filter((r) => (r.tags || []).some((t) => String(t).toLowerCase() === 'grant'));
  const govByEmail = grantHolders.filter((r) => /\.gov\.au\b/i.test(r.email || ''));
  log(`\n--- grant → role:funder; gov subset needs role:gov added (ruling) ---`);
  log(`  grant holders: ${grantHolders.length} · with .gov.au email (likely role:gov): ${govByEmail.length}`);
  for (const r of govByEmail) log(`    ${r.full_name || '(no name)'} <${r.email}> ${r.ghl_id}`);
  log(`  (remaining grant holders → role:funder only; confirm any non-.gov.au gov bodies manually)`);
  // tag-lib reconcile
  try {
    const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
    const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
    const r = await fetch(`https://services.leadconnectorhq.com/locations/${LOC}/tags`, { headers: { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json' } });
    const defs = new Set(((await r.json()).tags || []).map((t) => t.name.trim().toLowerCase()));
    log(`\n--- GHL tag-library reconciliation ---`);
    log(`  canonical role defs MISSING (auto-created on first add): ${ALL_CANONICAL.filter((a) => a.startsWith('role:') && !defs.has(a.toLowerCase())).join(', ') || '(none)'}`);
    log(`  legacy role defs present in GHL: ${ALL_LEGACY.filter((t) => defs.has(t.toLowerCase())).length} / ${ALL_LEGACY.length}`);
  } catch (e) { log(`  (tag-lib reconcile skipped: ${e.message})`); }
  log(`\n--- sample candidate plans (first 8) ---`);
  for (const c of candidates.slice(0, 8)) log(`  ${c.full_name || '(no name)'} ${c.ghl_id}: +[${c.adds.join(', ')}] -[${c.removes.join(', ')}]`);
  log(`\n(DRY RUN — no writes. Run --tracer, then --apply.)`);
  process.exit(0);
}

// ---- LIVE: verify-first, idempotent ----
let touched = 0, added = 0, removed = 0, notInGhl = 0, errors = 0;
for (const c of candidates) {
  let liveC;
  try { liveC = await ghl.getContactById(c.ghl_id); }
  catch (e) {
    if (isNotFound(e.message)) { notInGhl++; log(`- skip (not in GHL): ${c.full_name || ''} ${c.ghl_id}`); await sleep(SLEEP_MS); continue; }
    errors++; log(`  ⚠ ERROR get ${c.ghl_id}: ${e.message}`); await sleep(SLEEP_MS); continue;
  }
  if (!liveC) { notInGhl++; log(`- skip (not in GHL): ${c.ghl_id}`); await sleep(SLEEP_MS); continue; }

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
if (LIVE) log(`UNDO: per line — remove the +canonical, re-add the -legacy.`);
