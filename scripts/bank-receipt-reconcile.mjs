#!/usr/bin/env node
/**
 * Bank ↔ Receipt Reconciliation — pulls every bank transaction and bill from
 * live Xero for a date range, every receipt from receipt_emails for the same
 * range, and aligns them by vendor + amount + date so you can see exactly:
 *
 *   - Which bank txns have receipts (matched)
 *   - Which bank txns are missing receipts (unmatched bank)
 *   - Which receipts have no corresponding bank txn (unmatched receipt — likely
 *     paid by personal card, forwarded receipt, or quote/noise)
 *   - Per-account totals
 *   - Per-vendor groupings
 *
 * Output: thoughts/shared/reports/bank-receipt-reconcile-{from}-{to}.md
 *
 * Usage:
 *   node scripts/bank-receipt-reconcile.mjs                    # default Nov-Dec 2025
 *   node scripts/bank-receipt-reconcile.mjs 2025-11-01 2025-12-31
 *   node scripts/bank-receipt-reconcile.mjs 2026-01-01 2026-03-31
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const FROM = args[0] || '2025-11-01';
const TO = args[1] || '2025-12-31';

let token = process.env.XERO_ACCESS_TOKEN;
if (existsSync('.xero-tokens.json')) {
  try { token = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token; } catch {}
}
const TENANT = process.env.XERO_TENANT_ID;
const headers = { Authorization: 'Bearer ' + token, 'xero-tenant-id': TENANT, Accept: 'application/json' };

const xeroDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return `DateTime(${y},${String(m).padStart(2, '0')},${String(d).padStart(2, '0')})`;
};

async function xeroGet(url) {
  await new Promise(r => setTimeout(r, 800));
  const r = await fetch(url, { headers });
  if (!r.ok) {
    console.error('  HTTP ' + r.status + ' on ' + url.slice(0, 100));
    return null;
  }
  return r.json();
}

// ============================================================================
// PHASE 1: Pull ALL bank transactions from live Xero
// ============================================================================
async function fetchAllBankTransactions() {
  const out = [];
  const where = encodeURIComponent(`Date>=${xeroDate(FROM)} AND Date<=${xeroDate(TO)}`);
  for (let page = 1; page <= 30; page++) {
    const j = await xeroGet(`https://api.xero.com/api.xro/2.0/BankTransactions?where=${where}&page=${page}`);
    if (!j?.BankTransactions || j.BankTransactions.length === 0) break;
    out.push(...j.BankTransactions);
    if (j.BankTransactions.length < 100) break;
  }
  return out;
}

// ============================================================================
// PHASE 2: Pull ALL invoices (ACCPAY = bills + ACCREC = sales)
// ============================================================================
async function fetchAllInvoices(type) {
  const out = [];
  const where = encodeURIComponent(`Type=="${type}" AND Date>=${xeroDate(FROM)} AND Date<=${xeroDate(TO)}`);
  for (let page = 1; page <= 30; page++) {
    const j = await xeroGet(`https://api.xero.com/api.xro/2.0/Invoices?where=${where}&page=${page}`);
    if (!j?.Invoices || j.Invoices.length === 0) break;
    out.push(...j.Invoices);
    if (j.Invoices.length < 100) break;
  }
  return out;
}

// ============================================================================
// PHASE 3: Pull ALL receipts from Supabase receipt_emails for the period
// ============================================================================
async function fetchAllReceipts() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from('receipt_emails')
      .select('id, vendor_name, amount_detected, received_at, subject, source, status, mailbox, xero_bank_transaction_id, xero_invoice_id, xero_transaction_id, attachment_filename, attachment_url')
      .gte('received_at', FROM + 'T00:00:00')
      .lte('received_at', TO + 'T23:59:59')
      .range(from, from + 999);
    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

// ============================================================================
// PHASE 4: Matching logic
// ============================================================================
function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function tokensFromName(s) {
  return normalize(s).split(' ').filter(t => t.length >= 4);
}

function vendorMatch(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = tokensFromName(a), tb = tokensFromName(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const overlap = ta.filter(t => tb.includes(t)).length;
  return overlap >= 1 && overlap / Math.min(ta.length, tb.length) >= 0.5;
}

function amountMatch(a, b, tol = 0.50) {
  if (a == null || b == null) return false;
  const aa = Math.abs(Number(a)), bb = Math.abs(Number(b));
  if (aa === 0 || bb === 0) return false;
  return Math.abs(aa - bb) <= tol || Math.abs(aa - bb) / Math.max(aa, bb) <= 0.005;
}

function dateClose(a, b, days = 7) {
  if (!a || !b) return false;
  const da = new Date(a).getTime(), db = new Date(b).getTime();
  return Math.abs(da - db) <= days * 86400000;
}

function findReceiptForTxn(receipts, vendor, amount, date) {
  // Already-linked receipts get priority
  for (const r of receipts) {
    if (vendorMatch(vendor, r.vendor_name) &&
        amountMatch(amount, r.amount_detected, 0.50) &&
        dateClose(date, r.received_at, 14)) return r;
  }
  // Looser match
  for (const r of receipts) {
    if (vendorMatch(vendor, r.vendor_name) && amountMatch(amount, r.amount_detected, 2.00)) return r;
  }
  return null;
}

// ============================================================================
// MAIN
// ============================================================================
const fmt = (n) => '$' + Number(n || 0).toFixed(2);
const xeroDateParse = (s) => {
  if (!s) return null;
  const m = s.match(/\/Date\((\d+)/);
  return m ? new Date(parseInt(m[1])).toISOString().slice(0, 10) : null;
};

async function main() {
  console.log(`=== Bank ↔ Receipt Reconciliation ===`);
  console.log(`Range: ${FROM} → ${TO}\n`);

  console.log('Phase 1: Fetching all bank transactions from Xero (live)...');
  const bankTxns = await fetchAllBankTransactions();
  console.log(`  ${bankTxns.length} bank txns`);

  console.log('Phase 2: Fetching all ACCPAY bills from Xero (live)...');
  const accpay = await fetchAllInvoices('ACCPAY');
  console.log(`  ${accpay.length} bills`);

  console.log('Phase 2b: Fetching all ACCREC sales from Xero (live)...');
  const accrec = await fetchAllInvoices('ACCREC');
  console.log(`  ${accrec.length} sales invoices`);

  console.log('Phase 3: Fetching receipts from Supabase pool...');
  const receipts = await fetchAllReceipts();
  console.log(`  ${receipts.length} receipts in window\n`);

  // Build unified events list (every "money out" event from ACT)
  const events = [];
  for (const t of bankTxns) {
    events.push({
      kind: 'BANK_TXN',
      type: t.Type,
      status: t.Status,
      date: xeroDateParse(t.Date),
      vendor: t.Contact?.Name || '?',
      amount: Number(t.Total || 0),
      bankAccount: t.BankAccount?.Name,
      isReconciled: t.IsReconciled,
      hasAttachments: t.HasAttachments,
      reference: t.Reference || '',
      lineItems: t.LineItems || [],
      xeroId: t.BankTransactionID,
    });
  }
  for (const i of accpay) {
    events.push({
      kind: 'BILL',
      type: i.Type,
      status: i.Status,
      date: xeroDateParse(i.Date),
      paidDate: xeroDateParse(i.FullyPaidOnDate),
      vendor: i.Contact?.Name || '?',
      amount: Number(i.Total || 0),
      isReconciled: i.Status === 'PAID',
      hasAttachments: i.HasAttachments,
      reference: i.Reference || '',
      invoiceNumber: i.InvoiceNumber || '',
      lineItems: i.LineItems || [],
      xeroId: i.InvoiceID,
    });
  }

  // Now match each event to a receipt
  let matchedCount = 0;
  const usedReceiptIds = new Set();
  for (const e of events) {
    if (e.type === 'SPEND-TRANSFER' || e.type === 'RECEIVE-TRANSFER' || e.type === 'RECEIVE') continue;
    if (e.status === 'DELETED' || e.status === 'VOIDED') continue;
    const r = findReceiptForTxn(
      receipts.filter(r => !usedReceiptIds.has(r.id)),
      e.vendor, e.amount, e.date
    );
    if (r) {
      e.matchedReceipt = r;
      usedReceiptIds.add(r.id);
      matchedCount++;
    }
  }

  // Find unmatched receipts
  const unmatchedReceipts = receipts.filter(r => !usedReceiptIds.has(r.id));

  // ========================================================================
  // RENDER REPORT
  // ========================================================================
  const lines = [];
  lines.push(`# Bank ↔ Receipt Reconciliation — ${FROM} to ${TO}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Source:** Live Xero API + Supabase receipt_emails pool`);
  lines.push(``);

  // Per-account summary
  const byAccount = {};
  for (const e of events) {
    if (e.kind !== 'BANK_TXN') continue;
    const acc = e.bankAccount || '?';
    const k = acc + '|' + e.type;
    if (!byAccount[k]) byAccount[k] = { count: 0, total: 0 };
    byAccount[k].count++;
    byAccount[k].total += e.amount;
  }

  lines.push(`## Per-account activity (live Xero)`);
  lines.push(``);
  lines.push(`| Bank Account | Type | Count | Total |`);
  lines.push(`|---|---|---:|---:|`);
  for (const [k, d] of Object.entries(byAccount).sort((a, b) => b[1].total - a[1].total)) {
    const [acc, type] = k.split('|');
    lines.push(`| ${acc} | ${type} | ${d.count} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  // ACCPAY bills summary
  const billCount = events.filter(e => e.kind === 'BILL').length;
  const billTotal = events.filter(e => e.kind === 'BILL').reduce((s, e) => s + e.amount, 0);
  const billPaid = events.filter(e => e.kind === 'BILL' && e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
  const billOpen = events.filter(e => e.kind === 'BILL' && e.status !== 'PAID' && e.status !== 'VOIDED' && e.status !== 'DELETED').reduce((s, e) => s + e.amount, 0);

  lines.push(`## ACCPAY bills`);
  lines.push(``);
  lines.push(`- Total bills in window: ${billCount}`);
  lines.push(`- Total value: ${fmt(billTotal)}`);
  lines.push(`- Paid: ${fmt(billPaid)}`);
  lines.push(`- Open (AUTHORISED): ${fmt(billOpen)}`);
  lines.push(``);

  // SPEND vs RECEIVE on bank
  const spendTotal = events.filter(e => e.kind === 'BANK_TXN' && e.type === 'SPEND').reduce((s, e) => s + e.amount, 0);
  const receiveTotal = events.filter(e => e.kind === 'BANK_TXN' && e.type === 'RECEIVE').reduce((s, e) => s + e.amount, 0);

  lines.push(`## Money flow summary (bank only, excludes transfers)`);
  lines.push(``);
  lines.push(`- Total SPEND from ACT bank accounts: ${fmt(spendTotal)}`);
  lines.push(`- Total RECEIVE into ACT bank accounts: ${fmt(receiveTotal)}`);
  lines.push(``);

  // Receipt pool summary
  const receiptByStatus = {};
  for (const r of receipts) {
    const k = r.status || '?';
    if (!receiptByStatus[k]) receiptByStatus[k] = { count: 0, total: 0 };
    receiptByStatus[k].count++;
    receiptByStatus[k].total += Number(r.amount_detected || 0);
  }

  lines.push(`## Receipt pool (Supabase receipt_emails)`);
  lines.push(``);
  lines.push(`- Total receipts in window: ${receipts.length}`);
  lines.push(`- Matched to bank txns or bills: ${matchedCount}`);
  lines.push(`- Unmatched: ${unmatchedReceipts.length}`);
  lines.push(``);
  lines.push(`### By status`);
  lines.push(``);
  lines.push(`| Status | Count | Total value |`);
  lines.push(`|---|---:|---:|`);
  for (const [k, d] of Object.entries(receiptByStatus).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${k} | ${d.count} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  // ========================================================================
  // The big chunk — UNMATCHED RECEIPTS by value
  // ========================================================================
  lines.push(`## 🔴 Receipts WITHOUT a matching bank txn or bill`);
  lines.push(``);
  lines.push(`These are receipts in our pool that don't correspond to any actual ACT bank transaction or ACCPAY bill in the period. Possible causes:`);
  lines.push(``);
  lines.push(`1. **Paid via personal account/card** — bank feed not in Xero (e.g. Up Bank stopped syncing)`);
  lines.push(`2. **Forwarded by someone else** — receipt landed in ACT inbox but isn't ACT's obligation`);
  lines.push(`3. **Quote/notification only** — never actually purchased`);
  lines.push(`4. **Receipt arrived in window but bank txn happens in a different period**`);
  lines.push(``);

  // Group unmatched by vendor
  const unmatchedByVendor = {};
  for (const r of unmatchedReceipts) {
    const v = r.vendor_name || '?';
    if (!unmatchedByVendor[v]) unmatchedByVendor[v] = { count: 0, total: 0, samples: [] };
    unmatchedByVendor[v].count++;
    unmatchedByVendor[v].total += Number(r.amount_detected || 0);
    unmatchedByVendor[v].samples.push(r);
  }
  const sortedUnmatched = Object.entries(unmatchedByVendor).sort((a, b) => b[1].total - a[1].total);

  lines.push(`### Top 50 unmatched vendors by value`);
  lines.push(``);
  lines.push(`| Vendor | Count | Total | Sample dates |`);
  lines.push(`|---|---:|---:|---|`);
  for (const [v, d] of sortedUnmatched.slice(0, 50)) {
    const dates = d.samples.slice(0, 3).map(s => (s.received_at || '').slice(0, 10)).join(', ');
    lines.push(`| ${v} | ${d.count} | ${fmt(d.total)} | ${dates} |`);
  }
  if (sortedUnmatched.length > 50) lines.push(`| ... | | | ${sortedUnmatched.length - 50} more |`);
  lines.push(``);

  // ========================================================================
  // UNMATCHED BANK txns (txns we paid for but no receipt)
  // ========================================================================
  const unmatchedBank = events.filter(e =>
    (e.kind === 'BANK_TXN' && e.type === 'SPEND' && !e.matchedReceipt && e.status === 'AUTHORISED') ||
    (e.kind === 'BILL' && !e.matchedReceipt && e.status !== 'VOIDED' && e.status !== 'DELETED')
  );

  lines.push(`## 🟡 ACT bank txns/bills WITHOUT a matching receipt`);
  lines.push(``);
  lines.push(`These are real ACT money-out events where we don't have a receipt linked. Most are probably just unprocessed receipts that exist but the matcher didn't find — worth running gmail-to-xero-pipeline.mjs.`);
  lines.push(``);

  const unmatchedBankByVendor = {};
  for (const e of unmatchedBank) {
    const v = e.vendor || '?';
    if (!unmatchedBankByVendor[v]) unmatchedBankByVendor[v] = { count: 0, total: 0 };
    unmatchedBankByVendor[v].count++;
    unmatchedBankByVendor[v].total += e.amount;
  }
  const sortedUnmatchedBank = Object.entries(unmatchedBankByVendor).sort((a, b) => b[1].total - a[1].total);

  lines.push(`Total unmatched bank events: ${unmatchedBank.length} totalling ${fmt(unmatchedBank.reduce((s, e) => s + e.amount, 0))}`);
  lines.push(``);
  lines.push(`### Top 30 by value`);
  lines.push(``);
  lines.push(`| Vendor | Count | Total |`);
  lines.push(`|---|---:|---:|`);
  for (const [v, d] of sortedUnmatchedBank.slice(0, 30)) {
    lines.push(`| ${v} | ${d.count} | ${fmt(d.total)} |`);
  }
  lines.push(``);

  // ========================================================================
  // Mounty-tagged filter
  // ========================================================================
  const mountyEvents = events.filter(e => {
    return (e.lineItems || []).some(li => (li.Tracking || []).some(tr => {
      const opt = (tr.Option || '').toLowerCase();
      return opt.includes('mounty') || tr.Option === 'ACT-MY' || (tr.Option && tr.Option.startsWith('ACT-MY'));
    }));
  });
  const mountyTotal = mountyEvents.reduce((s, e) => s + e.amount, 0);

  lines.push(`## Mounty-tagged events (project tracking = ACT-MY or Mounty)`);
  lines.push(``);
  lines.push(`- Total Mounty-tagged events in Xero: ${mountyEvents.length}`);
  lines.push(`- Total value: ${fmt(mountyTotal)}`);
  lines.push(``);
  if (mountyEvents.length > 0) {
    lines.push(`| Date | Type | Vendor | Amount | Account/Status |`);
    lines.push(`|---|---|---|---:|---|`);
    for (const e of mountyEvents) {
      const accOrStatus = e.kind === 'BANK_TXN' ? e.bankAccount : e.status;
      lines.push(`| ${e.date} | ${e.kind === 'BANK_TXN' ? e.type : 'BILL'} | ${e.vendor} | ${fmt(e.amount)} | ${accOrStatus} |`);
    }
  }
  lines.push(``);

  // ========================================================================
  // ALL bank events sorted by date — the ledger
  // ========================================================================
  lines.push(`## Full ledger (every bank event in the period, by date)`);
  lines.push(``);
  lines.push(`Marker key: 🟢 has receipt | 🟡 no receipt | ⚫ transfer/owner | 🚫 deleted`);
  lines.push(``);
  lines.push(`| Date | Acct | Type | Vendor | Amount | Receipt | Tracking |`);
  lines.push(`|---|---|---|---|---:|---|---|`);

  const sortedEvents = events
    .filter(e => e.kind === 'BANK_TXN' || (e.kind === 'BILL' && e.status !== 'DELETED' && e.status !== 'VOIDED'))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const e of sortedEvents) {
    let marker = '🟡';
    if (e.status === 'DELETED' || e.status === 'VOIDED') marker = '🚫';
    else if (e.type === 'SPEND-TRANSFER' || e.type === 'RECEIVE-TRANSFER' || e.vendor.toLowerCase().includes('nicholas')) marker = '⚫';
    else if (e.matchedReceipt || e.hasAttachments) marker = '🟢';

    const acct = e.kind === 'BANK_TXN' ? (e.bankAccount || '?').replace('NJ Marchesi T/as ACT ', '').slice(0, 12) : 'BILL';
    const typeShort = e.kind === 'BANK_TXN' ? e.type.replace('-TRANSFER', '-TR') : (e.status || 'BILL');
    const trackingOpt = (e.lineItems?.[0]?.Tracking || []).map(tr => tr.Option).join(', ').slice(0, 25);
    const receiptTag = e.matchedReceipt ? `✓ ${(e.matchedReceipt.source || '').slice(0,3)}` : (e.hasAttachments ? '✓ Xero' : '—');
    lines.push(`| ${marker} ${e.date || '-'} | ${acct} | ${typeShort} | ${e.vendor.slice(0, 30)} | ${fmt(e.amount)} | ${receiptTag} | ${trackingOpt} |`);
  }
  lines.push(``);

  // ========================================================================
  // ALL unmatched receipts — full list (the noise / personal pool)
  // ========================================================================
  lines.push(`## Full unmatched receipt list`);
  lines.push(``);
  lines.push(`Every receipt in the pool with no matching bank txn or bill. This is what's most likely paid by personal account, forwarded from elsewhere, or noise.`);
  lines.push(``);
  lines.push(`| Date | Vendor | Amount | Source | Subject |`);
  lines.push(`|---|---|---:|---|---|`);
  for (const r of unmatchedReceipts.sort((a, b) => Number(b.amount_detected || 0) - Number(a.amount_detected || 0))) {
    lines.push(`| ${(r.received_at || '').slice(0, 10)} | ${(r.vendor_name || '?').slice(0, 30)} | ${fmt(r.amount_detected)} | ${r.source || '?'} | ${(r.subject || '').slice(0, 60)} |`);
  }

  const reportPath = `thoughts/shared/reports/bank-receipt-reconcile-${FROM}-to-${TO}.md`;
  writeFileSync(reportPath, lines.join('\n'));

  // Console summary
  console.log('=== SUMMARY ===');
  console.log(`Bank txns: ${bankTxns.length}`);
  console.log(`ACCPAY bills: ${accpay.length}`);
  console.log(`Receipts in pool: ${receipts.length}`);
  console.log(`Receipts matched to bank/bills: ${matchedCount}`);
  console.log(`Unmatched receipts: ${unmatchedReceipts.length}`);
  console.log(`Unmatched bank events: ${unmatchedBank.length}`);
  console.log(`Mounty-tagged events: ${mountyEvents.length} totalling ${fmt(mountyTotal)}`);
  console.log(`\nTotal SPEND from ACT bank accounts: ${fmt(spendTotal)}`);
  console.log(`Total ACCPAY bills (any status): ${fmt(billTotal)}`);
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
