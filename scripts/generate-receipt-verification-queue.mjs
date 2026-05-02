#!/usr/bin/env node
/**
 * Generate Receipt Verification Queue
 *
 * Read-only triage layer for BAS cleanup. It turns unreceipted authorised
 * Xero SPEND transactions into action queues by combining:
 * - Xero tax types (actual GST at risk, not blunt total/11)
 * - existing Xero ACCPAY bills with attachments
 * - receipt_emails pool candidates
 * - reconciliation/project-code state
 *
 * Usage:
 *   node scripts/generate-receipt-verification-queue.mjs Q2 Q3
 *   node scripts/generate-receipt-verification-queue.mjs Q2 Q3 --action high-friction --out-label operator
 *   node scripts/generate-receipt-verification-queue.mjs Q2 Q3 --action CHASE_RECEIPT --min-gst 20
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const FY = 26;
const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26' },
};

const args = process.argv.slice(2);
const quarterArgs = args.filter((a) => /^Q[1-4]$/i.test(a)).map((a) => a.toUpperCase());
const selectedQuarters = quarterArgs.length ? quarterArgs : ['Q2', 'Q3'];
const selected = selectedQuarters.map((q) => QUARTERS[q]);
const start = selected.reduce((min, q) => q.start < min ? q.start : min, selected[0].start);
const end = selected.reduce((max, q) => q.end > max ? q.end : max, selected[0].end);
const stamp = new Date().toISOString().slice(0, 10);

const RD_PROJECTS = new Set(['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD']);
const GST_CREDIT_TYPES = new Set(['INPUT', 'CAPEXINPUT']);
const BAS_EXCLUDED_TYPES = new Set(['BASEXCLUDED', 'EXEMPTEXPENSES']);
const G1_ONLY_TYPES = new Set(['INPUTTAXED', 'EXEMPTOUTPUT']);

const ACTION_LABELS = {
  XERO_FIND_MATCH: 'Xero Find & Match',
  UPLOAD_RECEIPT_POOL: 'Upload / link receipt from pool',
  REVIEW_LINKED_RECEIPT: 'Review linked receipt',
  CHASE_RECEIPT: 'Chase receipt',
  R_AND_D_EVIDENCE: 'R&D evidence only',
  RECONCILE_FIRST: 'Reconcile first',
  TAG_PROJECT: 'Tag project',
  NO_GST_EVIDENCE_ONLY: 'No GST evidence only',
  LOW_VALUE_REVIEW: 'Low-value review',
};

const ACTION_ALIASES = new Map([
  ['xero_find_match', 'XERO_FIND_MATCH'],
  ['xero find match', 'XERO_FIND_MATCH'],
  ['find match', 'XERO_FIND_MATCH'],
  ['xero find & match', 'XERO_FIND_MATCH'],
  ['upload_receipt_pool', 'UPLOAD_RECEIPT_POOL'],
  ['upload receipt pool', 'UPLOAD_RECEIPT_POOL'],
  ['upload', 'UPLOAD_RECEIPT_POOL'],
  ['link receipt', 'UPLOAD_RECEIPT_POOL'],
  ['review_linked_receipt', 'REVIEW_LINKED_RECEIPT'],
  ['review linked receipt', 'REVIEW_LINKED_RECEIPT'],
  ['review receipt', 'REVIEW_LINKED_RECEIPT'],
  ['linked receipt', 'REVIEW_LINKED_RECEIPT'],
  ['chase_receipt', 'CHASE_RECEIPT'],
  ['chase receipt', 'CHASE_RECEIPT'],
  ['chase', 'CHASE_RECEIPT'],
  ['r_and_d_evidence', 'R_AND_D_EVIDENCE'],
  ['r&d evidence', 'R_AND_D_EVIDENCE'],
  ['r and d evidence', 'R_AND_D_EVIDENCE'],
  ['reconcile_first', 'RECONCILE_FIRST'],
  ['reconcile first', 'RECONCILE_FIRST'],
  ['tag_project', 'TAG_PROJECT'],
  ['tag project', 'TAG_PROJECT'],
  ['no_gst_evidence_only', 'NO_GST_EVIDENCE_ONLY'],
  ['no gst evidence only', 'NO_GST_EVIDENCE_ONLY'],
  ['low_value_review', 'LOW_VALUE_REVIEW'],
  ['low value review', 'LOW_VALUE_REVIEW'],
]);

const ACTION_GROUPS = {
  'high-friction': ['CHASE_RECEIPT', 'REVIEW_LINKED_RECEIPT', 'UPLOAD_RECEIPT_POOL', 'XERO_FIND_MATCH', 'TAG_PROJECT'],
  operator: ['CHASE_RECEIPT', 'REVIEW_LINKED_RECEIPT', 'UPLOAD_RECEIPT_POOL', 'XERO_FIND_MATCH', 'TAG_PROJECT'],
  gst: ['CHASE_RECEIPT', 'REVIEW_LINKED_RECEIPT', 'UPLOAD_RECEIPT_POOL', 'XERO_FIND_MATCH'],
  evidence: ['R_AND_D_EVIDENCE', 'NO_GST_EVIDENCE_ONLY'],
};

function optionValue(name) {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1) return args[idx + 1];
  return null;
}

function normalizeActionToken(value) {
  return String(value || '')
    .trim()
    .replace(/^-+/, '')
    .replace(/-/g, '_')
    .toUpperCase();
}

function parseActionFilter(raw) {
  if (!raw) return null;
  const selectedActions = new Set();
  const parts = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const groupKey = part.toLowerCase().replace(/_/g, '-');
    if (ACTION_GROUPS[groupKey]) {
      ACTION_GROUPS[groupKey].forEach((code) => selectedActions.add(code));
      continue;
    }

    const normalized = normalizeActionToken(part);
    if (ACTION_LABELS[normalized]) {
      selectedActions.add(normalized);
      continue;
    }

    const alias = ACTION_ALIASES.get(part.toLowerCase().replace(/[_-]/g, ' ')) || ACTION_ALIASES.get(part.toLowerCase());
    if (alias) selectedActions.add(alias);
  }

  return selectedActions.size ? selectedActions : null;
}

const actionFilter = parseActionFilter(optionValue('action') || optionValue('actions'));
const minGstFilter = optionValue('min-gst') === null ? null : Number(optionValue('min-gst'));
const vendorFilter = optionValue('vendor') ? normalize(optionValue('vendor')) : null;
const projectFilter = optionValue('project') ? String(optionValue('project')).toUpperCase() : null;
const outLabel = optionValue('out-label') || optionValue('label');
const safeOutLabel = outLabel ? `-${String(outLabel).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}` : '';
const outDir = path.join('thoughts/shared/reports', `receipt-verification-${selectedQuarters.join('-').toLowerCase()}-fy${FY}-${stamp}${safeOutLabel}`);

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCSV(rows, columns) {
  return `${columns.join(',')}\n${rows.map((r) => columns.map((c) => csvEscape(r[c])).join(',')).join('\n')}\n`;
}

function fmt(n) {
  return 'AUD ' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(value) {
  return Number(value || 0);
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(pty|ltd|limited|inc|incorporated|llc|corp|corporation|australia|australian|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return normalize(value).split(' ').filter((token) => token.length >= 3);
}

function vendorScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  const overlap = ta.filter((token) => setB.has(token)).length;
  return overlap / Math.max(ta.length, tb.length);
}

function amountScore(a, b) {
  const aa = Math.abs(num(a));
  const bb = Math.abs(num(b));
  if (!aa || !bb) return 0;
  const diff = Math.abs(aa - bb);
  const pct = diff / Math.max(aa, bb);
  if (diff <= 0.02) return 1;
  if (diff <= 0.5) return 0.95;
  if (diff <= 2 || pct <= 0.01) return 0.85;
  if (pct <= 0.05) return 0.6;
  if (pct <= 0.1) return 0.35;
  return 0;
}

function amountDiff(a, b) {
  return Math.abs(Math.abs(num(a)) - Math.abs(num(b)));
}

function dateScore(a, b, maxDays = 30) {
  if (!a || !b) return 0;
  const days = Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
  if (days <= 1) return 1;
  if (days <= 3) return 0.9;
  if (days <= 7) return 0.75;
  if (days <= 14) return 0.55;
  if (days <= maxDays) return 0.3;
  return 0;
}

function asLineItems(lineItems) {
  return Array.isArray(lineItems) ? lineItems : [];
}

function taxTypesFor(lineItems) {
  return [...new Set(asLineItems(lineItems).map((li) => li?.tax_type).filter(Boolean))];
}

function accountCodesFor(lineItems) {
  return [...new Set(asLineItems(lineItems).map((li) => li?.account_code).filter(Boolean))];
}

function gstAtRisk(lineItems) {
  return asLineItems(lineItems).reduce((sum, li) => {
    if (!GST_CREDIT_TYPES.has(li?.tax_type)) return sum;
    return sum + (Math.abs(num(li?.line_amount)) / 11);
  }, 0);
}

function quarterFor(date) {
  for (const [name, q] of Object.entries(QUARTERS)) {
    if (date >= q.start && date <= q.end) return `${name} FY${FY}`;
  }
  return 'Unknown';
}

function xeroTxnUrl(id) {
  return id ? `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${id}` : '';
}

function xeroBillUrl(id) {
  return id ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${id}` : '';
}

async function fetchAll(table, select, configure) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let query = sb.from(table).select(select).range(from, from + 999);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function findBestBill(tx, bills) {
  let best = null;
  for (const bill of bills) {
    const amount = amountScore(tx.total, bill.total);
    if (!amount) continue;
    const vendor = vendorScore(tx.contact_name, bill.contact_name);
    if (vendor < 0.25) continue;
    const date = dateScore(tx.date, bill.date, 45);
    if (!date) continue;
    const score = Math.round((amount * 45 + vendor * 35 + date * 20));
    if (!best || score > best.score) {
      best = { ...bill, score, amountScore: amount, vendorScore: vendor, dateScore: date };
    }
  }
  return best;
}

function receiptSearchText(receipt) {
  return [
    receipt.vendor_name,
    receipt.subject,
    receipt.from_email,
    receipt.attachment_filename,
  ].filter(Boolean).join(' ');
}

function findBestReceipt(tx, receipts) {
  let best = null;
  for (const receipt of receipts) {
    const linked = receipt.xero_bank_transaction_id === tx.xero_transaction_id || receipt.xero_transaction_id === tx.xero_transaction_id;
    const amount = amountScore(tx.total, receipt.amount_detected);
    const vendor = vendorScore(tx.contact_name, receiptSearchText(receipt));
    const date = dateScore(tx.date, String(receipt.received_at || '').slice(0, 10), 45);

    if (receipt.xero_bank_transaction_id === tx.xero_transaction_id || receipt.xero_transaction_id === tx.xero_transaction_id) {
      const warning = [];
      const diff = amountDiff(tx.total, receipt.amount_detected);
      if (diff > 2 && amount < 0.85) warning.push(`amount differs by ${fmt(diff)}`);
      if (vendor < 0.2) warning.push('vendor text is weak');
      if (!date) warning.push('receipt date is outside match window');
      const score = warning.length ? Math.round((amount * 45 + vendor * 35 + date * 20)) : 100;
      return {
        ...receipt,
        score,
        linked,
        warning: warning.join('; '),
        reason: warning.length ? 'linked in receipt pool but needs review' : 'already linked in receipt pool',
        amountScore: amount,
        vendorScore: vendor,
        dateScore: date,
      };
    }
    if (!amount) continue;
    if (vendor < 0.2) continue;
    if (!date) continue;
    const score = Math.round((amount * 45 + vendor * 35 + date * 20));
    if (!best || score > best.score) {
      best = { ...receipt, score, amountScore: amount, vendorScore: vendor, dateScore: date };
    }
  }
  return best;
}

function actionFor({ tx, taxTypes, gst, bestBill, bestReceipt }) {
  const isRd = RD_PROJECTS.has(tx.project_code) || tx.rd_eligible === true;
  const allNoGst = taxTypes.length > 0 && taxTypes.every((type) => BAS_EXCLUDED_TYPES.has(type) || G1_ONLY_TYPES.has(type));

  if (bestReceipt?.linked && bestReceipt?.warning) return 'REVIEW_LINKED_RECEIPT';
  if (!tx.project_code) return 'TAG_PROJECT';
  if (bestBill?.score >= 82) return 'XERO_FIND_MATCH';
  if (bestReceipt?.score >= 82) return 'UPLOAD_RECEIPT_POOL';
  if (!tx.is_reconciled && Math.abs(num(tx.total)) >= 500) return 'RECONCILE_FIRST';
  if (gst >= 20) return 'CHASE_RECEIPT';
  if (isRd) return 'R_AND_D_EVIDENCE';
  if (gst === 0 && allNoGst) return 'NO_GST_EVIDENCE_ONLY';
  if (!tx.is_reconciled) return 'RECONCILE_FIRST';
  return 'LOW_VALUE_REVIEW';
}

function priorityFor(row) {
  const actionWeight = {
    TAG_PROJECT: 95,
    REVIEW_LINKED_RECEIPT: 92,
    XERO_FIND_MATCH: 90,
    UPLOAD_RECEIPT_POOL: 85,
    RECONCILE_FIRST: 75,
    CHASE_RECEIPT: 70,
    R_AND_D_EVIDENCE: 55,
    LOW_VALUE_REVIEW: 35,
    NO_GST_EVIDENCE_ONLY: 10,
  }[row.action_code] || 0;
  return actionWeight + Math.min(row.gst_at_risk * 2, 25) + Math.min(Math.abs(row.amount) / 10000, 10);
}

async function main() {
  if (!SUPABASE_KEY) throw new Error('Missing Supabase service role key');
  mkdirSync(outDir, { recursive: true });

  console.log(`Generating receipt verification queue: ${selectedQuarters.join(' + ')} (${start} → ${end})`);

  const txns = await fetchAll(
    'xero_transactions',
    'xero_transaction_id, contact_name, total, date, type, bank_account, project_code, has_attachments, is_reconciled, status, line_items, rd_eligible, rd_category',
    (query) => query
      .eq('type', 'SPEND')
      .eq('status', 'AUTHORISED')
      .eq('has_attachments', false)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true }),
  );

  const lo = new Date(new Date(start).getTime() - 45 * 86400000).toISOString().slice(0, 10);
  const hi = new Date(new Date(end).getTime() + 45 * 86400000).toISOString().slice(0, 10);
  const bills = await fetchAll(
    'xero_invoices',
    'xero_id, invoice_number, contact_name, total, date, due_date, status, has_attachments',
    (query) => query
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'PAID'])
      .eq('has_attachments', true)
      .gte('date', lo)
      .lte('date', hi),
  );

  const receipts = await fetchAll(
    'receipt_emails',
    'id, vendor_name, amount_detected, received_at, subject, from_email, mailbox, source, status, xero_transaction_id, xero_bank_transaction_id, xero_invoice_id, match_confidence, match_method, attachment_filename',
    (query) => query
      .not('amount_detected', 'is', null)
      .gte('received_at', `${lo}T00:00:00`)
      .lte('received_at', `${hi}T23:59:59`),
  );

  const allRows = txns.map((tx) => {
    const taxTypes = taxTypesFor(tx.line_items);
    const accountCodes = accountCodesFor(tx.line_items);
    const gst = Number(gstAtRisk(tx.line_items).toFixed(2));
    const bestBill = findBestBill(tx, bills);
    const bestReceipt = findBestReceipt(tx, receipts);
    const action = actionFor({ tx, taxTypes, gst, bestBill, bestReceipt });
    const row = {
      quarter: quarterFor(tx.date),
      action_code: action,
      action: ACTION_LABELS[action],
      priority: 0,
      date: tx.date,
      vendor: tx.contact_name || '',
      amount: Number(tx.total || 0).toFixed(2),
      gst_at_risk: gst.toFixed(2),
      tax_types: taxTypes.join('+') || 'NO_TAX_TYPE',
      account_codes: accountCodes.join('+') || 'NO_ACCOUNT',
      project_code: tx.project_code || 'UNTAGGED',
      rd_flag: RD_PROJECTS.has(tx.project_code) || tx.rd_eligible === true ? 'yes' : 'no',
      reconciled: tx.is_reconciled ? 'yes' : 'no',
      bank_account: tx.bank_account || '',
      suggested_bill_score: bestBill?.score || '',
      suggested_bill_vendor: bestBill?.contact_name || '',
      suggested_bill_amount: bestBill?.total || '',
      suggested_bill_date: bestBill?.date || '',
      suggested_bill_number: bestBill?.invoice_number || '',
      suggested_bill_url: xeroBillUrl(bestBill?.xero_id),
      suggested_receipt_score: bestReceipt?.score || '',
      suggested_receipt_vendor: bestReceipt?.vendor_name || '',
      suggested_receipt_amount: bestReceipt?.amount_detected || '',
      suggested_receipt_date: String(bestReceipt?.received_at || '').slice(0, 10),
      suggested_receipt_subject: bestReceipt?.subject || '',
      suggested_receipt_reason: bestReceipt?.reason || '',
      suggested_receipt_amount_score: bestReceipt?.amountScore === undefined ? '' : bestReceipt.amountScore.toFixed(2),
      suggested_receipt_vendor_score: bestReceipt?.vendorScore === undefined ? '' : bestReceipt.vendorScore.toFixed(2),
      suggested_receipt_date_score: bestReceipt?.dateScore === undefined ? '' : bestReceipt.dateScore.toFixed(2),
      match_warning: bestReceipt?.warning || '',
      xero_bank_txn_url: xeroTxnUrl(tx.xero_transaction_id),
      xero_transaction_id: tx.xero_transaction_id || '',
    };
    row.priority = priorityFor(row).toFixed(2);
    return row;
  });

  const rows = allRows
    .filter((row) => !actionFilter || actionFilter.has(row.action_code))
    .filter((row) => minGstFilter === null || num(row.gst_at_risk) >= minGstFilter)
    .filter((row) => {
      if (!vendorFilter) return true;
      const rowVendor = normalize(row.vendor);
      return rowVendor && (rowVendor.includes(vendorFilter) || vendorFilter.includes(rowVendor));
    })
    .filter((row) => !projectFilter || row.project_code.toUpperCase() === projectFilter)
    .sort((a, b) => Number(b.priority) - Number(a.priority));

  const columns = [
    'quarter', 'action', 'priority', 'date', 'vendor', 'amount', 'gst_at_risk',
    'tax_types', 'account_codes', 'project_code', 'rd_flag', 'reconciled',
    'bank_account', 'suggested_bill_score', 'suggested_bill_vendor',
    'suggested_bill_amount', 'suggested_bill_date', 'suggested_bill_number',
    'suggested_bill_url', 'suggested_receipt_score', 'suggested_receipt_vendor',
    'suggested_receipt_amount', 'suggested_receipt_date', 'suggested_receipt_subject',
    'suggested_receipt_reason', 'suggested_receipt_amount_score',
    'suggested_receipt_vendor_score', 'suggested_receipt_date_score',
    'match_warning', 'xero_bank_txn_url', 'xero_transaction_id',
  ];
  writeFileSync(path.join(outDir, 'queue.csv'), toCSV(rows, columns));

  const byAction = new Map();
  const byQuarter = new Map();
  for (const row of rows) {
    const action = byAction.get(row.action_code) || { count: 0, amount: 0, gst: 0 };
    action.count++;
    action.amount += Math.abs(num(row.amount));
    action.gst += num(row.gst_at_risk);
    byAction.set(row.action_code, action);

    const quarter = byQuarter.get(row.quarter) || { count: 0, amount: 0, gst: 0 };
    quarter.count++;
    quarter.amount += Math.abs(num(row.amount));
    quarter.gst += num(row.gst_at_risk);
    byQuarter.set(row.quarter, quarter);
  }

  const topRows = rows.slice(0, 30);
  const summary = [
    `# Receipt Verification Queue — ${selectedQuarters.join(' + ')} FY${FY}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Range: ${start} to ${end}`,
    `Rows before filters: ${allRows.length}`,
    `Rows after filters: ${rows.length}`,
    '',
    '## Filters',
    '',
    `- Actions: ${actionFilter ? [...actionFilter].map((code) => ACTION_LABELS[code]).join(', ') : 'all actions'}`,
    `- Minimum GST at risk: ${minGstFilter === null ? 'none' : fmt(minGstFilter)}`,
    `- Vendor: ${vendorFilter || 'all vendors'}`,
    `- Project: ${projectFilter || 'all projects'}`,
    '',
    '## What This Does',
    '',
    'This queue reduces Xero receipt cleanup to the smallest practical set of actions. It prioritises project-code gaps, existing bill/receipt matches, unreconciled high-value lines, GST-at-risk items, and R&D evidence. It does not write to Xero or Supabase.',
    '',
    '## Summary By Action',
    '',
    '| Action | Rows | Amount | GST at risk |',
    '|---|---:|---:|---:|',
    ...[...byAction.entries()]
      .sort((a, b) => b[1].gst - a[1].gst || b[1].amount - a[1].amount)
      .map(([code, value]) => `| ${ACTION_LABELS[code]} | ${value.count} | ${fmt(value.amount)} | ${fmt(value.gst)} |`),
    '',
    '## Summary By Quarter',
    '',
    '| Quarter | Rows | Amount | GST at risk |',
    '|---|---:|---:|---:|',
    ...[...byQuarter.entries()].map(([quarter, value]) => `| ${quarter} | ${value.count} | ${fmt(value.amount)} | ${fmt(value.gst)} |`),
    '',
    '## Top 30 Rows To Work',
    '',
    '| Action | Quarter | Vendor | Amount | GST at risk | Project | Reconciled | Best match |',
    '|---|---|---|---:|---:|---|---|---|',
    ...topRows.map((row) => {
      const match = row.suggested_bill_score
        ? `bill ${row.suggested_bill_score}`
        : row.suggested_receipt_score
          ? `receipt ${row.suggested_receipt_score}`
          : '';
      return `| ${row.action} | ${row.quarter} | ${row.vendor} | ${fmt(row.amount)} | ${fmt(row.gst_at_risk)} | ${row.project_code} | ${row.reconciled} | ${match} |`;
    }),
    '',
    '## How To Use',
    '',
    '1. Open `queue.csv` in a spreadsheet.',
    '2. Filter action = `Tag project` first and fix project code gaps.',
    '3. Filter action = `Review linked receipt`; these have an existing receipt-pool link but amount/vendor/date looks suspicious.',
    '4. Filter action = `Xero Find & Match`; open the bank transaction and bill URLs side by side.',
    '5. Filter action = `Upload / link receipt from pool`; verify the suggested receipt, then use the receipt upload/link script or Xero UI.',
    '6. Filter action = `Chase receipt`; sort by GST at risk and only chase material rows.',
    '7. Filter action = `R&D evidence only`; these may not affect GST but should be kept for R&D substantiation.',
    '8. Ignore or batch-close `No GST evidence only` after Standard Ledger agrees the tax type is acceptable.',
    '',
    '## Verification Status',
    '',
    `verified: Queried authorised unreceipted Xero SPEND rows, ACCPAY bills with attachments, and receipt_emails candidates from ACT Supabase for ${start} to ${end}. Generated queue.csv and summary.md.`,
    '',
    'inferred: Match scores are deterministic vendor/amount/date heuristics. They are decision support, not proof.',
    '',
    'unverified: Xero UI attachment state after this run, Gmail raw search outside receipt_emails, Xero Files library, Standard Ledger approval, and any write-back to Xero/Supabase.',
  ].join('\n');

  writeFileSync(path.join(outDir, 'summary.md'), summary);

  console.log(`Rows: ${rows.length}`);
  if (rows.length !== allRows.length) console.log(`Rows before filters: ${allRows.length}`);
  if (actionFilter) console.log(`Action filter: ${[...actionFilter].join(', ')}`);
  if (minGstFilter !== null) console.log(`Minimum GST filter: ${fmt(minGstFilter)}`);
  if (vendorFilter) console.log(`Vendor filter: ${vendorFilter}`);
  if (projectFilter) console.log(`Project filter: ${projectFilter}`);
  for (const [code, value] of [...byAction.entries()].sort((a, b) => b[1].gst - a[1].gst || b[1].amount - a[1].amount)) {
    console.log(`${ACTION_LABELS[code]}: ${value.count} rows, ${fmt(value.amount)}, GST ${fmt(value.gst)}`);
  }
  console.log(`\nWrote: ${outDir}/summary.md`);
  console.log(`Wrote: ${outDir}/queue.csv`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
