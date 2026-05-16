#!/usr/bin/env node
/**
 * Xero expense drafts smoke test.
 *
 * Read-only checks for the faster Xero Me path:
 * - Organisation access
 * - draft Receipts endpoint
 * - ExpenseClaims endpoint
 * - target lookup for the known Triple Bull bank-line example
 *
 * This script does not submit, approve, pay, attach, or reconcile anything.
 * OAuth token rotation may update local token mirrors.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const REPORT_DATE = new Date().toISOString().slice(0, 10);
const REPORT_DIR = path.join('thoughts', 'shared', 'reports', `xero-expense-drafts-smoke-${REPORT_DATE}`);
const REPORT_PATH = path.join(REPORT_DIR, 'summary.md');
const PROVENANCE_PATH = `${REPORT_PATH}.provenance.md`;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL/service role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function get(obj, ...names) {
  for (const name of names) {
    if (obj && obj[name] != null) return obj[name];
  }
  return null;
}

function arrayFrom(payload, key) {
  const value = get(payload, key, key[0].toLowerCase() + key.slice(1));
  return Array.isArray(value) ? value : [];
}

function parseXeroDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value);
  const match = raw.match(/\/Date\((\d+)([+-]\d+)?\)\//);
  if (match) return new Date(Number(match[1])).toISOString().slice(0, 10);
  return raw.slice(0, 10);
}

function amount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  const n = amount(value);
  return n == null ? '-' : `$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const left = new Date(`${a}T00:00:00Z`);
  const right = new Date(`${b}T00:00:00Z`);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null;
  return Math.round((left.getTime() - right.getTime()) / 86_400_000);
}

function statusCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const status = get(row, 'Status', 'status') || '(none)';
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function normaliseReceipt(row, source, claim = null) {
  const contact = get(row, 'Contact', 'contact') || {};
  const user = get(row, 'User', 'user') || {};
  const lineItems = get(row, 'LineItems', 'lineItems') || [];
  return {
    source,
    id: get(row, 'ReceiptID', 'receiptID') || get(row, 'ID', 'id'),
    claimId: claim ? get(claim, 'ExpenseClaimID', 'expenseClaimID') : null,
    claimStatus: claim ? get(claim, 'Status', 'status') : null,
    status: get(row, 'Status', 'status'),
    date: parseXeroDate(get(row, 'Date', 'date')),
    total: amount(get(row, 'Total', 'total')),
    contactName: get(contact, 'Name', 'name'),
    userName: [get(user, 'FirstName', 'firstName'), get(user, 'LastName', 'lastName')].filter(Boolean).join(' '),
    reference: get(row, 'Reference', 'reference') || get(row, 'ReceiptNumber', 'receiptNumber'),
    hasAttachments: Boolean(get(row, 'HasAttachments', 'hasAttachments')),
    lineText: lineItems.map(item => get(item, 'Description', 'description')).filter(Boolean).join(' | '),
  };
}

function targetMatches(rows) {
  const targetDate = '2026-03-25';
  const targetAmount = 153;
  return rows
    .map(row => {
      const text = [
        row.contactName,
        row.reference,
        row.lineText,
        row.userName,
      ].filter(Boolean).join(' ').toLowerCase();
      const dateDelta = daysBetween(row.date, targetDate);
      const amountDelta = row.total == null ? null : Math.abs(Math.abs(row.total) - targetAmount);
      const textHit = text.includes('triple') || text.includes('bull') || text.includes('cronulla');
      const amountHit = amountDelta != null && amountDelta <= 1;
      const dateHit = dateDelta != null && Math.abs(dateDelta) <= 7;
      const score = (textHit ? 3 : 0) + (amountHit ? 2 : 0) + (dateHit ? 1 : 0);
      return { ...row, dateDelta, amountDelta, score };
    })
    .filter(row => row.score >= 2)
    .sort((a, b) => b.score - a.score || Math.abs(a.dateDelta ?? 999) - Math.abs(b.dateDelta ?? 999))
    .slice(0, 20);
}

async function attempt(label, fn) {
  try {
    const data = await fn();
    return { label, ok: true, data };
  } catch (error) {
    return {
      label,
      ok: false,
      error: error.message,
      status: error.status || null,
    };
  }
}

function endpointLine(result) {
  if (result.ok) return `- verified: ${result.label} returned HTTP 200.`;
  return `- unverified: ${result.label} failed${result.status ? ` with HTTP ${result.status}` : ''}: ${result.error}`;
}

function table(rows) {
  if (rows.length === 0) return '_No matches._';
  return [
    '| Source | Status | Date | Amount | Contact | Reference | Claim | Attachments | Match note |',
    '| --- | --- | ---: | ---: | --- | --- | --- | --- | --- |',
    ...rows.map(row => [
      row.source,
      row.status || '-',
      row.date || '-',
      money(row.total),
      (row.contactName || '-').replaceAll('|', '/'),
      (row.reference || '-').replaceAll('|', '/'),
      row.claimId ? `${row.claimStatus || '-'} ${row.claimId}` : '-',
      row.hasAttachments ? 'yes' : 'no',
      `amount delta ${row.amountDelta == null ? '-' : `$${row.amountDelta.toFixed(2)}`}; date delta ${row.dateDelta == null ? '-' : `${row.dateDelta}d`}`,
    ].join(' | ')).map(line => `| ${line} |`),
  ].join('\n');
}

async function main() {
  console.log('Xero expense drafts smoke test');
  console.log('Read-only Xero accounting checks. No accounting-state mutation.\n');

  const xero = await createXeroClient(supabase);

  const organisation = await attempt('Organisation', () => xero.get('Organisation'));
  const receiptsResult = await attempt('Receipts', () => xero.get('Receipts'));
  const claimsResult = await attempt('ExpenseClaims', () => xero.get('ExpenseClaims'));

  const receipts = receiptsResult.ok
    ? arrayFrom(receiptsResult.data, 'Receipts').map(row => normaliseReceipt(row, 'Receipts endpoint'))
    : [];
  const claims = claimsResult.ok ? arrayFrom(claimsResult.data, 'ExpenseClaims') : [];
  const claimReceipts = claims.flatMap(claim => {
    const rows = get(claim, 'Receipts', 'receipts') || [];
    return rows.map(row => normaliseReceipt(row, 'ExpenseClaims receipt', claim));
  });
  const allReceipts = [...receipts, ...claimReceipts];
  const matches = targetMatches(allReceipts);

  const lines = [
    '# Xero Expense Drafts Smoke',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Endpoint Access',
    endpointLine(organisation),
    endpointLine(receiptsResult),
    endpointLine(claimsResult),
    '',
    '## Counts',
    `- Receipts endpoint rows: ${receipts.length}`,
    `- ExpenseClaims rows: ${claims.length}`,
    `- Receipts embedded in expense claims: ${claimReceipts.length}`,
    '',
    '## Receipt Status Counts',
    statusCounts(receipts).length
      ? statusCounts(receipts).map(([status, count]) => `- ${status}: ${count}`).join('\n')
      : '- none returned',
    '',
    '## Expense Claim Status Counts',
    statusCounts(claims).length
      ? statusCounts(claims).map(([status, count]) => `- ${status}: ${count}`).join('\n')
      : '- none returned',
    '',
    '## Triple Bull Candidate Search',
    'Target bank line: 2026-03-25, $153.00, TRIPLE BULL CRONULLA.',
    '',
    table(matches),
    '',
    '## Operational Interpretation',
    receiptsResult.ok
      ? '- verified: Xero API exposes draft receipt records through the Receipts endpoint for this tenant/token.'
      : '- unverified: Xero API draft receipt access is not available with the current tenant/token.',
    claimsResult.ok
      ? '- verified: Xero API exposes expense claim records through the ExpenseClaims endpoint for this tenant/token.'
      : '- unverified: Xero API expense claim access is not available with the current tenant/token.',
    matches.length > 0
      ? '- inferred: at least one Xero receipt/claim candidate may explain the Triple Bull bank-line gap. Human review is still required before approval/reconciliation.'
      : '- inferred: the Triple Bull Xero Me item is not visible through the tested Accounting API receipt/claim endpoints, or its amount/date/text are too different for this search.',
    '',
    '## Safety',
    '- verified: this script only called Xero GET endpoints.',
    '- unverified: no Xero UI draft submit/approve/reconcile action was attempted.',
    '',
  ];

  const provenance = [
    '# Provenance: Xero Expense Drafts Smoke',
    '',
    `Report: ${REPORT_PATH}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Data Sources Queried',
    '- Supabase `xero_tokens` via `scripts/lib/finance/xero-client.mjs` for OAuth token resolution/refresh.',
    '- Xero Accounting API `GET /Organisation`.',
    '- Xero Accounting API `GET /Receipts`.',
    '- Xero Accounting API `GET /ExpenseClaims`.',
    '',
    '## Mutations',
    '- No Xero accounting data mutation was performed.',
    '- OAuth token mirrors may have been rotated and persisted to Supabase, `.xero-tokens.json`, and `.env.local` as part of normal Xero authentication.',
    '',
    '## Verified',
    '- Endpoint success/failure statuses in the report came from live Xero API responses.',
    '- Receipt/claim counts came from live Xero API response bodies.',
    '',
    '## Inferred',
    '- Triple Bull candidate relevance is inferred from amount/date/text matching.',
    '',
    '## Unknown',
    '- Whether every Xero web/mobile draft expense appears in the classic Accounting API Receipts/ExpenseClaims endpoints.',
    '- Whether any visible candidate should be submitted/approved/reconciled; that requires human/accounting approval.',
    '',
    '## Reproduce',
    '```bash',
    'node scripts/xero-expense-drafts-smoke.mjs',
    '```',
    '',
  ].join('\n');

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_PATH, lines.join('\n'));
  writeFileSync(PROVENANCE_PATH, provenance);

  console.log(lines.join('\n'));
  console.log(`Report written: ${REPORT_PATH}`);
  console.log(`Provenance written: ${PROVENANCE_PATH}`);
}

main().catch(error => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
