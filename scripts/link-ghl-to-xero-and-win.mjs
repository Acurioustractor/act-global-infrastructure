#!/usr/bin/env node
/**
 * Link stale GHL opportunities to their Xero invoices and mark them Won.
 *
 * Strategy per opp:
 *   1. Find Xero invoices in last 12 months where total matches monetary_value (±$1).
 *   2. Score candidates by: PAID status (+10), keyword overlap with name (+5), date proximity to opp's last_stage_change (+3).
 *   3. Best candidate auto-matched if score ≥ 10 AND single best by ≥3 points. Otherwise flagged for manual.
 *
 * Default: dry-run, prints proposed matches.
 * --apply: writes ghl_opportunities.xero_invoice_id + marks GHL opp Won.
 *
 * Usage:
 *   node scripts/link-ghl-to-xero-and-win.mjs                    # all stale 60+ days
 *   node scripts/link-ghl-to-xero-and-win.mjs --apply             # write linkages + mark Won
 *   node scripts/link-ghl-to-xero-and-win.mjs --pipeline "A Curious Tractor"
 *   node scripts/link-ghl-to-xero-and-win.mjs --ids ghl_id1,ghl_id2  # only these specific ids
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const pipelineArg = args.find(a => a.startsWith('--pipeline'));
const PIPELINE = pipelineArg ? pipelineArg.split(/[ =]/)[1] : 'A Curious Tractor';
const idsArg = args.find(a => a.startsWith('--ids'));
const ID_FILTER = idsArg ? idsArg.split(/[ =]/)[1].split(',') : null;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

const STOPWORDS = new Set(['the','a','of','and','for','to','at','on','in','-','#','1','2','3']);
function tokenize(s) {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOPWORDS.has(t));
}
function keywordOverlap(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  let n = 0;
  for (const t of ta) if (tb.has(t)) n++;
  return n;
}

async function fetchStaleOpps() {
  const ninety = new Date(Date.now() - 60 * 86400000).toISOString();
  let q = supabase.from('ghl_opportunities')
    .select('ghl_id, name, monetary_value, pipeline_name, stage_name, last_stage_change_at, xero_invoice_id')
    .eq('status', 'open')
    .lt('last_stage_change_at', ninety)
    .order('monetary_value', { ascending: false, nullsFirst: false });
  if (PIPELINE) q = q.eq('pipeline_name', PIPELINE);
  const { data } = await q;
  let rows = data || [];
  if (ID_FILTER) rows = rows.filter(r => ID_FILTER.includes(r.ghl_id));
  return rows.filter(r => !r.xero_invoice_id); // skip already-linked
}

async function findCandidates(opp) {
  const target = Number(opp.monetary_value || 0);
  if (target === 0) return [];
  const { data } = await supabase.from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, date, status, line_items')
    .eq('type', 'ACCREC')
    .gte('date', '2025-04-01')
    .gte('total', target - 1)
    .lte('total', target + 1)
    .neq('status', 'VOIDED').neq('status', 'DELETED')
    .order('date', { ascending: false });
  return data || [];
}

function scoreCandidate(opp, candidate) {
  let score = 0;
  if (candidate.status === 'PAID') score += 10;
  else if (candidate.status === 'AUTHORISED') score += 5;
  // Keyword overlap (name vs contact_name + invoice_number + line_item descriptions)
  const haystack = [
    candidate.contact_name,
    candidate.invoice_number,
    JSON.stringify(candidate.line_items || []),
  ].join(' ');
  const overlap = keywordOverlap(opp.name, haystack);
  score += overlap * 5;
  return score;
}

async function applyMatch(opp, invoice) {
  // 1. Update Supabase: set xero_invoice_id (column exists on ghl_opportunities)
  await supabase.from('ghl_opportunities')
    .update({ xero_invoice_id: invoice.xero_id })
    .eq('ghl_id', opp.ghl_id);

  // 2. Mark GHL opp Won via API
  const res = await fetch(`https://services.leadconnectorhq.com/opportunities/${opp.ghl_id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ status: 'won' }),
  });
  if (!res.ok) throw new Error(`GHL ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  log('=== Link GHL → Xero + mark Won ===');
  log(APPLY ? 'APPLY MODE' : 'DRY RUN — preview only');
  log(`Pipeline filter: ${PIPELINE || '(any)'}`);
  if (ID_FILTER) log(`IDs filter: ${ID_FILTER.join(',')}`);

  const opps = await fetchStaleOpps();
  log(`\n${opps.length} stale unlinked opps to process\n`);

  let auto = 0, manual = 0, err = 0;
  for (const opp of opps) {
    const cands = await findCandidates(opp);
    log(`${fmt(opp.monetary_value).padEnd(10)} ${(opp.name || 'unnamed').slice(0, 40).padEnd(40)} → ${cands.length} candidates`);
    if (cands.length === 0) {
      log(`    NO MATCH (no Xero invoice with amount $${opp.monetary_value})`);
      manual++;
      continue;
    }
    const scored = cands.map(c => ({ ...c, _score: scoreCandidate(opp, c) }))
      .sort((a, b) => b._score - a._score);
    const best = scored[0];
    const second = scored[1];
    const marginOk = !second || (best._score - second._score >= 3);
    const confidentEnough = best._score >= 10;
    const decision = (confidentEnough && marginOk) ? 'AUTO' : 'MANUAL';
    log(`    ${decision} → ${best.invoice_number} · ${best.contact_name?.slice(0, 35)} · ${best.status} · score=${best._score}${second ? ` (next=${second._score})` : ''}`);

    if (decision === 'AUTO' && APPLY) {
      try {
        await applyMatch(opp, best);
        log(`      ✓ marked Won + linked xero_invoice_id`);
        auto++;
      } catch (e) {
        log(`      ✗ ERROR: ${e.message}`);
        err++;
      }
    } else if (decision === 'AUTO') {
      auto++;
    } else {
      manual++;
    }
  }

  log(`\nSummary: ${auto} auto, ${manual} need manual, ${err} errors`);
  if (!APPLY) log('Pass --apply to write changes.');
  if (manual > 0) log(`\nFor manual ones: open the GHL opp + the candidate Xero invoice, confirm, then re-run with --ids <ghl_id> after manually setting status=Won in GHL.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
