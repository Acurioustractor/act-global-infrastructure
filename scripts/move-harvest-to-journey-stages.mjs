#!/usr/bin/env node
/**
 * Move seated Harvest contacts into the Harvest Membership Journey pipeline at their tier stage.
 * Step 3 (pipeline part) of the Harvest clean-system blueprint.
 *
 * SAFETY GATE: on --apply it first confirms ALL Harvest-named workflows are in DRAFT.
 * If any is still Published, it REFUSES to run — because creating an opportunity / moving a
 * stage CAN trigger a published send-workflow. No contact gets an email out of the blue.
 *
 * Idempotent: skips contacts already holding an opp in this pipeline.
 *
 *   node scripts/move-harvest-to-journey-stages.mjs            # DRY RUN
 *   node scripts/move-harvest-to-journey-stages.mjs --apply    # create opps (gated on workflows=Draft)
 */
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force-unsafe'); // bypass the workflow-draft gate (don't)
const supabase = createClient(process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN}`,
  Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const BASE = 'https://services.leadconnectorhq.com';

const PIPELINE = 'ijPN2jEoEuMshXXKbQ4z';
const STAGE = {
  curious:   '85da97c5-7cdc-4500-95d7-7dbdaea0ee5c',
  connected: '571c3eab-ecca-47e6-a746-cafc04cd7c1c',
  member:    '21e1dcb8-d674-4724-a8b0-5cb4cafba635',
  active:    '6173b52b-3396-4431-9f87-ba73f20e0e27',
  steward:   'ea084ff5-607e-49a8-a6d2-d087cec57c5d',
};
const RUNGS = ['curious', 'connected', 'member', 'active', 'steward'];
const gone = (tags) => tags.some(t => t.startsWith('gone-from-ghl'));
const tierOf = (tags) => { // highest rung present
  let best = null;
  for (const t of tags) { const m = t.match(/^tier:(.+)$/); if (m && RUNGS.includes(m[1])) { if (best === null || RUNGS.indexOf(m[1]) > RUNGS.indexOf(best)) best = m[1]; } }
  return best;
};

async function workflowGate() {
  const r = await fetch(`${BASE}/workflows/?locationId=${LOC}`, { headers: H });
  const wfs = (await r.json()).workflows || [];
  const harvest = wfs.filter(w => /harvest/i.test(w.name));
  const live = harvest.filter(w => String(w.status).toLowerCase() !== 'draft');
  return { harvest, live };
}

async function existingContactIds() {
  const ids = new Set(); let page = 1;
  for (;;) {
    const r = await fetch(`${BASE}/opportunities/search?location_id=${LOC}&pipeline_id=${PIPELINE}&limit=100&page=${page}`, { headers: H });
    if (!r.ok) break;
    const j = await r.json();
    const opps = j.opportunities || [];
    for (const o of opps) { const cid = o.contactId || o.contact?.id; if (cid) ids.add(cid); }
    if (opps.length < 100) break; page++;
    await sleep(200);
  }
  return ids;
}

async function main() {
  console.log(`=== Move Harvest → Membership Journey stages — ${APPLY ? 'APPLY' : 'DRY RUN'} ===`);

  // --- SAFETY GATE ---
  const { harvest, live } = await workflowGate();
  console.log(`Harvest workflows: ${harvest.length} | still Published (must be 0): ${live.length}`);
  if (live.length) { live.forEach(w => console.log(`  🔴 PUBLISHED: ${w.name}`)); }
  if (APPLY && live.length && !FORCE) {
    console.log('\n⛔ REFUSING TO RUN: set every Harvest workflow to Draft first (creating opps can trigger a live send-workflow). No one gets emailed by accident.');
    process.exit(1);
  }

  const all = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('ghl_contacts').select('ghl_id, tags, full_name, first_name, last_name').range(from, from + 999);
    if (error) throw error;
    all.push(...(data || [])); if (!data || data.length < 1000) break; from += 1000;
  }
  const seated = all.filter(c => !gone(c.tags || []) && tierOf(c.tags || []));
  console.log(`Seated Harvest contacts (have a tier: tag): ${seated.length}`);

  const inPipeline = await existingContactIds();
  console.log(`Already in the pipeline (skip): ${inPipeline.size}`);

  const dist = {}; const toCreate = [];
  for (const c of seated) {
    if (inPipeline.has(c.ghl_id)) continue;
    const tier = tierOf(c.tags);
    dist[tier] = (dist[tier] || 0) + 1;
    toCreate.push({ ghl_id: c.ghl_id, tier, name: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Harvest contact' });
  }
  console.log('To create:', JSON.stringify(dist), '| total', toCreate.length);

  if (!APPLY) { console.log('\nDRY RUN — nothing created. Re-run with --apply once all Harvest workflows are Draft.'); return; }

  console.log('\nCreating opportunities at tier stages...');
  let ok = 0, err = 0;
  for (const o of toCreate) {
    const body = { pipelineId: PIPELINE, locationId: LOC, pipelineStageId: STAGE[o.tier], status: 'open', name: `${o.name} — Harvest`, contactId: o.ghl_id };
    const r = await fetch(`${BASE}/opportunities/`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    if (r.ok) ok++; else { err++; if (err <= 5) console.log(`  ✗ ${o.ghl_id} ${o.tier} -> ${r.status}`); }
    if ((ok + err) % 50 === 0) console.log(`  ${ok + err}/${toCreate.length} (errs ${err})`);
    await sleep(160);
  }
  console.log(`Created: ${ok}, errors: ${err}.`);
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
