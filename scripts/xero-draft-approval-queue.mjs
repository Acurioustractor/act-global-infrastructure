#!/usr/bin/env node
import './lib/load-env.mjs';

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const args = process.argv.slice(2);
const QUARTERS = valueAfter('--quarters')
  ? valueAfter('--quarters').split(',').map((q) => q.trim().toUpperCase()).filter(Boolean)
  : ['Q2', 'Q3'];
const LIMIT = Number(valueAfter('--limit') || 1000);
const DATE = todayInBrisbane();
const OUT_DIR = join('thoughts', 'shared', 'reports', `xero-draft-approval-queue-${DATE}`);
const RECEIPT_THRESHOLD = 82.5;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

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

function asNumber(value) {
  const parsed = typeof value === 'number' ? value : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asPercent(value) {
  const number = asNumber(value);
  return number > 0 && number <= 1 ? number * 100 : number;
}

function money(value) {
  return asNumber(value).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

function blank(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function vendor(row) {
  return row.best_vendor_name || row.payee || row.particulars || row.reference || 'Bank line';
}

function description(row) {
  return [row.particulars, row.reference, row.bank_account].filter(Boolean).join(' · ');
}

function hasXeroTarget(row) {
  return !blank(row.xero_transaction_id) || !blank(row.matched_xero_transaction_id);
}

function hasLocalReceipt(row) {
  return Boolean(
    row.has_approved_link
      || row.receipt_match_status === 'matched'
      || row.evidence_status === 'covered_legacy'
      || row.evidence_status === 'covered_evidence'
      || row.evidence_status === 'matched'
  );
}

function hasCandidate(row) {
  return Boolean(
    Number(row.candidate_count || 0) > 0
      || row.evidence_status === 'candidate'
      || row.evidence_status === 'high_confidence_candidate'
  );
}

function receiptState(row) {
  if (hasLocalReceipt(row)) return 'local_receipt_ready';
  if (hasCandidate(row)) return 'candidate_receipt_review';
  if (Math.abs(asNumber(row.amount)) <= RECEIPT_THRESHOLD) return 'under_threshold_needs_file_if_available';
  return 'missing_receipt';
}

function priority(row) {
  if (hasLocalReceipt(row)) return 1;
  if (hasCandidate(row)) return 2;
  if (Math.abs(asNumber(row.amount)) <= RECEIPT_THRESHOLD) return 3;
  return 4;
}

function xeroNextStep(row) {
  const state = receiptState(row);
  if (state === 'local_receipt_ready') return 'Approve matching Xero Expenses draft or create spend-money, then reconcile.';
  if (state === 'candidate_receipt_review') return 'Confirm/reject receipt candidate, then approve/create Xero target.';
  if (state === 'under_threshold_needs_file_if_available') return 'Check Xero Expenses draft and attach file if available; otherwise mark low-value policy decision.';
  return 'Find receipt in Xero Me/Dext/Gmail or upload manually before creating/reconciling.';
}

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(string)) return string;
  return `"${string.replace(/"/g, '""')}"`;
}

function writeCsv(path, rows) {
  const headers = [
    'priority',
    'quarter',
    'date',
    'amount',
    'vendor',
    'description',
    'receipt_state',
    'candidate_count',
    'confidence',
    'best_source',
    'project_code',
    'project_source',
    'rd_eligible',
    'xero_next_step',
    'xero_search',
    'bank_line_id',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}

async function fetchRowsForQuarter(quarter) {
  const { start, end } = quarterDates(quarter);
  const { data, error } = await sb
    .from('v_finance_bank_line_evidence')
    .select('id, date, direction, payee, particulars, reference, amount, status, bank_account, project_code, project_source, rd_eligible, receipt_match_status, evidence_status, candidate_count, best_confidence, best_source, best_vendor_name, has_approved_link, xero_transaction_id, matched_xero_transaction_id')
    .eq('direction', 'debit')
    .eq('status', 'unreconciled')
    .gte('date', start)
    .lte('date', end)
    .order('amount', { ascending: false })
    .limit(LIMIT);

  if (error) throw error;
  return (data || []).map((row) => ({ ...row, quarter }));
}

const rows = [];
for (const quarter of QUARTERS) {
  rows.push(...await fetchRowsForQuarter(quarter));
}

const queue = rows
  .filter((row) => !hasXeroTarget(row))
  .sort((a, b) => {
    const priorityDelta = priority(a) - priority(b);
    if (priorityDelta !== 0) return priorityDelta;
    return Math.abs(asNumber(b.amount)) - Math.abs(asNumber(a.amount));
  });

const csvRows = queue.map((row) => {
  const amount = Math.abs(asNumber(row.amount));
  const name = vendor(row);
  return {
    priority: priority(row),
    quarter: row.quarter,
    date: row.date || '',
    amount: amount.toFixed(2),
    vendor: name,
    description: description(row),
    receipt_state: receiptState(row),
    candidate_count: row.candidate_count || 0,
    confidence: row.best_confidence == null ? '' : Math.round(asPercent(row.best_confidence)),
    best_source: row.best_source || '',
    project_code: row.project_code || '',
    project_source: row.project_source || '',
    rd_eligible: row.rd_eligible === true ? 'true' : row.rd_eligible === false ? 'false' : '',
    xero_next_step: xeroNextStep(row),
    xero_search: `${name} ${amount.toFixed(2)} ${row.date || ''}`,
    bank_line_id: row.id,
  };
});

mkdirSync(OUT_DIR, { recursive: true });
writeCsv(join(OUT_DIR, 'queue.csv'), csvRows);

const counts = csvRows.reduce((acc, row) => {
  acc[row.receipt_state] = (acc[row.receipt_state] || 0) + 1;
  return acc;
}, {});
const valueByState = csvRows.reduce((acc, row) => {
  acc[row.receipt_state] = (acc[row.receipt_state] || 0) + asNumber(row.amount);
  return acc;
}, {});

const topRows = csvRows.slice(0, 40).map((row) => (
  `| ${row.priority} | ${row.quarter} | ${row.date} | ${money(row.amount)} | ${row.vendor} | ${row.receipt_state} | ${row.project_code || '-'} | ${row.xero_next_step} |`
));

const summary = [
  `# Xero Draft Approval Queue - ${QUARTERS.join(' + ')} FY26`,
  '',
  `Generated: ${new Date().toISOString()}`,
  `Supabase: ${SUPABASE_URL}`,
  '',
  '## What This Queue Means',
  '',
  'These are unreconciled spend bank lines where the ACT mirror has no Xero accounting target yet.',
  'That usually means one of three things: a Xero Expenses/Xero Me draft exists but has not been approved, a spend-money transaction still needs to be created, or the Xero mirror has not been resynced after manual work.',
  '',
  '## Summary',
  '',
  `- Rows missing mirrored Xero target: ${csvRows.length}`,
  `- Value: ${money(csvRows.reduce((sum, row) => sum + asNumber(row.amount), 0))}`,
  `- Local receipt already ready: ${counts.local_receipt_ready || 0} (${money(valueByState.local_receipt_ready || 0)})`,
  `- Candidate receipt to review: ${counts.candidate_receipt_review || 0} (${money(valueByState.candidate_receipt_review || 0)})`,
  `- Under threshold: ${counts.under_threshold_needs_file_if_available || 0} (${money(valueByState.under_threshold_needs_file_if_available || 0)})`,
  `- Missing receipt: ${counts.missing_receipt || 0} (${money(valueByState.missing_receipt || 0)})`,
  '',
  '## Fast Workflow',
  '',
  '1. Open Xero Expenses drafts.',
  '2. Search each priority 1/2 row by amount, date, or vendor.',
  '3. Approve/create the Xero transaction with the project/R&D context shown in `queue.csv`.',
  '4. Reconcile the matching NAB Visa bank-feed line in Xero.',
  '5. Rerun `node scripts/sync-xero-to-supabase.mjs transactions` and refresh `/finance/workbench?status=xero_drafts`.',
  '',
  '## Top Rows',
  '',
  '| Priority | Quarter | Date | Amount | Vendor | Receipt state | Project | Xero next step |',
  '|---:|---|---|---:|---|---|---|---|',
  ...topRows,
  '',
  '## Output Files',
  '',
  `- ${join(OUT_DIR, 'queue.csv')}`,
  '',
  '## Verification Status',
  '',
  'verified: Queried live Supabase v_finance_bank_line_evidence for unreconciled debit bank lines and Xero target IDs.',
  'verified: This script performed no Supabase writes and no Xero writes.',
  'inferred: Xero draft likelihood is inferred from unreconciled bank lines with no mirrored Xero accounting target.',
  'unverified: Xero UI draft existence and final bank-feed reconciliation state were not checked by this script.',
  '',
].join('\n');

writeFileSync(join(OUT_DIR, 'summary.md'), summary);
writeFileSync(join(OUT_DIR, 'summary.md.provenance.md'), [
  `# Provenance - Xero Draft Approval Queue ${QUARTERS.join(' + ')} FY26`,
  '',
  `Report: ${join(OUT_DIR, 'summary.md')}`,
  `Generated: ${new Date().toISOString()}`,
  `Command: node scripts/xero-draft-approval-queue.mjs --quarters ${QUARTERS.join(',')}`,
  '',
  '## Queried Sources',
  '',
  '- public.v_finance_bank_line_evidence: bank lines, receipt evidence status, candidate counts, Xero mirror IDs, project/R&D mirror fields',
  '',
  '## Verified',
  '',
  '- Live Supabase data was queried during this run.',
  '- The report is read-only.',
  '',
  '## Inferred',
  '',
  '- Rows with unreconciled debit bank status and no Xero target ID are treated as Xero draft/create/reconcile assist rows.',
  '- Receipt readiness is inferred from receipt evidence status and candidate counts.',
  '',
  '## Unknown / Not Checked',
  '',
  '- Whether a matching Xero Expenses draft currently exists for each row.',
  '- Whether Xero UI has already been manually reconciled after the last mirror sync.',
  '',
].join('\n'));

console.log('Xero draft approval queue generated');
console.log(`  Supabase: ${SUPABASE_URL}`);
console.log(`  Quarters: ${QUARTERS.join(', ')}`);
console.log(`  Rows: ${csvRows.length}`);
console.log(`  Value: ${money(csvRows.reduce((sum, row) => sum + asNumber(row.amount), 0))}`);
console.log(`  Report: ${join(OUT_DIR, 'summary.md')}`);
