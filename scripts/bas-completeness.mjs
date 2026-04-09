#!/usr/bin/env node
/**
 * BAS Completeness Classifier — for a given quarter, classifies every
 * AUTHORISED SPEND transaction into one of 7 coverage paths:
 *
 *   1. DIRECT              — attachment on the bank txn itself
 *   2. BILL_LINKED         — paired with an ACCPAY bill that has an attachment
 *                            (via sync-bill-attachments heuristic: vendor + date ± 14d + amount match)
 *   3. FILES_LIBRARY       — receipt in Xero Files library references this txn
 *                            (requires xero-files-library-scan.mjs to populate a lookup)
 *   4. POOL_MATCH          — receipt_emails row links to this txn
 *   5. GMAIL_RAW           — gmail-deep-search found a likely receipt
 *                            (requires gmail-deep-search.mjs to populate a lookup)
 *   6. NO_RECEIPT_NEEDED   — bank fee, transfer, owner drawing, small GST-free, contractor invoice
 *   7. MISSING             — genuine gap, chase list
 *
 * Writes:
 *   thoughts/shared/reports/bas-completeness-Q{N}-FY{YY}-{date}.md
 *
 * Usage:
 *   node scripts/bas-completeness.mjs Q1
 *   node scripts/bas-completeness.mjs Q2 Q3
 *   node scripts/bas-completeness.mjs Q2 --gap-only
 *   node scripts/bas-completeness.mjs Q1 --fy 26          # explicit FY
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const GAP_ONLY = args.includes('--gap-only');
const fyIdx = args.indexOf('--fy');
const FY_ARG = fyIdx !== -1 ? parseInt(args[fyIdx + 1]) : null;

// Quarter → date range. FY26 = Jul 2025 - Jun 2026.
const QUARTERS_BY_FY = (fy) => {
  const yr1 = 2000 + fy - 1; // FY26 → 2025
  const yr2 = 2000 + fy;     // FY26 → 2026
  return {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30`, label: `Q1 FY${fy}` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31`, label: `Q2 FY${fy}` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31`, label: `Q3 FY${fy}` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30`, label: `Q4 FY${fy}` },
  };
};

// Reconciliation rules — match vendors that don't need receipts
const NO_RECEIPT_VENDOR_EXACT = new Set([
  'nab', 'nab fee', 'nab international fee', 'nab fx margin',
  'bank fee', 'dishonour fee', 'merchant fee', 'service fee',
  'stripe fee', 'paypal fee', 'interest charge', 'interest',
  'bank interest', 'account fee',
]);
const NO_RECEIPT_VENDOR_CONTAINS = [
  'bank fee', 'dishonour', 'merchant fee', 'interest charge',
  'international fee', 'fx margin', 'card fee', 'atm fee',
];

function classifyNoReceipt(tx) {
  const name = (tx.contact_name || '').toLowerCase().trim();

  // Rule 1a: Exact bank-fee vendor names
  if (NO_RECEIPT_VENDOR_EXACT.has(name)) return { needed: false, reason: 'bank_fee' };

  // Rule 1b: Substring bank-fee patterns
  for (const p of NO_RECEIPT_VENDOR_CONTAINS) {
    if (name.includes(p)) return { needed: false, reason: 'bank_fee' };
  }
  // Rule 2: Bank transfers
  if (tx.type === 'SPEND-TRANSFER' || tx.type === 'RECEIVE-TRANSFER') {
    return { needed: false, reason: 'bank_transfer' };
  }
  // Rule 3: Owner drawings (BASEXCLUDED)
  if (tx.line_items) {
    const allExcluded = Array.isArray(tx.line_items) && tx.line_items.length > 0 &&
      tx.line_items.every(li => li.tax_type === 'BASEXCLUDED');
    if (allExcluded) return { needed: false, reason: 'owner_drawing' };
  }
  // Rule 4: "NM " prefix (Nicholas Marchesi tagged)
  if (name.startsWith('nm ') || name === 'nicholas marchesi') {
    return { needed: false, reason: 'owner_drawing' };
  }
  return { needed: true };
}

// Heuristic: does an ACCPAY bill exist that matches this SPEND within ±14d?
function findBillLink(tx, billsByVendor) {
  const name = (tx.contact_name || '').toLowerCase();
  const firstToken = name.split(' ')[0];
  const candidates = billsByVendor.get(firstToken) || [];
  const txDate = new Date(tx.date).getTime();
  const txAmount = Math.abs(Number(tx.total));
  for (const bill of candidates) {
    if (!bill.has_attachments) continue;
    const billDate = new Date(bill.date).getTime();
    const daysDiff = Math.abs(txDate - billDate) / 86400000;
    if (daysDiff > 14) continue;
    const amountDiff = Math.abs(txAmount - Number(bill.total));
    if (amountDiff > 0.50) continue;
    return bill;
  }
  return null;
}

async function loadQuarter(quarter) {
  // Load all SPEND (all types) for the quarter
  const { data: txns, error } = await sb
    .from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, type, has_attachments, status, line_items, bank_account, is_reconciled, project_code')
    .in('type', ['SPEND', 'SPEND-TRANSFER'])
    .eq('status', 'AUTHORISED')
    .gte('date', quarter.start)
    .lte('date', quarter.end)
    .order('total', { ascending: false });
  if (error) { console.error(error); process.exit(1); }
  return txns;
}

async function loadBillsIndex(quarter) {
  // Load ACCPAY bills ± 30 days around the quarter for matching
  const lo = new Date(new Date(quarter.start).getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const hi = new Date(new Date(quarter.end).getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const { data: bills } = await sb
    .from('xero_invoices')
    .select('xero_id, contact_name, total, date, has_attachments, status')
    .eq('type', 'ACCPAY')
    .neq('status', 'DELETED')
    .neq('status', 'VOIDED')
    .gte('date', lo)
    .lte('date', hi);
  // Index by first-token of contact_name for fast lookup
  const byVendor = new Map();
  for (const b of bills || []) {
    const token = (b.contact_name || '').toLowerCase().split(' ')[0];
    if (!byVendor.has(token)) byVendor.set(token, []);
    byVendor.get(token).push(b);
  }
  return byVendor;
}

async function loadPoolLinks(txIds) {
  // Receipt_emails rows linked to these Xero txn IDs
  if (txIds.length === 0) return new Map();
  const links = new Map();
  // Batch in chunks of 200
  for (let i = 0; i < txIds.length; i += 200) {
    const batch = txIds.slice(i, i + 200);
    const { data } = await sb
      .from('receipt_emails')
      .select('id, vendor_name, xero_bank_transaction_id, xero_transaction_id, status')
      .or(`xero_bank_transaction_id.in.(${batch.map(id => `"${id}"`).join(',')}),xero_transaction_id.in.(${batch.map(id => `"${id}"`).join(',')})`);
    for (const r of data || []) {
      const key = r.xero_bank_transaction_id || r.xero_transaction_id;
      if (key) links.set(key, r);
    }
  }
  return links;
}

async function classifyQuarter(qKey, quarter) {
  console.log(`\n=== Classifying ${quarter.label} ===`);
  const txns = await loadQuarter(quarter);
  console.log(`  Loaded ${txns.length} SPEND/SPEND-TRANSFER txns`);

  const billsByVendor = await loadBillsIndex(quarter);
  console.log(`  Bills indexed: ${[...billsByVendor.values()].reduce((s, v) => s + v.length, 0)}`);

  const poolLinks = await loadPoolLinks(txns.map(t => t.xero_transaction_id));
  console.log(`  Receipt pool links: ${poolLinks.size}`);

  const buckets = {
    DIRECT: [],
    BILL_LINKED: [],
    FILES_LIBRARY: [], // placeholder — populated if xero-files-library-scan report exists
    POOL_MATCH: [],
    GMAIL_RAW: [],     // placeholder — populated if gmail-deep-search report exists
    NO_RECEIPT_NEEDED: [],
    MISSING: [],
  };

  for (const tx of txns) {
    // Path 1: DIRECT
    if (tx.has_attachments) { buckets.DIRECT.push(tx); continue; }

    // Path 6: NO_RECEIPT_NEEDED (check before matching to avoid spurious matches)
    const rule = classifyNoReceipt(tx);
    if (!rule.needed) { buckets.NO_RECEIPT_NEEDED.push({ ...tx, noReceiptReason: rule.reason }); continue; }

    // Path 2: BILL_LINKED
    const bill = findBillLink(tx, billsByVendor);
    if (bill) { buckets.BILL_LINKED.push({ ...tx, _bill: bill }); continue; }

    // Path 4: POOL_MATCH
    const pool = poolLinks.get(tx.xero_transaction_id);
    if (pool) { buckets.POOL_MATCH.push({ ...tx, _pool: pool }); continue; }

    // Path 7: MISSING (genuine gap)
    buckets.MISSING.push(tx);
  }

  return { quarter, txns, buckets };
}

function fmt(n) { return '$' + Number(n || 0).toFixed(2); }

function renderReport(results) {
  const all = results.flatMap(r => r.txns);
  const combined = { DIRECT: [], BILL_LINKED: [], FILES_LIBRARY: [], POOL_MATCH: [], GMAIL_RAW: [], NO_RECEIPT_NEEDED: [], MISSING: [] };
  for (const r of results) {
    for (const k of Object.keys(combined)) combined[k].push(...r.buckets[k]);
  }

  const totalCount = all.length;
  const totalValue = all.reduce((s, t) => s + Math.abs(Number(t.total)), 0);

  const quartersLabel = results.map(r => r.quarter.label).join(' + ');

  const lines = [];
  lines.push(`# BAS Completeness — ${quartersLabel}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## The 7-path model`);
  lines.push(`Each SPEND transaction falls into one of 7 coverage paths. Paths 1-6 are all "covered" (receipt exists or isn't needed). Only path 7 is a genuine chase target.`);
  lines.push(``);
  lines.push(`| Path | Count | Value | % by count | % by value |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const [k, v] of Object.entries(combined)) {
    const val = v.reduce((s, t) => s + Math.abs(Number(t.total)), 0);
    const pctC = totalCount ? ((v.length / totalCount) * 100).toFixed(1) : '0.0';
    const pctV = totalValue ? ((val / totalValue) * 100).toFixed(1) : '0.0';
    const emoji = k === 'MISSING' ? '🔴' : k === 'DIRECT' ? '🟢' : '🟡';
    lines.push(`| ${emoji} ${k} | ${v.length} | ${fmt(val)} | ${pctC}% | ${pctV}% |`);
  }
  lines.push(`| **TOTAL** | **${totalCount}** | **${fmt(totalValue)}** | 100.0% | 100.0% |`);
  lines.push(``);

  // The real metric
  const covered = totalCount - combined.MISSING.length;
  const coveredValue = totalValue - combined.MISSING.reduce((s, t) => s + Math.abs(Number(t.total)), 0);
  lines.push(`## The real metric`);
  lines.push(`**Covered (paths 1-6):** ${covered} / ${totalCount} txns = **${((covered / totalCount) * 100).toFixed(1)}%**`);
  lines.push(`**Covered value:** ${fmt(coveredValue)} / ${fmt(totalValue)} = **${((coveredValue / totalValue) * 100).toFixed(1)}%**`);
  lines.push(``);
  lines.push(`**Genuine gap (path 7):** ${combined.MISSING.length} txns, ${fmt(combined.MISSING.reduce((s, t) => s + Math.abs(Number(t.total)), 0))}`);
  lines.push(``);

  // NO_RECEIPT_NEEDED breakdown
  if (combined.NO_RECEIPT_NEEDED.length > 0) {
    const byReason = {};
    for (const t of combined.NO_RECEIPT_NEEDED) {
      byReason[t.noReceiptReason] = (byReason[t.noReceiptReason] || 0) + 1;
    }
    lines.push(`## Path 6 breakdown (NO_RECEIPT_NEEDED)`);
    for (const [r, n] of Object.entries(byReason)) {
      lines.push(`- ${r}: ${n} txns`);
    }
    lines.push(``);
  }

  // BILL_LINKED samples
  if (combined.BILL_LINKED.length > 0) {
    lines.push(`## Path 2 (BILL_LINKED) — ${combined.BILL_LINKED.length} txns`);
    lines.push(`These SPEND txns have a matching ACCPAY bill with a receipt attached. Run \`sync-bill-attachments-to-txns.mjs --apply\` to copy the attachment from bill → bank txn in Xero.`);
    lines.push(``);
    lines.push(`Sample (first 10):`);
    for (const t of combined.BILL_LINKED.slice(0, 10)) {
      lines.push(`- ${t.date} ${t.contact_name} ${fmt(Math.abs(t.total))} ← bill ${t._bill.xero_id.slice(0, 8)} (${t._bill.status})`);
    }
    lines.push(``);
  }

  // POOL_MATCH samples
  if (combined.POOL_MATCH.length > 0) {
    lines.push(`## Path 4 (POOL_MATCH) — ${combined.POOL_MATCH.length} txns`);
    lines.push(`These bank txns are linked to a receipt_emails row. Run \`upload-receipts-to-xero.mjs\` to push the file to Xero.`);
    lines.push(``);
  }

  // The chase list (MISSING)
  lines.push(`## Path 7 (MISSING) — the real chase list`);
  lines.push(``);
  if (combined.MISSING.length === 0) {
    lines.push(`**No genuine gaps.** 🎉`);
  } else {
    // Group by vendor
    const byVendor = {};
    for (const t of combined.MISSING) {
      const v = t.contact_name || '?';
      if (!byVendor[v]) byVendor[v] = { n: 0, total: 0, txns: [] };
      byVendor[v].n++;
      byVendor[v].total += Math.abs(Number(t.total));
      byVendor[v].txns.push(t);
    }
    const sorted = Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total);
    lines.push(`Grouped by vendor (top 30 by value):`);
    lines.push(``);
    lines.push(`| Vendor | Txns | Value | Recommended action |`);
    lines.push(`|---|---:|---:|---|`);
    for (const [v, data] of sorted.slice(0, 30)) {
      const action = vendorAction(v, data.n, data.total);
      lines.push(`| ${v} | ${data.n} | ${fmt(data.total)} | ${action} |`);
    }
    if (sorted.length > 30) lines.push(`| ... | | | ${sorted.length - 30} more vendors |`);
    lines.push(``);

    // Full per-txn list (for gap-only mode)
    if (GAP_ONLY) {
      lines.push(`## Full chase list (per-txn)`);
      lines.push(``);
      lines.push(`| Date | Vendor | Amount | Account | Xero ID |`);
      lines.push(`|---|---|---:|---|---|`);
      for (const t of combined.MISSING.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))) {
        lines.push(`| ${t.date} | ${t.contact_name || '?'} | ${fmt(Math.abs(t.total))} | ${t.bank_account || '?'} | \`${t.xero_transaction_id}\` |`);
      }
    }
  }

  lines.push(``);
  lines.push(`## Next steps`);
  lines.push(`1. For path 2 (BILL_LINKED): run \`node scripts/sync-bill-attachments-to-txns.mjs --apply\` to copy receipts from bills to bank txns`);
  lines.push(`2. For path 4 (POOL_MATCH): run \`node scripts/upload-receipts-to-xero.mjs\` to push pool receipts to Xero`);
  lines.push(`3. For path 7 (MISSING): run \`node scripts/gmail-deep-search.mjs ${results[0].quarter.label.split(' ')[0]}\` to hunt raw Gmail for missed receipts`);
  lines.push(`4. For path 7 (MISSING): run \`node scripts/xero-files-library-scan.mjs\` to check Xero's Files library`);
  lines.push(`5. For vendors with persistent gaps: check \`.claude/skills/bas-cycle/references/vendor-patterns.md\` for known playbooks`);

  return lines.join('\n');
}

function vendorAction(vendor, count, value) {
  const v = vendor.toLowerCase();
  if (v.includes('qantas')) return 'Run Find & Match in Xero UI — bills exist';
  if (v.includes('uber')) return count > 10 ? 'Bulk bill→txn sync if bills exist' : 'Check Uber Business portal';
  if (v.includes('webflow') || v.includes('stripe') || v.includes('anthropic') || v.includes('openai') || v.includes('claude') || v.includes('vercel') || v.includes('notion')) return 'SaaS — check vendor portal or Gmail';
  if (v.includes('apple')) return 'Check Apple receipts email (iCloud statements)';
  if (v.includes('google')) return 'Check Google Workspace billing';
  if (v.includes('samuel hafer') || v.includes('chris witta') || v.includes('joseph kirmos') || v.includes('defy')) return 'Contractor — chase invoice';
  if (value < 10) return 'Small — consider write-off';
  if (value < 82.50) return 'Under GST threshold — bank line OK';
  return 'Chase vendor for duplicate';
}

async function main() {
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  if (quarterArgs.length === 0) { console.error('Specify at least one quarter: Q1, Q2, Q3, or Q4'); process.exit(1); }

  const fy = FY_ARG || 26; // default to FY26
  const QUARTERS = QUARTERS_BY_FY(fy);
  const results = [];
  for (const q of quarterArgs) {
    const quarter = QUARTERS[q];
    if (!quarter) { console.error(`Unknown quarter: ${q}`); continue; }
    const result = await classifyQuarter(q, quarter);
    results.push(result);
  }

  const report = renderReport(results);
  const qTag = quarterArgs.join('-');
  const reportPath = `thoughts/shared/reports/bas-completeness-${qTag}-FY${fy}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(reportPath, report);
  console.log(`\nReport: ${reportPath}`);

  // Quick summary
  const all = results.flatMap(r => Object.entries(r.buckets).map(([k, v]) => [k, v.length]));
  const rollup = {};
  for (const [k, n] of all) rollup[k] = (rollup[k] || 0) + n;
  console.log(`\n=== Rollup ===`);
  for (const [k, n] of Object.entries(rollup)) console.log(`  ${k}: ${n}`);
}

main().catch(e => { console.error(e); process.exit(1); });
