#!/usr/bin/env node
/**
 * goods-tender-scan.mjs — IPP/MMR standing query for "Goods on Country"
 *
 * Goods on Country runs through The Butterfly Movement Ltd (Indigenous-led
 * charity, DGR) with a potential JV with Oonchiumpa — making Goods eligible
 * for Indigenous Procurement Policy (IPP) set-asides and Mandatory Minimum
 * Requirements (MMR) weighted tenders. This script surfaces the Goods-biddable
 * slice of the procurement corpus so we know WHICH agencies buy WHAT, under MMR,
 * in Goods-relevant categories — i.e. where to position for the next tender.
 *
 * DATA REALITY (verified 2026-06-07 against project tednluwflfhxyucgwigh):
 *   - austender_contracts (~807k rows) is AWARDED-contract data (OCDS).
 *     It has `is_mmr_applicable` (boolean) — verified present — but NO live
 *     "open/closing" status and `title` is just a contract REFERENCE code
 *     (e.g. "CON010627"). The descriptive text lives in `description`.
 *     Category = UNSPSC codes (e.g. "UNSPSC:56101700") or free-text labels.
 *   - state_tenders (~200k rows) is ~99.8% status='awarded' with `category`
 *     entirely NULL and `closing_date` entirely NULL. The handful of
 *     open/current/unknown rows are scrape fragments (PDFs, reports), not
 *     live tenders. It is included as a supplementary signal layer only.
 *
 * Because neither table carries a live open-tender feed with usable close
 * dates, "open or recently-closed (last 90 days)" is implemented as
 * RECENTLY-PUBLISHED awarded contracts (default 90d, --days to widen). Each
 * row is a re-tender / repeat-buyer signal: the same agency in the same
 * category is the realistic next bid. "why-biddable" explains the IPP/MMR
 * basis. This is a TARGET list, not a live AusTender notice feed.
 *
 * Usage:
 *   node scripts/goods-tender-scan.mjs                 # ranked human-readable list, 90d
 *   node scripts/goods-tender-scan.mjs --days 365      # widen window to 12 months
 *   node scripts/goods-tender-scan.mjs --limit 50      # cap rows (default 40)
 *   node scripts/goods-tender-scan.mjs --json          # machine-readable JSON
 *
 * READ-ONLY: SELECT only via the exec_sql RPC (service role). No writes/DDL.
 */

// Load .env.local quietly (quiet:true keeps the dotenv banner off stdout so
// --json output stays clean/parseable). Mirrors scripts/lib/load-env.mjs
// (override:true so .env.local wins over stale shell env).
import { config as dotenvConfig } from 'dotenv';
import { resolve as pathResolve } from 'path';
import { existsSync } from 'fs';
const _envPath = pathResolve(process.cwd(), '.env.local');
if (existsSync(_envPath)) dotenvConfig({ path: _envPath, override: true, quiet: true });
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
// 90s fetch timeout — the shared instance can 522/overload (origin pooler
// exhaustion); fail fast with a clear error instead of hanging for minutes.
const FETCH_TIMEOUT_MS = 90_000;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: {
    fetch: (url, opts = {}) =>
      fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
  },
});

// ── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const idx = (flag) => args.indexOf(flag);
const DAYS = idx('--days') >= 0 ? parseInt(args[idx('--days') + 1], 10) || 90 : 90;
const LIMIT = idx('--limit') >= 0 ? parseInt(args[idx('--limit') + 1], 10) || 40 : 40;

// ── Goods-relevant classification ───────────────────────────────────────────
// UNSPSC families (verified populated in austender_contracts):
//   56 = Furniture and Furnishings
//   72 = Building/Facility construction & maintenance
//   76 = Industrial Cleaning / facility services
//   93 = Politics & Civic Affairs / community & social services
const UNSPSC_FAMILIES = ['56', '72', '76', '93'];
// description keywords (title is a ref code, so keyword-match on description)
const DESC_KEYWORDS = [
  'furniture', 'furnishing', 'fit-out', 'fitout', 'fit out', 'joinery', 'cabinetry',
  'community service', 'social service', 'community program',
  'facilit', 'maintenance', 'cleaning', 'grounds',
  'indigenous', 'first nations', 'aboriginal', 'torres strait',
];

// build SQL category/description predicate (parameter-free; literals are static & safe)
function goodsPredicate(descCol = 'description', catCol = 'category') {
  const catClause = UNSPSC_FAMILIES.map((f) => `${catCol} LIKE 'UNSPSC:${f}%'`).join(' OR ');
  const kwClause = DESC_KEYWORDS
    .map((k) => `${descCol} ILIKE '%${k.replace(/'/g, "''")}%'`)
    .join(' OR ');
  return `(${catClause} OR ${kwClause})`;
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) throw new Error(error.message);
  return data || [];
}

// "why-biddable" rationale per row
function whyBiddable(r) {
  const reasons = [];
  if (r.is_mmr_applicable) reasons.push('MMR-applicable contract (≥$7.5m or covered category → Indigenous participation weighting)');
  const cat = r.category || '';
  if (/^UNSPSC:56/.test(cat)) reasons.push('Furniture/furnishings — core Goods supply line');
  if (/^UNSPSC:72/.test(cat)) reasons.push('Facility construction/fit-out — Goods install/fit-out scope');
  if (/^UNSPSC:76/.test(cat)) reasons.push('Facility/cleaning services');
  if (/^UNSPSC:93/.test(cat)) reasons.push('Community & social services — Butterfly Movement program fit');
  const d = (r.description || '').toLowerCase();
  if (/indigenous|first nations|aboriginal|torres strait/.test(d)) reasons.push('Indigenous-specific scope (IPP set-aside / Exemption 16 candidate)');
  if (/furniture|furnishing|joinery|fit-?out|cabinetry/.test(d)) reasons.push('Furniture/fit-out scope in description');
  if (/community|social service/.test(d)) reasons.push('Community/social-service scope in description');
  if (!reasons.length) reasons.push('Goods-category match');
  return reasons;
}

async function scanAustender() {
  // austender_contracts (~807k rows) has NO indexes, so every filter is a
  // sequential scan. To stay well under exec_sql's statement timeout we
  // two-stage it in ONE statement: the `recent` CTE first narrows by the
  // selective is_mmr_applicable + date_published window (90d ≈ 16k rows), and
  // the Goods category/keyword predicate (17 ILIKEs) is then evaluated only
  // against that small set rather than all 807k rows. Aggregated/limited in
  // SQL so we never hit the 1000-row PostgREST cap.
  const sql = `
    WITH recent AS MATERIALIZED (
      SELECT id, ocid, title AS ref, description, contract_value, currency,
             buyer_name, supplier_name, supplier_acnc_match, supplier_oric_match,
             category, procurement_method,
             date_published, contract_end, is_mmr_applicable, source_url
      FROM austender_contracts
      WHERE is_mmr_applicable = true
        AND date_published <= now()
        AND date_published >= now() - interval '${DAYS} days'
    )
    SELECT id, ocid, ref, description, contract_value, currency,
           buyer_name, supplier_name, supplier_acnc_match, supplier_oric_match,
           category, procurement_method,
           date_published::date AS published, contract_end::date AS contract_end,
           is_mmr_applicable, source_url
    FROM recent
    WHERE ${goodsPredicate('description', 'category')}
    ORDER BY contract_value DESC NULLS LAST, date_published DESC
    LIMIT ${LIMIT}`;
  return q(sql);
}

async function scanStateTenders() {
  // Supplementary: state_tenders has no usable category/closing_date, so we
  // keyword-match description/title and take anything not flagged 'awarded',
  // or recently published. Realistically returns little — kept for coverage.
  const kw = DESC_KEYWORDS.map((k) => `(description ILIKE '%${k.replace(/'/g, "''")}%' OR title ILIKE '%${k.replace(/'/g, "''")}%')`).join(' OR ');
  const sql = `
    SELECT id, source, source_id, title AS ref, description, contract_value, currency,
           status, state, buyer_name, buyer_department,
           published_date::date AS published, closing_date::date AS closing,
           is_justice_related, source_url
    FROM state_tenders
    WHERE (status IS DISTINCT FROM 'awarded'
           OR published_date >= now() - interval '${DAYS} days')
      AND (${kw})
    ORDER BY COALESCE(closing_date, published_date) DESC NULLS LAST,
             contract_value DESC NULLS LAST
    LIMIT ${LIMIT}`;
  return q(sql);
}

function fmtMoney(v) {
  if (v == null) return 'n/a';
  const n = Number(v);
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}m`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

async function main() {
  const [aus, state] = [await scanAustender(), await scanStateTenders()]; // sequential, no Promise.all

  const ausRanked = aus.map((r) => ({
    lens: 'austender (MMR awarded — re-tender signal)',
    value: r.contract_value != null ? Number(r.contract_value) : null,
    agency: r.buyer_name,
    incumbent_supplier: r.supplier_name,
    incumbent_indigenous: !!(r.supplier_oric_match) || !!(r.supplier_acnc_match),
    published: r.published,
    contract_end: r.contract_end,
    category: r.category,
    description: r.description,
    is_mmr_applicable: r.is_mmr_applicable,
    why_biddable: whyBiddable(r),
    source_url: r.source_url,
    ocid: r.ocid,
  }));

  const stateRanked = state.map((r) => ({
    lens: 'state_tenders (supplementary)',
    value: r.contract_value != null ? Number(r.contract_value) : null,
    agency: r.buyer_name || r.buyer_department,
    state: r.state,
    status: r.status,
    published: r.published,
    closing: r.closing,
    description: r.description || r.ref,
    why_biddable: whyBiddable({ description: r.description, category: null, is_mmr_applicable: false }),
    source_url: r.source_url,
  }));

  if (JSON_OUT) {
    console.log(JSON.stringify({
      generated_at: new Date().toISOString(),
      window_days: DAYS,
      limit: LIMIT,
      caveat: 'austender_contracts & state_tenders are AWARDED-contract data, not a live open-tender feed. Rows are re-tender/repeat-buyer targets, ranked by value. Verify the live notice on AusTender / state portals before bidding.',
      austender_mmr_targets: ausRanked,
      state_tenders_supplementary: stateRanked,
    }, null, 2));
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  GOODS-ON-COUNTRY — IPP/MMR BIDDABLE TARGET SCAN`);
  console.log(`  Window: last ${DAYS} days · ranked by contract value · top ${LIMIT}`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  NOTE: Source tables are AWARDED-contract data, not a live open-tender');
  console.log('  feed. Each row = a re-tender / repeat-buyer target (same agency,');
  console.log('  same Goods category, MMR-flagged). Confirm the live notice before bidding.\n');

  console.log(`── AusTender: MMR-applicable, Goods-relevant (${ausRanked.length}) ──\n`);
  ausRanked.forEach((r, i) => {
    console.log(`${i + 1}. ${fmtMoney(r.value)}  ·  ${r.agency || 'Unknown agency'}`);
    console.log(`   ${(r.description || '').slice(0, 100)}`);
    console.log(`   category: ${r.category || 'n/a'}  ·  published: ${r.published || 'n/a'}  ·  ends: ${r.contract_end || 'n/a'}`);
    if (r.incumbent_supplier) console.log(`   incumbent: ${r.incumbent_supplier}${r.incumbent_indigenous ? ' (Indigenous-matched)' : ''}`);
    console.log(`   why biddable: ${r.why_biddable.join(' · ')}`);
    if (r.source_url) console.log(`   ${r.source_url}`);
    console.log('');
  });

  console.log(`── state_tenders (supplementary, sparse) (${stateRanked.length}) ──\n`);
  if (!stateRanked.length) {
    console.log('   (none — state_tenders has no usable category/closing-date data)\n');
  } else {
    stateRanked.forEach((r, i) => {
      console.log(`${i + 1}. ${fmtMoney(r.value)}  ·  ${r.agency || 'Unknown'} [${r.state || '?'}] ${r.status || ''}`);
      console.log(`   ${(r.description || '').slice(0, 100)}`);
      console.log(`   published: ${r.published || 'n/a'}  ·  closing: ${r.closing || 'n/a'}`);
      console.log('');
    });
  }

  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`Totals: ${ausRanked.length} AusTender MMR targets · ${stateRanked.length} state supplementary`);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
