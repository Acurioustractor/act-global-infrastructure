#!/usr/bin/env node
/**
 * Backfill Stranded Dext Links — for each dext_import receipt with
 * status='uploaded' and NO Xero linkage, find the matching Xero entity by
 * vendor + amount + date and populate the linkage column.
 *
 * Why: Dext's direct-to-Xero integration pushed ~903 receipts to Xero before
 * we built the receipt_emails tracking. The rows exist in our DB but the
 * xero_*_id columns are NULL, making them invisible to matchers and BAS reports.
 *
 * Safe: only WRITES to receipt_emails (linkage columns). Never touches Xero.
 * Idempotent: --apply twice is fine, only updates rows still missing linkage.
 *
 * Usage:
 *   node scripts/backfill-stranded-dext-links.mjs                # dry run
 *   node scripts/backfill-stranded-dext-links.mjs --apply        # write linkage
 *   node scripts/backfill-stranded-dext-links.mjs --apply --limit 50
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;

// Vendor name normalization for fuzzy matching
function normalize(s) {
  return (s || '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(pty|ltd|limited|inc|corp|llc|the|and)\b/g, '')
    .trim();
}

function vendorMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Token containment: at least one significant token (>3 chars) shared
  const ta = na.split(' ').filter(t => t.length > 3);
  const tb = nb.split(' ').filter(t => t.length > 3);
  return ta.some(t => tb.includes(t)) || nb.includes(na) || na.includes(nb);
}

function amountClose(a, b, tolerance = 0.01) {
  if (a == null || b == null) return false;
  const diff = Math.abs(Math.abs(a) - Math.abs(b));
  return diff <= tolerance;
}

function dateWithinDays(a, b, days = 3) {
  if (!a || !b) return false;
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return ms <= days * 86400000;
}

async function main() {
  console.log('=== Backfill Stranded Dext Links ===');
  console.log(APPLY ? 'MODE: APPLY (writes linkage)' : 'MODE: dry run');

  // 1. Load stranded receipts (paginated)
  const stranded = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('receipt_emails')
      .select('id, vendor_name, amount_detected, received_at, dext_item_id')
      .eq('source', 'dext_import')
      .eq('status', 'uploaded')
      .is('xero_transaction_id', null)
      .is('xero_bank_transaction_id', null)
      .is('xero_invoice_id', null)
      .order('received_at', { ascending: false })
      .range(from, from + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data || data.length === 0) break;
    stranded.push(...data);
    if (data.length < 1000) break;
    from += 1000;
    if (LIMIT && stranded.length >= LIMIT) break;
  }
  const candidates = LIMIT ? stranded.slice(0, LIMIT) : stranded;
  console.log(`Stranded rows to backfill: ${candidates.length}`);

  if (candidates.length === 0) { console.log('Nothing to do.'); return; }

  // 2. Load Xero match targets — only ones with attachments confirmed
  // (a stranded receipt should match against a Xero entity that already has its receipt)
  const txns = [];
  let p = 0;
  while (true) {
    const { data } = await sb.from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, has_attachments, type')
      .in('type', ['SPEND', 'ACCPAY'])
      .eq('has_attachments', true)
      .gte('date', '2024-01-01')
      .order('date', { ascending: false })
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    txns.push(...data);
    if (data.length < 1000) break;
    p++;
  }
  console.log(`Xero SPEND/ACCPAY targets (with attachments): ${txns.length}`);

  const invoices = [];
  p = 0;
  while (true) {
    const { data } = await sb.from('xero_invoices')
      .select('xero_id, contact_name, total, date, has_attachments, type')
      .eq('type', 'ACCPAY')
      .eq('has_attachments', true)
      .gte('date', '2024-01-01')
      .order('date', { ascending: false })
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    invoices.push(...data);
    if (data.length < 1000) break;
    p++;
  }
  console.log(`Xero ACCPAY invoices (with attachments): ${invoices.length}`);

  // 3. Match each stranded receipt
  const matched = [];      // exact: 1 vendor+amount+date hit
  const ambiguous = [];    // multi-hit
  const noMatch = [];

  for (const r of candidates) {
    if (!r.amount_detected || r.amount_detected === 0) {
      noMatch.push({ ...r, reason: 'no amount' });
      continue;
    }
    // Search across both txns and invoices
    const txHits = txns.filter(t =>
      vendorMatch(r.vendor_name, t.contact_name) &&
      amountClose(r.amount_detected, t.total) &&
      dateWithinDays(r.received_at, t.date, 3)
    );
    const invHits = invoices.filter(i =>
      vendorMatch(r.vendor_name, i.contact_name) &&
      amountClose(r.amount_detected, i.total) &&
      dateWithinDays(r.received_at, i.date, 3)
    );
    const total = txHits.length + invHits.length;
    if (total === 1) {
      const isInv = invHits.length === 1;
      matched.push({
        receipt: r,
        target: isInv ? invHits[0] : txHits[0],
        kind: isInv ? 'invoice' : 'txn',
      });
    } else if (total === 0) {
      // Try wider date window (±7d) for fallback
      const txHits2 = txns.filter(t =>
        vendorMatch(r.vendor_name, t.contact_name) &&
        amountClose(r.amount_detected, t.total) &&
        dateWithinDays(r.received_at, t.date, 7)
      );
      const invHits2 = invoices.filter(i =>
        vendorMatch(r.vendor_name, i.contact_name) &&
        amountClose(r.amount_detected, i.total) &&
        dateWithinDays(r.received_at, i.date, 7)
      );
      if (txHits2.length + invHits2.length === 1) {
        const isInv = invHits2.length === 1;
        matched.push({
          receipt: r,
          target: isInv ? invHits2[0] : txHits2[0],
          kind: isInv ? 'invoice' : 'txn',
          fallback: '±7d',
        });
      } else if (txHits2.length + invHits2.length > 1) {
        ambiguous.push({ receipt: r, hits: txHits2.length + invHits2.length });
      } else {
        noMatch.push({ ...r, reason: 'no Xero counterpart found' });
      }
    } else {
      ambiguous.push({ receipt: r, hits: total });
    }
  }

  console.log(`\nResults:`);
  console.log(`  ✅ Matched (1 hit): ${matched.length}`);
  console.log(`  ⚠️  Ambiguous (>1 hit): ${ambiguous.length}`);
  console.log(`  ❌ No match: ${noMatch.length}`);

  // Top no-match reasons
  const noAmount = noMatch.filter(n => n.reason === 'no amount').length;
  console.log(`     no amount: ${noAmount}`);
  console.log(`     no Xero counterpart: ${noMatch.length - noAmount}`);

  if (APPLY && matched.length > 0) {
    console.log(`\nApplying ${matched.length} link backfills...`);
    let done = 0, failed = 0;
    for (const { receipt, target, kind } of matched) {
      const update = kind === 'invoice'
        ? { xero_invoice_id: target.xero_id }
        : { xero_bank_transaction_id: target.xero_transaction_id };
      const { error } = await sb.from('receipt_emails').update(update).eq('id', receipt.id);
      if (error) { failed++; console.error(`  FAIL ${receipt.vendor_name}: ${error.message}`); }
      else done++;
      if ((done + failed) % 50 === 0) console.log(`  ${done + failed}/${matched.length}`);
    }
    console.log(`Applied: ${done} | Failed: ${failed}`);
  } else if (matched.length > 0) {
    console.log(`\nDry run — re-run with --apply to write ${matched.length} link backfills.`);
  }

  // Write report
  const reportPath = `thoughts/shared/reports/backfill-stranded-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [
    `# Stranded Dext Receipts — Backfill Report`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Mode:** ${APPLY ? 'APPLIED' : 'dry run'}`,
    ``,
    `## Summary`,
    `- Stranded rows examined: ${candidates.length}`,
    `- Matched 1:1: ${matched.length}`,
    `- Ambiguous (>1 Xero hit): ${ambiguous.length}`,
    `- No match: ${noMatch.length}`,
    ``,
    `## Sample matches (first 20)`,
    ...matched.slice(0, 20).map(m => `- ${m.receipt.vendor_name} $${m.receipt.amount_detected} ${(m.receipt.received_at || '').slice(0,10)} → ${m.kind}: ${m.target.contact_name} ${m.target.date} ${m.fallback || ''}`),
    ``,
    `## Ambiguous (need human eyeball)`,
    ...ambiguous.slice(0, 30).map(a => `- ${a.receipt.vendor_name} $${a.receipt.amount_detected} ${(a.receipt.received_at || '').slice(0,10)} — ${a.hits} candidates`),
    ``,
    `## No-match (no Xero counterpart)`,
    ...noMatch.filter(n => n.reason !== 'no amount').slice(0, 40).map(n => `- ${n.vendor_name} $${n.amount_detected} ${(n.received_at || '').slice(0,10)}`),
  ];
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
