#!/usr/bin/env node
/**
 * Convert exported Xero chart-of-accounts JSON → Xero CSV import format.
 *
 * Xero's import CSV uses these headers exactly (case matters):
 *   *Code, *Name, *Type, *Tax Code, Description, Dashboard, Expense Claims, Enable Payments
 *
 * Import via: Xero → Accounting → Chart of accounts → Import → upload CSV.
 * Xero will reject system accounts (bank/tax/PAYG/GST) — we filter those out.
 *
 * Usage:
 *   node scripts/chart-to-csv.mjs
 *   node scripts/chart-to-csv.mjs --in config/xero-chart.json --out config/xero-chart-import.csv
 *   node scripts/chart-to-csv.mjs --include-archived     # include archived accounts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const outIdx = args.indexOf('--out');
const INPUT = inIdx !== -1 ? args[inIdx + 1] : join(process.cwd(), 'config', 'xero-chart.json');
const OUTPUT = outIdx !== -1 ? args[outIdx + 1] : join(process.cwd(), 'config', 'xero-chart-import.csv');
const INCLUDE_ARCHIVED = args.includes('--include-archived');

// Xero system account types — not importable via CSV (auto-created by Xero)
const SYSTEM_TYPES = new Set([
  'BANK',                       // bank accounts added via bank feeds
  'PAYG',                       // PAYG withholding
  'PAYGLIABILITY',
  'SUPERANNUATIONEXPENSE',
  'SUPERANNUATIONLIABILITY',
  'WAGESPAYABLELIABILITY',
]);

// Xero system accounts by code (reserved / auto-created)
const SYSTEM_CODES = new Set([
  '820',  // GST
  '840',  // Rounding
  '860',  // Tracking Transfers
  '877',  // Realised Currency Gains
  '880',  // Owner Funds Introduced
  '888',  // Retained Earnings
]);

// CSV escape
function escape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[,"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Xero CSV requires "Yes" / "No" for boolean columns
function yn(b) {
  return b === true ? 'Yes' : b === false ? 'No' : '';
}

function main() {
  const raw = readFileSync(INPUT, 'utf8');
  const chart = JSON.parse(raw);
  const accounts = chart.accounts || [];

  // Filter: active only (unless flag), skip system-reserved
  const filtered = accounts.filter((a) => {
    if (!INCLUDE_ARCHIVED && a.Status !== 'ACTIVE') return false;
    if (SYSTEM_TYPES.has(a.Type)) return false;
    if (SYSTEM_CODES.has(a.Code)) return false;
    return true;
  });

  // Build CSV
  const headers = ['*Code', '*Name', '*Type', '*Tax Code', 'Description', 'Dashboard', 'Expense Claims', 'Enable Payments'];
  const rows = [headers.join(',')];

  for (const a of filtered) {
    rows.push([
      escape(a.Code),
      escape(a.Name),
      escape(a.Type),
      escape(a.TaxType || 'NONE'),
      escape(a.Description || ''),
      escape(yn(a.ShowInExpenseClaims ? true : true)), // default Yes (visible)
      escape(yn(a.ShowInExpenseClaims)),
      escape(yn(a.EnablePaymentsToAccount)),
    ].join(','));
  }

  writeFileSync(OUTPUT, rows.join('\n') + '\n');

  const skipped = accounts.length - filtered.length;
  console.log(`✓ Wrote ${filtered.length} account rows to ${OUTPUT}`);
  console.log(`  Skipped ${skipped} (system accounts, bank, PAYG, super, etc.)`);
  console.log('');
  console.log('Imported via: Xero (new entity) → Accounting → Chart of accounts → Import → upload this CSV');
  console.log('');
  console.log('Expected post-import manual steps in new tenant:');
  console.log('  1. Bank accounts — added separately via Bank feeds (not CSV)');
  console.log('  2. Tax rates — most AU defaults already present (verify GST-on-Expenses, BAS Excluded, GST Free)');
  console.log('  3. Tracking categories — recreate manually (no bulk API; see xero-chart.json.tracking_categories for source)');
  console.log('  4. Contacts — migrate separately (xero_contacts sync)');
  console.log('  5. Review flagged duplicates if Xero warns');
}

main();
