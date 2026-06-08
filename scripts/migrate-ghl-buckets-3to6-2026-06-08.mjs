#!/usr/bin/env node
/**
 * migrate-ghl-buckets-3to6-2026-06-08.mjs — Phase B buckets 3–6 engine. Dry-run default.
 *
 * One validated engine for role / interest / source / place. Built from the authoritative
 * flat-tag map + RESOLVED rulings (thoughts/shared/reviews/ghl-flat-tag-map-2026-06-08.md).
 * Bucket 7 (comms:) is NOT here — send-risk, gated separately.
 *
 * Full-scans the mirror (2.6k rows) so regex-prefix tags (goods-community-*, goods-linkedin-*,
 * goods-src-*) are covered. Excludes gone-from-ghl*. Idempotent per-tag add/remove; NEVER
 * adds comms:. Community-line rules carry lane:community (OCAP protective marker).
 *
 * --fast skips the per-contact verify GET (uses mirror tags; writes are 404-safe + idempotent)
 * → ~halves API calls. Rate-limited 1.1s between GHL calls regardless.
 *
 * Usage:
 *   node scripts/migrate-ghl-buckets-3to6-2026-06-08.mjs --bucket role            # dry-run one
 *   node scripts/migrate-ghl-buckets-3to6-2026-06-08.mjs --bucket role,interest,source,place  # dry all
 *   node scripts/migrate-ghl-buckets-3to6-2026-06-08.mjs --bucket role --tracer   # one live, verify, stop
 *   node scripts/migrate-ghl-buckets-3to6-2026-06-08.mjs --bucket role,interest,source,place --fast --apply
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const TRACER = process.argv.includes('--tracer');
const FAST = process.argv.includes('--fast');
const LIVE = APPLY || TRACER;
const bIdx = process.argv.indexOf('--bucket');
const BUCKETS = bIdx >= 0 && process.argv[bIdx + 1] ? process.argv[bIdx + 1].split(',').map((s) => s.trim()) : ['role'];
const LOG = 'thoughts/shared/reviews/buckets3-6-apply-2026-06-08.md';
const SLEEP_MS = 1100;

// ───────────────────────── bucket definitions ─────────────────────────
const DEFS = {
  role: {
    rules: [
      { legacy: ['storyteller', 'audience-storyteller', 'featured storyteller', 'story-feature'], add: ['role:storyteller', 'lane:community'] },
      { legacy: ['audience-partner', 'partner', 'goods-partner', 'goods-key-partner', 'goods-partner-lead', 'potential-partner'], add: ['role:partner'] },
      { legacy: ['njp'], add: ['role:partner', 'interest:justice-reform'] },
      { legacy: ['conference-host'], add: ['role:partner', 'interest:justice-reform'] },
      { legacy: ['venue-partner'], add: ['role:partner', 'interest:venue'] },
      { legacy: ['goods-gmail-partner'], add: ['role:partner', 'source:gmail-discovery'] },
      { legacy: ['audience-funder', 'funder', 'goods-funder'], add: ['role:funder'] },
      { legacy: ['goods-gmail-funder'], add: ['role:funder', 'source:gmail-discovery'] },
      { legacy: ['grant'], add: ['role:funder'] },
      { legacy: ['tour-funding'], add: ['role:funder'] },
      { legacy: ['goods-government-grant'], add: ['role:funder', 'role:gov', 'project:act-gd'] },
      { legacy: ['government'], add: ['role:gov'] },
      { legacy: ['goods-gmail-government'], add: ['role:gov', 'source:gmail-discovery'] },
      { legacy: ['goods-supporter'], add: ['role:supporter'] },
      { legacy: ['goods-supplier', 'goods-supplier-active', 'goods-supplier-pending', 'goods-role-store', 'goods-vendor', 'shop-produce', 'shop-maker',
        'supplier-plant5', 'supplier-steel5', 'supplier-hdpe2', 'supplier-canvas', 'supplier-fasteners', 'supplier-product4', 'supplier-hdpe-bulk',
        'vendor-services5', 'vendor-print2', 'vendor-freight', 'vendor-tech'], add: ['role:supplier'] },
      { legacy: ['goods-customer', 'goods-bed-order'], add: ['role:buyer'] },
      { legacy: ['goods-communitycontrolled'], add: ['role:community-controlled', 'lane:community'] },
      { legacy: ['goods-community', 'community', 'indigenous-led'], add: ['role:community', 'lane:community'] },
      { legacy: ['goods-gmail-community'], add: ['role:community', 'lane:community', 'source:gmail-discovery'] },
      { legacy: ['elder'], add: ['role:elder', 'lane:community'] },
      { legacy: ['goods-role-council'], add: ['role:council'] },
      { legacy: ['goods-role-landcouncil'], add: ['role:land-council'] },
      { legacy: ['goods-role-health', 'goods-role-health_service'], add: ['role:health-service'] },
      { legacy: ['goods-role-housing', 'goods-role-housing_provider'], add: ['role:housing-provider'] },
      { legacy: ['goods-advisory'], add: ['role:advisor'] },
      { legacy: ['media', 'goods-media'], add: ['role:media'] },
      { legacy: ['goods-gmail-media'], add: ['role:media', 'source:gmail-discovery'] },
      { legacy: ['research'], add: ['role:researcher'] },
      { legacy: ['uwa-law'], add: ['role:researcher', 'place:perth'] },
      { legacy: ['collaborator'], add: ['role:advisor'] },
      { legacy: ['goods-role-corp'], add: [] }, // DROP (Ben 2026-06-08) — already role:partner
    ],
  },
  interest: {
    rules: [
      { legacy: ['interest-membership'], add: ['interest:membership'] },
      { legacy: ['interest-community'], add: ['interest:community'] },
      { legacy: ['interest-events'], add: ['interest:events'] },
      { legacy: ['interest-markets'], add: ['interest:markets'] },
      { legacy: ['interest-workshops'], add: ['interest:workshops'] },
      { legacy: ['interest-garden'], add: ['interest:garden'] },
      { legacy: ['interest-food'], add: ['interest:food'] },
      { legacy: ['interest-volunteer'], add: ['interest:volunteer'] },
      { legacy: ['interest-sustainability'], add: ['interest:sustainability'] },
      { legacy: ['interest-venue'], add: ['interest:venue'] },
      { legacy: ['interest-eat'], add: ['interest:food'] },   // fold singleton → food
      { legacy: ['interest-grow'], add: ['interest:garden'] }, // fold singleton → garden
      { legacy: ['container-request', 'container request'], add: ['interest:container'] },
      { legacy: ['goods-washer-interest'], add: ['interest:washer'] },
      { legacy: ['goods-bulk-order-inquiry'], add: ['interest:bulk-order'] },
      { legacy: ['justice', 'yj', 'youth justice'], add: ['interest:justice-reform'] },
      { legacy: ['legal'], add: ['interest:justice-reform'] },
      { legacy: ['detention centre'], add: ['interest:justice-reform'] },
      { legacy: ['speech-pathology', 'food-and-phonics', 'education', 'homeschool-programs'], add: ['interest:education'] },
      { legacy: ['24-carrot-gardens'], add: ['interest:garden'] },
      { legacy: ['venue', 'venue-enquiry'], add: ['interest:venue'] },
      { legacy: ['festivals-target'], add: ['interest:festivals'] },
      { legacy: ['workshop-booking', 'workshop-suggestion'], add: ['interest:workshops'] },
    ],
  },
  source: {
    rules: [
      { legacy: ['goods-inquiry', 'goods-general-inquiry'], add: ['source:inquiry', 'role:buyer'] },
      { legacy: ['act-inquiry'], add: ['source:inquiry'] },
      { legacy: ['contact-form', 'contact', 'website-signup', 'website-form', 'footer signup'], add: ['source:website'] },
      { legacy: ['goods-src-footer', 'source: footer'], add: ['source:footer'] },
      { legacy: ['eoi-gathering-march-2026'], add: ['source:event:eoi-gathering-2026'] },
      { legacy: ['locals-day-march-2026'], add: ['source:event:locals-day-2026'] },
      { legacy: ['goods-gmail-active'], add: ['source:gmail-discovery'] },
      { legacy: ['grantscope-source'], add: ['source:grantscope'] },
      { legacy: ['linkedin-nic', 'linkedin-gmail_discovery'], add: ['source:linkedin'] },
      { legacy: ['goods-li-contained-tour'], add: ['source:linkedin', 'interest:justice-reform'] },
      { legacy: ['goods-parliament-house-demo'], add: ['source:event:parliament-house-demo'] },
      { legacy: ['goods-canberra-airport-—-reconciliation-week'], add: ['source:event:canberra-airport-2026'] },
      { legacy: ['auto-created-from-xero'], add: ['source:xero'] },
      { legacy: ['source-other'], add: ['source:other'] },
      { legacy: ['source-social'], add: ['source:social'] },
    ],
    regex: [
      { re: /^goods-linkedin-(.+)$/i, add: () => ['source:linkedin'] },
      { re: /^goods-src-(?!footer$)(.+)$/i, add: (m) => [`source:event:${m[1].toLowerCase()}`] },
    ],
    deferred: ['event registrant', 'event-submission', 'goods-event'],
  },
  place: {
    rules: [
      { legacy: ['goods-state-nt'], add: ['place:nt'] },
      { legacy: ['goods-state-qld'], add: ['place:qld'] },
      { legacy: ['adelaide'], add: ['place:adelaide'] },
      { legacy: ['brisbane'], add: ['place:brisbane'] },
      { legacy: ['melbourne'], add: ['place:melbourne'] },
      { legacy: ['sydney'], add: ['place:sydney'] },
      { legacy: ['perth'], add: ['place:perth'] },
      { legacy: ['cairns'], add: ['place:cairns'] },
      { legacy: ['rockhampton'], add: ['place:rockhampton'] },
      { legacy: ['tasmania'], add: ['place:tasmania'] },
      { legacy: ['international'], add: ['place:international'] },
      { legacy: ['regional-nsw'], add: ['place:regional-nsw'] },
      { legacy: ['cape-york'], add: ['place:cape-york'] },
      { legacy: ['witta'], add: ['place:community:witta'] },
    ],
    regex: [
      { re: /^goods-community-(.+)$/i, add: (m) => [`place:community:${m[1].toLowerCase()}`] },
    ],
  },
};

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNotFound = (m) => /not found|404|400/i.test(String(m || ''));

function plan(tags, def) {
  const lc = (tags || []).map((t) => String(t).toLowerCase());
  const adds = new Set(); const removes = new Set(); const matched = new Set();
  for (const rule of def.rules) for (const t of (tags || [])) {
    if (rule.legacy.includes(String(t).toLowerCase())) {
      matched.add(t); removes.add(t);
      for (const a of rule.add) if (!lc.includes(a.toLowerCase())) adds.add(a);
    }
  }
  for (const rr of (def.regex || [])) for (const t of (tags || [])) {
    if (matched.has(t)) continue;
    const m = String(t).match(rr.re);
    if (m) { matched.add(t); removes.add(t); for (const a of rr.add(m)) if (!lc.includes(a.toLowerCase())) adds.add(a); }
  }
  return { adds: [...adds], removes: [...removes] };
}

// ── full mirror scan once (exclude gone-from-ghl) ──
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('ghl_contacts').select('ghl_id, full_name, email, tags').not('ghl_id', 'is', null).range(from, from + 999);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const liveRows = rows.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
log(`\n# Phase B buckets ${BUCKETS.join(',')} — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY)'}${FAST ? ' [fast]' : ''}`);
log(`Mirror: ${rows.length} rows · live (non-gone): ${liveRows.length}`);

for (const bname of BUCKETS) {
  const def = DEFS[bname];
  if (!def) { log(`\n⚠ unknown bucket "${bname}" — skipping`); continue; }
  const candidates = liveRows.map((r) => ({ ...r, ...plan(r.tags, def) })).filter((r) => r.adds.length || r.removes.length);

  const addTally = {}, remTally = {};
  for (const c of candidates) { for (const a of c.adds) addTally[a] = (addTally[a] || 0) + 1; for (const r of c.removes) remTally[r] = (remTally[r] || 0) + 1; }
  log(`\n══════ BUCKET: ${bname} ══════`);
  log(`candidates: ${candidates.length} · adds: ${Object.values(addTally).reduce((a, b) => a + b, 0)} · removes: ${Object.values(remTally).reduce((a, b) => a + b, 0)}`);
  log(`ADDs: ${Object.keys(addTally).sort().map((k) => `${k}=${addTally[k]}`).join('  ') || '(none)'}`);
  if (def.deferred) for (const t of def.deferred) { const n = liveRows.filter((r) => (r.tags || []).some((x) => String(x).toLowerCase() === t.toLowerCase())).length; if (n) log(`DEFERRED ${t}: ${n} (not auto-mapped)`); }

  if (!LIVE) {
    log(`sample: ` + candidates.slice(0, 5).map((c) => `${c.full_name || '?'} +[${c.adds.join(',')}] -[${c.removes.join(',')}]`).join('  |  '));
    continue;
  }

  let touched = 0, added = 0, removed = 0, notInGhl = 0, errors = 0, i = 0;
  for (const c of candidates) {
    i++;
    let p = c; // fast: mirror plan
    if (!FAST) {
      let liveC;
      try { liveC = await ghl.getContactById(c.ghl_id); }
      catch (e) { if (isNotFound(e.message)) { notInGhl++; await sleep(SLEEP_MS); continue; } errors++; await sleep(SLEEP_MS); continue; }
      if (!liveC) { notInGhl++; await sleep(SLEEP_MS); continue; }
      p = plan(liveC.tags, def);
      if (TRACER) log(`\n## TRACER ${c.full_name} (${c.ghl_id})\n- before: [${(liveC.tags || []).join(', ')}]`);
      if (!p.adds.length && !p.removes.length) { log(`- ${c.full_name} ${c.ghl_id}: already canonical (no-op)`); await sleep(SLEEP_MS); continue; }
    }
    try {
      for (const a of p.adds) { await ghl.addTagToContact(c.ghl_id, a); added++; }
      for (const r of p.removes) { await ghl.removeTagFromContact(c.ghl_id, r); removed++; }
      touched++;
      if (TRACER) {
        const after = await ghl.getContactById(c.ghl_id);
        const at = (after.tags || []).map((t) => String(t).toLowerCase());
        const ok = p.adds.every((a) => at.includes(a.toLowerCase())) && !p.removes.some((r) => at.includes(r.toLowerCase()));
        log(`- after:  [${(after.tags || []).join(', ')}]\n- verify: ${ok ? '✅' : '⚠ CHECK'}\nUNDO: remove [${p.adds.join(', ')}]; re-add [${p.removes.join(', ')}] on ${c.ghl_id}`);
        log(`TRACER done on 1 contact. Rerun with --apply.`); process.exit(0);
      }
      if (i % 50 === 0) log(`  …${bname} ${i}/${candidates.length} (touched ${touched}, 404 ${notInGhl})`);
    } catch (e) {
      if (isNotFound(e.message)) { notInGhl++; } else { errors++; log(`  ⚠ ERROR ${c.ghl_id}: ${e.message}`); }
    }
    await sleep(SLEEP_MS);
  }
  log(`✔ ${bname}: contacts ${touched} · adds ${added} · removes ${removed} · not-in-GHL ${notInGhl} · errors ${errors}`);
}
log(`\nDONE buckets ${BUCKETS.join(',')}. ${LIVE ? '(LIVE)' : '(dry)'}`);
