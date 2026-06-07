#!/usr/bin/env node
/**
 * Enroll Goods contacts into their funnel audience — assigns the comms:<audience>-drip
 * enrollment tag by role, so the GHL drip workflows have populated audiences to fire on.
 *
 * Additive + idempotent: only adds the drip tag if absent, skips gone-from-ghl (stale) rows.
 * The tag is a SEGMENT (who is in the funnel). It does NOT send — sends gate separately on
 * newsletter_consent (newsletter-consent-policy.md). This reports the send-ready split.
 *
 *   node scripts/enroll-goods-audiences.mjs            # DRY RUN (sizes + send-ready)
 *   node scripts/enroll-goods-audiences.mjs --apply    # assign the drip tags (Tier 2)
 */
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const GHL_H = { Authorization: `Bearer ${process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN}`,
  Version: '2021-07-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const isGoods = (tags) => tags.some(t => ['project:act-gd', 'act-gd', 'goods'].includes(t));
const goneStale = (tags) => tags.some(t => t.startsWith('gone-from-ghl'));

const AUDIENCES = [
  { key: 'funder',    roles: ['role:funder'],                  dripTag: 'comms:funder-drip' },
  { key: 'supporter', roles: ['role:supporter'],               dripTag: 'comms:supporter-drip' },
  { key: 'buyer',     roles: ['role:buyer', 'role:supplier'],  dripTag: 'comms:buyer-drip' },
  { key: 'partner',   roles: ['role:partner'],                 dripTag: 'comms:partner-drip' },
];

async function fetchGoods() {
  const all = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('ghl_contacts')
      .select('ghl_id, tags, newsletter_consent, newsletter_unsubscribed_at').range(from, from + 999);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < 1000) break; from += 1000;
  }
  return all.filter(c => isGoods(c.tags || []) && !goneStale(c.tags || []));
}

async function main() {
  console.log(`=== Enroll Goods audiences — ${APPLY ? 'APPLY (LIVE)' : 'DRY RUN'} ===`);
  const goods = await fetchGoods();
  console.log(`Live Goods contacts: ${goods.length}\n`);

  const toTag = []; // {ghl_id, dripTag}
  for (const a of AUDIENCES) {
    const inAud = goods.filter(c => (c.tags || []).some(t => a.roles.includes(t)));
    const sendReady = inAud.filter(c => c.newsletter_consent === true && !c.newsletter_unsubscribed_at);
    const needsTag = inAud.filter(c => !(c.tags || []).includes(a.dripTag));
    console.log(`${a.key.padEnd(10)} ${a.dripTag.padEnd(22)} audience ${String(inAud.length).padStart(3)} | send-ready (consented) ${String(sendReady.length).padStart(3)} | needs enroll-tag ${needsTag.length}`);
    for (const c of needsTag) toTag.push({ ghl_id: c.ghl_id, dripTag: a.dripTag });
  }
  console.log(`\nTotal enrollment-tag assignments: ${toTag.length}`);

  if (!APPLY) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  console.log('\nAssigning...');
  let ok = 0, err = 0;
  for (const { ghl_id, dripTag } of toTag) {
    const r = await fetch(`https://services.leadconnectorhq.com/contacts/${ghl_id}/tags`,
      { method: 'POST', headers: GHL_H, body: JSON.stringify({ tags: [dripTag] }) });
    if (r.ok) ok++; else err++;
    if ((ok + err) % 100 === 0) console.log(`  ${ok + err}/${toTag.length} (errs ${err})`);
    await sleep(150);
  }
  console.log(`Assigned: ${ok}, errors (stale): ${err}`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
