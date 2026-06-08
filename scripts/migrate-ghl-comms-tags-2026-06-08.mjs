#!/usr/bin/env node
/**
 * migrate-ghl-comms-tags-2026-06-08.mjs — Phase B bucket 7 (comms:). SEND-RISK. Dry default.
 *
 * The gated newsletter migration + drip retirement. Rules (flat-tag map §comms + OCAP):
 *
 *  canAdd = NOT community-line (lane:community / role:storyteller / etc.) AND newsletter_consent=true
 *
 *  MIGRATE (only if canAdd; else LEAVE the legacy tag + flag — the Spam-Act group):
 *    goods-newsletter   → +comms:goods-newsletter,   then −goods-newsletter
 *    newsletter         → +comms:act-newsletter,     then −newsletter
 *    harvest-newsletter → +comms:harvest-newsletter, then −harvest-newsletter
 *    comms:newsletter   → +comms:act-newsletter (if canAdd & lacks), then −comms:newsletter (always — dupe)
 *
 *  RETIRE (remove from ALL — removing a comms tag never sends; send-safe):
 *    comms:partner-drip · comms:nurture · goods-nurture
 *
 *  LEAVE + FLAG (judgment, not auto-migrated): audience-brand (not treated as consent);
 *    no-consent / community legacy newsletter holders (separate Spam-Act decision).
 *
 * NEVER adds a comms: tag to a community-line contact. Verify-first (NOT --fast). UNDO logged.
 *
 * Usage:
 *   node scripts/migrate-ghl-comms-tags-2026-06-08.mjs           # dry-run
 *   node scripts/migrate-ghl-comms-tags-2026-06-08.mjs --tracer  # first live contact, verify, stop
 *   node scripts/migrate-ghl-comms-tags-2026-06-08.mjs --apply   # all
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
const LOG = 'thoughts/shared/reviews/bucket7-comms-and-looseends-2026-06-08.md';
const SLEEP_MS = 1100;

const COMMUNITY_LINE = ['lane:community', 'role:storyteller', 'role:community', 'role:community-controlled', 'role:elder',
  'storyteller', 'audience-storyteller', 'featured storyteller', 'story-feature', 'community', 'elder',
  'goods-communitycontrolled', 'goods-community', 'indigenous-led'];
const NEWSLETTER_MIGRATE = { 'goods-newsletter': 'comms:goods-newsletter', 'newsletter': 'comms:act-newsletter', 'harvest-newsletter': 'comms:harvest-newsletter' };
const RETIRE = ['comms:partner-drip', 'comms:nurture', 'goods-nurture'];
const DUPE = 'comms:newsletter'; // → comms:act-newsletter then drop
const WORKLIST = [...Object.keys(NEWSLETTER_MIGRATE), ...RETIRE, DUPE];

const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const ghl = createGHLService();
const log = (s) => { console.log(s); if (LIVE) appendFileSync(LOG, s + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isNF = (m) => /not found|404|400/i.test(String(m || ''));
const lc = (a) => (a || []).map((t) => String(t).toLowerCase());

// plan from a contact's tags + consent. Returns {adds, removes, leftFlags}.
function plan(tags, consent) {
  const t = lc(tags);
  const isCommunity = COMMUNITY_LINE.some((c) => t.includes(c.toLowerCase()));
  const canAdd = !isCommunity && consent === true;
  const adds = new Set(), removes = new Set(), left = [];
  // newsletter migrate (gated)
  for (const [legacy, canon] of Object.entries(NEWSLETTER_MIGRATE)) {
    if (!t.includes(legacy)) continue;
    if (canAdd) { if (!t.includes(canon.toLowerCase())) adds.add(canon); removes.add(legacy); }
    else left.push(legacy); // Spam-Act group — leave the legacy tag
  }
  // dupe comms:newsletter → act-newsletter (add gated) then drop (always)
  if (t.includes(DUPE)) { if (canAdd && !t.includes('comms:act-newsletter')) adds.add('comms:act-newsletter'); removes.add(DUPE); }
  // retire drips (always — send-safe)
  for (const r of RETIRE) if (t.includes(r)) removes.add(r);
  return { adds: [...adds], removes: [...removes], left, isCommunity, canAdd };
}

// worklist from mirror
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from('ghl_contacts').select('ghl_id, full_name, tags, newsletter_consent').overlaps('tags', WORKLIST).not('ghl_id', 'is', null).range(from, from + 999);
  if (error) { console.error(error.message); process.exit(1); }
  rows.push(...(data || [])); if (!data || data.length < 1000) break;
}
const liveRows = rows.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
const candidates = liveRows.map((r) => ({ ...r, ...plan(r.tags, r.newsletter_consent) })).filter((c) => c.adds.length || c.removes.length);

log(`\n# bucket-7 comms migration — ${new Date().toISOString()} ${APPLY ? '(APPLY)' : TRACER ? '(TRACER)' : '(DRY)'}`);
log(`Worklist live rows: ${liveRows.length} · need work: ${candidates.length}`);

// tallies
const addT = {}, remT = {}; let leftCount = 0;
const leftByTag = {};
for (const c of candidates) { for (const a of c.adds) addT[a] = (addT[a] || 0) + 1; for (const r of c.removes) remT[r] = (remT[r] || 0) + 1; }
for (const c of liveRows.map((r) => ({ ...r, ...plan(r.tags, r.newsletter_consent) }))) for (const l of c.left) { leftByTag[l] = (leftByTag[l] || 0) + 1; leftCount++; }
log(`\n--- ADDs (consent-gated, non-community) ---`); for (const k of Object.keys(addT).sort()) log(`  +${k.padEnd(26)} ${addT[k]}`);
log(`\n--- REMOVEs ---`); for (const k of Object.keys(remT).sort()) log(`  -${k.padEnd(26)} ${remT[k]}`);
log(`\n--- LEFT (Spam-Act group: legacy newsletter on no-consent/community — NOT migrated, flagged) ---`);
for (const k of Object.keys(leftByTag).sort()) log(`  ~${k.padEnd(26)} ${leftByTag[k]}`);
// audience-brand info
const ab = liveRows.filter((r) => lc(r.tags).includes('audience-brand')).length;
log(`\n--- FLAGGED (untouched): audience-brand=${ab} (not treated as consent — your call) ---`);
log(`\nTOTAL: ${candidates.length} contacts · ${Object.values(addT).reduce((a, b) => a + b, 0)} adds · ${Object.values(remT).reduce((a, b) => a + b, 0)} removes · LEFT ${leftCount}`);

if (!LIVE) {
  log(`\nsample: ` + candidates.slice(0, 6).map((c) => `${c.full_name || '?'}${c.isCommunity ? '[COMM]' : ''}${c.canAdd ? '[+ok]' : '[no-add]'} +[${c.adds.join(',')}] -[${c.removes.join(',')}]`).join('\n        '));
  log(`\n(DRY — no writes.)`); process.exit(0);
}

// LIVE — verify-first
let touched = 0, added = 0, removed = 0, nf = 0, errors = 0, i = 0;
for (const c of candidates) {
  i++;
  let live;
  try { live = await ghl.getContactById(c.ghl_id); } catch (e) { if (isNF(e.message)) { nf++; await sleep(SLEEP_MS); continue; } errors++; await sleep(SLEEP_MS); continue; }
  if (!live) { nf++; await sleep(SLEEP_MS); continue; }
  const p = plan(live.tags, c.newsletter_consent); // live tags + mirror consent
  if (!p.adds.length && !p.removes.length) { await sleep(SLEEP_MS); continue; }
  try {
    if (TRACER) log(`\n## TRACER ${c.full_name} (${c.ghl_id}) consent=${c.newsletter_consent} community=${p.isCommunity}\n- before: [${(live.tags || []).join(', ')}]`);
    for (const a of p.adds) { await ghl.addTagToContact(c.ghl_id, a); added++; }
    for (const r of p.removes) { await ghl.removeTagFromContact(c.ghl_id, r); removed++; }
    touched++;
    if (TRACER) {
      const after = await ghl.getContactById(c.ghl_id); const at = lc(after.tags);
      const ok = p.adds.every((a) => at.includes(a.toLowerCase())) && !p.removes.some((r) => at.includes(r.toLowerCase()));
      const noCommComms = !(p.isCommunity && at.some((x) => x.startsWith('comms:')));
      log(`- after:  [${(after.tags || []).join(', ')}]\n- verify: ${ok ? '✅' : '⚠ CHECK'} · community-has-no-comms: ${noCommComms ? '✅' : '⚠'}`);
      log(`UNDO: remove [${p.adds.join(', ')}]; re-add [${p.removes.join(', ')}] on ${c.ghl_id}`);
      log(`TRACER done. Rerun --apply.`); process.exit(0);
    }
    log(`- ${c.full_name} ${c.ghl_id}: +[${p.adds.join(', ')}] -[${p.removes.join(', ')}]`);
    if (i % 50 === 0) log(`  …${i}/${candidates.length}`);
  } catch (e) { if (isNF(e.message)) nf++; else { errors++; log(`  ⚠ ${c.ghl_id}: ${e.message}`); } }
  await sleep(SLEEP_MS);
}
log(`\n✔ comms: contacts ${touched} · adds ${added} · removes ${removed} · not-in-GHL ${nf} · errors ${errors}`);
if (LIVE) log(`UNDO: per line.`);
