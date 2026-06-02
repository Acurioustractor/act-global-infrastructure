#!/usr/bin/env node
/**
 * GHL tag migration — EXPAND phase (additive-first).
 *
 * Maps ad-hoc tags to the canonical namespaces from the LOCKED spec
 * (thoughts/shared/handoffs/2026-06-02-act-ghl-build-spec.md §"TAG SYSTEM — LOCKED",
 * which supersedes ghl-tag-taxonomy.md), and ADDS the canonical tags to each contact.
 * Reconciled 2026-06-02: membership = tier:member (NOT role:member); shop = interest:markets;
 * temp: is RETIRED (folds into tier:, earned via action:) and is NOT migrated in this pass.
 * It NEVER removes the old tags — so all 26 live workflows keep firing on their existing
 * triggers (the GHL API can't read/edit workflow triggers, so removal is unsafe until each
 * workflow is re-pointed by hand). Removal is a later CONTRACT phase, not this script.
 *
 * --dry-run (default ON unless --apply): reads ghl_contacts, prints the full old→new mapping
 * with counts, lists UNMAPPED tags (so we never silently mis-map), lists junk-to-delete, and
 * the total adds — WITHOUT writing anything.
 *
 * --apply: writes via GHL add-tags (rate-limited). Requires an approved dry-run first.
 *
 * Usage:
 *   node scripts/migrate-ghl-tags.mjs              # dry-run (safe)
 *   node scripts/migrate-ghl-tags.mjs --apply      # live add (Tier 2 — get go first)
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const DRY = !APPLY;
// --limit N : in --apply mode, only write the first N contacts (tracer-bullet a small batch first)
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : null; })();

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const GHL_KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const GHL_H = { Authorization: `Bearer ${GHL_KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// Canonicalize one old tag -> { add: [canonical...], drop: 'junk'|'stage'|null }
// add=[] with drop set => contributes nothing (flagged for later deletion, never added).
// Returns null => UNMAPPED (reported, so we extend the rules rather than guess).
// ============================================================
const PROJECT = { 'goods':'act-gd','act-gd':'act-gd','project:act-gd':'act-gd','project-goods':'act-gd',
  'harvest':'act-hv','the harvest':'act-hv','the-harvest':'act-hv','act-hv':'act-hv','project:act-hv':'act-hv',
  'justicehub':'act-jh','act-jh':'act-jh','project:act-jh':'act-jh',
  'empathy ledger':'act-el','empathy-ledger':'act-el','act-el':'act-el',
  'act-ce':'act-ce','project:act-ce':'act-ce','act-cn':'act-cn','project:act-cn':'act-cn',
  'act-ca':'act-ca','project:act-ca':'act-ca','act-in':'act-in','project:act-core':'act-core',
  'project:act-oo':'act-oo','project:act-bg':'act-bg','project:act-cf':'act-cf','project:act-ra':'act-ra',
  'civicgraph':'act-cn','act-cn ':'act-cn' };

const ROLE = { 'funder':'funder','audience-funder':'funder','goods-funder':'funder','goods-gmail-funder':'funder',
  'storyteller':'storyteller','audience-storyteller':'storyteller','featured storyteller':'storyteller','story-feature':'storyteller',
  'partner':'partner','audience-partner':'partner','goods-partner':'partner','goods-key-partner':'partner','potential-partner':'partner','goods-partner-lead':'partner','venue-partner':'partner',
  'goods-supporter':'supporter','goods-supplier':'supplier','goods-supplier-active':'supplier','goods-vendor':'supplier','vendor-services':'supplier','supplier-plant':'supplier','supplier-steel':'supplier','supplier-product':'supplier','supplier-hdpe':'supplier','supplier-hdpe-bulk':'supplier','supplier-fasteners':'supplier','vendor-print':'supplier','vendor-tech':'supplier','vendor-freight':'supplier',
  'goods-customer':'buyer','goods-role-store':'buyer','shop-maker':'supplier',
  'goods-community':'community','goods-communitycontrolled':'community-controlled','community':'community','indigenous-led':'community-controlled',
  'goods-role-council':'council','goods-role-landcouncil':'land-council','goods-role-health':'health-service','goods-role-health_service':'health-service','goods-role-housing':'housing','goods-role-corp':'corporate',
  'elder':'elder','steward':'supporter','collaborator':'partner','goods-media':'media','goods-advisory':'advisory',
  'government':'gov','goods-government-grant':'gov','goods-gmail-government':'gov','goods-gmail-media':'media','goods-gmail-community':'community','goods-gmail-partner':'partner' };

const INTEREST = { 'interest-membership':'membership','interest-community':'community','interest-events':'events',
  'interest-markets':'markets','interest-workshops':'workshops','interest-garden':'garden','interest-food':'food',
  'interest-volunteer':'volunteer','interest-sustainability':'sustainability','interest-venue':'venue','interest-eat':'food',
  'goods-washer-interest':'washer','harvest-shop-interest':'markets','interest:justice-reform':'justice-reform',
  'container-request':'container','container request':'container','container - contacted':'container' };

// temp: (engagement heat) is RETIRED in the locked spec — it folds into tier:, which is
// EARNED via action: gives, not back-derived from heat. So heat tags are NOT migrated here.
// goods-hot/warm/etc. fall through to the goods-prefix rule below -> project:act-gd only.

const COMMS = { 'goods-newsletter':'goods-newsletter','harvest-newsletter':'harvest-newsletter','newsletter':'newsletter',
  'goods-nurture':'nurture','audience-brand':'newsletter' };

const SOURCE = { 'harvest-website':'website','website-signup':'website','website-form':'website','contact-form':'contact-form',
  'footer signup':'footer','goods-src-footer':'footer','linkedin-nic':'linkedin','linkedin-gmail_discovery':'linkedin',
  'grantscope-source':'grantscope','auto-created-from-xero':'xero','goods-gmail-active':'gmail-discovery',
  'world-tour':'world-tour','goods-src-alive-beds':'event:alive-beds','goods-src-canberra-airport-2026':'event:canberra-airport-2026',
  'goods-src-naidoc-2026':'event:naidoc-2026','goods-src-parliament-house-demo':'event:parliament-demo','source-social':'social','source-other':'other','inbound':'inbound' };

// regex families
const EXTRA = {
  // high-count unmapped from the first dry-run
  'harvest-member':['project:act-hv','tier:member'],'member-comments':['project:act-hv'],
  'member-question':['project:act-hv'],'harvest-people-hq':['project:act-hv'],
  'eoi-gathering-march-2026':['source:event:eoi-gathering-2026'],'locals-day-march-2026':['source:event:locals-day-2026'],
  'harvest-gathering-photos':['project:act-hv','source:event:gathering'],'photo-wall':['project:act-hv'],'photo-wall-ready':['project:act-hv'],'witta':['place:witta'],
  'shop-prospect':['interest:markets','role:buyer'],'harvest-shop-interest':['project:act-hv','interest:markets'],'shop-follow-up':['project:act-hv','interest:markets'],
  'shop-produce':['project:act-hv','interest:markets','role:supplier'],'shop-maker':['project:act-hv','interest:markets','role:supplier'],'shop-food':['project:act-hv','interest:markets','role:supplier'],'shop-consignment':['project:act-hv','interest:markets','role:supplier'],
  'world-tour-partner':['role:partner','source:world-tour'],'act-regenerative-studio':['project:act-core'],
  'grant':['role:funder'],'goods-government-grant':['role:gov'],'research':['role:researcher'],
  // inquiry tags carry their project too (source: is only "how", project: is the scope)
  'act-inquiry':['project:act-core','source:inquiry'],'flagship-inquiry':['source:inquiry'],'goods-general-inquiry':['project:act-gd','source:inquiry'],'goods-inquiry':['project:act-gd','source:inquiry'],
  'priority-medium':['priority:medium'],'goods-priority-high':['priority:high'],'goods-priority-medium':['priority:medium'],'goods-key-partner':['role:partner','priority:high'],
  'meeting-held':['action:meeting-held'],'quiz-completed':['action:quiz-completed'],'biz-expression-of-interest':['interest:business'],'business-interest':['interest:business'],'business-registration':['interest:business'],
  'justice':['project:act-jh','interest:justice-reform'],'youth justice':['project:act-jh','interest:justice-reform'],'yj':['project:act-jh','interest:justice-reform'],'detention centre':['project:act-jh'],'njp':['project:act-jh'],
  'festivals-target':['interest:festivals'],'conference-host':['role:partner'],'venue':['interest:venue'],'venue-enquiry':['interest:venue'],
  'residency-applicant':['project:act-fm','interest:residency'],'residency-artist':['project:act-fm','interest:residency'],'workshop-booking':['interest:workshops'],'workshop-suggestion':['interest:workshops'],
  'csa interest':['interest:membership'],'form:csa':['interest:membership'],'24-carrot-gardens':['role:partner'],'food-and-phonics':['project:act-hv'],'homeschool-programs':['interest:workshops'],
  'media':['role:media'],'legal':['role:advisory'],'speech-pathology':['role:health-service'],'uwa-law':['role:partner'],'education':['interest:workshops'],'minderoo-connection':['role:funder'],'tour-funding':['role:funder'],'ramsey':['role:funder'],'international':['place:international'],
  'steward - advocate':['role:supporter'],'steward - volunteer':['role:supporter','interest:volunteer'],'community-idea':['interest:community'],'idea-general':['source:inbound'],'event-submission':['source:contact-form'],'event registrant':['interest:events'],'quiz-completed ':['action:quiz-completed'],
};
// tier: is canonical (recognise existing rung tags as no-ops). temp: is RETIRED — left out
// so any existing temp:* surfaces as UNMAPPED (a CONTRACT-phase cleanup signal, not migrated here).
const CANON_NS = /^(project|role|interest|tier|place|source|comms|consent|ops|action|priority):/;

function canonicalize(raw) {
  const t = raw.trim().toLowerCase();
  // already canonical namespaced → keep as-is (no-op add; clears project:act-fa, interest:events, etc.)
  if (CANON_NS.test(t)) return { add: [t] };
  if (EXTRA[t]) return { add: EXTRA[t] };
  // junk / ops — never add, flag for deletion
  if (/^gone-from-ghl/.test(t)) return { drop: 'junk' };
  if (/(^|[^a-z])(test|smoke|webhook|delete-me)([^a-z]|$)|^context:|codex/.test(t)) return { drop: 'junk' };
  if (/-review-20|needs-name-review|duplicate-review|migration-review|member-migration/.test(t)) return { drop: 'ops' };
  if (['auto-triage','auto-created-from-xero','no email','ai-flagged','project:watch'].includes(t)) return { drop: 'ops' };
  // stage/tier duplicates of pipeline stage — drop (pipeline owns these)
  if (/^goods-(stage|tier)-|^goods-signal$|^engagement:/.test(t) || ['goods-stage-prospect','goods-stage-customer'].includes(t)) return { drop: 'stage' };
  // explicit maps
  if (PROJECT[t]) return { add: [`project:${PROJECT[t]}`] };
  if (ROLE[t]) return { add: [`role:${ROLE[t]}`] };
  if (INTEREST[t]) return { add: [`interest:${INTEREST[t]}`] };
  if (COMMS[t]) return { add: [`comms:${COMMS[t]}`] };
  if (SOURCE[t]) return { add: [`source:${SOURCE[t]}`] };
  // regex families
  let m;
  if ((m = t.match(/^goods-role-(.+)$/))) return { add: [`role:${m[1].replace(/_/g,'-')}`] };
  if ((m = t.match(/^goods-src-(.+)$/))) return { add: [`source:event:${m[1]}`] };
  if ((m = t.match(/^goods-gmail-(.+)$/))) return { add: ['source:gmail-discovery', `role:${m[1]}`] };
  if ((m = t.match(/^goods-state-(.+)$/))) return { add: [`place:${m[1]}`] };
  if ((m = t.match(/^goods-community-(.+)$/))) return { add: [`place:community:${m[1]}`] };
  if ((m = t.match(/^interest-(.+)$/))) return { add: [`interest:${m[1]}`] };
  if ((m = t.match(/^contained-(.+)$/))) return { add: ['project:act-jh', 'interest:justice-reform'] };
  if ((m = t.match(/^supplier-(.+)$/))) return { add: ['role:supplier'] };
  if ((m = t.match(/^(adelaide|brisbane|melbourne|sydney|perth|tasmania|cairns|cape-york|rockhampton|regional-nsw|witta|brisbane|darwin)$/))) return { add: [`place:${m[1]}`] };
  if (/^goods-/.test(t)) return { add: ['project:act-gd'], note: 'goods-prefix only project mapped; review for finer namespace' };
  return null; // UNMAPPED
}

async function fetchContacts() {
  // Read LIVE GHL contacts directly. The Supabase ghl_contacts mirror is stale —
  // it carries ~533 auto_* placeholder rows + deleted-contact rows that 400 on write.
  // Live pagination gives only real contacts with their CURRENT tags.
  const BASE = 'https://services.leadconnectorhq.com';
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error('Missing GHL_LOCATION_ID');
  const all = [];
  let path = `/contacts/?locationId=${locationId}&limit=100`;
  for (let page = 0; page < 400 && path; page++) {
    const r = await fetch(path.startsWith('http') ? path : BASE + path, { headers: GHL_H });
    if (!r.ok) throw new Error(`GHL /contacts ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const batch = data.contacts || [];
    for (const c of batch) all.push({ ghl_id: c.id, tags: c.tags || [] });
    if (!batch.length) break;
    path = data.meta?.nextPageUrl || null;
    await sleep(120); // gentle on the rate limit
  }
  return all;
}

async function main() {
  console.log(`=== GHL tag migration (EXPAND/additive) — ${DRY ? 'DRY RUN' : 'APPLY (LIVE)'} ===`);
  const contacts = await fetchContacts();
  console.log(`Contacts: ${contacts.length}`);

  const mapCount = new Map();   // "old -> new1,new2" : count
  const unmapped = new Map();   // old : count
  const junk = new Map();       // old : count (to delete later)
  const perContactAdds = [];    // { ghl_id, add: [] }
  let totalAdds = 0;

  let skippedGone = 0;
  for (const c of contacts) {
    // skip contacts deleted from GHL (stale mirror rows) — POST add-tags 400s on them
    if ((c.tags || []).some(t => t.startsWith('gone-from-ghl'))) { skippedGone++; continue; }
    const existing = new Set((c.tags || []).map(x => x.trim()));
    const toAdd = new Set();
    for (const tag of (c.tags || [])) {
      const r = canonicalize(tag);
      if (r === null) { unmapped.set(tag, (unmapped.get(tag) || 0) + 1); continue; }
      if (r.drop) { junk.set(tag, (junk.get(tag) || 0) + 1); continue; }
      const key = `${tag}  →  ${r.add.join(', ')}`;
      mapCount.set(key, (mapCount.get(key) || 0) + 1);
      for (const nt of r.add) if (!existing.has(nt)) toAdd.add(nt);
    }
    if (toAdd.size) { perContactAdds.push({ ghl_id: c.ghl_id, add: [...toAdd] }); totalAdds += toAdd.size; }
  }

  console.log(`\n--- MAPPINGS (old → new), ALL by count ---`);
  [...mapCount.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${String(n).padStart(4)}  ${k}`));

  console.log(`\n--- JUNK / drop (NOT added; delete in CONTRACT phase) --- ${[...junk.values()].reduce((a,b)=>a+b,0)} tag-instances ---`);
  [...junk.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${String(n).padStart(4)}  ${k}`));

  console.log(`\n--- UNMAPPED (need a rule before they migrate) --- ${unmapped.size} distinct`);
  [...unmapped.entries()].sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${String(n).padStart(4)}  ${k}`));

  console.log(`\nSkipped (gone-from-ghl, stale): ${skippedGone}`);
  console.log(`Contacts that gain ≥1 canonical tag: ${perContactAdds.length} | total tag-adds: ${totalAdds}`);

  const idClass = (id) => /^auto_/.test(id) ? 'auto_(placeholder)' : /test/.test(id) ? 'test' : /^[A-Za-z0-9]{18,}$/.test(id) ? 'ghl-format' : 'other-short';
  const allByClass = {}, addByClass = {};
  for (const c of contacts) { const k = idClass(c.ghl_id || ''); allByClass[k] = (allByClass[k] || 0) + 1; }
  for (const a of perContactAdds) { const k = idClass(a.ghl_id || ''); addByClass[k] = (addByClass[k] || 0) + 1; }
  console.log('\n--- CONTACT ID HEALTH (ghl_id format) ---');
  console.log('  all mirror rows by id-class:', JSON.stringify(allByClass));
  console.log('  rows that WOULD be written by class:', JSON.stringify(addByClass));
  console.log('  NOTE: ghl-format != exists — deleted contacts keep a valid-looking id; only a live GET confirms.');

  if (DRY) { console.log('\nDRY RUN — nothing written. Re-run with --apply after approval.'); return; }

  const targets = LIMIT ? perContactAdds.slice(0, LIMIT) : perContactAdds;
  console.log(`\nAPPLYING (additive add-tags)${LIMIT ? ` — LIMIT ${LIMIT} (tracer)` : ''}... ${targets.length} contacts`);
  let done = 0, errs = 0;
  for (const { ghl_id, add } of targets) {
    try {
      if (LIMIT) console.log(`  ${ghl_id}  +[${add.join(', ')}]`);
      const r = await fetch(`https://services.leadconnectorhq.com/contacts/${ghl_id}/tags`, {
        method: 'POST', headers: GHL_H, body: JSON.stringify({ tags: add }),
      });
      if (!r.ok) { errs++; if (errs <= 5) console.log(`  ${ghl_id} -> ${r.status} ${(await r.text()).slice(0,120)}`); }
      done++;
      if (done % 100 === 0) console.log(`  ${done}/${targets.length} (errs ${errs})`);
      await sleep(150); // ~7/s, under 100/10s
    } catch (e) { errs++; }
  }
  console.log(`Applied: ${done} contacts, errors ${errs}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
