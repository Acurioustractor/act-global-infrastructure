#!/usr/bin/env node
/**
 * Upload approved finance receipt evidence documents to Xero bank transactions.
 *
 * This is the bridge for the newer receipt evidence hub:
 *   finance_receipt_documents + finance_receipt_bank_line_links
 *     -> Xero BankTransactions Attachments API
 *
 * Defaults to dry-run. Pass --apply to write attachments to Xero.
 *
 * Usage:
 *   node scripts/upload-evidence-receipts-to-xero.mjs --quarters Q2,Q3,Q4
 *   node scripts/upload-evidence-receipts-to-xero.mjs --quarters Q2,Q3,Q4 --limit 20 --apply
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CHECK_XERO = APPLY || args.includes('--check-xero');
const INCLUDE_EXISTING = args.includes('--include-existing');
const LIMIT = numberAfter('--limit', APPLY ? 25 : 100);
const FY = numberAfter('--fy', 26);
const QUARTERS = valueAfter('--quarters')
  ? valueAfter('--quarters').split(',').map((q) => q.trim().toUpperCase()).filter(Boolean)
  : args.filter((arg) => /^Q[1-4]$/i.test(arg)).map((arg) => arg.toUpperCase());

const quarterList = QUARTERS.length ? QUARTERS : ['Q2', 'Q3', 'Q4'];
const ranges = quarterList.map((quarter) => ({ quarter, ...quarterDates(FY, quarter) }));
const DATE = todayInBrisbane();
const REPORT_DIR = join('thoughts', 'shared', 'reports', `xero-evidence-upload-${DATE}`);
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function numberAfter(flag, fallback) {
  const raw = valueAfter(flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function quarterDates(fy, quarter) {
  const yr1 = 2000 + fy - 1;
  const yr2 = 2000 + fy;
  const quarters = {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30` },
  };
  if (!quarters[quarter]) throw new Error(`Unsupported quarter: ${quarter}`);
  return quarters[quarter];
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

function sqlString(value) {
  return `$$${String(value).replaceAll('$$', '')}$$`;
}

function safeFileName(value, fallback) {
  const raw = basename(String(value || fallback || 'receipt.pdf'));
  const cleaned = raw.replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 140);
  return cleaned || 'receipt.pdf';
}

function contentTypeFor(filename, provided) {
  if (provided && provided !== 'application/octet-stream') return provided;
  const ext = extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.heic') return 'image/heic';
  return provided || 'application/octet-stream';
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

async function execSql(query) {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw error;
  return data || [];
}

function dateClause() {
  return ranges
    .map((range) => `(bsl.date >= ${sqlString(range.start)}::date and bsl.date <= ${sqlString(range.end)}::date)`)
    .join(' or ');
}

async function loadUploadRows() {
  const query = `
    with linked as (
      select
        l.id as link_id,
        l.bank_line_id,
        l.receipt_document_id,
        l.confidence,
        l.match_method,
        l.xero_action,
        bsl.date as bank_date,
        bsl.payee,
        bsl.particulars,
        bsl.amount as bank_amount,
        bsl.status as bank_status,
        bsl.xero_transaction_id as bank_xero_transaction_id,
        bsl.matched_xero_transaction_id,
        d.source,
        d.source_record_id,
        d.vendor_name as document_vendor,
        d.document_number,
        d.document_date,
        d.amount_total,
        d.attachment_url,
        d.attachment_storage_path,
        d.attachment_filename,
        d.attachment_content_type,
        d.attachment_size_bytes,
        d.xero_transaction_id as document_xero_transaction_id,
        d.xero_bank_transaction_id as document_xero_bank_transaction_id,
        d.xero_attachment_id,
        d.status as document_status,
        d.provenance,
        coalesce(
          d.xero_bank_transaction_id,
          d.xero_transaction_id,
          bsl.xero_transaction_id,
          bsl.matched_xero_transaction_id
        ) as target_xero_transaction_id
      from finance_receipt_bank_line_links l
      join finance_receipt_documents d on d.id = l.receipt_document_id
      join bank_statement_lines bsl on bsl.id = l.bank_line_id
      where l.link_status = $$approved$$
        and bsl.direction = $$debit$$
        and (${dateClause()})
        and coalesce(d.attachment_storage_path, d.attachment_url) is not null
    )
    select
      linked.*,
      tx.has_attachments as target_has_attachments,
      tx.status as target_status,
      tx.contact_name as target_contact_name,
      tx.date as target_date,
      tx.total as target_total
    from linked
    left join xero_transactions tx on tx.xero_transaction_id = linked.target_xero_transaction_id
    order by linked.bank_date asc, abs(linked.bank_amount) desc, linked.confidence desc nulls last
    limit ${Number(LIMIT) || 100}
  `;
  return execSql(query);
}

async function downloadAttachment(row) {
  const source = row.attachment_storage_path || row.attachment_url;
  if (!source) throw new Error('Missing attachment path');

  if (String(source).startsWith('http://') || String(source).startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  if (existsSync(source)) return readFileSync(source);

  const storagePath = String(source).replace(/^receipt-attachments\//, '');
  const { data, error } = await sb.storage.from('receipt-attachments').download(storagePath);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function xeroAttachmentNames(xero, transactionId) {
  const data = await xero.get(`BankTransactions/${transactionId}/Attachments`);
  return (data.Attachments || []).map((attachment) => attachment.FileName || '');
}

function classify(row) {
  if (!row.target_xero_transaction_id) return { status: 'blocked', reason: 'no Xero bank transaction ID yet' };
  if (row.xero_attachment_id) return { status: 'skipped', reason: 'document already marked uploaded to Xero' };
  if (row.target_status === 'DELETED' || row.target_status === 'VOIDED') {
    return { status: 'blocked', reason: `target Xero transaction is ${row.target_status}` };
  }
  if (!CHECK_XERO && !INCLUDE_EXISTING && row.target_has_attachments === true) {
    return { status: 'skipped', reason: 'target already has attachment in mirror' };
  }
  if (Number(row.attachment_size_bytes || 0) > MAX_ATTACHMENT_BYTES) {
    return { status: 'blocked', reason: `file too large for safe upload (${row.attachment_size_bytes} bytes)` };
  }
  return { status: 'ready', reason: 'ready to upload' };
}

async function markUploaded(row, attachmentId, filename) {
  const provenance = typeof row.provenance === 'object' && row.provenance !== null ? row.provenance : {};
  const { error: docError } = await sb
    .from('finance_receipt_documents')
    .update({
      xero_bank_transaction_id: row.target_xero_transaction_id,
      xero_transaction_id: row.target_xero_transaction_id,
      xero_attachment_id: attachmentId || filename,
      xero_tenant_id: process.env.XERO_TENANT_ID || null,
      status: 'uploaded_to_xero',
      provenance: {
        ...provenance,
        xero_upload: {
          uploaded_at: new Date().toISOString(),
          target: 'BankTransactions',
          xero_transaction_id: row.target_xero_transaction_id,
          filename,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.receipt_document_id);
  if (docError) throw docError;

  await sb
    .from('xero_transactions')
    .update({
      has_attachments: true,
      updated_at: new Date().toISOString(),
    })
    .eq('xero_transaction_id', row.target_xero_transaction_id);
}

async function main() {
  console.log(`Upload evidence receipts to Xero — ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Quarters: ${quarterList.join(', ')}`);
  console.log(`  Limit: ${LIMIT}`);
  console.log('');

  mkdirSync(REPORT_DIR, { recursive: true });
  const rows = await loadUploadRows();
  const xero = CHECK_XERO ? await createXeroClient(sb) : null;
  const results = [];

  let ready = 0;
  let uploaded = 0;
  let skipped = 0;
  let blocked = 0;
  let failed = 0;

  for (const row of rows) {
    const initial = classify(row);
    const filename = safeFileName(
      row.attachment_filename,
      `${row.document_vendor || row.payee || 'receipt'}-${row.bank_date}.pdf`,
    );
    const contentType = contentTypeFor(filename, row.attachment_content_type);
    const base = {
      link_id: row.link_id,
      receipt_document_id: row.receipt_document_id,
      bank_line_id: row.bank_line_id,
      bank_date: row.bank_date,
      payee: row.payee,
      bank_amount: row.bank_amount,
      document_vendor: row.document_vendor,
      document_date: row.document_date,
      amount_total: row.amount_total,
      source: row.source,
      confidence: row.confidence,
      target_xero_transaction_id: row.target_xero_transaction_id,
      target_contact_name: row.target_contact_name,
      target_date: row.target_date,
      target_total: row.target_total,
      filename,
      content_type: contentType,
      status: initial.status,
      reason: initial.reason,
    };

    if (initial.status !== 'ready') {
      if (initial.status === 'skipped') skipped += 1;
      else blocked += 1;
      results.push(base);
      continue;
    }

    if (CHECK_XERO && !APPLY) {
      try {
        const existingNames = await xeroAttachmentNames(xero, row.target_xero_transaction_id);
        if (!INCLUDE_EXISTING && existingNames.length > 0) {
          skipped += 1;
          results.push({
            ...base,
            status: 'skipped',
            reason: `target has ${existingNames.length} attachment(s) in Xero`,
          });
          continue;
        }
        results.push({
          ...base,
          status: 'ready',
          reason: existingNames.length
            ? `target has ${existingNames.length} attachment(s), but --include-existing allows another upload`
            : 'ready to upload; Xero API reports no existing attachments',
        });
        ready += 1;
        continue;
      } catch (error) {
        failed += 1;
        results.push({ ...base, status: 'failed', reason: `Xero attachment check failed: ${error.message}` });
        continue;
      }
    }

    ready += 1;
    if (!APPLY) {
      results.push(base);
      continue;
    }

    try {
      const existingNames = await xeroAttachmentNames(xero, row.target_xero_transaction_id);
      if (!INCLUDE_EXISTING && existingNames.length > 0) {
        skipped += 1;
        results.push({
          ...base,
          status: 'skipped',
          reason: `target already has ${existingNames.length} attachment(s) in Xero`,
        });
        continue;
      }
      if (existingNames.includes(filename)) {
        skipped += 1;
        await markUploaded(row, filename, filename);
        results.push({
          ...base,
          status: 'skipped',
          reason: 'same filename already exists in Xero; marked uploaded',
        });
        continue;
      }

      const buffer = await downloadAttachment(row);
      if (!buffer.length) throw new Error('Empty attachment file');
      if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error(`File too large (${buffer.length} bytes)`);

      const response = await xero.uploadAttachment(
        'BankTransactions',
        row.target_xero_transaction_id,
        encodeURIComponent(filename),
        buffer,
        contentType,
      );
      const attachmentId = response?.Attachments?.[0]?.AttachmentID || filename;
      await markUploaded(row, attachmentId, filename);
      uploaded += 1;
      results.push({ ...base, status: 'uploaded', reason: `uploaded ${filename}` });
    } catch (error) {
      failed += 1;
      results.push({ ...base, status: 'failed', reason: error.message });
    }
  }

  const uploadableValue = results
    .filter((row) => row.status === 'ready' || row.status === 'uploaded')
    .reduce((sum, row) => sum + Math.abs(Number(row.bank_amount || 0)), 0);

  writeCsv(join(REPORT_DIR, 'queue.csv'), results, [
    'status',
    'reason',
    'bank_date',
    'payee',
    'bank_amount',
    'document_vendor',
    'document_date',
    'amount_total',
    'source',
    'confidence',
    'target_xero_transaction_id',
    'target_contact_name',
    'target_date',
    'target_total',
    'filename',
    'link_id',
    'receipt_document_id',
    'bank_line_id',
  ]);

  const md = [
    `# Xero Evidence Upload - ${DATE}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`,
    `Supabase: ${SUPABASE_URL}`,
    `Quarters: ${quarterList.join(', ')}`,
    `Rows loaded: ${rows.length}`,
    `Ready: ${ready}`,
    `Uploaded: ${uploaded}`,
    `Skipped: ${skipped}`,
    `Blocked: ${blocked}`,
    `Failed: ${failed}`,
    `Ready/uploaded bank value: ${money(uploadableValue)}`,
    '',
    '## Output',
    '',
    `- ${join(REPORT_DIR, 'queue.csv')}`,
    '',
    '## Verification Status',
    '',
    'verified: Queried live Supabase approved receipt evidence links and Xero mirror transaction IDs.',
    APPLY
      ? `verified: Attempted Xero attachment writes for ${ready} ready rows; uploaded ${uploaded}, failed ${failed}.`
      : 'verified: Dry-run only; no Xero writes were made.',
    CHECK_XERO
      ? 'verified: Checked Xero attachment state for rows processed during apply/check mode.'
      : 'unverified: Did not call Xero attachment read endpoints in this dry run; used Supabase mirror has_attachments flags.',
    '',
  ].join('\n');
  writeFileSync(join(REPORT_DIR, 'summary.md'), md);

  console.log(`Rows loaded:             ${rows.length}`);
  console.log(`Ready:                   ${ready}`);
  console.log(`Uploaded:                ${uploaded}`);
  console.log(`Skipped:                 ${skipped}`);
  console.log(`Blocked:                 ${blocked}`);
  console.log(`Failed:                  ${failed}`);
  console.log(`Ready/uploaded value:    ${money(uploadableValue)}`);
  console.log(`Report:                  ${join(REPORT_DIR, 'summary.md')}`);
  if (!APPLY && ready > 0) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to upload ready attachments to Xero.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
