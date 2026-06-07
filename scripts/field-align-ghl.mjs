#!/usr/bin/env node
/**
 * field-align-ghl.mjs — close the alignment loop: Ben's reads → GHL (gated).
 *
 * Translates the field-decisions ledger (his rings + relations, NOT machine guesses)
 * into GHL tag diffs under the NEW `ring:` namespace (5|15|50|150|out — The Field's
 * Dunbar read, verbatim). Deliberately separate from `tier:` (belonging rung,
 * hand-moved only) — closeness and belonging are different ladders.
 *
 * Rules honoured (wiki/concepts/ghl-tag-namespaces.md):
 *   - community lane NEVER laddered → any lane:community contact is skipped hard
 *   - orgs are not people → known org reads (minjerribah/mmeic/yj_grants) skipped
 *   - family is not CRM → ring:family reads never exported
 *   - resolve by EMAIL at apply time, never pasted contact IDs
 *   - votes (triage up/down) are pre-ring signal — NOT exported; only ring reads
 *
 *   node scripts/field-align-ghl.mjs prep    # show the full diff (read-only)
 *   node scripts/field-align-ghl.mjs apply   # execute (Ben's explicit go)
 */
import dotenv from 'dotenv';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
dotenv.config({ path: '.env.local' });

const LEDGER = 'thoughts/shared/field-decisions.jsonl';
const LOG = 'thoughts/shared/field-align-ghl-log.md';
const mode = process.argv[2] || 'prep';
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

const ORG_READS = new Set(['minjerribah moorgumpin elders', 'mmeic justice', 'yj_grants']); // orgs, not people
const RINGS = new Set(['5', '15', '50', '150', 'out']);

// name → email fallback from the worklist (UI reads before 2026-06-06 stored name only)
function parseCSV(t){const R=[];let r=[],f='',Q=false;for(let i=0;i<t.length;i++){const c=t[i];if(Q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++;}else Q=false;}else f+=c;}else if(c==='"')Q=true;else if(c===',')(r.push(f),f='');else if(c==='\n')(r.push(f),R.push(r),r=[],f='');else if(c!=='\r')f+=c;}if(f||r.length){r.push(f);R.push(r);}return R;}
const emailByName = new Map();
if (existsSync('thoughts/shared/unified-orbit-worklist.csv')) {
  const R = parseCSV(readFileSync('thoughts/shared/unified-orbit-worklist.csv', 'utf8'));
  const h = R[0];
  for (const x of R.slice(1).filter(x => x.length === h.length)) {
    const row = Object.fromEntries(h.map((k, i) => [k, x[i]]));
    const k = norm(row.name);
    if (k && row.email && !emailByName.has(k)) emailByName.set(k, row.email.toLowerCase());
  }
}

// latest read per person with a ring
const latest = new Map();
for (const l of readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean)) {
  let d; try { d = JSON.parse(l); } catch { continue; }
  if (!d.name) continue;
  if (!d.email) d.email = emailByName.get(norm(d.name)) || '';
  latest.set(norm(d.name), d);
}
const cands = [...latest.values()].filter(d =>
  d.ring && RINGS.has(String(d.ring)) && !ORG_READS.has(norm(d.name)) && !d.aligned_ghl);

console.log(`${cands.length} ring reads to align (of ${latest.size} ledger people; org/family/unringed skipped)\n`);

const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID;
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'content-type': 'application/json' };
async function findByEmail(email) {
  const r = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${LOC}&query=${encodeURIComponent(email)}`, { headers: H });
  const d = await r.json();
  return (d.contacts || []).filter(c => (c.email || '').toLowerCase() === email.toLowerCase());
}

let planned = 0, applied = 0, skipped = 0;
for (const d of cands) {
  if (!d.email) { console.log(`  ~ ${d.name} — no email in ledger, resolve by hand`); skipped++; continue; }
  const contacts = await findByEmail(d.email);
  if (!contacts.length) { console.log(`  ~ ${d.name} <${d.email}> — not in GHL (uncaptured)`); skipped++; continue; }
  for (const c of contacts) {
    const tags = c.tags || [];
    if (tags.includes('lane:community')) { console.log(`  ✋ ${d.name} — lane:community, never laddered. SKIP.`); skipped++; continue; }
    const want = `ring:${d.ring}`;
    const stale = tags.filter(t => t.startsWith('ring:') && t !== want);
    if (tags.includes(want) && !stale.length) continue;
    planned++;
    console.log(`  ${d.name} <${d.email}> ${c.id}: +[${want}]${stale.length ? ` −[${stale.join(' ')}]` : ''}`);
    if (mode === 'apply') {
      const newTags = [...tags.filter(t => !t.startsWith('ring:')), want];
      const r = await fetch(`https://services.leadconnectorhq.com/contacts/${c.id}`, {
        method: 'PUT', headers: H, body: JSON.stringify({ tags: newTags }),
      });
      if (r.ok) {
        applied++;
        appendFileSync(LOG, `- ${new Date().toISOString()} ${d.name} <${d.email}> ${c.id}: +${want}${stale.length ? ` −${stale.join(',')}` : ''} (undo: restore [${tags.join(' ')}])\n`);
      } else console.error(`  ✗ ${d.name}: ${r.status} ${await r.text()}`);
      await new Promise(s => setTimeout(s, 300)); // GHL rate limit
    }
  }
}

if (mode !== 'apply') {
  console.log(`\nDry run: ${planned} tag change(s) planned, ${skipped} skipped.`);
  console.log('Execute with:  node scripts/field-align-ghl.mjs apply  (gated — Ben\'s explicit go)');
  console.log('After apply: node scripts/sync-ghl-to-supabase.mjs (mirror lag) then regen worklist.');
} else {
  console.log(`\n✓ ${applied} applied · ${skipped} skipped · undo log → ${LOG}`);
}
