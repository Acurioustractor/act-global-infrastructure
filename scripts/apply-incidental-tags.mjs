// Tag the 35 held REVIEW incidentals by location/type signal; default ACT-CORE.
// Dry-run by default; --apply writes to the mirror. Source manual-bulk-2026-05-30.
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SOURCE = 'manual-bulk-2026-05-30';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const items = JSON.parse(readFileSync('scripts/output/untagged-expense-proposal.json', 'utf8')).filter(i => i.conf === 'REVIEW');

// Keyword → project_code. First match wins; default ACT-CORE.
const RULES = [
  [/sealink|quarters tsv|lucinda|tully bakery|hermit park/i, 'ACT-PI'],   // North QLD / Palm Island trip
  [/sydney|bridgeclimb|domestic airport|cheesecake shop|lotte duty free|denpasar|sunnymead|suzanne zemek|freedom fuels/i, 'ACT-IN'], // travel
  [/3 legged thing|do film/i, 'ACT-EL'],                                  // photography / film
];
const codeFor = (it) => {
  const hay = `${it.contact} ${it.desc}`;
  for (const [re, code] of RULES) if (re.test(hay)) return code;
  return 'ACT-CORE';
};

const assigned = items.map(it => ({ ...it, finalCode: codeFor(it) }));
const by = {};
for (const it of assigned) { by[it.finalCode] = by[it.finalCode] || { n: 0, $: 0 }; by[it.finalCode].n++; by[it.finalCode].$ += it.amount; }

console.log(`${APPLY ? 'APPLYING' : 'DRY-RUN'} — ${assigned.length} incidentals → source ${SOURCE}\n`);
for (const it of assigned.sort((a, b) => (a.finalCode > b.finalCode ? 1 : a.finalCode < b.finalCode ? -1 : b.amount - a.amount))) {
  console.log(`  ${it.finalCode.padEnd(8)} ${it.date}  ${(it.contact || '').slice(0, 28).padEnd(28)} $${String(Math.round(it.amount)).padStart(4)}`);
}
console.log('\nSplit:');
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].$ - a[1].$)) console.log(`  ${k.padEnd(8)} ${String(v.n).padStart(2)}  $${Math.round(v.$).toLocaleString()}`);

if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); process.exit(0); }

const groups = {};
for (const it of assigned) { const key = `${it.table}|${it.finalCode}`; (groups[key] = groups[key] || []).push(it.id); }
let updated = 0;
for (const [key, ids] of Object.entries(groups)) {
  const [table, code] = key.split('|');
  const { data, error } = await sb.from(table).update({ project_code: code, project_code_source: SOURCE }).in('id', ids).select('id');
  if (error) { console.error(`  ERROR ${table}/${code}: ${error.message}`); continue; }
  updated += (data || []).length;
  console.log(`  ${table} → ${code}: ${(data || []).length}/${ids.length}`);
}
console.log(`\nApplied ${updated}/${assigned.length}.`);
