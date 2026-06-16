#!/usr/bin/env node
/**
 * build-rd-basis.mjs — the honest FY26 R&D-basis sidecar (whole-picture v1.5 phase 3).
 *
 * Reports the FY26 R&D basis AS IT ACTUALLY STANDS for the 43.5% R&D Tax Incentive — not a
 * confident number. Sources rd_eligible SPEND from xero_transactions, strips founder drawings via
 * the TDD-pinned pure fn (lib/rd-basis-lib.mjs · test scripts/tests/rd-basis.test.mjs), and frames
 * the result as an AT-RISK CEILING.
 *
 * READ-ONLY: queries xero_transactions, writes one JSON sidecar. No DB/Xero/GHL writes.
 *
 * The defensible basis is a CEILING, not bankable, for TWO documented reasons:
 *   1. Nothing on paper — contemporaneous records 15078–81 absent from the mirror, R&D checklist
 *      unchecked, decision log DRAFT (founders-OS plan 2026-06-10). 43.5% requires contemporaneous
 *      records; without them the claim is uncured.
 *   2. Standard Ledger review of the remaining (non-founder) rows can strip more ineligible spend —
 *      the documented collapse-to-~$55K risk.
 * Gate: bankable only when RD_BASIS_RECORDS_CURED=1 (set ONLY after records exist + SL confirms).
 * Default OFF — the sidecar headlines the RISK, never a bankable figure.
 *
 * Output: thoughts/shared/data/rd-basis-latest.json (gitignored — sensitive R&D financials).
 * Run:  node scripts/build-rd-basis.mjs            (writes sidecar + prints summary)
 *       node scripts/build-rd-basis.mjs --dry-run  (prints only)
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeRdBasis } from './lib/rd-basis-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
loadEnv({ path: path.resolve(ROOT, '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const OUT = path.join(ROOT, 'thoughts/shared/data/rd-basis-latest.json');
const FY = { start: '2025-07-01', end: '2026-06-30' };
const money = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Documented "nothing on paper" gaps — from the founders-OS plan 2026-06-10 (not computed here).
const PAPER_GAPS = [
  'Contemporaneous records 15078-81 absent from the Xero mirror',
  'R&D activity checklist unchecked',
  'Decision log still DRAFT',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key);

  // rd_eligible SPEND in FY26 (384 rows < PostgREST 1000 cap; guard the count anyway).
  const { data, error, count } = await sb
    .from('xero_transactions')
    .select('contact_name, total', { count: 'exact' })
    .eq('type', 'SPEND')
    .eq('rd_eligible', true)
    .gte('date', FY.start)
    .lte('date', FY.end);
  if (error) throw error;
  if (count != null && data.length !== count) {
    throw new Error(`TRUNCATION GUARD: fetched ${data.length} of ${count} rd_eligible rows — paginate`);
  }

  const rows = data.map((r) => ({ contact_name: r.contact_name, amount: Math.abs(Number(r.total) || 0) }));
  const r = computeRdBasis(rows);

  const cured = ['1', 'true', 'yes'].includes(String(process.env.RD_BASIS_RECORDS_CURED || '').toLowerCase());

  const out = {
    generated_at: new Date().toISOString(),
    fy: 'FY26 (1 Jul 2025 - 30 Jun 2026)',
    source: 'xero_transactions where rd_eligible AND type=SPEND',
    rows_total: rows.length,
    gross_flagged: r.grossFlagged,            // what is tagged R&D today
    founder_drawings: r.founderDrawings,      // R&D-INELIGIBLE — must be stripped
    founder_rows: r.founderRows,
    founder_pct: Number(r.founderPct.toFixed(1)),
    defensible_basis_ceiling: r.defensibleBasis, // CEILING after stripping obvious founder rows
    offset_435_on_ceiling: r.offset435,          // 43.5% on the ceiling (illustrative, NOT bankable)
    records_cured: cured,
    bankable: cured,                             // never bankable until records cured
    headline: cured
      ? `FY26 R&D basis (records cured): up to ${money(r.defensibleBasis)} defensible; offset ~${money(r.offset435)}. SL-confirm final.`
      : `AT RISK — flagged ${money(r.grossFlagged)} but ${money(r.founderDrawings)} (${r.founderPct.toFixed(0)}%) is founder drawings (ineligible). Defensible CEILING ${money(r.defensibleBasis)}; NOT bankable (nothing on paper + collapse-to-~$55K risk).`,
    paper_gaps: PAPER_GAPS,
    collapse_risk_note: 'Defensible basis is a ceiling; SL review of the remaining non-founder rows can push it lower (documented collapse-to-~$55K risk).',
  };

  console.log(`FY26 R&D basis ${DRY_RUN ? '(dry-run)' : ''}`);
  console.log(`  flagged today:      ${money(r.grossFlagged)} (${rows.length} rows)`);
  console.log(`  founder drawings:   ${money(r.founderDrawings)} (${r.founderRows} rows, ${r.founderPct.toFixed(0)}%) — R&D-INELIGIBLE, strip`);
  console.log(`  defensible ceiling: ${money(r.defensibleBasis)}  ->  43.5% offset ${money(r.offset435)} (illustrative)`);
  console.log(`  records cured: ${cured} -> bankable: ${cured}${cured ? '' : '  [AT RISK: ' + PAPER_GAPS.length + ' paper gaps + collapse-to-~$55K]'}`);

  if (DRY_RUN) { console.log(`  (dry-run: ${path.relative(ROOT, OUT)} NOT written)`); return; }
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`  wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => { console.error('build-rd-basis FAILED:', e.message); process.exit(1); });
