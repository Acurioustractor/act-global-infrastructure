#!/usr/bin/env node
/**
 * Generate a human setup pack for Dext sections, supplier rules, project
 * tracking, and safe publish policies.
 *
 * Usage:
 *   node scripts/generate-dext-routing-pack.mjs
 *   node scripts/generate-dext-routing-pack.mjs --csv Dext/nicholas-marchesi-2026-05-15.csv
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DATE = todayInBrisbane();
const CONFIG_PATH = 'config/dext-routing-sections.json';
const DEFAULT_CSV = 'Dext/nicholas-marchesi-2026-05-15.csv';
const CSV_PATH = valueAfter('--csv') || (existsSync(DEFAULT_CSV) ? DEFAULT_CSV : null);
const OUT_DIR = join('thoughts', 'shared', 'reports', `dext-routing-pack-${DATE}`);

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

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(string)) return string;
  return `"${string.replace(/"/g, '""')}"`;
}

function writeCsv(path, rows, headers) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}

function supplierRoute(config, supplier) {
  const normalized = String(supplier || '').toLowerCase();
  for (const group of config.supplier_defaults) {
    for (const candidate of group.suppliers) {
      if (normalized.includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(normalized)) {
        return group;
      }
    }
  }
  return null;
}

function summarizeExport(config) {
  if (!CSV_PATH || !existsSync(CSV_PATH)) return { rows: [], supplierRows: [], categoryRows: [] };
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const suppliers = new Map();
  const categories = new Map();

  for (const row of rows) {
    const supplier = row.Supplier?.trim() || '(blank)';
    const category = row.Category?.trim() || '(blank)';
    const amount = Math.abs(parseNumber(row['Total (AUD)']));

    const supplierEntry = suppliers.get(supplier) || { supplier, count: 0, amount: 0 };
    supplierEntry.count += 1;
    supplierEntry.amount += amount;
    suppliers.set(supplier, supplierEntry);

    const categoryEntry = categories.get(category) || { category, count: 0, amount: 0 };
    categoryEntry.count += 1;
    categoryEntry.amount += amount;
    categories.set(category, categoryEntry);
  }

  const supplierRows = [...suppliers.values()]
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .map((entry) => {
      const route = supplierRoute(config, entry.supplier);
      return {
        supplier: entry.supplier,
        receipt_count: entry.count,
        total_aud_abs: entry.amount.toFixed(2),
        suggested_category: route?.category || 'Manual review',
        suggested_project: route?.project || 'ASK_USER',
        payment_method: route?.payment_method || 'review',
        publish_destination: route?.publish_destination || 'Manual review',
        auto_publish: route?.auto_publish ?? false,
        rd_default: route?.rd_default || 'review',
      };
    });

  const categoryRows = [...categories.values()]
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .map((entry) => {
      const route = config.category_defaults.find((item) => item.dext_category === entry.category);
      return {
        category: entry.category,
        receipt_count: entry.count,
        total_aud_abs: entry.amount.toFixed(2),
        default_project: route?.default_project || 'ASK_USER',
        tax_rate: route?.tax_rate || 'review',
        rd_default: route?.rd_default || 'review',
        publish_policy: route?.publish_policy || 'manual_review',
        notes: route?.notes || '',
      };
    });

  return { rows, supplierRows, categoryRows };
}

function bulletList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function fieldValueLabel(value) {
  if (value.code && value.name) return `${value.code} · ${value.name}`;
  return value.name || value.code || '';
}

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
const exportSummary = summarizeExport(config);

mkdirSync(OUT_DIR, { recursive: true });

writeCsv(join(OUT_DIR, 'dext-supplier-routing.csv'), exportSummary.supplierRows, [
  'supplier',
  'receipt_count',
  'total_aud_abs',
  'suggested_category',
  'suggested_project',
  'payment_method',
  'publish_destination',
  'auto_publish',
  'rd_default',
]);

writeCsv(join(OUT_DIR, 'dext-category-routing.csv'), exportSummary.categoryRows, [
  'category',
  'receipt_count',
  'total_aud_abs',
  'default_project',
  'tax_rate',
  'rd_default',
  'publish_policy',
  'notes',
]);

const fieldRows = [];
for (const field of config.dext_fields_to_configure) {
  for (const value of field.values) {
    fieldRows.push({
      field: field.field,
      required: field.required,
      name_or_code: fieldValueLabel(value),
      use_for: value.use_for,
      xero_destination: value.xero_destination || '',
      default_publish: value.default_publish || '',
    });
  }
}
writeCsv(join(OUT_DIR, 'dext-fields-to-add.csv'), fieldRows, [
  'field',
  'required',
  'name_or_code',
  'use_for',
  'xero_destination',
  'default_publish',
]);

const md = [
  '# Dext Routing Pack',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Config: ${CONFIG_PATH}`,
  CSV_PATH ? `Dext export: ${CSV_PATH}` : 'Dext export: not provided',
  '',
  '## Operating Rule',
  '',
  'Dext is the evidence/OCR intake. Xero is the accounting source of truth. Supabase/workbench is the review queue. For historical cleanup, do not bulk publish from Dext unless a bank line and Xero action are known.',
  '',
  '## Global Settings',
  '',
  `- Legacy cleanup auto-publish default: ${config.global_settings.legacy_cleanup_mode.auto_publish_default}`,
  `- Legacy paid card destination: ${config.global_settings.legacy_cleanup_mode.publish_destination_for_paid_card_spend}`,
  `- New ACT Pty auto-publish default: ${config.global_settings.new_act_pty_mode.auto_publish_default}`,
  `- Auto-publish sample requirement: ${config.global_settings.new_act_pty_mode.sample_requirement}`,
  '',
  '## Dext Fields To Add',
  '',
  '| Field | Value | Use | Destination / Publish |',
  '|---|---|---|---|',
  ...fieldRows.map((row) => `| ${row.field} | ${row.name_or_code} | ${row.use_for} | ${[row.xero_destination, row.default_publish].filter(Boolean).join(' / ')} |`),
  '',
  '## Category Defaults',
  '',
  '| Dext Category | Project | Tax | R&D | Publish | Notes |',
  '|---|---|---|---|---|---|',
  ...config.category_defaults.map((row) => `| ${row.dext_category} | ${row.default_project} | ${row.tax_rate} | ${row.rd_default} | ${row.publish_policy} | ${row.notes} |`),
  '',
  '## Supplier Groups',
  '',
  ...config.supplier_defaults.map((group) => [
    `### ${group.category}`,
    '',
    `- Suppliers: ${group.suppliers.join(', ')}`,
    `- Project: ${group.project}`,
    `- Payment method: ${group.payment_method}`,
    `- Publish destination: ${group.publish_destination}`,
    `- Auto-publish: ${group.auto_publish}`,
    `- R&D: ${group.rd_default}`,
    '',
  ].join('\n')),
  '## Never Auto-Publish',
  '',
  bulletList(config.never_auto_publish),
  '',
  '## Latest Dext Export Summary',
  '',
  `- Parsed export rows: ${exportSummary.rows.length}`,
  `- Supplier rows in CSV: ${exportSummary.supplierRows.length}`,
  `- Category rows in CSV: ${exportSummary.categoryRows.length}`,
  '',
  '### Top Supplier Routing',
  '',
  '| Supplier | Count | Amount | Project | Category | Auto-publish |',
  '|---|---:|---:|---|---|---|',
  ...exportSummary.supplierRows.slice(0, 40).map((row) => `| ${row.supplier} | ${row.receipt_count} | $${row.total_aud_abs} | ${row.suggested_project} | ${row.suggested_category} | ${row.auto_publish} |`),
  '',
  '## Output Files',
  '',
  `- ${join(OUT_DIR, 'dext-fields-to-add.csv')}`,
  `- ${join(OUT_DIR, 'dext-category-routing.csv')}`,
  `- ${join(OUT_DIR, 'dext-supplier-routing.csv')}`,
  '',
  '## Verification Status',
  '',
  'verified: Generated from config/dext-routing-sections.json and the latest Dext CSV export when present.',
  'inferred: Suggested project/category/routing is based on configured ACT bookkeeping rules and vendor names, not Dext UI state.',
  'unverified: No live Dext settings were changed or checked by this script.',
  '',
].join('\n');

writeFileSync(join(OUT_DIR, 'README.md'), md);
writeFileSync(join(OUT_DIR, 'README.md.provenance.md'), [
  '# Provenance - Dext Routing Pack',
  '',
  `Report: ${join(OUT_DIR, 'README.md')}`,
  `Generated: ${new Date().toISOString()}`,
  `Command: node scripts/generate-dext-routing-pack.mjs${CSV_PATH ? ` --csv ${CSV_PATH}` : ''}`,
  '',
  '## Sources',
  '',
  `- ${CONFIG_PATH}`,
  CSV_PATH ? `- ${CSV_PATH}` : '- No Dext export CSV used',
  '',
  '## Verified',
  '',
  '- Config file was parsed.',
  CSV_PATH ? '- Dext export CSV was parsed with multiline-safe parser.' : '- No CSV parse was needed.',
  '- Output CSV and Markdown files were written locally.',
  '',
  '## Unknown',
  '',
  '- Live Dext supplier rules and Xero connection settings.',
  '- Whether suggested mappings have been applied inside Dext.',
  '',
].join('\n'));

console.log('Dext routing pack generated');
console.log(`  Config:       ${CONFIG_PATH}`);
console.log(`  Dext export:  ${CSV_PATH || '(none)'}`);
console.log(`  Suppliers:    ${exportSummary.supplierRows.length}`);
console.log(`  Categories:   ${exportSummary.categoryRows.length}`);
console.log(`  Report:       ${join(OUT_DIR, 'README.md')}`);
