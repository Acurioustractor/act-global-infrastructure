#!/usr/bin/env node
/**
 * Import Xero Files receipt candidates into the receipt evidence pool.
 *
 * Why: Xero Files can contain thousands of loose receipt PDFs/images that are
 * not attached to bank transactions or bills. The library scan can identify
 * filename/vendor candidates, but receipt matching needs amount/date/vendor and
 * a previewable file in Supabase Storage.
 *
 * Defaults to DRY RUN. Pass --apply to write Supabase Storage + documents.
 *
 * Usage:
 *   node scripts/import-xero-files-receipts.mjs
 *   node scripts/import-xero-files-receipts.mjs --apply
 *   node scripts/import-xero-files-receipts.mjs --quarters Q2,Q3 --limit 50 --apply
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { execFile as execFileCb } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import { promisify } from 'util';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const execFile = promisify(execFileCb);
const FILES_API = 'https://api.xero.com/files.xro/1.0';
const BUCKET = 'receipt-attachments';
const REPORT_DATE = new Date().toISOString().slice(0, 10);
const REPORT_DIR = join('thoughts', 'shared', 'reports', `xero-files-import-${REPORT_DATE}`);
const REPORT_PATH = join(REPORT_DIR, 'summary.md');
const PROVENANCE_PATH = `${REPORT_PATH}.provenance.md`;

const FY26_QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30' },
  Q2: { start: '2025-10-01', end: '2025-12-31' },
  Q3: { start: '2026-01-01', end: '2026-03-31' },
  Q4: { start: '2026-04-01', end: '2026-06-30' },
};

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const quartersArg = valueAfter('--quarters') || 'Q2,Q3';
const quarters = quartersArg.split(',').map(q => q.trim().toUpperCase()).filter(Boolean);
const limit = Number(valueAfter('--limit') || 0);
const concurrency = Math.max(1, Number(valueAfter('--concurrency') || 1));
const reimport = args.includes('--reimport');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL/service role key');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function valueAfter(flag) {
  const idx = args.indexOf(flag);
  return idx === -1 ? null : args[idx + 1];
}

function dateRangeForQuarters(selected) {
  const ranges = selected.map(q => FY26_QUARTERS[q]).filter(Boolean);
  if (ranges.length === 0) throw new Error(`No valid quarters in ${selected.join(',')}`);
  return {
    start: ranges.map(r => r.start).sort()[0],
    end: ranges.map(r => r.end).sort().at(-1),
  };
}

const GENERIC_WORDS = new Set([
  'receipt', 'invoice', 'tax', 'copy', 'download', 'payment', 'paid',
  'the', 'and', 'for', 'with', 'from', 'pty', 'ltd', 'limited', 'australia',
  'australian', 'company', 'group', 'corp', 'corporation', 'service',
  'brisbane', 'sydney', 'melbourne', 'alice', 'springs', 'maleny', 'townsville',
  'www', 'com', 'net', 'org', 'pdf', 'jpg', 'jpeg', 'png',
]);

function cleanText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return cleanText(value)
    .split(' ')
    .filter(token => token.length >= 4 && !GENERIC_WORDS.has(token));
}

function safeFileName(value) {
  return basename(value || 'xero-file')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 120);
}

function filenameVendor(value) {
  const stem = safeFileName(value)
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(receipt|invoice|tax|copy|download)\b/ig, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stem || null;
}

async function fetchPaged(table, select, configure, pageSize = 1000) {
  const rows = [];
  let page = 0;
  while (true) {
    let query = sb.from(table).select(select);
    if (configure) query = configure(query);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    page += 1;
  }
  return rows;
}

async function loadMissingBankLines(range) {
  return fetchPaged(
    'v_finance_bank_line_evidence',
    'id,date,payee,particulars,reference,amount,evidence_status,receipt_match_status,candidate_count',
    query => query
      .eq('direction', 'debit')
      .gte('date', range.start)
      .lte('date', range.end)
      .in('evidence_status', ['uncovered', 'candidate', 'high_confidence_candidate'])
      .order('amount', { ascending: false }),
  );
}

async function loadExistingXeroFileIds() {
  const rows = await fetchPaged(
    'finance_receipt_documents',
    'source_record_id',
    query => query.eq('source', 'xero_files'),
  );
  return new Set(rows.map(row => row.source_record_id));
}

async function xeroFilesFetch(xero, endpoint, accept = 'application/json', retry = 0) {
  const response = await fetch(`${FILES_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${xero.getAccessToken()}`,
      'xero-tenant-id': xero.getTenantId(),
      Accept: accept,
    },
  });
  if (response.status === 429 && retry < 6) {
    const retryAfter = Number(response.headers.get('Retry-After') || 5);
    await sleep((retryAfter + 1) * 1000);
    return xeroFilesFetch(xero, endpoint, accept, retry + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Xero Files ${response.status}: ${text.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  return response;
}

async function listXeroFiles(xero) {
  const files = [];
  let page = 1;
  while (true) {
    const response = await xeroFilesFetch(xero, `/Files?pagesize=100&page=${page}`);
    const json = await response.json();
    const items = json.Items || json.items || [];
    if (items.length === 0) break;
    files.push(...items);
    if (items.length < 100) break;
    page += 1;
    await sleep(250);
  }
  return files;
}

function buildVendorTokenIndex(lines) {
  const index = new Map();
  for (const line of lines) {
    const lineTokens = new Set([
      ...tokens(line.payee),
      ...tokens(line.particulars),
      ...tokens(line.reference),
    ]);
    for (const token of lineTokens) {
      if (!index.has(token)) index.set(token, []);
      index.get(token).push(line);
    }
  }
  return index;
}

function selectCandidateFiles(files, vendorIndex, existingIds) {
  const candidates = [];
  for (const file of files) {
    const id = file.Id || file.id;
    const name = file.Name || file.name || '';
    if (!id || (!reimport && existingIds.has(id))) continue;
    if (!/\.(pdf|png|jpe?g|heic|tiff?)$/i.test(name)) continue;

    const fileTokens = tokens(name);
    const matchedLinesById = new Map();
    const matchedTokens = [];
    for (const token of fileTokens) {
      const lines = vendorIndex.get(token) || [];
      if (lines.length === 0) continue;
      matchedTokens.push(token);
      for (const line of lines) matchedLinesById.set(line.id, line);
    }
    if (matchedLinesById.size === 0) continue;

    candidates.push({
      file,
      xeroFileId: id,
      name,
      matchedLines: [...matchedLinesById.values()],
      matchedLineCount: matchedLinesById.size,
      matchedTokens: [...new Set(matchedTokens)],
    });
  }
  return candidates.sort((a, b) => b.matchedLineCount - a.matchedLineCount || a.name.localeCompare(b.name));
}

function mediaTypeFor(contentType, filename) {
  if (contentType && !/^application\/octet-stream/i.test(contentType)) return contentType;
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
  return contentType || 'application/octet-stream';
}

function fileExtFor(mediaType, filename) {
  const ext = extname(filename || '');
  if (ext) return ext;
  if (mediaType === 'application/pdf') return '.pdf';
  if (mediaType === 'image/png') return '.png';
  if (mediaType === 'image/heic') return '.heic';
  if (mediaType === 'image/tiff') return '.tiff';
  return '.jpg';
}

async function extractTextLocal(buffer, mediaType, filename) {
  const dir = await mkdtemp(join(tmpdir(), 'act-xero-file-ocr-'));
  try {
    const inputPath = join(dir, `receipt${fileExtFor(mediaType, filename)}`);
    await writeFile(inputPath, buffer);

    if (mediaType === 'application/pdf') {
      try {
        const { stdout } = await execFile('pdftotext', ['-layout', inputPath, '-'], {
          timeout: 30000,
          maxBuffer: 5 * 1024 * 1024,
        });
        if (stdout.trim().length > 40) return stdout;
      } catch {}

      const pngPrefix = join(dir, 'page-0');
      const pngPath = join(dir, 'page-0.png');
      try {
        await execFile('pdftoppm', ['-f', '1', '-singlefile', '-r', '200', '-png', '-gray', inputPath, pngPrefix], { timeout: 60000 });
      } catch {
        return '';
      }
      const { stdout } = await execFile('tesseract', [pngPath, 'stdout', '--psm', '6'], {
        timeout: 60000,
        maxBuffer: 5 * 1024 * 1024,
      });
      return stdout;
    }

    const { stdout } = await execFile('tesseract', [inputPath, 'stdout', '--psm', '6'], {
      timeout: 60000,
      maxBuffer: 5 * 1024 * 1024,
    });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseVendorFromText(text, filename) {
  const skip = /(tax invoice|receipt|duplicate|eftpos|merchant|customer copy|abn|tax inv|invoice no|date|time|total|visa|mastercard|approved|purchase|terminal|cashier|subtotal|gst|forwarded message|booking reference|amount paid|balance due)/i;
  for (const line of normalizeLines(text).slice(0, 18)) {
    const cleaned = line.replace(/\bABN\b.*$/i, '').replace(/[^A-Za-z0-9&'()./ -]/g, '').trim();
    if (cleaned.length >= 3 && /[A-Za-z]/.test(cleaned) && !skip.test(cleaned)) return cleaned.slice(0, 100);
  }
  return filenameVendor(filename);
}

function parseDateFromText(text) {
  const monthMap = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
    aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10', october: '10',
    nov: '11', november: '11', dec: '12', december: '12',
  };
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const au = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2}|\d{2})\b/);
  if (au) {
    const year = au[3].length === 2 ? `20${au[3]}` : au[3];
    return `${year}-${au[2].padStart(2, '0')}-${au[1].padStart(2, '0')}`;
  }

  const named = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2}|\d{2})\b/);
  if (named) {
    const month = monthMap[named[2].toLowerCase()];
    if (month) {
      const year = named[3].length === 2 ? `20${named[3]}` : named[3];
      return `${year}-${month}-${named[1].padStart(2, '0')}`;
    }
  }
  return null;
}

function parseAmountFromText(text) {
  const money = /(?:AUD|A\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})/g;
  const candidates = [];
  for (const line of normalizeLines(text)) {
    const lower = line.toLowerCase();
    let match;
    while ((match = money.exec(line)) !== null) {
      const amount = Number(match[1].replace(/,/g, ''));
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) continue;
      let weight = 1;
      if (/(grand\s+total|amount\s+paid|total\s+paid|payment\s+total|balance\s+due)/i.test(lower)) weight = 5;
      else if (/\btotal\b/i.test(lower)) weight = 4;
      else if (/\bamount\b|\bpaid\b/i.test(lower)) weight = 3;
      else if (/\bgst\b|\btax\b|\bsubtotal\b|\bchange\b/i.test(lower)) weight = 0.5;
      candidates.push({ amount, weight });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.weight - a.weight) || (b.amount - a.amount));
  return candidates[0].amount;
}

function parseGstFromText(text) {
  for (const line of normalizeLines(text)) {
    if (!/\b(gst|tax)\b/i.test(line)) continue;
    const match = line.match(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})/);
    if (match) return Number(match[1].replace(/,/g, ''));
  }
  return null;
}

function dayDelta(left, right) {
  if (!left || !right) return null;
  const a = new Date(`${left}T00:00:00Z`);
  const b = new Date(`${right}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function plausibleAmountDelta(lineAmount, receiptAmount) {
  if (lineAmount == null || receiptAmount == null) return null;
  return Math.abs(Math.abs(Number(lineAmount)) - Math.abs(Number(receiptAmount)));
}

function findPlausibleBankLine(candidate, amountTotal, documentDate) {
  if (amountTotal == null || !documentDate) return null;

  const scored = [];
  for (const line of candidate.matchedLines || []) {
    const amountDelta = plausibleAmountDelta(line.amount, amountTotal);
    const dateDelta = dayDelta(documentDate, line.date);
    if (amountDelta == null || dateDelta == null) continue;

    const lineAmount = Math.abs(Number(line.amount) || 0);
    const amountOk = amountDelta <= Math.max(1, lineAmount * 0.02);
    const dateOk = Math.abs(dateDelta) <= 14;
    if (!amountOk || !dateOk) continue;

    scored.push({
      line,
      amountDelta,
      dateDelta,
      score: amountDelta + Math.abs(dateDelta) * 0.1,
    });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored[0] || null;
}

function normalizeCreatedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function processCandidate(xero, candidate) {
  const response = await xeroFilesFetch(xero, `/Files/${candidate.xeroFileId}/Content`, '*/*');
  const buffer = Buffer.from(await response.arrayBuffer());
  const mediaType = mediaTypeFor(response.headers.get('content-type'), candidate.name);
  const text = await extractTextLocal(buffer, mediaType, candidate.name);
  const documentDate = parseDateFromText(text);
  const amountTotal = parseAmountFromText(text);
  const taxAmount = parseGstFromText(text);
  const vendorName = parseVendorFromText(text, candidate.name);
  const plausible = findPlausibleBankLine(candidate, amountTotal, documentDate);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  const storagePath = `xero-files/${candidate.xeroFileId}/${safeFileName(candidate.name)}`;
  const matchReady = Boolean(plausible && vendorName);

  const row = {
    source: 'xero_files',
    source_record_id: candidate.xeroFileId,
    source_table: 'xero_files',
    received_at: normalizeCreatedDate(candidate.file.CreatedDateUtc || candidate.file.createdDateUtc),
    vendor_name: vendorName,
    document_date: matchReady ? documentDate : null,
    amount_total: matchReady ? amountTotal : null,
    tax_amount: matchReady ? taxAmount : null,
    currency_code: 'AUD',
    attachment_url: storagePath,
    attachment_storage_path: storagePath,
    attachment_filename: candidate.name,
    attachment_content_type: mediaType,
    attachment_size_bytes: buffer.length,
    file_sha256: sha256,
    xero_file_id: candidate.xeroFileId,
    xero_tenant_id: xero.getTenantId(),
    ocr_text: text.slice(0, 200000),
    extracted_fields: {
      local_ocr: true,
      matched_tokens: candidate.matchedTokens,
      matched_line_count: candidate.matchedLineCount,
      plausible_bank_line_id: plausible?.line?.id || null,
      plausible_bank_line_date: plausible?.line?.date || null,
      plausible_bank_line_amount: plausible?.line?.amount || null,
      plausible_amount_delta: plausible?.amountDelta ?? null,
      plausible_date_delta_days: plausible?.dateDelta ?? null,
      parsed_vendor_name: vendorName,
      parsed_document_date: documentDate,
      parsed_amount_total: amountTotal,
      parsed_tax_amount: taxAmount,
      xero_file_created_at: candidate.file.CreatedDateUtc || candidate.file.createdDateUtc || null,
      xero_file_size: candidate.file.Size || candidate.file.size || null,
    },
    provenance: {
      imported_by: 'scripts/import-xero-files-receipts.mjs',
      source_api: 'xero_files',
      amount_source: matchReady ? 'local_ocr_plausible_bank_line' : 'withheld_no_plausible_bank_line',
      date_source: matchReady ? 'local_ocr_plausible_bank_line' : 'withheld_no_plausible_bank_line',
      vendor_source: vendorName ? 'local_ocr_or_filename' : 'missing',
    },
    status: matchReady ? 'candidate' : 'needs_review',
    updated_at: new Date().toISOString(),
  };

  if (apply) {
    const { error: uploadError } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: mediaType,
      upsert: true,
    });
    if (uploadError) throw new Error(`storage upload: ${uploadError.message}`);

    const { error: upsertError } = await sb
      .from('finance_receipt_documents')
      .upsert(row, { onConflict: 'source,source_record_id' });
    if (upsertError) throw new Error(`document upsert: ${upsertError.message}`);
  }

  return {
    ...candidate,
    mediaType,
    bytes: buffer.length,
    vendorName,
    documentDate,
    amountTotal,
    taxAmount,
    textChars: text.length,
    plausible,
    matchReady,
    status: row.status,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resultLine(result) {
  const plausible = result.plausible
    ? `bank ${result.plausible.line.date} $${Math.abs(Number(result.plausible.line.amount)).toFixed(2)} delta $${result.plausible.amountDelta.toFixed(2)} ${result.plausible.dateDelta}d`
    : 'no plausible bank line';
  return `- ${result.name} | ${result.vendorName || '?'} | parsed ${result.documentDate || '?'} ${result.amountTotal == null ? '?' : `$${result.amountTotal.toFixed(2)}`} | ${result.status} | ${plausible} | ${result.xeroFileId}`;
}

async function main() {
  const range = dateRangeForQuarters(quarters);
  console.log(`Import Xero Files receipts - ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Quarters: ${quarters.join(', ')} (${range.start} to ${range.end})`);
  console.log(`Concurrency: ${concurrency}${limit ? `, limit: ${limit}` : ''}\n`);

  const xero = await createXeroClient(sb);
  const [lines, existingIds, files] = await Promise.all([
    loadMissingBankLines(range),
    loadExistingXeroFileIds(),
    listXeroFiles(xero),
  ]);

  const vendorIndex = buildVendorTokenIndex(lines);
  let candidates = selectCandidateFiles(files, vendorIndex, existingIds);
  if (limit > 0) candidates = candidates.slice(0, limit);

  console.log(`Missing/candidate bank lines: ${lines.length}`);
  console.log(`Xero Files rows: ${files.length}`);
  console.log(`Already imported xero_files docs: ${existingIds.size}`);
  console.log(`Candidate files selected: ${candidates.length}\n`);

  const results = [];
  const errors = [];
  let next = 0;

  async function worker() {
    while (next < candidates.length) {
      const index = next++;
      const candidate = candidates[index];
      try {
        const result = await processCandidate(xero, candidate);
        results.push(result);
        console.log(`[${index + 1}/${candidates.length}] ${result.name} -> ${result.vendorName || '?'} ${result.documentDate || '?'} ${result.amountTotal == null ? '?' : `$${result.amountTotal.toFixed(2)}`}`);
      } catch (error) {
        errors.push({ candidate, error: error.message });
        console.log(`[${index + 1}/${candidates.length}] ERROR ${candidate.name}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const usable = results.filter(r => r.matchReady);
  const amountOnly = results.filter(r => r.amountTotal != null && !r.matchReady);

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = [
    '# Xero Files Receipt Import',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${apply ? 'APPLY' : 'DRY RUN'}`,
    `Quarter scope: ${quarters.join(', ')} (${range.start} to ${range.end})`,
    '',
    '## Summary',
    `- Missing/candidate bank lines considered: ${lines.length}`,
    `- Xero Files rows scanned: ${files.length}`,
    `- Existing xero_files documents skipped: ${existingIds.size}`,
    `- Candidate files selected: ${candidates.length}`,
    `- Files processed: ${results.length}`,
    `- Usable parsed receipts (vendor + date + amount): ${usable.length}`,
    `- Amount-only/partial parsed receipts: ${amountOnly.length}`,
    `- Errors: ${errors.length}`,
    '',
    '## Parsed Receipts',
    ...results.slice(0, 300).map(resultLine),
    '',
    '## Errors',
    ...(errors.length ? errors.slice(0, 100).map(e => `- ${e.candidate.name}: ${e.error}`) : ['- none']),
    '',
    '## Next',
    apply
      ? '- Run `node scripts/receipt-evidence-hub.mjs --quarters Q2,Q3 --apply` to score these imported files against bank lines.'
      : '- Re-run with `--apply` to upload files and upsert `finance_receipt_documents`.',
    '',
  ].join('\n');
  writeFileSync(REPORT_PATH, report);

  const provenance = [
    '# Provenance: Xero Files Receipt Import',
    '',
    `Report: ${REPORT_PATH}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Data Sources Queried',
    '- Xero Files API `GET /Files`.',
    '- Xero Files API `GET /Files/{FileId}/Content` for selected candidate files.',
    '- Supabase `v_finance_bank_line_evidence` for missing/candidate bank-line vendors.',
    '- Supabase `finance_receipt_documents` for existing imported Xero file IDs.',
    '',
    '## Mutations',
    apply
      ? '- Uploaded selected Xero Files content to Supabase Storage bucket `receipt-attachments`.'
      : '- No Supabase Storage uploads; dry run only.',
    apply
      ? '- Upserted selected rows into `finance_receipt_documents` with source `xero_files`.'
      : '- No `finance_receipt_documents` upserts; dry run only.',
    '- No Xero accounting or Files Library mutation was performed.',
    '',
    '## Verified',
    '- Xero file content downloads returned live file bytes.',
    '- OCR/text extraction was performed locally using `pdftotext` and/or `tesseract`.',
    '',
    '## Inferred',
    '- Candidate selection is based on filename tokens overlapping missing bank-line vendor tokens.',
    '- Extracted amount/date/vendor are local parser/OCR outputs and need human review before reconciliation.',
    '',
    '## Unknown',
    '- Whether each imported receipt is the correct receipt for a specific bank line until the receipt evidence hub scores and a human approves it.',
    '',
    '## Reproduce',
    '```bash',
    `node scripts/import-xero-files-receipts.mjs --quarters ${quarters.join(',')} ${apply ? '--apply' : ''}`.trim(),
    '```',
    '',
  ].join('\n');
  writeFileSync(PROVENANCE_PATH, provenance);

  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`Provenance: ${PROVENANCE_PATH}`);
}

main().catch(error => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
