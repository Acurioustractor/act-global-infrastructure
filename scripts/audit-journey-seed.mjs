#!/usr/bin/env node
/**
 * READ-ONLY — Task 3 seed reconciliation audit.
 * Joins Harvest Membership Journey opportunities (the board) against contact tier: tags.
 * Reports: board cards missing their matching tier: tag, community contacts wrongly seated,
 * and tier:-tagged contacts NOT seated on the board. No writes.
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));

const BASE = 'https://services.leadconnectorhq.com';
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PIPELINE = 'ijPN2jEoEuMshXXKbQ4z';
const STAGE_TIER = {
  '85da97c5-7cdc-4500-95d7-7dbdaea0ee5c': 'curious',
  '571c3eab-ecca-47e6-a746-cafc04cd7c1c': 'connected',
  '21e1dcb8-d674-4724-a8b0-5cb4cafba635': 'member',
  '6173b52b-3396-4431-9f87-ba73f20e0e27': 'active',
  'ea084ff5-607e-49a8-a6d2-d087cec57c5d': 'steward',
};
const COMMUNITY = ['role:community', 'role:community-controlled', 'role:storyteller', 'role:elder'];

async function fetchOpps() {
  const all = [];
  let path = `/opportunities/search?location_id=${LOC}&pipeline_id=${PIPELINE}&status=all&limit=100`;
  for (let p = 0; p < 50 && path; p++) {
    const r = await fetch(path.startsWith('http') ? path : BASE + path, { headers: H });
    if (!r.ok) throw new Error(`opps ${r.status}: ${(await r.text()).slice(0,150)}`);
    const d = await r.json();
    for (const o of (d.opportunities || [])) all.push({ contactId: o.contactId, stageId: o.pipelineStageId, name: o.name });
    path = d.meta?.nextPageUrl || null;
    if (!(d.opportunities || []).length) break;
    await sleep(120);
  }
  return all;
}

async function fetchContacts() {
  const map = new Map();
  let path = `/contacts/?locationId=${LOC}&limit=100`;
  for (let p = 0; p < 400 && path; p++) {
    const r = await fetch(path.startsWith('http') ? path : BASE + path, { headers: H });
    if (!r.ok) throw new Error(`contacts ${r.status}`);
    const d = await r.json();
    for (const c of (d.contacts || [])) map.set(c.id, (c.tags || []).map(t => t.trim()));
    if (!(d.contacts || []).length) break;
    path = d.meta?.nextPageUrl || null;
    await sleep(110);
  }
  return map;
}

const [opps, contacts] = [await fetchOpps(), await fetchContacts()];
console.log(`\nJourney opportunities (board cards): ${opps.length} | live contacts: ${contacts.size}\n`);

// per-stage breakdown + on-board issues
const stageCount = {}, missingTag = {}, communityOnBoard = [];
const seatedByTier = {}; // tier -> Set(contactId) for contacts correctly seated at that stage
for (const o of opps) {
  const tier = STAGE_TIER[o.stageId] || 'UNKNOWN-STAGE';
  stageCount[tier] = (stageCount[tier] || 0) + 1;
  const tags = contacts.get(o.contactId) || [];
  if (tags.some(t => COMMUNITY.includes(t))) communityOnBoard.push(`${o.name} [${tags.filter(t=>COMMUNITY.includes(t)).join(',')}] @${tier}`);
  if (!tags.includes(`tier:${tier}`)) missingTag[tier] = (missingTag[tier] || 0) + 1;
  (seatedByTier[tier] ||= new Set()).add(o.contactId);
}

console.log('--- BOARD CARDS by stage (and how many are MISSING the matching tier: tag) ---');
for (const tier of ['curious','connected','member','active','steward','UNKNOWN-STAGE']) {
  if (stageCount[tier]) console.log(`  ${tier.padEnd(9)} ${String(stageCount[tier]).padStart(4)} cards | missing tier:${tier} tag: ${missingTag[tier] || 0}`);
}

console.log(`\n--- COMMUNITY contacts wrongly seated on the board (must remove) --- ${communityOnBoard.length}`);
communityOnBoard.slice(0, 25).forEach(s => console.log(`  ${s}`));

console.log('\n--- tier:-TAGGED contacts NOT seated at the matching stage (tagged, no/!wrong card) ---');
for (const tier of ['member','active','steward','connected','curious']) {
  const tagged = [...contacts.entries()].filter(([, tags]) => tags.includes(`tier:${tier}`)).map(([id]) => id);
  const seated = seatedByTier[tier] || new Set();
  const notSeated = tagged.filter(id => !seated.has(id));
  console.log(`  tier:${tier.padEnd(9)} tagged ${String(tagged.length).padStart(4)} | seated at ${tier}: ${tagged.length - notSeated.length} | NOT on board: ${notSeated.length}`);
}
