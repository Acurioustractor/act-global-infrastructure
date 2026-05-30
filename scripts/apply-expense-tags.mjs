// Apply approved expense tags to the Supabase mirror.
// Set: 106 HIGH items. Override: ACT-IN items at Alice Springs / Darwin → ACT-GD.
// Hold: 35 REVIEW items (skipped). Source: manual-bulk-2026-05-30 (manual-guard protected).
// Dry-run by default; pass --apply to write.
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SOURCE = 'manual-bulk-2026-05-30';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const items = JSON.parse(readFileSync('scripts/output/untagged-expense-proposal.json', 'utf8'));

// On-country reassign rule (Ben's call: ASP/DRW travel is Goods, not infra).
const isOnCountry = (it) => /\bASP\b|\bDRW\b|\bMNG\b|alice springs|darwin/i.test(`${it.contact} ${it.desc}`);

const toApply = [];
for (const it of items) {
  if (it.conf !== 'HIGH') continue;            // HOLD REVIEW items
  let code = it.suggest;
  let note = '';
  // Ben's call: Alice Springs / Darwin on-country spend is Goods, regardless of the
  // vendor-rule default (flights default to ACT-IN; the "Flight Bar Witta" contact
  // mis-maps Alice Springs card spend to ACT-HV). Reassign all such items → ACT-GD.
  if (isOnCountry(it) && code !== 'ACT-GD') { note = ` (reassigned ${code}→GD)`; code = 'ACT-GD'; }
  toApply.push({ ...it, finalCode: code, note });
}

// Summary
const by = {};
for (const it of toApply) { by[it.finalCode] = by[it.finalCode] || { n: 0, $: 0 }; by[it.finalCode].n++; by[it.finalCode].$ += it.amount; }
console.log(`${APPLY ? 'APPLYING' : 'DRY-RUN'} — ${toApply.length} items, source=${SOURCE}\n`);
console.log('Final project split:');
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].$ - a[1].$)) console.log(`  ${k.padEnd(8)} ${String(v.n).padStart(3)}  $${Math.round(v.$).toLocaleString()}`);
const reassigned = toApply.filter(it => it.note);
console.log(`\nReassigned IN→GD (${reassigned.length}):`);
for (const it of reassigned) console.log(`  ${it.date} ${(it.contact || '').slice(0, 26).padEnd(26)} ${(it.desc || '').slice(0, 30)}  $${Math.round(it.amount)}`);

if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); process.exit(0); }

// Apply grouped by (table, finalCode)
const groups = {};
for (const it of toApply) { const key = `${it.table}|${it.finalCode}`; (groups[key] = groups[key] || []).push(it.id); }
let updated = 0;
for (const [key, ids] of Object.entries(groups)) {
  const [table, code] = key.split('|');
  const { data, error } = await sb.from(table)
    .update({ project_code: code, project_code_source: SOURCE })
    .in('id', ids).select('id');
  if (error) { console.error(`  ERROR ${table}/${code}: ${error.message}`); continue; }
  updated += (data || []).length;
  console.log(`  ${table} → ${code}: ${(data || []).length}/${ids.length}`);
}
console.log(`\nApplied ${updated}/${toApply.length}.`);
