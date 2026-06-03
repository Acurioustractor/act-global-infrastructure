#!/usr/bin/env node
/**
 * cost-drill-ground-truth.mjs — reproducible ground-truth for the cost-drill TDD pins.
 *
 * Reads project_monthly_financials for FY26 (2025-07-01..2026-06-30), folds legacy wrappers
 * (ACT-HQ→ACT-CORE, ACT-CG→ACT-CS, ACT-PC→ACT-PI), and prints folded per-project
 * revenue/expenses/net + org totals. These numbers pin the Phase-1 fold test + provenance sidecar.
 *
 * Run: node scripts/cost-drill-ground-truth.mjs
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const LEGACY_WRAPPERS = { 'ACT-CG': 'ACT-CS', 'ACT-HQ': 'ACT-CORE', 'ACT-PC': 'ACT-PI' };
const fold = (c) => LEGACY_WRAPPERS[String(c || '').trim().toUpperCase()] || String(c || '').trim().toUpperCase();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FY_START = '2025-07-01';
const FY_END = '2026-06-30';

const { data, error } = await supabase
  .from('project_monthly_financials')
  .select('project_code, month, revenue, expenses, net')
  .gte('month', FY_START)
  .lte('month', FY_END)
  .range(0, 9999);

if (error) { console.error(error); process.exit(1); }

console.log(`Rows: ${data.length} (FY26 ${FY_START}..${FY_END})\n`);

// Raw legacy-code contributions (so we can verify the fold merges them)
const legacyCodes = Object.keys(LEGACY_WRAPPERS);
const rawLegacy = new Map();
for (const r of data) {
  const c = String(r.project_code || '').trim().toUpperCase();
  if (legacyCodes.includes(c)) {
    const a = rawLegacy.get(c) || { revenue: 0, expenses: 0, net: 0 };
    a.revenue += Number(r.revenue || 0); a.expenses += Number(r.expenses || 0); a.net += Number(r.net || 0);
    rawLegacy.set(c, a);
  }
}
console.log('Raw legacy-code contributions (pre-fold):');
for (const [c, a] of rawLegacy) console.log(`  ${c} → ${fold(c)}: rev ${Math.round(a.revenue)} exp ${Math.round(a.expenses)} net ${Math.round(a.net)}`);
console.log('');

// Folded per-project
const byCode = new Map();
let tRev = 0, tExp = 0, tNet = 0;
for (const r of data) {
  const code = fold(r.project_code);
  const a = byCode.get(code) || { revenue: 0, expenses: 0, net: 0 };
  a.revenue += Number(r.revenue || 0); a.expenses += Number(r.expenses || 0); a.net += Number(r.net || 0);
  byCode.set(code, a);
  tRev += Number(r.revenue || 0); tExp += Number(r.expenses || 0); tNet += Number(r.net || 0);
}

const rows = [...byCode.entries()]
  .map(([code, a]) => ({ code, revenue: Math.round(a.revenue), expenses: Math.round(a.expenses), net: Math.round(a.net) }))
  .sort((x, y) => y.expenses - x.expenses);

console.log('Folded per-project P&L (FY26), by expenses desc:');
console.log('code'.padEnd(12), 'revenue'.padStart(12), 'expenses'.padStart(12), 'net'.padStart(12));
for (const r of rows) console.log(r.code.padEnd(12), String(r.revenue).padStart(12), String(r.expenses).padStart(12), String(r.net).padStart(12));
console.log('—'.repeat(50));
console.log('TOTAL'.padEnd(12), String(Math.round(tRev)).padStart(12), String(Math.round(tExp)).padStart(12), String(Math.round(tNet)).padStart(12));
