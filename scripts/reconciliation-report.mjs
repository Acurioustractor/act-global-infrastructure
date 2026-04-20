#!/usr/bin/env node
/**
 * Reconciliation Report — the ONE script to run before going into Xero.
 *
 * Output:
 *   1. READY TO RECONCILE — matched to receipt, just approve in Xero
 *   2. NEED RECEIPTS — charges over $82.50 with no receipt match
 *   3. NO RECEIPT NEEDED — bank fees, small subs, transfers
 *   4. Summary stats + BAS readiness score
 *
 * Usage:
 *   node scripts/reconciliation-report.mjs                    # Current quarter
 *   node scripts/reconciliation-report.mjs --quarter Q2       # Specific quarter
 *   node scripts/reconciliation-report.mjs --match            # Run matcher first then report
 *   node scripts/reconciliation-report.mjs --match --apply    # Match + save to DB + report
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const GST_THRESHOLD = 82.50;
const MATCH_THRESHOLD = 0.70;
const AMBIGUOUS_THRESHOLD = 0.45;

const args = process.argv.slice(2);
const RUN_MATCHER = args.includes('--match');
const APPLY = args.includes('--apply');
const quarterArg = args.find(a => a.startsWith('Q'))?.replace('--quarter', '').trim();

// Determine quarter date range
function getQuarterDates(q) {
  const now = new Date();
  const fy = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const quarters = {
    Q1: [`${fy - 1}-07-01`, `${fy - 1}-09-30`],
    Q2: [`${fy - 1}-10-01`, `${fy - 1}-12-31`],
    Q3: [`${fy}-01-01`, `${fy}-03-31`],
    Q4: [`${fy}-04-01`, `${fy}-06-30`],
  };
  return quarters[q] || quarters.Q2; // Default Q2 for now since that's what we have
}

const quarter = quarterArg || 'Q2';
const [fromDate, toDate] = getQuarterDates(quarter);

// ============================================================================
// Matching engine
// ============================================================================

// Dice coefficient on bigrams for fuzzy vendor matching
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

function vendorScore(receiptVendor, statementPayee, statementParticulars) {
  const rv = (receiptVendor || '').toLowerCase();
  const sp = (statementPayee || '').toLowerCase();
  const spart = (statementParticulars || '').toLowerCase();

  // Direct contains
  if (spart.includes(rv) || rv.includes(sp)) return 1.0;
  if (sp.includes(rv) || rv.includes(sp)) return 0.95;

  // Bigram similarity
  const s1 = similarity(rv, sp);
  const s2 = similarity(rv, spart);
  return Math.max(s1, s2);
}

function dateScore(receiptDate, statementDate) {
  if (!receiptDate || !statementDate) return 0;
  const rd = new Date(receiptDate);
  const sd = new Date(statementDate);
  const daysDiff = Math.abs((rd - sd) / 86400000);
  if (daysDiff <= 1) return 1.0;
  if (daysDiff <= 3) return 0.9;
  if (daysDiff <= 7) return 0.7;
  if (daysDiff <= 14) return 0.4;
  return 0;
}

function amountScore(receiptAmt, statementAmt) {
  const r = Math.abs(parseFloat(receiptAmt || 0));
  const s = Math.abs(parseFloat(statementAmt || 0));
  if (!r || !s) return 0;
  if (Math.abs(r - s) < 0.01) return 1.0;

  // GST tolerance — receipt might be ex GST, charge is inc
  const rWithGST = r * 1.1;
  const rWithoutGST = r / 1.1;
  if (Math.abs(rWithGST - s) / s < 0.02) return 0.95;
  if (Math.abs(rWithoutGST - s) / s < 0.02) return 0.95;

  // Percentage difference
  const pctDiff = Math.abs(r - s) / Math.max(r, s);
  if (pctDiff < 0.05) return 0.8;
  if (pctDiff < 0.10) return 0.5;
  if (pctDiff < 0.20) return 0.2;
  return 0;
}

function compositeScore(receipt, line) {
  const v = vendorScore(receipt.vendor_name, line.payee, line.particulars);
  const d = dateScore(receipt.received_at, line.date);
  const a = amountScore(receipt.amount_detected, line.amount);

  // For high-frequency vendors (Uber, Qantas), amount+date precision matters more
  const highFreq = ['uber', 'qantas', 'webflow', 'bunnings'];
  const isHighFreq = highFreq.some(hf => (line.payee || '').toLowerCase().includes(hf));

  if (isHighFreq && v >= 0.8) {
    // Vendor is already confirmed — weight amount and date much higher
    // Exact amount + same day = near certain match
    return (v * 0.15) + (d * 0.35) + (a * 0.50);
  }

  return (v * 0.35) + (d * 0.25) + (a * 0.40);
}

// ============================================================================
// No-receipt-needed classifier
// ============================================================================

function isNoReceiptNeeded(line, subscriptions) {
  // Bank fees and transfers
  if (line.receipt_match_status === 'no_receipt_needed') return true;

  const p = (line.particulars || '').toUpperCase();
  const payee = (line.payee || '').toUpperCase();

  // Bank fees
  if (p.includes('NAB INTNL TRAN FEE') || p.includes('INTEREST ON CASH') || p.includes('C ADV INTERNET TFR')) return true;

  // Transfers
  if (line.direction === 'credit') return true;

  // Under $10 micro-charges
  if (parseFloat(line.amount) < 10 && (payee.includes('GOPAYID') || payee.includes('GOJEK'))) return true;

  // Subscription with no_receipt_needed flag
  for (const sub of subscriptions) {
    if (p.includes(sub.vendor_pattern.toUpperCase()) && sub.no_receipt_needed) return true;
  }

  // Under GST threshold and a known low-value category
  if (parseFloat(line.amount) < GST_THRESHOLD) {
    const lowValue = ['CAFE', 'COFFEE', 'ESPRESSO', 'BAKERY', 'PIE GUY', 'SUSHI', 'GELATO',
      'IGA', 'WOOLWORTHS', 'COLES', 'ALDI', 'NIGHTOWL', 'BP ', 'LIBERTY', 'AMPOL',
      'KMART', 'TARGET', 'RELAY'];
    if (lowValue.some(lv => p.includes(lv) || payee.includes(lv))) return true;
  }

  return false;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  RECONCILIATION REPORT — ${quarter} FY26 (${fromDate} to ${toDate})`);
  console.log(`${'='.repeat(70)}\n`);

  // Load data (paginate past Supabase 1000-row default)
  const lines = [];
  let page = 0;
  while (true) {
    const { data: batch } = await sb.from('bank_statement_lines')
      .select('*')
      .gte('date', fromDate).lte('date', toDate)
      .eq('direction', 'debit')
      .order('date')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    lines.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }

  const receipts = [];
  page = 0;
  while (true) {
    const { data: batch } = await sb.from('receipt_emails')
      .select('id, vendor_name, amount_detected, received_at, source, status, attachment_url')
      .gte('received_at', new Date(new Date(fromDate) - 14 * 86400000).toISOString())
      .lte('received_at', new Date(new Date(toDate).getTime() + 14 * 86400000).toISOString())
      .order('received_at')
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!batch || batch.length === 0) break;
    receipts.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }

  const { data: subscriptions } = await sb.from('subscription_patterns')
    .select('*').eq('active', true);

  console.log(`Loaded: ${lines.length} debit lines, ${receipts.length} receipts, ${subscriptions.length} subscription patterns\n`);

  // ============================================================================
  // Step 1: Classify no-receipt-needed
  // ============================================================================
  const noReceiptNeeded = [];
  const needsProcessing = [];

  for (const line of lines) {
    if (isNoReceiptNeeded(line, subscriptions)) {
      noReceiptNeeded.push(line);
    } else {
      needsProcessing.push(line);
    }
  }

  // ============================================================================
  // Step 2: Match remaining lines to receipts
  // ============================================================================
  const matched = [];
  const ambiguous = [];
  const unmatched = [];
  const usedReceiptIds = new Set();

  // Sort: process high-value unique items first (better matches), Uber/small last
  const sortedForMatching = [...needsProcessing].sort((a, b) => {
    const aFreq = ['uber', 'qantas'].some(v => (a.payee || '').toLowerCase().includes(v)) ? 1 : 0;
    const bFreq = ['uber', 'qantas'].some(v => (b.payee || '').toLowerCase().includes(v)) ? 1 : 0;
    if (aFreq !== bFreq) return aFreq - bFreq; // unique vendors first
    return parseFloat(b.amount) - parseFloat(a.amount); // then by amount desc
  });

  for (const line of sortedForMatching) {
    // Already matched?
    if (line.receipt_match_status === 'matched' && line.receipt_match_id) {
      matched.push({ line, receipt: null, score: line.receipt_match_score, preMatched: true });
      usedReceiptIds.add(line.receipt_match_id);
      continue;
    }

    // Score all receipts
    const la = parseFloat(line.amount);
    const candidates = receipts
      .filter(r => !usedReceiptIds.has(r.id))
      .filter(r => {
        // Quick pre-filter: amount within 50% (or GST-adjusted)
        const ra = Math.abs(parseFloat(r.amount_detected || 0));
        if (!ra || !la) return false;
        return Math.abs(ra - la) / Math.max(ra, la) < 0.50 || Math.abs(ra * 1.1 - la) / la < 0.50;
      })
      .map(r => ({ receipt: r, score: compositeScore(r, line) }))
      .filter(c => c.score >= AMBIGUOUS_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0 && candidates[0].score >= MATCH_THRESHOLD) {
      matched.push({ line, receipt: candidates[0].receipt, score: candidates[0].score });
      usedReceiptIds.add(candidates[0].receipt.id);
    } else if (candidates.length > 0) {
      ambiguous.push({ line, candidates: candidates.slice(0, 3) });
    } else {
      unmatched.push(line);
    }
  }

  // ============================================================================
  // Step 3: Save matches to DB if --apply
  // ============================================================================
  if (APPLY && RUN_MATCHER) {
    let saved = 0;
    for (const m of matched) {
      if (m.preMatched) continue;
      const { error } = await sb.from('bank_statement_lines').update({
        receipt_match_id: m.receipt.id,
        receipt_match_score: m.score,
        receipt_match_status: 'matched',
      }).eq('id', m.line.id);
      if (!error) saved++;
    }

    for (const line of noReceiptNeeded) {
      if (line.receipt_match_status !== 'no_receipt_needed') {
        await sb.from('bank_statement_lines').update({
          receipt_match_status: 'no_receipt_needed',
        }).eq('id', line.id);
      }
    }

    console.log(`💾 Saved ${saved} matches to database\n`);
  }

  // ============================================================================
  // Step 4: Report
  // ============================================================================

  // --- READY TO RECONCILE ---
  console.log(`${'─'.repeat(70)}`);
  console.log(`  ✅ READY TO RECONCILE — just approve in Xero (${matched.length} items)`);
  console.log(`${'─'.repeat(70)}`);
  const matchedByDate = matched.sort((a, b) => a.line.date.localeCompare(b.line.date));
  let matchedTotal = 0;
  for (const m of matchedByDate) {
    const amt = parseFloat(m.line.amount);
    matchedTotal += amt;
    const score = (m.score * 100).toFixed(0);
    const vendor = (m.receipt?.vendor_name || 'pre-matched').padEnd(30);
    console.log(`  ${m.line.date} | ${m.line.payee?.padEnd(30) || '?'.padEnd(30)} | $${amt.toFixed(2).padStart(10)} | ${score}% match → ${vendor}`);
  }
  console.log(`  ${'─'.repeat(66)}`);
  console.log(`  TOTAL: $${matchedTotal.toFixed(2)}\n`);

  // --- NEED RECEIPTS ---
  const needReceipts = unmatched.filter(l => parseFloat(l.amount) >= GST_THRESHOLD);
  const smallUnmatched = unmatched.filter(l => parseFloat(l.amount) < GST_THRESHOLD);

  console.log(`${'─'.repeat(70)}`);
  console.log(`  🔴 NEED RECEIPTS BEFORE RECONCILING (${needReceipts.length} items over $${GST_THRESHOLD})`);
  console.log(`${'─'.repeat(70)}`);
  let needReceiptsTotal = 0;
  for (const line of needReceipts.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))) {
    const amt = parseFloat(line.amount);
    needReceiptsTotal += amt;
    const proj = (line.project_code || '???').padEnd(8);
    console.log(`  ${line.date} | ${(line.payee || '?').padEnd(30)} | $${amt.toFixed(2).padStart(10)} | ${proj} | ${(line.particulars || '').slice(0, 40)}`);
  }
  console.log(`  ${'─'.repeat(66)}`);
  console.log(`  TOTAL: $${needReceiptsTotal.toFixed(2)}\n`);

  // --- AMBIGUOUS ---
  if (ambiguous.length > 0) {
    console.log(`${'─'.repeat(70)}`);
    console.log(`  🟡 AMBIGUOUS — need human check (${ambiguous.length} items)`);
    console.log(`${'─'.repeat(70)}`);
    for (const a of ambiguous.slice(0, 20)) {
      console.log(`  ${a.line.date} | ${(a.line.payee || '?').padEnd(25)} | $${parseFloat(a.line.amount).toFixed(2).padStart(10)}`);
      for (const c of a.candidates) {
        console.log(`    → ${(c.receipt.vendor_name || '?').padEnd(25)} $${parseFloat(c.receipt.amount_detected).toFixed(2).padStart(10)} (${(c.score * 100).toFixed(0)}%)`);
      }
    }
    console.log();
  }

  // --- NO RECEIPT NEEDED ---
  console.log(`${'─'.repeat(70)}`);
  console.log(`  ⬜ NO RECEIPT NEEDED (${noReceiptNeeded.length} items — fees, transfers, small subs)`);
  console.log(`${'─'.repeat(70)}`);
  let noReceiptTotal = 0;
  for (const line of noReceiptNeeded) {
    noReceiptTotal += parseFloat(line.amount);
  }
  console.log(`  TOTAL: $${noReceiptTotal.toFixed(2)} across ${noReceiptNeeded.length} items (bank fees, transfers, micro-charges, small subs)\n`);

  // --- SMALL UNMATCHED (under threshold, low priority) ---
  if (smallUnmatched.length > 0) {
    let smallTotal = 0;
    smallUnmatched.forEach(l => smallTotal += parseFloat(l.amount));
    console.log(`  ℹ️  ${smallUnmatched.length} unmatched items under $${GST_THRESHOLD} ($${smallTotal.toFixed(2)} total) — low priority\n`);
  }

  // ============================================================================
  // BAS READINESS SCORE
  // ============================================================================
  const totalDebits = lines.length;
  const totalValue = lines.reduce((s, l) => s + parseFloat(l.amount), 0);

  const coveredCount = matched.length + noReceiptNeeded.length;
  const coveredValue = matchedTotal + noReceiptTotal;

  const pctCount = ((coveredCount / totalDebits) * 100).toFixed(1);
  const pctValue = ((coveredValue / totalValue) * 100).toFixed(1);

  console.log(`${'='.repeat(70)}`);
  console.log(`  BAS READINESS — ${quarter} FY26`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Coverage by count:  ${coveredCount}/${totalDebits} = ${pctCount}%`);
  console.log(`  Coverage by value:  $${coveredValue.toFixed(2)}/$${totalValue.toFixed(2)} = ${pctValue}%`);
  console.log();
  console.log(`  ✅ Matched to receipt:    ${matched.length} items ($${matchedTotal.toFixed(2)})`);
  console.log(`  ⬜ No receipt needed:      ${noReceiptNeeded.length} items ($${noReceiptTotal.toFixed(2)})`);
  console.log(`  🔴 Missing receipt (>$${GST_THRESHOLD}): ${needReceipts.length} items ($${needReceiptsTotal.toFixed(2)})`);
  console.log(`  🟡 Ambiguous:             ${ambiguous.length} items`);
  console.log(`  ℹ️  Small unmatched:       ${smallUnmatched.length} items`);
  console.log();

  // Project breakdown
  console.log(`  BY PROJECT:`);
  const byProject = {};
  for (const line of lines) {
    const p = line.project_code || 'UNTAGGED';
    if (!byProject[p]) byProject[p] = { count: 0, total: 0 };
    byProject[p].count++;
    byProject[p].total += parseFloat(line.amount);
  }
  for (const [proj, data] of Object.entries(byProject).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`    ${proj.padEnd(12)} ${String(data.count).padStart(4)} items  $${data.total.toFixed(2).padStart(12)}`);
  }

  console.log(`\n${'='.repeat(70)}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
