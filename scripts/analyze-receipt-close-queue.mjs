#!/usr/bin/env node
/**
 * Analyze the Q2/Q3 receipt-backed close queue.
 *
 * This is read-only by default. With --apply-mirror-hygiene it updates only
 * Supabase bank_statement_lines mirror status for rows already reconciled in
 * the Xero mirrors. It never writes to Xero.
 *
 * It separates "has a good receipt" from "safe to reconcile/attach" by checking
 * the Xero transaction and payment mirrors.
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY_MIRROR_HYGIENE = args.includes('--apply-mirror-hygiene');
const QUARTERS = valueAfter('--quarters')
  ? valueAfter('--quarters').split(',').map((q) => q.trim().toUpperCase()).filter(Boolean)
  : ['Q2', 'Q3'];
const DATE = todayInBrisbane();
const OUT_DIR = join('thoughts', 'shared', 'reports', `receipt-close-queue-${DATE}`);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function todayInBrisbane() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function quarterDates(quarter) {
  const quarters = {
    Q1: { start: '2025-07-01', end: '2025-09-30' },
    Q2: { start: '2025-10-01', end: '2025-12-31' },
    Q3: { start: '2026-01-01', end: '2026-03-31' },
    Q4: { start: '2026-04-01', end: '2026-06-30' },
  };
  if (!quarters[quarter]) throw new Error(`Unsupported quarter: ${quarter}`);
  return quarters[quarter];
}

function money(value) {
  return Number(value || 0).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

function absAmount(value) {
  return Math.abs(Number(value || 0));
}

function hasAttachment(candidate) {
  return Boolean(
    candidate.attachment_url
    || candidate.attachment_storage_path
    || candidate.attachment_filename,
  );
}

function isStrictDextBackedCandidate(candidate) {
  if (!candidate) return false;
  if (!['dext_receipt', 'receipt_email'].includes(String(candidate.source || ''))) return false;
  if (!hasAttachment(candidate)) return false;
  if (Number(candidate.confidence || 0) < 0.99) return false;
  if (Math.abs(Number(candidate.amount_delta || 0)) > 0.005) return false;
  if (Number(candidate.amount_score || 0) !== 1) return false;
  if (Number(candidate.vendor_score || 0) < 0.85) return false;

  const dateDelta = candidate.date_delta_days;
  if (dateDelta === null || dateDelta === undefined || dateDelta === '') return false;
  return Math.abs(Number(dateDelta)) <= 7;
}

function bestStrictCandidate(row) {
  const candidates = Array.isArray(row.receipt_candidates) ? row.receipt_candidates : [];
  return candidates
    .filter(isStrictDextBackedCandidate)
    .sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
}

function sumRows(items) {
  return items.reduce((sum, item) => sum + absAmount(item.row.amount), 0);
}

async function fetchRowsForQuarter(quarter) {
  const { start, end } = quarterDates(quarter);
  const { data, error } = await sb
    .from('v_finance_bank_line_evidence')
    .select('*')
    .eq('direction', 'debit')
    .gte('date', start)
    .lte('date', end)
    .order('amount', { ascending: false })
    .limit(2000);

  if (error) throw error;
  return (data || []).map((row) => ({ ...row, quarter }));
}

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(string)) return string;
  return `"${string.replace(/"/g, '""')}"`;
}

function writeCsv(path, rows) {
  const headers = [
    'category',
    'quarter',
    'date',
    'payee',
    'particulars',
    'amount',
    'candidate_source',
    'candidate_vendor',
    'candidate_date',
    'xero_invoice_id',
    'xero_bank_transaction_id',
    'xero_payment_id',
    'xero_payment_amount',
    'xero_payment_reconciled',
    'xero_transaction_reconciled',
    'note',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((item) => headers.map((header) => csvEscape(item[header])).join(',')),
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}

const allRows = [];
for (const quarter of QUARTERS) {
  allRows.push(...await fetchRowsForQuarter(quarter));
}

const strictRows = allRows
  .filter((row) => String(row.status || '').toLowerCase() === 'unreconciled')
  .map((row) => ({ row, candidate: bestStrictCandidate(row) }))
  .filter((item) => item.candidate);

const invoiceIds = [...new Set(strictRows.map((item) => item.candidate.xero_invoice_id).filter(Boolean))];
const bankTxnIds = [...new Set(strictRows.map((item) => item.candidate.xero_bank_transaction_id).filter(Boolean))];

const { data: payments = [], error: paymentError } = invoiceIds.length
  ? await sb
    .from('xero_payments')
    .select('xero_payment_id, invoice_xero_id, date, amount, is_reconciled, status, account_name')
    .in('invoice_xero_id', invoiceIds)
  : { data: [], error: null };
if (paymentError) throw paymentError;

const { data: xeroTransactions = [], error: transactionError } = bankTxnIds.length
  ? await sb
    .from('xero_transactions')
    .select('xero_transaction_id, date, contact_name, total, is_reconciled, has_attachments, type, status')
    .in('xero_transaction_id', bankTxnIds)
  : { data: [], error: null };
if (transactionError) throw transactionError;

const paymentsByInvoice = new Map();
for (const payment of payments || []) {
  const list = paymentsByInvoice.get(payment.invoice_xero_id) || [];
  list.push(payment);
  paymentsByInvoice.set(payment.invoice_xero_id, list);
}

const transactionById = new Map((xeroTransactions || []).map((txn) => [txn.xero_transaction_id, txn]));
const bankTargetUseCount = new Map();
for (const item of strictRows) {
  const id = item.candidate.xero_bank_transaction_id;
  if (id) bankTargetUseCount.set(id, (bankTargetUseCount.get(id) || 0) + 1);
}

const categories = {
  already_reconciled_exact_payment: [],
  invoice_payment_amount_mismatch: [],
  invoice_no_reconciled_payment: [],
  bank_transaction_reconciled_unique: [],
  bank_transaction_duplicate_target: [],
  bank_transaction_unreconciled_or_unknown: [],
  no_xero_target: [],
};

for (const item of strictRows) {
  const { row, candidate } = item;
  const amount = absAmount(row.amount);
  const invoiceId = candidate.xero_invoice_id;
  const bankTxnId = candidate.xero_bank_transaction_id;

  if (invoiceId) {
    const invoicePayments = paymentsByInvoice.get(invoiceId) || [];
    const reconciledPayments = invoicePayments.filter((payment) => payment.is_reconciled === true);
    const exactPayment = reconciledPayments.find((payment) => Math.abs(absAmount(payment.amount) - amount) < 0.01);

    if (exactPayment) {
      categories.already_reconciled_exact_payment.push({ ...item, payment: exactPayment });
    } else if (reconciledPayments.length > 0) {
      categories.invoice_payment_amount_mismatch.push({ ...item, payments: reconciledPayments });
    } else {
      categories.invoice_no_reconciled_payment.push({ ...item, payments: invoicePayments });
    }
    continue;
  }

  if (bankTxnId) {
    const txn = transactionById.get(bankTxnId);
    if ((bankTargetUseCount.get(bankTxnId) || 0) > 1) {
      categories.bank_transaction_duplicate_target.push({ ...item, transaction: txn });
    } else if (txn?.is_reconciled === true) {
      categories.bank_transaction_reconciled_unique.push({ ...item, transaction: txn });
    } else {
      categories.bank_transaction_unreconciled_or_unknown.push({ ...item, transaction: txn });
    }
    continue;
  }

  categories.no_xero_target.push(item);
}

let mirrorHygieneUpdated = 0;
if (APPLY_MIRROR_HYGIENE) {
  const exactPaymentRows = categories.already_reconciled_exact_payment;
  const bankTxnRows = categories.bank_transaction_reconciled_unique;

  for (const item of exactPaymentRows) {
    const { error } = await sb
      .from('bank_statement_lines')
      .update({ status: 'reconciled' })
      .eq('id', item.row.id);
    if (error) throw error;
    mirrorHygieneUpdated += 1;
  }

  for (const item of bankTxnRows) {
    const { error } = await sb
      .from('bank_statement_lines')
      .update({
        status: 'reconciled',
        matched_xero_transaction_id: item.candidate.xero_bank_transaction_id,
        xero_transaction_id: item.candidate.xero_bank_transaction_id,
      })
      .eq('id', item.row.id);
    if (error) throw error;
    mirrorHygieneUpdated += 1;
  }
}

mkdirSync(OUT_DIR, { recursive: true });

const flatRows = [];
for (const [category, items] of Object.entries(categories)) {
  for (const item of items) {
    const payment = item.payment || item.payments?.[0] || null;
    flatRows.push({
      category,
      quarter: item.row.quarter,
      date: item.row.date,
      payee: item.row.payee,
      particulars: item.row.particulars,
      amount: absAmount(item.row.amount).toFixed(2),
      candidate_source: item.candidate.source,
      candidate_vendor: item.candidate.vendor_name,
      candidate_date: item.candidate.document_date,
      xero_invoice_id: item.candidate.xero_invoice_id || '',
      xero_bank_transaction_id: item.candidate.xero_bank_transaction_id || '',
      xero_payment_id: payment?.xero_payment_id || '',
      xero_payment_amount: payment?.amount ?? '',
      xero_payment_reconciled: payment?.is_reconciled ?? '',
      xero_transaction_reconciled: item.transaction?.is_reconciled ?? '',
      note: item.payments?.length > 1 ? `${item.payments.length} reconciled payments found` : '',
    });
  }
}

writeCsv(join(OUT_DIR, 'strict-dext-backed-unreconciled.csv'), flatRows);

const summaryLines = [
  `# Receipt Close Queue - ${QUARTERS.join(' + ')} FY26`,
  '',
  `Generated: ${new Date().toISOString()}`,
  `Mode: ${APPLY_MIRROR_HYGIENE ? 'APPLY SUPABASE MIRROR HYGIENE' : 'READ ONLY'}`,
  `Supabase: ${SUPABASE_URL}`,
  '',
  '## Strict Dext-Backed Unreconciled Queue',
  '',
  `- Rows: ${strictRows.length}`,
  `- Value: ${money(sumRows(strictRows))}`,
  '',
  '## Categories',
  '',
  ...Object.entries(categories).map(([category, items]) => (
    `- ${category}: ${items.length} (${money(sumRows(items))})`
  )),
  '',
  '## Output Files',
  '',
  `- ${join(OUT_DIR, 'strict-dext-backed-unreconciled.csv')}`,
  '',
  '## Verification Status',
  '',
  'verified: Queried live Supabase v_finance_bank_line_evidence, xero_payments, and xero_transactions.',
  APPLY_MIRROR_HYGIENE
    ? `verified: This script performed Supabase-only mirror hygiene for ${mirrorHygieneUpdated} rows already reconciled in the Xero mirrors.`
    : 'verified: This script performed no Xero writes and no Supabase writes.',
  'inferred: Strict receipt matches are based on deterministic receipt-evidence scores and mirror IDs.',
  'unverified: Xero UI was not clicked; duplicate bank transaction targets require manual/Xero UI review.',
  '',
];

writeFileSync(join(OUT_DIR, 'summary.md'), summaryLines.join('\n'));
writeFileSync(join(OUT_DIR, 'summary.md.provenance.md'), [
  `# Provenance - Receipt Close Queue ${QUARTERS.join(' + ')} FY26`,
  '',
  `Report: ${join(OUT_DIR, 'summary.md')}`,
  `Generated: ${new Date().toISOString()}`,
  `Command: node scripts/analyze-receipt-close-queue.mjs --quarters ${QUARTERS.join(',')}${APPLY_MIRROR_HYGIENE ? ' --apply-mirror-hygiene' : ''}`,
  '',
  '## Queried Sources',
  '',
  '- public.v_finance_bank_line_evidence: debit bank lines and receipt candidates',
  '- public.xero_payments: invoice payment mirror',
  '- public.xero_transactions: bank transaction mirror',
  '',
  '## Verified',
  '',
  '- Live Supabase data was queried during this run.',
  APPLY_MIRROR_HYGIENE
    ? `- Supabase-only mirror status updates were applied to ${mirrorHygieneUpdated} rows already reconciled in the Xero mirrors.`
    : '- The analysis script was read-only.',
  '',
  '## Inferred',
  '',
  '- Strict match confidence depends on the receipt evidence scoring model.',
  '- Xero UI actionability is inferred from mirror IDs and duplicate target checks.',
  '',
  '## Unknown / Not Checked',
  '',
  '- Whether Xero UI currently shows each row in the bank reconciliation queue.',
  '- BAS lodgement report figures.',
  '',
].join('\n'));

console.log(`Receipt close queue analysis complete`);
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Quarters: ${QUARTERS.join(', ')}`);
console.log(`  Strict queue: ${strictRows.length} (${money(sumRows(strictRows))})`);
for (const [category, items] of Object.entries(categories)) {
  console.log(`  ${category.padEnd(42)} ${String(items.length).padStart(3)}  ${money(sumRows(items)).padStart(14)}`);
}
console.log(`  Report: ${join(OUT_DIR, 'summary.md')}`);
if (APPLY_MIRROR_HYGIENE) console.log(`  Applied Supabase mirror hygiene: ${mirrorHygieneUpdated} rows`);
