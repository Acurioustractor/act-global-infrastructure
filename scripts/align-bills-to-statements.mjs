#!/usr/bin/env node
/**
 * Align Xero bills (ACCPAY with attachments) to bank statement lines.
 *
 * Bills created by the Xero app, connectors (Qantas/Uber/etc), or Dext
 * have receipts attached. This script matches them to bank_statement_lines
 * so those lines are marked as receipted.
 *
 * Also matches receipt_emails to BSL lines for completeness.
 *
 * Usage:
 *   node scripts/align-bills-to-statements.mjs              # Dry run
 *   node scripts/align-bills-to-statements.mjs --apply       # Write matches to DB
 *   node scripts/align-bills-to-statements.mjs --verbose      # Show all scoring details
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

// ── Matching functions (reused from reconciliation-report.mjs) ───

function bigrams(str) {
  const s = (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pairs = [];
  for (let i = 0; i < s.length - 1; i++) pairs.push(s.slice(i, i + 2));
  return pairs;
}

function similarity(a, b) {
  const ba = bigrams(a);
  const bb = bigrams(b);
  if (!ba.length || !bb.length) return 0;
  const setB = new Set(bb);
  const matches = ba.filter(p => setB.has(p)).length;
  return (2 * matches) / (ba.length + bb.length);
}

function vendorScore(candidateVendor, statementPayee, statementParticulars) {
  const cv = (candidateVendor || '').toLowerCase();
  const sp = (statementPayee || '').toLowerCase();
  const spart = (statementParticulars || '').toLowerCase();

  if (spart.includes(cv) || cv.includes(sp)) return 1.0;
  if (sp.includes(cv) || cv.includes(sp)) return 0.95;

  const s1 = similarity(cv, sp);
  const s2 = similarity(cv, spart);
  return Math.max(s1, s2);
}

function dateScore(candidateDate, statementDate) {
  if (!candidateDate || !statementDate) return 0;
  const cd = new Date(candidateDate);
  const sd = new Date(statementDate);
  const daysDiff = Math.abs((cd - sd) / 86400000);
  if (daysDiff <= 1) return 1.0;
  if (daysDiff <= 3) return 0.9;
  if (daysDiff <= 7) return 0.7;
  if (daysDiff <= 14) return 0.4;
  if (daysDiff <= 30) return 0.1;
  return 0;
}

function amountScore(candidateAmt, statementAmt) {
  const c = Math.abs(parseFloat(candidateAmt || 0));
  const s = Math.abs(parseFloat(statementAmt || 0));
  if (!c || !s) return 0;
  if (Math.abs(c - s) < 0.01) return 1.0;

  // GST tolerance
  const cWithGST = c * 1.1;
  const cWithoutGST = c / 1.1;
  if (Math.abs(cWithGST - s) / s < 0.02) return 0.95;
  if (Math.abs(cWithoutGST - s) / s < 0.02) return 0.95;

  const pctDiff = Math.abs(c - s) / Math.max(c, s);
  if (pctDiff < 0.05) return 0.8;
  if (pctDiff < 0.10) return 0.5;
  if (pctDiff < 0.20) return 0.2;
  return 0;
}

function compositeScore(candidate, line) {
  const v = vendorScore(candidate.vendor, line.payee, line.particulars);
  const d = dateScore(candidate.date, line.date);
  const a = amountScore(candidate.amount, line.amount);

  // Weight: amount 40%, vendor 35%, date 25%
  return (a * 0.40) + (v * 0.35) + (d * 0.25);
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔗 Bill-to-Statement Alignment${APPLY ? ' (APPLYING)' : ' (DRY RUN)'}\n`);

  // Load unmatched BSL lines (paginate past 1000-row cap)
  const lines = [];
  let pg = 0;
  while (true) {
    const { data: batch } = await sb.from('bank_statement_lines')
      .select('id, date, payee, particulars, amount, project_code, receipt_match_status, receipt_match_id')
      .eq('direction', 'debit')
      .eq('receipt_match_status', 'unmatched')
      .order('amount', { ascending: true })
      .range(pg * 1000, (pg + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    lines.push(...batch);
    if (batch.length < 1000) break;
    pg++;
  }

  console.log(`📋 ${lines.length} unmatched statement lines\n`);
  if (lines.length === 0) {
    console.log('✅ Nothing to align');
    return;
  }

  // Load ACCPAY bills with attachments (these ARE receipts)
  const { data: bills } = await sb.from('xero_invoices')
    .select('id, xero_id, contact_name, total, date, has_attachments, invoice_number, status')
    .eq('type', 'ACCPAY')
    .eq('has_attachments', true)
    .neq('status', 'VOIDED')
    .gte('date', '2025-07-01')
    .order('date', { ascending: false })
    .limit(1000);

  // Load receipt_emails
  const { data: receipts } = await sb.from('receipt_emails')
    .select('id, vendor_name, amount_detected, received_at, source, status')
    .gte('received_at', '2025-07-01')
    .not('status', 'in', '("duplicate","junk")')
    .order('received_at', { ascending: false })
    .limit(2000);

  console.log(`📦 ${bills.length} bills with attachments, ${receipts.length} receipt emails\n`);

  // Build candidates from both sources
  const candidates = [];

  for (const bill of bills) {
    candidates.push({
      type: 'bill',
      id: bill.id,
      xeroId: bill.xero_id,
      vendor: bill.contact_name,
      amount: Math.abs(parseFloat(bill.total)),
      date: bill.date,
      label: `Bill ${bill.invoice_number || bill.xero_id} — ${bill.contact_name}`,
    });
  }

  for (const receipt of receipts) {
    candidates.push({
      type: 'receipt_email',
      id: receipt.id,
      vendor: receipt.vendor_name,
      amount: parseFloat(receipt.amount_detected || 0),
      date: receipt.received_at,
      label: `Receipt: ${receipt.vendor_name} $${receipt.amount_detected} (${receipt.source})`,
    });
  }

  // Match each unmatched line against all candidates
  const matched = [];
  const ambiguous = [];
  const unresolved = [];
  const usedCandidates = new Set(); // 1:1 matching — each candidate used once

  // Sort lines by amount desc (match highest-value items first)
  const sortedLines = [...lines].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  for (const line of sortedLines) {
    // Score all unused candidates
    const scored = candidates
      .filter(c => !usedCandidates.has(`${c.type}:${c.id}`))
      .map(c => ({
        ...c,
        score: compositeScore(c, line),
      }))
      .filter(c => c.score > 0.3)
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const amt = Math.abs(parseFloat(line.amount));

    if (best && best.score >= 0.75) {
      matched.push({ line, candidate: best, score: best.score });
      usedCandidates.add(`${best.type}:${best.id}`);

      if (VERBOSE) {
        console.log(`  ✅ ${line.date} ${(line.payee || '?').padEnd(25)} $${amt.toFixed(2).padStart(10)}`);
        console.log(`     → ${best.label} (score: ${best.score.toFixed(2)})`);
      }
    } else if (best && best.score >= 0.45) {
      ambiguous.push({
        line,
        candidates: scored.slice(0, 3),
      });

      if (VERBOSE) {
        console.log(`  ⚡ ${line.date} ${(line.payee || '?').padEnd(25)} $${amt.toFixed(2).padStart(10)}`);
        for (const c of scored.slice(0, 3)) {
          console.log(`     ? ${c.label} (score: ${c.score.toFixed(2)})`);
        }
      }
    } else {
      unresolved.push({ line, topCandidate: best || null });

      if (VERBOSE) {
        console.log(`  ❌ ${line.date} ${(line.payee || '?').padEnd(25)} $${amt.toFixed(2).padStart(10)}`);
        if (best) console.log(`     best: ${best.label} (score: ${best.score.toFixed(2)} — too low)`);
        else console.log(`     no candidates found`);
      }
    }
  }

  // Summary
  const matchedValue = matched.reduce((s, m) => s + Math.abs(parseFloat(m.line.amount)), 0);
  const ambigValue = ambiguous.reduce((s, m) => s + Math.abs(parseFloat(m.line.amount)), 0);
  const unresolvedValue = unresolved.reduce((s, m) => s + Math.abs(parseFloat(m.line.amount)), 0);

  console.log(`\n── Results ──`);
  console.log(`  ✅ Matched:    ${matched.length} lines ($${matchedValue.toFixed(0)})`);
  console.log(`  ⚡ Ambiguous:  ${ambiguous.length} lines ($${ambigValue.toFixed(0)})`);
  console.log(`  ❌ Unresolved: ${unresolved.length} lines ($${unresolvedValue.toFixed(0)})`);

  // Bill vs receipt_email breakdown
  const billMatches = matched.filter(m => m.candidate.type === 'bill').length;
  const receiptMatches = matched.filter(m => m.candidate.type === 'receipt_email').length;
  console.log(`  📦 From bills: ${billMatches} | From receipt emails: ${receiptMatches}`);

  // Apply matches
  if (APPLY && matched.length > 0) {
    console.log(`\n💾 Applying ${matched.length} matches...`);
    let applied = 0;

    for (const { line, candidate, score } of matched) {
      const updates = {
        receipt_match_status: 'matched',
        receipt_match_score: score,
      };

      if (candidate.type === 'bill') {
        updates.receipt_match_id = candidate.id;
        updates.notes = `Matched to bill ${candidate.label}`;
      } else {
        updates.receipt_match_id = candidate.id;
        updates.notes = `Matched to ${candidate.label}`;
      }

      const { error } = await sb.from('bank_statement_lines')
        .update(updates)
        .eq('id', line.id);

      if (!error) applied++;
      else console.log(`  ⚠️  Failed to update ${line.id}: ${error.message}`);
    }

    console.log(`  ✅ Applied ${applied}/${matched.length} matches`);
  }

  // Show unresolved for chase list
  if (unresolved.length > 0 && !VERBOSE) {
    console.log(`\n── Unresolved (need manual action) ──`);
    for (const { line } of unresolved.slice(0, 15)) {
      const amt = Math.abs(parseFloat(line.amount));
      console.log(`  ${line.date} ${(line.payee || '?').padEnd(25)} $${amt.toFixed(2).padStart(10)} ${line.project_code || '???'}`);
    }
    if (unresolved.length > 15) console.log(`  ... +${unresolved.length - 15} more`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
