#!/usr/bin/env node
/**
 * READ-ONLY audit: how many opportunities on the Harvest Membership Journey
 * pipeline are genuine Harvest contacts vs act.place-newsletter contacts that
 * the (pre-projectCode) "ACT — Intake" workflow wrongly seated there.
 *
 * Mis-seated = act.place newsletter signature (comms:act-newsletter / project:act-in
 *   / act-regenerative-studio source) WITHOUT a genuine-Harvest signal.
 * Genuine    = project:act-hv / harvest-website / csa / eoi-gathering.
 *
 * Prints counts + a few example emails per bucket. Makes ZERO writes. Re-run
 * after migration to confirm the Harvest pipeline holds only genuine Harvest.
 *
 * Ref: wiki/decisions/act-site-form-alignment.md fix-list step 5 (migrate mis-seated).
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
await import(join(dirname(fileURLToPath(import.meta.url)), 'lib/load-env.mjs'));

const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', Accept: 'application/json' };
const BASE = 'https://services.leadconnectorhq.com';
const HARVEST_PIPELINE = 'ijPN2jEoEuMshXXKbQ4z';

if (!KEY || !LOC) { console.error('Missing GHL_API_KEY / GHL_LOCATION_ID'); process.exit(1); }

const has = (tags, t) => tags.includes(t);
const someIncludes = (tags, sub) => tags.some((x) => x.includes(sub));

function classify(tags) {
  const genuine =
    has(tags, 'project:act-hv') || has(tags, 'act-hv') || has(tags, 'harvest-website') ||
    has(tags, 'csa') || someIncludes(tags, 'harvest') || someIncludes(tags, 'eoi-gathering');
  const actplace =
    has(tags, 'comms:act-newsletter') || has(tags, 'project:act-in') || has(tags, 'act-in') ||
    has(tags, 'act-regenerative-studio');
  if (actplace && !genuine) return 'MISSEATED';
  if (genuine && !actplace) return 'GENUINE';
  if (genuine && actplace) return 'AMBIGUOUS';
  return 'OTHER';
}

const buckets = { GENUINE: [], MISSEATED: [], AMBIGUOUS: [], OTHER: [] };
let startAfter, startAfterId, page = 0, total = 0;

while (true) {
  const u = new URL(`${BASE}/opportunities/search`);
  u.searchParams.set('location_id', LOC);
  u.searchParams.set('pipeline_id', HARVEST_PIPELINE);
  u.searchParams.set('status', 'all');
  u.searchParams.set('limit', '100');
  if (startAfter) u.searchParams.set('startAfter', String(startAfter));
  if (startAfterId) u.searchParams.set('startAfterId', startAfterId);

  const r = await fetch(u, { headers: H });
  if (!r.ok) { console.error(`HTTP ${r.status}`, (await r.text()).slice(0, 300)); process.exit(1); }
  const j = await r.json();
  const opps = j.opportunities || j.data?.opportunities || [];
  total = j.meta?.total ?? j.data?.meta?.total ?? total;
  for (const o of opps) {
    const c = o.contact || o.relations?.[0] || {};
    const tags = Array.isArray(c.tags) ? c.tags : [];
    buckets[classify(tags)].push({ email: c.email || '(no email)', stage: o.pipelineStageId, tags });
  }
  const meta = j.meta || j.data?.meta || {};
  page += 1;
  if (!meta.nextPageUrl || opps.length === 0) break;
  startAfter = meta.startAfter; startAfterId = meta.startAfterId;
  await new Promise((res) => setTimeout(res, 350)); // gentle on the 60 req/min limit
}

const n = (k) => buckets[k].length;
const counted = n('GENUINE') + n('MISSEATED') + n('AMBIGUOUS') + n('OTHER');
console.log(`\nHarvest Membership Journey (${HARVEST_PIPELINE}) — pipeline meta.total=${total}, classified=${counted} (pages=${page})\n`);
console.log(`  GENUINE Harvest      : ${n('GENUINE')}  (project:act-hv / harvest-website / csa / eoi — stay put)`);
console.log(`  MIS-SEATED act.place : ${n('MISSEATED')}  (act.place newsletter → migrate to ACT — Ecosystem Journey/Connected)`);
console.log(`  AMBIGUOUS (both)     : ${n('AMBIGUOUS')}  (has BOTH signals — review by hand)`);
console.log(`  OTHER / no signal    : ${n('OTHER')}  (review)\n`);
for (const k of ['MISSEATED', 'AMBIGUOUS', 'OTHER']) {
  if (n(k)) console.log(`  e.g. ${k}: ${buckets[k].slice(0, 6).map((x) => x.email).join(', ')}`);
}
console.log('\n(read-only — no writes made)');
