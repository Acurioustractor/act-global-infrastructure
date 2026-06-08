#!/usr/bin/env node
/**
 * fix-ghl-loose-ends-2026-06-08.mjs — Phase B small fixes (Ben "fix all" 2026-06-08).
 *   A) role:corporate (non-canonical) + any lingering goods-role-corp → REMOVE (keep role:partner)
 *   B) real innovation fund (grant + dewr.gov.au) → ADD role:gov (on top of role:funder)
 *   C) deferred source tags: event registrant→interest:events · event-submission→source:website ·
 *      goods-event→interest:events  (Ben-delegated rulings; low-stakes)
 * verify-first per contact, idempotent, dry-run default.
 *
 * Usage: node scripts/fix-ghl-loose-ends-2026-06-08.mjs [--apply]
 */
import dotenv from 'dotenv';
import { appendFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const LOG = 'thoughts/shared/reviews/bucket7-comms-and-looseends-2026-06-08.md';
const SLEEP_MS = 1100;
const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (APPLY) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNF = (m) => /not found|404|400/i.test(String(m || ''));

const REMOVE_TAGS = ['role:corporate', 'goods-role-corp'];
const SOURCE_RULES = { 'event registrant': { add: ['interest:events'] }, 'event-submission': { add: ['source:website'] }, 'goods-event': { add: ['interest:events'] } };
const GOV_ID = 'MymJIeUEL8btnnIT7bJB'; // real innovation fund

async function getLive(tags) {
  let rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('ghl_contacts').select('ghl_id, full_name, tags').overlaps('tags', tags).not('ghl_id', 'is', null).range(from, from + 999);
    if (error) { console.error(error.message); process.exit(1); }
    rows.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return rows.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
}
log(`\n# Phase B loose-ends fix — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : '(DRY)'}`);

// A) role:corporate / goods-role-corp removal
const corp = await getLive(REMOVE_TAGS);
log(`\nA) role:corporate/goods-role-corp holders: ${corp.length}`);
for (const r of corp) {
  const present = REMOVE_TAGS.filter((t) => (r.tags || []).map((x) => x.toLowerCase()).includes(t));
  log(`  - ${r.full_name || '?'} ${r.ghl_id}: remove [${present.join(', ')}]`);
  if (!APPLY) continue;
  try { const live = await ghl.getContactById(r.ghl_id); if (!live) { log('    skip (404)'); await sleep(SLEEP_MS); continue; }
    for (const t of REMOVE_TAGS) if ((live.tags || []).map((x) => x.toLowerCase()).includes(t)) { await ghl.removeTagFromContact(r.ghl_id, t); }
  } catch (e) { log(`    ${isNF(e.message) ? 'skip (404)' : '⚠ ' + e.message}`); }
  await sleep(SLEEP_MS);
}

// B) real innovation fund → role:gov
log(`\nB) real innovation fund (${GOV_ID}) → +role:gov`);
if (APPLY) {
  try { const live = await ghl.getContactById(GOV_ID);
    if (!live) log('  skip (404)');
    else { const has = (live.tags || []).map((x) => x.toLowerCase()).includes('role:gov'); if (has) log('  already role:gov'); else { await ghl.addTagToContact(GOV_ID, 'role:gov'); log(`  ✅ +role:gov (now: funder+gov)`); } }
  } catch (e) { log(`  ${isNF(e.message) ? 'skip (404)' : '⚠ ' + e.message}`); }
  await sleep(SLEEP_MS);
}

// C) deferred source
const srcKeys = Object.keys(SOURCE_RULES);
const srcRows = await getLive(srcKeys);
log(`\nC) deferred source holders: ${srcRows.length}`);
for (const r of srcRows) {
  const adds = new Set(); const removes = [];
  for (const k of srcKeys) if ((r.tags || []).map((x) => x.toLowerCase()).includes(k)) { SOURCE_RULES[k].add.forEach((a) => adds.add(a)); removes.push(k); }
  log(`  - ${r.full_name || '?'} ${r.ghl_id}: +[${[...adds].join(', ')}] -[${removes.join(', ')}]`);
  if (!APPLY) continue;
  try { const live = await ghl.getContactById(r.ghl_id); if (!live) { log('    skip (404)'); await sleep(SLEEP_MS); continue; }
    const lt = (live.tags || []).map((x) => x.toLowerCase());
    for (const a of adds) if (!lt.includes(a.toLowerCase())) await ghl.addTagToContact(r.ghl_id, a);
    for (const rm of removes) if (lt.includes(rm.toLowerCase())) await ghl.removeTagFromContact(r.ghl_id, rm);
  } catch (e) { log(`    ${isNF(e.message) ? 'skip (404)' : '⚠ ' + e.message}`); }
  await sleep(SLEEP_MS);
}
log(`\nDONE loose-ends. ${APPLY ? '(LIVE)' : '(dry)'}`);
