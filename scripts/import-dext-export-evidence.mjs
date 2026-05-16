#!/usr/bin/env node
/**
 * Import a Dext CSV + local PDF/JPG export into the canonical receipt evidence
 * table. This does not write to Xero or reconcile anything.
 *
 * Usage:
 *   node scripts/import-dext-export-evidence.mjs /path/export.csv --files-dir /path/export-folder
 *   node scripts/import-dext-export-evidence.mjs /path/export.csv --files-dir /path/export-folder --apply
 */

import './lib/load-env.mjs';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const csvPath = args.find((arg) => !arg.startsWith('--'));
const APPLY = args.includes('--apply');
const filesDir = valueAfter('--files-dir');
const DATE = todayInBrisbane();
const OUT_DIR = join('thoughts', 'shared', 'reports', `dext-export-evidence-${DATE}`);
const STORAGE_PREFIX = `dext-export/${DATE}`;

if (!csvPath) {
  console.error('Usage: node scripts/import-dext-export-evidence.mjs <csv-path> --files-dir <folder> [--apply]');
  process.exit(1);
}

if (!existsSync(csvPath)) throw new Error(`CSV not found: ${csvPath}`);
if (!filesDir || !existsSync(filesDir)) throw new Error(`Files directory not found: ${filesDir || '(missing)'}`);

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

const MONTHS = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

function parseDextDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = MONTHS[match[2]];
  if (!month) return null;
  return `${match[3]}-${month}-${day}`;
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value) {
  return cleanText(value).replace(/\s+/g, '');
}

function contentTypeFor(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function scoreFile(record, fileName) {
  const haystack = compactText(fileName);
  const supplier = compactText(record.supplier);
  const number = compactText(record.documentNumber);
  const date = String(record.documentDate || '').replace(/-/g, '');
  let score = 0;
  if (number && haystack.includes(number)) score += 5;
  if (date && haystack.includes(date)) score += 3;
  if (supplier && haystack.includes(supplier.slice(0, Math.min(20, supplier.length)))) score += 2;
  return score;
}

function findFile(record, files) {
  const ranked = files
    .map((file) => ({ file, score: scoreFile(record, basename(file)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.file || null;
}

function money(value) {
  return Number(value || 0).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
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

async function uploadFile(record) {
  if (!record.localFilePath) return null;
  const body = readFileSync(record.localFilePath);
  const ext = extname(record.localFilePath).toLowerCase() || '.bin';
  const safeId = String(record.receiptId).replace(/[^a-zA-Z0-9_-]/g, '-');
  const storagePath = `${STORAGE_PREFIX}/${safeId}${ext}`;
  const contentType = contentTypeFor(record.localFilePath);

  const { error } = await sb.storage
    .from('receipt-attachments')
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed for ${record.receiptId}: ${error.message}`);

  return {
    storagePath,
    contentType,
    size: body.length,
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

const rawRecords = parseCsv(readFileSync(csvPath, 'utf8'));
const files = readdirSync(filesDir)
  .map((file) => join(filesDir, file))
  .filter((file) => statSync(file).isFile());

const records = rawRecords.map((row) => {
  const receiptId = row['Receipt ID']?.trim();
  const documentDate = parseDextDate(row.Date);
  const totalAud = parseNumber(row['Total (AUD)']);
  const totalOriginal = parseNumber(row.Total);
  const taxAud = parseNumber(row['Tax (AUD)']);
  const supplier = row.Supplier?.trim() || null;
  const documentNumber = row['Invoice Number']?.trim() || null;
  const normalized = {
    receiptId,
    supplier,
    documentDate,
    documentNumber,
    totalAud,
    totalOriginal,
    taxAud,
    currency: row.Currency?.trim() || 'AUD',
    category: row.Category?.trim() || null,
    project: row.Project?.trim() || null,
    project2: row['Project 2']?.trim() || null,
    paymentMethod: row['Payment Method']?.trim() || null,
    bankAccount: row['Bank Account']?.trim() || null,
    status: row.Status?.trim() || null,
    owner: row.Owner?.trim() || null,
    image: row.Image?.trim() || null,
    raw: row,
  };
  normalized.localFilePath = findFile(normalized, files);
  return normalized;
});

const valid = records.filter((record) => record.receiptId && record.documentDate && record.totalAud !== null);
const invalid = records.filter((record) => !valid.includes(record));
const missingFiles = valid.filter((record) => !record.localFilePath);
const nonZero = valid.filter((record) => Math.abs(record.totalAud || 0) > 0.005);
const statusCounts = new Map();
const supplierCounts = new Map();
for (const record of valid) {
  statusCounts.set(record.status || 'Unknown', (statusCounts.get(record.status || 'Unknown') || 0) + 1);
  supplierCounts.set(record.supplier || '(blank)', (supplierCounts.get(record.supplier || '(blank)') || 0) + 1);
}

let upserted = 0;
let uploaded = 0;
let errors = 0;
const importRows = [];

if (APPLY) {
  for (const record of valid) {
    try {
      const upload = await uploadFile(record);
      if (upload) uploaded += 1;

      const row = {
        source: 'dext_receipt',
        source_record_id: record.receiptId,
        source_table: 'dext_export',
        subject: record.supplier ? `Dext export receipt from ${record.supplier}` : 'Dext export receipt',
        received_at: record.documentDate ? `${record.documentDate}T00:00:00+10:00` : null,
        vendor_name: record.supplier,
        document_number: record.documentNumber,
        document_date: record.documentDate,
        amount_total: record.totalAud,
        tax_amount: record.taxAud,
        currency_code: 'AUD',
        attachment_url: upload?.storagePath || record.image || null,
        attachment_storage_path: upload?.storagePath || null,
        attachment_filename: record.localFilePath ? basename(record.localFilePath) : null,
        attachment_content_type: upload?.contentType || (record.localFilePath ? contentTypeFor(record.localFilePath) : null),
        attachment_size_bytes: upload?.size || null,
        file_sha256: upload?.sha256 || null,
        project_code: record.project || null,
        extracted_fields: {
          category: record.category,
          currency_original: record.currency,
          total_original: record.totalOriginal,
          project_2: record.project2,
          payment_method: record.paymentMethod,
          bank_account: record.bankAccount,
          dext_status: record.status,
          owner: record.owner,
          image_url: record.image,
        },
        provenance: {
          imported_by: 'scripts/import-dext-export-evidence.mjs',
          csv_path: csvPath,
          files_dir: filesDir,
          imported_at: new Date().toISOString(),
        },
        status: 'candidate',
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb
        .from('finance_receipt_documents')
        .upsert(row, { onConflict: 'source,source_record_id' });
      if (error) throw error;
      upserted += 1;
    } catch (error) {
      errors += 1;
      console.error(`ERROR ${record.receiptId}: ${error.message}`);
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });

for (const record of valid) {
  importRows.push({
    receipt_id: record.receiptId,
    date: record.documentDate,
    supplier: record.supplier,
    invoice_number: record.documentNumber,
    amount_aud: record.totalAud,
    tax_aud: record.taxAud,
    category: record.category,
    project: record.project,
    status: record.status,
    local_file: record.localFilePath || '',
    file_found: record.localFilePath ? 'yes' : 'no',
    image: record.image,
  });
}

writeCsv(join(OUT_DIR, 'dext-export-records.csv'), importRows, [
  'receipt_id',
  'date',
  'supplier',
  'invoice_number',
  'amount_aud',
  'tax_aud',
  'category',
  'project',
  'status',
  'file_found',
  'local_file',
  'image',
]);

writeCsv(join(OUT_DIR, 'missing-local-files.csv'), missingFiles.map((record) => ({
  receipt_id: record.receiptId,
  date: record.documentDate,
  supplier: record.supplier,
  invoice_number: record.documentNumber,
  amount_aud: record.totalAud,
  image: record.image,
})), ['receipt_id', 'date', 'supplier', 'invoice_number', 'amount_aud', 'image']);

const topSuppliers = [...supplierCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
const summary = [
  '# Dext Export Evidence Import',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Mode: ${APPLY ? 'APPLY' : 'READ ONLY'}`,
  `Supabase: ${SUPABASE_URL}`,
  '',
  '## Inputs',
  '',
  `- CSV: ${csvPath}`,
  `- Files directory: ${filesDir}`,
  '',
  '## Summary',
  '',
  `- Parsed rows: ${records.length}`,
  `- Valid rows: ${valid.length}`,
  `- Invalid rows: ${invalid.length}`,
  `- Non-zero rows: ${nonZero.length}`,
  `- Local files found: ${valid.length - missingFiles.length}`,
  `- Local files missing: ${missingFiles.length}`,
  `- Total absolute AUD value: ${money(nonZero.reduce((sum, record) => sum + Math.abs(record.totalAud || 0), 0))}`,
  `- Uploaded files: ${uploaded}`,
  `- Evidence rows upserted: ${upserted}`,
  `- Errors: ${errors}`,
  '',
  '## Status Counts',
  '',
  ...[...statusCounts.entries()].sort((a, b) => b[1] - a[1]).map(([status, count]) => `- ${status}: ${count}`),
  '',
  '## Top Suppliers',
  '',
  ...topSuppliers.map(([supplier, count]) => `- ${supplier}: ${count}`),
  '',
  '## Output Files',
  '',
  `- ${join(OUT_DIR, 'dext-export-records.csv')}`,
  `- ${join(OUT_DIR, 'missing-local-files.csv')}`,
  '',
  '## Verification Status',
  '',
  `verified: Parsed the Dext CSV with multiline-safe parsing and checked local evidence files in ${filesDir}.`,
  APPLY
    ? 'verified: Uploaded local receipt files to Supabase Storage and upserted finance_receipt_documents rows.'
    : 'verified: Dry-run mode performed no Supabase writes and no Xero writes.',
  'unverified: No Xero UI reconciliation or Dext publishing action was performed by this script.',
  '',
].join('\n');

writeFileSync(join(OUT_DIR, 'summary.md'), summary);
writeFileSync(join(OUT_DIR, 'summary.md.provenance.md'), [
  '# Provenance - Dext Export Evidence Import',
  '',
  `Report: ${join(OUT_DIR, 'summary.md')}`,
  `Generated: ${new Date().toISOString()}`,
  `Command: node scripts/import-dext-export-evidence.mjs ${csvPath} --files-dir ${filesDir}${APPLY ? ' --apply' : ''}`,
  '',
  '## Queried Sources',
  '',
  '- Local Dext CSV export',
  '- Local Dext PDF/JPG export directory',
  APPLY ? '- Supabase Storage bucket receipt-attachments' : '- Supabase was configured but not written in dry-run mode',
  APPLY ? '- public.finance_receipt_documents' : '',
  '',
  '## Verified',
  '',
  '- CSV parse count, valid row count, local file matching count.',
  APPLY ? '- Supabase upload/upsert counts from script execution.' : '- No write mode was enabled.',
  '',
  '## Unknown / Not Checked',
  '',
  '- Xero UI reconciliation status.',
  '- Whether each Dext item is still unpublished inside Dext.',
  '- BAS lodgement figures.',
  '',
].filter(Boolean).join('\n'));

console.log(`Dext export evidence ${APPLY ? 'apply' : 'dry-run'} complete`);
console.log(`  Supabase:          ${SUPABASE_URL}`);
console.log(`  Parsed rows:       ${records.length}`);
console.log(`  Valid rows:        ${valid.length}`);
console.log(`  Local files found: ${valid.length - missingFiles.length}`);
console.log(`  Missing files:     ${missingFiles.length}`);
console.log(`  Non-zero rows:     ${nonZero.length}`);
console.log(`  Total AUD value:   ${money(nonZero.reduce((sum, record) => sum + Math.abs(record.totalAud || 0), 0))}`);
console.log(`  Uploaded files:    ${uploaded}`);
console.log(`  Upserted rows:     ${upserted}`);
console.log(`  Errors:            ${errors}`);
console.log(`  Report:            ${join(OUT_DIR, 'summary.md')}`);
