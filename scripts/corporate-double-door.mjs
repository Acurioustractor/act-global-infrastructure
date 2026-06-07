#!/usr/bin/env node
/**
 * corporate-double-door.mjs — the "corporate double-door" lens
 *
 * Thesis: some organisations approach ACT through TWO doors at once — as a
 * government/agency PROCUREMENT BUYER (they put work out to tender, which Goods
 * can win under IPP/MMR) AND as a philanthropic GRANT-MAKER (they fund mission
 * work). An org sitting in both columns is a relationship worth one coherent
 * strategy rather than two siloed pitches.
 *
 * Sources (verified 2026-06-07, project tednluwflfhxyucgwigh):
 *   - BUYERS:  v_act_procurement_buyers (226 rows) — buyer_name, contract_count,
 *              total_relevant_spend, top_categories, recency.
 *   - GRANT-MAKERS: foundations (~11,042 rows; 551 DGR) — name, acnc_abn,
 *              has_dgr, total_giving_annual, thematic_focus, type.
 *
 * Name matching is fuzzy: both sides are normalised (lowercase, strip
 * Pty/Ltd/Limited/Foundation/Trust/Inc + "Department of"/"The", drop
 * punctuation) before joining. EXACT normalised matches are reported as
 * confirmed double-doors; everything else is ranked by trigram similarity
 * (pg_trgm `similarity()`, verified installed) and the top near-misses are
 * shown with a similarity score + shared-token note.
 *
 * REALITY CHECK: v_act_procurement_buyers is overwhelmingly GOVERNMENT
 * departments/agencies, while foundations is philanthropic bodies. A genuine
 * double-door is therefore RARE (a probe found ~1 strict match, itself a
 * gallery's in-house foundation). So the near-miss list is the substantive
 * output — read it as "closest corporate/named overlaps to investigate", not
 * as confirmed dual-role orgs.
 *
 * Usage:
 *   node scripts/corporate-double-door.mjs            # exact matches + top-20 near-misses
 *   node scripts/corporate-double-door.mjs --top 40   # widen near-miss list
 *   node scripts/corporate-double-door.mjs --min 0.45 # raise near-miss similarity floor
 *   node scripts/corporate-double-door.mjs --json
 *
 * READ-ONLY: SELECT only via exec_sql RPC. No writes/DDL.
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

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const idx = (f) => args.indexOf(f);
const TOP = idx('--top') >= 0 ? parseInt(args[idx('--top') + 1], 10) || 20 : 20;
const MIN_SIM = idx('--min') >= 0 ? parseFloat(args[idx('--min') + 1]) || 0.4 : 0.4;

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) throw new Error(error.message);
  return data || [];
}

// JS-side normaliser — must mirror the SQL one used in the joins below.
const SUFFIXES = ['pty', 'ltd', 'limited', 'foundation', 'trust', 'inc', 'incorporated',
  'the', 'department of', 'dept of', 'office of', 'australian', 'group', 'co', 'company'];
function normalise(name) {
  if (!name) return '';
  let s = name.toLowerCase();
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9 ]/g, ' ');
  for (const suf of SUFFIXES) s = s.replace(new RegExp(`\\b${suf}\\b`, 'g'), ' ');
  return s.replace(/\s+/g, ' ').trim();
}
function tokens(norm) { return new Set(norm.split(' ').filter((t) => t.length > 2)); }
function sharedTokens(a, b) {
  const ta = tokens(a), tb = tokens(b);
  return [...ta].filter((t) => tb.has(t));
}
const collapse = (norm) => norm.replace(/ /g, '');
// Trigram set of a string (Postgres pg_trgm style: pad with 2 leading + 1
// trailing space, then 3-grams). Used to score near-misses in JS so we don't
// depend on a server-side trigram index over the 11k-row foundations table.
function trigrams(s) {
  const padded = `  ${s} `;
  const g = new Set();
  for (let i = 0; i < padded.length - 2; i++) g.add(padded.slice(i, i + 3));
  return g;
}
function trigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const ga = trigrams(a), gb = trigrams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const t of ga) if (gb.has(t)) inter++;
  const union = ga.size + gb.size - inter;
  return union ? inter / union : 0;
}

async function main() {
  // Both sides are small enough to pull in full via exec_sql (the RPC path is
  // NOT subject to the 1000-row PostgREST cap — verified pattern). Buyers = 226,
  // foundations = ~11k (small unindexed table, fast seq scan). We then do
  // normalisation + exact + trigram matching in JS. This avoids a 226×11k
  // LATERAL cross join in SQL (which would seq-scan foundations 226 times with
  // no trigram index) and keeps the heavy string work on the client.

  const buyersRaw = await q(`
    SELECT buyer_name, contract_count, total_relevant_spend, top_categories
    FROM v_act_procurement_buyers`);
  const foundationsRaw = await q(`
    SELECT id, name, has_dgr, total_giving_annual, type
    FROM foundations
    WHERE name IS NOT NULL`);

  // Normalise both sides once.
  const buyers = buyersRaw
    .map((b) => ({ ...b, norm: normalise(b.buyer_name) }))
    .filter((b) => b.norm.length > 4); // drop too-short keys (false-match risk)
  const foundations = foundationsRaw
    .map((f) => ({ ...f, norm: normalise(f.name) }))
    .filter((f) => f.norm.length > 3);

  // Index foundations by collapsed-norm for O(1) exact lookup.
  const foundByCollapsed = new Map();
  for (const f of foundations) {
    const key = collapse(f.norm);
    if (!foundByCollapsed.has(key)) foundByCollapsed.set(key, f);
  }

  // --- 1) Exact normalised matches (collapsed, space-insensitive) ---
  const exactEnriched = [];
  const exactBuyerNames = new Set();
  for (const b of buyers) {
    const f = foundByCollapsed.get(collapse(b.norm));
    if (!f) continue;
    exactBuyerNames.add(b.buyer_name);
    exactEnriched.push({
      buyer_name: b.buyer_name,
      buyer_evidence: {
        contract_count: b.contract_count,
        total_relevant_spend: b.total_relevant_spend != null ? Number(b.total_relevant_spend) : null,
        top_categories: b.top_categories,
      },
      foundation_name: f.name,
      grantmaker_evidence: {
        foundation_id: f.id,
        has_dgr: f.has_dgr,
        total_giving_annual: f.total_giving_annual != null ? Number(f.total_giving_annual) : null,
        type: f.type,
      },
      match: 'exact (normalised)',
    });
  }
  exactEnriched.sort((a, b) => (b.buyer_evidence.total_relevant_spend || 0) - (a.buyer_evidence.total_relevant_spend || 0));

  // --- 2) Near-misses via JS trigram similarity ---
  // For each non-exact buyer, find the single best foundation by trigram
  // similarity on the normalised strings, keep if >= MIN_SIM.
  const nearAll = [];
  for (const b of buyers) {
    if (exactBuyerNames.has(b.buyer_name)) continue;
    const bTokens = tokens(b.norm);
    let best = null;
    for (const f of foundations) {
      // cheap gate: require at least one shared token OR a trigram-promising
      // length overlap, to skip the obviously-unrelated majority fast.
      let shareTok = false;
      for (const t of bTokens) { if (f.norm.includes(t)) { shareTok = true; break; } }
      if (!shareTok && Math.abs(f.norm.length - b.norm.length) > 8) continue;
      const sim = trigramSimilarity(b.norm, f.norm);
      if (!best || sim > best.sim) best = { f, sim };
    }
    if (best && best.sim >= MIN_SIM && collapse(best.f.norm) !== collapse(b.norm)) {
      const shared = sharedTokens(b.norm, best.f.norm);
      nearAll.push({
        buyer_name: b.buyer_name,
        buyer_evidence: {
          contract_count: b.contract_count,
          total_relevant_spend: b.total_relevant_spend != null ? Number(b.total_relevant_spend) : null,
          top_categories: b.top_categories,
        },
        foundation_name: best.f.name,
        grantmaker_evidence: {
          foundation_id: best.f.id,
          has_dgr: best.f.has_dgr,
          total_giving_annual: best.f.total_giving_annual != null ? Number(best.f.total_giving_annual) : null,
          type: best.f.type,
        },
        similarity: Math.round(best.sim * 1000) / 1000,
        shared_tokens: shared,
        note: shared.length
          ? `shares: ${shared.join(', ')}`
          : 'trigram overlap only (no shared whole word) — likely coincidental',
      });
    }
  }
  nearAll.sort((a, b) => b.similarity - a.similarity || (b.buyer_evidence.total_relevant_spend || 0) - (a.buyer_evidence.total_relevant_spend || 0));
  const nearEnriched = nearAll.slice(0, TOP);

  if (JSON_OUT) {
    console.log(JSON.stringify({
      generated_at: new Date().toISOString(),
      buyers_source: 'v_act_procurement_buyers (226)',
      grantmakers_source: 'foundations (~11,042)',
      caveat: 'Buyers are overwhelmingly govt agencies; genuine double-doors are rare. Near-misses are investigation leads ranked by trigram similarity, NOT confirmed dual-role orgs. Verify before acting.',
      exact_double_doors: exactEnriched,
      near_misses_top: nearEnriched,
    }, null, 2));
    return;
  }

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  CORPORATE DOUBLE-DOOR — buyers ∩ grant-makers');
  console.log('  buyers: v_act_procurement_buyers (226) · grant-makers: foundations (~11,042)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  NOTE: procurement buyers here are overwhelmingly govt agencies, so a');
  console.log('  genuine double-door (buys AND grants) is rare. Treat near-misses as');
  console.log('  leads to investigate, not confirmed dual-role orgs.\n');

  console.log(`── Exact normalised double-doors (${exactEnriched.length}) ──\n`);
  if (!exactEnriched.length) {
    console.log('   (none)\n');
  } else {
    exactEnriched.forEach((r, i) => {
      console.log(`${i + 1}. ${r.buyer_name}  ≈  ${r.foundation_name}`);
      console.log(`   buyer: ${r.buyer_evidence.contract_count} contracts · $${(r.buyer_evidence.total_relevant_spend || 0).toLocaleString()} relevant spend`);
      console.log(`   grant-maker: foundation_id=${r.grantmaker_evidence.foundation_id} · DGR=${r.grantmaker_evidence.has_dgr} · giving/yr=${r.grantmaker_evidence.total_giving_annual ?? 'n/a'}`);
      console.log('');
    });
  }

  console.log(`── Top ${nearEnriched.length} near-misses (similarity ≥ ${MIN_SIM}) ──\n`);
  if (!nearEnriched.length) {
    console.log('   (none above threshold)\n');
  } else {
    nearEnriched.forEach((r, i) => {
      console.log(`${i + 1}. [sim ${r.similarity}] ${r.buyer_name}  ~  ${r.foundation_name}`);
      console.log(`   ${r.note}`);
      console.log(`   buyer: ${r.buyer_evidence.contract_count} contracts · $${(r.buyer_evidence.total_relevant_spend || 0).toLocaleString()} spend`);
      console.log(`   grant-maker: foundation_id=${r.grantmaker_evidence.foundation_id} · DGR=${r.grantmaker_evidence.has_dgr} · giving/yr=${r.grantmaker_evidence.total_giving_annual ?? 'n/a'}`);
      console.log('');
    });
  }

  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`Totals: ${exactEnriched.length} exact double-doors · ${nearEnriched.length} near-misses shown`);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
