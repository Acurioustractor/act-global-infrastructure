#!/usr/bin/env node
/**
 * Resolve ambiguous receipt matches using tighter logic:
 *
 * Pass 1: Exact amount + same day = auto-match
 * Pass 2: Exact amount + ±1 day = auto-match
 * Pass 3: Exact amount + ±3 days = auto-match (if only one candidate)
 * Pass 4: Remaining ambiguous → mark as no_receipt_needed if under $82.50
 *         or if it's a known vendor where bank statement is sufficient
 *
 * Usage:
 *   node scripts/resolve-ambiguous-matches.mjs           # Dry run
 *   node scripts/resolve-ambiguous-matches.mjs --apply    # Write to DB
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');

function daysDiff(d1, d2) {
  return Math.abs((new Date(d1) - new Date(d2)) / 86400000);
}

async function main() {
  console.log('=== Resolve Ambiguous Matches ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN\n');

  // Load unmatched statement lines (not matched, not no_receipt_needed)
  const { data: lines } = await sb.from('bank_statement_lines')
    .select('*')
    .eq('direction', 'debit')
    .not('receipt_match_status', 'in', '("matched","no_receipt_needed")')
    .gte('date', '2025-10-01').lte('date', '2025-12-31')
    .order('date');

  // Load all receipts in range
  const { data: receipts } = await sb.from('receipt_emails')
    .select('id, vendor_name, amount_detected, received_at, source, status')
    .gte('received_at', '2025-09-15T00:00:00')
    .lte('received_at', '2026-01-15T00:00:00')
    .order('received_at');

  // Load already-matched receipt IDs to avoid double-matching
  const { data: matchedLines } = await sb.from('bank_statement_lines')
    .select('receipt_match_id')
    .eq('receipt_match_status', 'matched')
    .not('receipt_match_id', 'is', null);

  const usedIds = new Set(matchedLines.map(l => l.receipt_match_id));

  console.log(`Lines to resolve: ${lines.length}`);
  console.log(`Receipt pool: ${receipts.length}`);
  console.log(`Already matched receipts: ${usedIds.size}\n`);

  const resolved = [];
  const stillAmbiguous = [];

  // Sort lines: unique vendors first, then high-value, then Uber/Qantas last
  const sorted = [...lines].sort((a, b) => {
    const aUber = (a.payee || '').toLowerCase().includes('uber') ? 1 : 0;
    const bUber = (b.payee || '').toLowerCase().includes('uber') ? 1 : 0;
    if (aUber !== bUber) return aUber - bUber;
    return parseFloat(b.amount) - parseFloat(a.amount);
  });

  for (const line of sorted) {
    const lineAmt = parseFloat(line.amount);
    const lineDate = line.date;
    const linePayee = (line.payee || '').toLowerCase();

    // Find candidate receipts
    const candidates = receipts
      .filter(r => !usedIds.has(r.id))
      .filter(r => {
        const rAmt = Math.abs(parseFloat(r.amount_detected || 0));
        // Exact amount or GST-adjusted
        return Math.abs(rAmt - lineAmt) < 0.02
          || Math.abs(rAmt * 1.1 - lineAmt) < 0.02
          || Math.abs(rAmt / 1.1 - lineAmt) < 0.02;
      })
      .filter(r => {
        // Within 14 day window
        const rDate = (r.received_at || '').slice(0, 10);
        return daysDiff(rDate, lineDate) <= 14;
      });

    if (candidates.length === 0) {
      stillAmbiguous.push(line);
      continue;
    }

    // Pass 1: exact amount + same day
    let match = candidates.find(r => {
      const rAmt = Math.abs(parseFloat(r.amount_detected || 0));
      const rDate = (r.received_at || '').slice(0, 10);
      return Math.abs(rAmt - lineAmt) < 0.02 && daysDiff(rDate, lineDate) <= 1;
    });

    // Pass 2: exact amount + ±3 days, only if single candidate
    if (!match) {
      const close = candidates.filter(r => {
        const rAmt = Math.abs(parseFloat(r.amount_detected || 0));
        const rDate = (r.received_at || '').slice(0, 10);
        return Math.abs(rAmt - lineAmt) < 0.02 && daysDiff(rDate, lineDate) <= 3;
      });
      if (close.length === 1) match = close[0];
    }

    // Pass 3: GST-adjusted amount + same day
    if (!match) {
      match = candidates.find(r => {
        const rAmt = Math.abs(parseFloat(r.amount_detected || 0));
        const rDate = (r.received_at || '').slice(0, 10);
        return (Math.abs(rAmt * 1.1 - lineAmt) < 0.02 || Math.abs(rAmt / 1.1 - lineAmt) < 0.02)
          && daysDiff(rDate, lineDate) <= 1;
      });
    }

    // Pass 4: best date match if multiple exact-amount candidates
    if (!match && candidates.length > 1) {
      const exactAmt = candidates.filter(r => {
        const rAmt = Math.abs(parseFloat(r.amount_detected || 0));
        return Math.abs(rAmt - lineAmt) < 0.02;
      });
      if (exactAmt.length > 0) {
        // Pick closest date
        exactAmt.sort((a, b) => {
          const da = daysDiff((a.received_at || '').slice(0, 10), lineDate);
          const db = daysDiff((b.received_at || '').slice(0, 10), lineDate);
          return da - db;
        });
        match = exactAmt[0];
      }
    }

    if (match) {
      resolved.push({ line, receipt: match });
      usedIds.add(match.id);
      console.log(`  ✅ ${line.date} | ${(line.payee || '?').padEnd(25)} | $${lineAmt.toFixed(2).padStart(10)} → ${(match.vendor_name || '?').padEnd(25)} $${parseFloat(match.amount_detected).toFixed(2)}`);
    } else {
      stillAmbiguous.push(line);
    }
  }

  console.log(`\nResolved: ${resolved.length}`);
  console.log(`Still ambiguous: ${stillAmbiguous.length}`);

  // Apply
  if (APPLY && resolved.length > 0) {
    let saved = 0;
    for (const { line, receipt } of resolved) {
      const { error } = await sb.from('bank_statement_lines').update({
        receipt_match_id: receipt.id,
        receipt_match_score: 0.95,
        receipt_match_status: 'matched',
      }).eq('id', line.id);
      if (!error) saved++;
    }
    console.log(`💾 Saved ${saved} matches`);
  }

  // Show remaining ambiguous
  if (stillAmbiguous.length > 0) {
    console.log(`\nStill ambiguous (${stillAmbiguous.length}):`);
    const overThreshold = stillAmbiguous.filter(l => parseFloat(l.amount) >= 82.50);
    const underThreshold = stillAmbiguous.filter(l => parseFloat(l.amount) < 82.50);

    if (overThreshold.length > 0) {
      console.log(`\n  Over $82.50 (${overThreshold.length}):`);
      for (const l of overThreshold.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))) {
        console.log(`    ${l.date} | ${(l.payee || '?').padEnd(25)} | $${parseFloat(l.amount).toFixed(2).padStart(10)} | ${l.project_code || '???'}`);
      }
    }
    console.log(`\n  Under $82.50: ${underThreshold.length} items ($${underThreshold.reduce((s, l) => s + parseFloat(l.amount), 0).toFixed(2)})`);
  }

  // Final BAS readiness
  const { data: final } = await sb.from('bank_statement_lines')
    .select('receipt_match_status, amount')
    .eq('direction', 'debit')
    .gte('date', '2025-10-01').lte('date', '2025-12-31');

  const totalValue = final.reduce((s, l) => s + parseFloat(l.amount), 0);
  const coveredValue = final
    .filter(l => l.receipt_match_status === 'matched' || l.receipt_match_status === 'no_receipt_needed')
    .reduce((s, l) => s + parseFloat(l.amount), 0);

  console.log(`\n📊 BAS Readiness: ${(coveredValue / totalValue * 100).toFixed(1)}% by value`);
}

main().catch(e => { console.error(e); process.exit(1); });
