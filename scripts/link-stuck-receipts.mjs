#!/usr/bin/env node
/**
 * Link Stuck Receipts — writes bas-gap-sweep auto-matches into the
 * receipt_emails table so the existing upload-receipts-to-xero.mjs cron
 * (or a manual run of it) pushes the attachments to Xero.
 *
 * Uses the same scoring logic as bas-gap-sweep.mjs. A match is applied when:
 *   - Score ≥ 80 (configurable via --min-score)
 *   - The receipt is currently in review/captured/failed state
 *   - The Xero transaction has no attachments yet
 *   - The receipt isn't already linked to a different Xero entity
 *
 * Defaults to DRY-RUN. Pass --apply to write changes.
 *
 * Usage:
 *   node scripts/link-stuck-receipts.mjs Q2                 # Dry run, Q2
 *   node scripts/link-stuck-receipts.mjs Q3 --apply         # Write Q3 matches
 *   node scripts/link-stuck-receipts.mjs Q2 --apply --min-score 75
 *   node scripts/link-stuck-receipts.mjs Q2 Q3 --apply      # Both quarters
 *
 * After running with --apply, trigger upload:
 *   node scripts/upload-receipts-to-xero.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26' },
};

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aw = new Set(a.split(/\W+/).filter(Boolean));
  const bw = new Set(b.split(/\W+/).filter(Boolean));
  let common = 0;
  for (const w of aw) if (bw.has(w)) common++;
  return common / Math.max(aw.size, bw.size, 1);
}

function scoreMatch(receipt, txn) {
  const txAmount = Math.abs(Number(txn.total));
  const rAmount = Number(receipt.amount_detected || 0);
  const vSim = similarity(receipt.vendor_name, txn.contact_name);
  const amountDiff = rAmount > 0 ? Math.abs(rAmount - txAmount) / txAmount : 1;
  const dayDiff = Math.abs((new Date(receipt.received_at) - new Date(txn.date)) / 86400000);
  let score = 0;
  if (vSim >= 0.5) score += 40 * vSim;
  if (amountDiff < 0.05) score += 40;
  else if (amountDiff < 0.15) score += 20;
  if (dayDiff < 3) score += 20;
  else if (dayDiff < 7) score += 10;
  else if (dayDiff < 14) score += 5;
  return { score, vSim, amountDiff, dayDiff };
}

async function processQuarter(quarterArg, minScore, apply) {
  const quarter = QUARTERS[quarterArg];
  if (!quarter) { console.error(`Unknown quarter: ${quarterArg}`); return { matches: [] }; }

  console.log(`\n=== ${quarter.label} ===`);

  // Unreceipted, already-reconciled SPEND transactions
  // (skip BASEXCLUDED line items — those are owner drawings / transfers, not real expenses)
  const txns = await q(`
    SELECT xero_transaction_id, date, contact_name, total::numeric(12,2)
    FROM xero_transactions
    WHERE type = 'SPEND' AND has_attachments = false
      AND date >= '${quarter.start}' AND date <= '${quarter.end}'
      AND NOT (line_items @> '[{"tax_type": "BASEXCLUDED"}]'::jsonb)
  `);
  console.log(`  Unreceipted SPEND (excl. BASEXCLUDED): ${txns.length}`);

  // Stuck receipts in window — require attachment_url because rows without a
  // stored file can't be uploaded to Xero by upload-receipts-to-xero.mjs.
  const stuck = await q(`
    SELECT id, vendor_name, amount_detected::numeric(12,2), received_at,
           status, xero_bank_transaction_id, xero_invoice_id, subject
    FROM receipt_emails
    WHERE status IN ('review', 'captured', 'failed')
      AND received_at >= '${quarter.start}'::date - interval '14 days'
      AND received_at <= '${quarter.end}'::date + interval '30 days'
      AND xero_bank_transaction_id IS NULL
      AND xero_invoice_id IS NULL
      AND attachment_url IS NOT NULL
  `);
  console.log(`  Stuck receipts in window: ${stuck.length}`);

  // For each txn, find best stuck receipt
  const used = new Set();
  const matches = [];

  // Sort txns by value so big-ticket items get first dibs on stuck receipts
  txns.sort((a, b) => Math.abs(Number(b.total)) - Math.abs(Number(a.total)));

  for (const tx of txns) {
    const candidates = stuck
      .filter(r => !used.has(r.id))
      .map(r => ({ receipt: r, ...scoreMatch(r, tx) }))
      .filter(c => c.score >= minScore)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      used.add(best.receipt.id);
      matches.push({ txn: tx, receipt: best.receipt, score: best.score });
    }
  }

  console.log(`  Matches ≥${minScore}%: ${matches.length}`);

  if (matches.length === 0) return { quarter, matches };

  // Show top 5 as preview
  console.log(`  Preview (top 5 by value):`);
  for (const m of matches.slice(0, 5)) {
    console.log(`    ${m.txn.date} ${(m.txn.contact_name || '?').slice(0, 24).padEnd(24)} ${fmt(m.txn.total).padStart(12)}  →  ${(m.receipt.vendor_name || '?').slice(0, 20).padEnd(20)} (${Math.round(m.score)}%)`);
  }

  // Apply
  if (apply) {
    let applied = 0, failed = 0;
    for (const m of matches) {
      const { error } = await sb
        .from('receipt_emails')
        .update({
          status: 'matched',
          xero_bank_transaction_id: m.txn.xero_transaction_id,
          match_confidence: Math.round(m.score),
          match_method: 'link-stuck-receipts',
          updated_at: new Date().toISOString(),
        })
        .eq('id', m.receipt.id);
      if (error) { console.error(`    ❌ ${m.receipt.id}: ${error.message}`); failed++; }
      else applied++;
    }
    console.log(`  ✅ Applied: ${applied}${failed > 0 ? ` (${failed} failed)` : ''}`);
  } else {
    console.log(`  (dry run — pass --apply to write)`);
  }

  return { quarter, matches };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const minScoreIdx = args.indexOf('--min-score');
  const minScore = minScoreIdx !== -1 ? parseInt(args[minScoreIdx + 1], 10) : 80;
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  const quarters = quarterArgs.length > 0 ? quarterArgs : ['Q2', 'Q3'];

  console.log(`Link Stuck Receipts — ${apply ? 'APPLY' : 'DRY RUN'} | min-score ${minScore}% | quarters: ${quarters.join(', ')}`);

  let totalMatches = 0;
  let totalValue = 0;
  for (const q of quarters) {
    const result = await processQuarter(q, minScore, apply);
    totalMatches += result.matches.length;
    totalValue += result.matches.reduce((s, m) => s + Math.abs(Number(m.txn.total)), 0);
  }

  console.log(`\n=== TOTAL ===`);
  console.log(`  Matches: ${totalMatches}`);
  console.log(`  Value:   ${fmt(totalValue)}`);
  console.log(`  GST:     ${fmt(totalValue / 11)} (at stake)`);
  if (apply) {
    console.log(`\n  Next: run "node scripts/upload-receipts-to-xero.mjs" to push attachments to Xero.`);
  } else {
    console.log(`\n  Re-run with --apply to write.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
