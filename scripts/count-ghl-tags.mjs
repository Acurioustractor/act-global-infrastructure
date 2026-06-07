#!/usr/bin/env node
/**
 * Read-only GHL tag counter — the "I verify, you click" tool for the Phase 2 re-point.
 * Paginates LIVE GHL contacts and counts how many match each tag-combo you pass.
 * Each arg is one combo: comma-separated tags = AND. Use !tag for NOT.
 *
 *   node scripts/count-ghl-tags.mjs "harvest-member" "project:act-hv,tier:member" "comms:harvest-newsletter"
 *
 * No args = the default Harvest re-point verification set.
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, '../lib/load-env.mjs'));

const BASE = 'https://services.leadconnectorhq.com';
const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const combos = process.argv.slice(2);
const DEFAULT = [
  'harvest-member', 'project:act-hv', 'tier:member', 'project:act-hv,tier:member',
  'harvest-member,!project:act-hv', 'harvest-member,!tier:member',     // gaps — should be 0
  'harvest-newsletter', 'comms:harvest-newsletter',
  'harvest-shop-interest', 'interest:markets', 'tier:connected',
];
const specs = (combos.length ? combos : DEFAULT).map(c => ({
  raw: c,
  need: c.split(',').filter(t => !t.startsWith('!')).map(t => t.trim()),
  not: c.split(',').filter(t => t.startsWith('!')).map(t => t.slice(1).trim()),
}));

async function fetchAll() {
  const all = [];
  let path = `/contacts/?locationId=${LOC}&limit=100`;
  for (let p = 0; p < 400 && path; p++) {
    const r = await fetch(path.startsWith('http') ? path : BASE + path, { headers: H });
    if (!r.ok) throw new Error(`GHL /contacts ${r.status}: ${(await r.text()).slice(0, 150)}`);
    const d = await r.json();
    const batch = d.contacts || [];
    for (const c of batch) all.push(new Set((c.tags || []).map(t => t.trim())));
    if (!batch.length) break;
    path = d.meta?.nextPageUrl || null;
    await sleep(110);
  }
  return all;
}

const contacts = await fetchAll();
console.log(`\nLive GHL contacts: ${contacts.length}\n`);
console.log('count  combo');
console.log('-----  -----');
for (const s of specs) {
  const n = contacts.filter(tags =>
    s.need.every(t => tags.has(t)) && s.not.every(t => !tags.has(t))
  ).length;
  console.log(`${String(n).padStart(5)}  ${s.raw}`);
}
