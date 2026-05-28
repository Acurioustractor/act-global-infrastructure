#!/usr/bin/env node
// Export the v3 bed cost model to a bundle of CSVs that import cleanly into
// Google Sheets (one tab per CSV). Source: thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json
//
// Usage:
//   node scripts/export-bed-cost-model-to-sheets.mjs
//
// Produces a dated folder under thoughts/shared/analysis/exports/ with:
//   - 01-build-states.csv      (the 5 scenarios with per-component cost lines)
//   - 02-idiot-index.csv       (the markup-ratio table)
//   - 03-volume-scenarios.csv  (today/target/vision fully-loaded by state)
//   - 04-founder-allocation.csv (production vs fundraising vs ACT-wide)
//   - 05-fundraising-offset.csv (the funding side of the model)
//   - 06-wage-scenarios.csv    (4 wage tiers, per-bed labour)
//   - 07-community-plastic.csv (4 pay-rate tiers for community-collected HDPE)
//   - 08-defy-verified-rates.csv (every OCR-verified Defy quote)
//   - 09-mistags-to-fix.csv    (the $120K of misattributed spend)
//   - 10-open-questions.csv    (what we still need from Defy)
//   - README.md                 (how to import into Sheets)
//
// Plan: goods-cost-evidence-funder-artifact

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MODEL_PATH = resolve(REPO_ROOT, 'thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json');
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = resolve(REPO_ROOT, `thoughts/shared/analysis/exports/${TODAY}-bed-cost-model-v3`);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const model = JSON.parse(readFileSync(MODEL_PATH, 'utf8'));

// Cell quoting per RFC 4180 — quote if it contains a comma, quote, or newline.
function cell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function rowsToCsv(headers, rows) {
  const lines = [headers.map(cell).join(',')];
  for (const row of rows) lines.push(row.map(cell).join(','));
  return lines.join('\n') + '\n';
}

// ─── 01 build states ───
{
  const headers = ['State', 'Label', 'Component', 'Amount ($)', 'Direct total ($)', 'New capex ($)', 'Cumulative capex ($)'];
  const rows = [];
  for (const [key, state] of Object.entries(model.build_states)) {
    for (const [i, comp] of state.components.entries()) {
      rows.push([
        i === 0 ? key : '',
        i === 0 ? state.label : '',
        comp.label,
        comp.amount.toFixed(2),
        i === 0 ? state.direct_total.toFixed(2) : '',
        i === 0 ? state.capital_added : '',
        i === 0 ? state.capital_cumulative : '',
      ]);
    }
  }
  writeFileSync(resolve(OUT_DIR, '01-build-states.csv'), rowsToCsv(headers, rows));
}

// ─── 02 idiot index ───
{
  const headers = ['Element', 'Raw low ($)', 'Raw high ($)', 'Current ($)', 'Index low (×)', 'Index high (×)', 'Markup pays for'];
  const rows = model.idiot_index.map((r) => [
    r.element,
    r.raw_low.toFixed(2),
    r.raw_high.toFixed(2),
    r.current.toFixed(2),
    r.index_low.toFixed(1),
    r.index_high.toFixed(1),
    r.markup_pays_for,
  ]);
  writeFileSync(resolve(OUT_DIR, '02-idiot-index.csv'), rowsToCsv(headers, rows));
}

// ─── 03 volume scenarios ───
{
  const headers = ['Scenario', 'Beds/yr', 'Production founder ($/bed)', 'Admin ($/bed)', 'Field travel ($/bed)', 'Freight ($/bed)', 'State 1 fully-loaded ($)', 'State 4 fully-loaded ($)', 'State 5 fully-loaded ($)'];
  const rows = model.volume_scenarios.map((s) => [
    s.label,
    s.beds_per_year,
    s.production_founder_per_bed,
    s.admin_per_bed,
    s.field_travel_per_bed,
    s.freight_per_bed,
    s.fully_loaded_state_1,
    s.fully_loaded_state_4,
    s.fully_loaded_state_5,
  ]);
  writeFileSync(resolve(OUT_DIR, '03-volume-scenarios.csv'), rowsToCsv(headers, rows));
}

// ─── 04 founder allocation ───
{
  const fa = model.founder_time_allocation;
  const headers = ['Activity', 'Days/yr', 'Rate ($/day)', 'Annual cost ($)', 'Allocate to', 'Per-bed @ 100/yr ($)', 'Per-bed @ 500/yr ($)', 'Per-bed @ 1000/yr ($)'];
  const rows = fa.split.map((r) => [
    r.label,
    r.days,
    fa.rate_per_day,
    r.annual_cost,
    r.allocate_to,
    r.allocate_to === 'bed-overhead' ? (r.annual_cost / 100).toFixed(2) : '—',
    r.allocate_to === 'bed-overhead' ? (r.annual_cost / 500).toFixed(2) : '—',
    r.allocate_to === 'bed-overhead' ? (r.annual_cost / 1000).toFixed(2) : '—',
  ]);
  rows.push(['TOTAL', fa.total_days_per_year_on_goods, fa.rate_per_day, fa.total_days_per_year_on_goods * fa.rate_per_day, '', '', '', '']);
  writeFileSync(resolve(OUT_DIR, '04-founder-allocation.csv'), rowsToCsv(headers, rows));
}

// ─── 05 fundraising offset ───
{
  const fr = model.fundraising_offset;
  const headers = ['Metric', 'Value', 'Note'];
  const rows = [
    ['Philanthropy founder-days/yr', fr.philanthropy_days_per_year, 'Days founder spends raising philanthropic funds'],
    ['$ raised per philanthropy day', fr.philanthropy_dollars_per_founder_day_estimate, 'Mid-stage social-enterprise benchmark'],
    ['Annual philanthropy raised', fr.philanthropy_annual_estimate, '50 × $5K = $250K'],
    ['Commercial founder-days/yr', fr.commercial_sales_days_per_year, 'Days on buyer development'],
    ['Commercial buyer benchmark', `$${fr.commercial_buyer_benchmark_per_bed}/bed`, fr.commercial_buyer_source],
    ['Per-bed subsidy @ 100/yr', `$${fr._per_bed_subsidy_at_100_per_year}`, '$250K / 100 beds'],
    ['Per-bed subsidy @ 500/yr', `$${fr._per_bed_subsidy_at_500_per_year}`, '$250K / 500 beds'],
  ];
  writeFileSync(resolve(OUT_DIR, '05-fundraising-offset.csv'), rowsToCsv(headers, rows));
}

// ─── 06 wage scenarios ───
{
  const headers = ['Pay scenario', '$/hr', '$/8hr day', '$/day inc super', 'Beds/day', '$/bed labour'];
  const rows = model.wage_scenarios.map((s) => [s.label, s.hourly, s.daily_8hr, s.daily_with_super, s.beds_per_day, s.per_bed.toFixed(2)]);
  writeFileSync(resolve(OUT_DIR, '06-wage-scenarios.csv'), rowsToCsv(headers, rows));
}

// ─── 07 community plastic ───
{
  const headers = ['Pay tier', '$/kg', 'kg/bed', '$/bed', 'Annual community pay @ 100 beds', 'Annual community pay @ 500 beds'];
  const rows = model.community_plastic_pay_scenarios.map((s) => [
    s.label,
    s.per_kg,
    s.kg_per_bed,
    s.per_bed.toFixed(2),
    (s.per_bed * 100).toFixed(0),
    (s.per_bed * 500).toFixed(0),
  ]);
  writeFileSync(resolve(OUT_DIR, '07-community-plastic.csv'), rowsToCsv(headers, rows));
}

// ─── 08 defy verified rates ───
{
  const headers = ['Item', 'Rate ($)', 'Source', 'Confidence'];
  const rows = [];
  for (const [key, value] of Object.entries(model.defy_verified_rates)) {
    if (typeof value === 'object' && value !== null && 'amount' in value) {
      rows.push([key, value.amount, value.source || '', value.confidence || '']);
    } else {
      rows.push([key, value, '', '']);
    }
  }
  writeFileSync(resolve(OUT_DIR, '08-defy-verified-rates.csv'), rowsToCsv(headers, rows));
}

// ─── 09 mistags ───
{
  const headers = ['Supplier / line', 'Amount ($)', 'Current tag', 'Correct tag'];
  const rows = model.mistags_to_fix.map((m) => [m.supplier, m.amount, m.current_tag, m.correct_tag]);
  writeFileSync(resolve(OUT_DIR, '09-mistags-to-fix.csv'), rowsToCsv(headers, rows));
}

// ─── 10 open questions for Defy ───
{
  const headers = ['#', 'Question'];
  const rows = model.open_questions_for_defy.map((q, i) => [i + 1, q]);
  writeFileSync(resolve(OUT_DIR, '10-open-questions-for-defy.csv'), rowsToCsv(headers, rows));
}

// ─── README ───
{
  const readme = `# Goods bed cost model v3 — Sheets-ready CSV bundle

Exported ${TODAY} from \`thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json\`.

## How to import into Google Sheets

1. Create a new Google Sheet (or open an existing one for this model).
2. For each CSV in this folder, **File → Import → Upload → ${'`'}<csv-file>${'`'} → Insert new sheet(s)**.
3. Rename each new tab to match the file (e.g. \`01 build states\`, \`02 idiot index\`).
4. Done — the workbook now mirrors the v3 model and you can edit any cell.

## To push changes back to the model

If you change a number in Sheets and want it to drive the live cost-model
page in CivicScope, edit the JSON at \`thoughts/shared/analysis/2026-05-28-goods-bed-cost-model-v3.json\`
to match, then commit. The grantscope service \`apps/web/src/lib/data/goods-bed-cost-model.json\`
is a mirror — keep them in sync (or have a script reconcile them).

## What's in each tab

| File | Purpose |
|---|---|
| \`01-build-states.csv\` | The 5 build-state scenarios (Defy-everything → all in-house) with per-component cost lines and cumulative capex. |
| \`02-idiot-index.csv\` | Markup-ratio table — where Defy's pricing leaves room for in-house cost reduction. |
| \`03-volume-scenarios.csv\` | Fully-loaded per-bed cost at 100/500/1000 beds/yr for each build state. |
| \`04-founder-allocation.csv\` | Founder time split: production (onto beds) vs fundraising (offset) vs ACT-wide. |
| \`05-fundraising-offset.csv\` | How dollars raised per founder-day subsidise bed cost. |
| \`06-wage-scenarios.csv\` | 4 wage tiers × 6 beds/day → $/bed labour. |
| \`07-community-plastic.csv\` | 4 pay-rate tiers for community-collected HDPE. |
| \`08-defy-verified-rates.csv\` | Every OCR-verified Defy invoice rate (the load-bearing data). |
| \`09-mistags-to-fix.csv\` | ~$120K of ACT-GD spend that's actually for other projects. |
| \`10-open-questions-for-defy.csv\` | What we still need from Defy to lock the model. |

## Verified data lineage

All rates in tab 08 come from \`scripts/ocr-defy-bills.mjs\` (Gemini 2.5 Flash Lite
OCR of every Defy invoice attachment in Xero), output in
\`thoughts/shared/analysis/2026-05-28-defy-invoice-ocr.json\`. Re-run that script
when Defy issues new invoices to refresh the verified-rate set.

Plan: \`goods-cost-evidence-funder-artifact\`.
`;
  writeFileSync(resolve(OUT_DIR, 'README.md'), readme);
}

console.log(`Exported v3 cost model to ${OUT_DIR}`);
console.log('  10 CSVs + README.md');
console.log('Next: File → Import → Upload (each CSV) into a Google Sheet.');
