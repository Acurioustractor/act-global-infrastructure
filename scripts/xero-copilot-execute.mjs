#!/usr/bin/env node
/**
 * Drive the /api/finance/xero-page-copilot/execute endpoint from the CLI.
 *
 * Most useful: bulk attach_evidence — for every bank_statement_line
 * that has an approved receipt link AND a matched Xero bank
 * transaction without an attachment, upload the receipt PDF.
 *
 * This is the "make the Xero copilot actually click buttons" path.
 *
 * Usage:
 *   node scripts/xero-copilot-execute.mjs --action attach_evidence --dry-run
 *   node scripts/xero-copilot-execute.mjs --action attach_evidence --limit 20 --apply
 *   node scripts/xero-copilot-execute.mjs --action attach_evidence --quarter Q2 --apply
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { Buffer } from 'node:buffer';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL / service role env vars.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY || args.includes('--dry-run');
const ACTION = valueAfter('--action') || 'attach_evidence';
const LIMIT = numberAfter('--limit', 25);
const QUARTER = valueAfter('--quarter') || null;

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}
function numberAfter(flag, fallback) {
  const raw = valueAfter(flag);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const FY26_QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30' },
  Q2: { start: '2025-10-01', end: '2025-12-31' },
  Q3: { start: '2026-01-01', end: '2026-03-31' },
  Q4: { start: '2026-04-01', end: '2026-06-30' },
};

function moneyCents(n) {
  return Math.round(Math.abs(Number(n) || 0) * 100);
}

async function findAttachEvidenceCandidates() {
  // bank_statement_lines.matched_xero_transaction_id is often NULL even when
  // an approved receipt exists. We resolve the Xero bank txn by date+amount
  // (within a 7-day window) against xero_transactions.
  //
  // Final candidate needs:
  //   1. approved+best receipt link in finance_receipt_bank_line_links
  //   2. a Xero bank txn within 7 days of the bank line at the same amount
  //   3. that Xero txn has has_attachments=false
  //   4. finance_receipt_documents has a downloadable file path

  const quarter = QUARTER ? FY26_QUARTERS[QUARTER.toUpperCase()] : null;

  let linksQuery = sb
    .from('finance_receipt_bank_line_links')
    .select('id,bank_line_id,receipt_document_id,confidence,xero_action,link_status,is_best_candidate')
    .eq('link_status', 'approved')
    .eq('is_best_candidate', true)
    .eq('xero_action', 'attach_file')
    .order('confidence', { ascending: false })
    .limit(LIMIT * 4);

  const { data: links, error: linksErr } = await linksQuery;
  if (linksErr) throw new Error(`finance_receipt_bank_line_links: ${linksErr.message}`);
  if (!links?.length) return [];

  const bankIds = [...new Set(links.map((l) => l.bank_line_id))];
  let banksQuery = sb
    .from('bank_statement_lines')
    .select('id,date,payee,amount,bank_account')
    .in('id', bankIds);
  if (quarter) {
    banksQuery = banksQuery.gte('date', quarter.start).lte('date', quarter.end);
  }
  const { data: banks, error: banksErr } = await banksQuery;
  if (banksErr) throw new Error(`bank_statement_lines: ${banksErr.message}`);
  const bankById = new Map((banks || []).map((b) => [b.id, b]));

  const docIds = [...new Set(links.map((l) => l.receipt_document_id))];
  const { data: docs, error: docsErr } = await sb
    .from('finance_receipt_documents')
    .select('id,vendor_name,document_date,amount_total,attachment_storage_path,attachment_url,attachment_filename,attachment_content_type')
    .in('id', docIds);
  if (docsErr) throw new Error(`finance_receipt_documents: ${docsErr.message}`);
  const docById = new Map((docs || []).map((d) => [d.id, d]));

  // Pull a wide window of Xero txns to match against.
  const dates = (banks || []).map((b) => b.date).filter(Boolean).sort();
  if (!dates.length) return [];
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const { data: xeroTxns, error: xeroErr } = await sb
    .from('xero_transactions')
    .select('xero_transaction_id,date,total,type,contact_name,has_attachments')
    .gte('date', minDate)
    .lte('date', maxDate)
    .eq('has_attachments', false)
    .in('type', ['SPEND', 'SPEND-OVERPAYMENT', 'SPEND-PREPAYMENT']);
  if (xeroErr) throw new Error(`xero_transactions: ${xeroErr.message}`);

  const candidates = [];
  for (const link of links) {
    if (candidates.length >= LIMIT) break;
    const bank = bankById.get(link.bank_line_id);
    if (!bank) continue;
    const doc = docById.get(link.receipt_document_id);
    if (!doc) continue;
    if (!doc.attachment_storage_path && !doc.attachment_url) continue;

    const bankCents = moneyCents(bank.amount);
    const bankTime = new Date(`${bank.date}T00:00:00`).getTime();
    const xeroMatch = (xeroTxns || []).find((x) => {
      if (moneyCents(x.total) !== bankCents) return false;
      const dt = new Date(`${x.date}T00:00:00`).getTime();
      return Math.abs(dt - bankTime) <= 7 * 86400000;
    });
    if (!xeroMatch) continue;

    candidates.push({
      bankLineId: bank.id,
      bankPayee: bank.payee,
      bankAmount: bank.amount,
      bankDate: bank.date,
      xeroBankTransactionId: xeroMatch.xero_transaction_id,
      xeroContact: xeroMatch.contact_name,
      receiptDocId: doc.id,
      receiptStoragePath: doc.attachment_storage_path,
      receiptUrl: doc.attachment_url,
      receiptFilename: doc.attachment_filename,
      receiptMime: doc.attachment_content_type,
      confidence: link.confidence,
    });
  }

  return candidates;
}

async function loadReceiptBytes(candidate) {
  if (candidate.receiptStoragePath) {
    const cleaned = candidate.receiptStoragePath.replace(/^receipt-attachments\//, '');
    const { data, error } = await sb.storage.from('receipt-attachments').download(cleaned);
    if (error || !data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: candidate.receiptFilename || cleaned.split('/').pop() || 'receipt.pdf',
      mime: data.type || candidate.receiptMime || 'application/pdf',
    };
  }
  if (candidate.receiptUrl && /^https?:\/\//i.test(candidate.receiptUrl)) {
    const res = await fetch(candidate.receiptUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: candidate.receiptFilename || candidate.receiptUrl.split('/').pop() || 'receipt.pdf',
      mime: res.headers.get('content-type') || candidate.receiptMime || 'application/pdf',
    };
  }
  return null;
}

async function executeAttachEvidence() {
  console.log('━'.repeat(72));
  console.log('Xero copilot executor — attach_evidence');
  console.log('━'.repeat(72));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY (will write to Xero)'}`);
  console.log(`Limit: ${LIMIT}${QUARTER ? `  •  Quarter: ${QUARTER}` : ''}`);
  console.log();

  const candidates = await findAttachEvidenceCandidates();
  console.log(`Found ${candidates.length} bank lines with approved receipt + un-attached Xero txn.`);
  if (!candidates.length) return;

  let xero;
  if (!DRY_RUN) {
    xero = await createXeroClient(sb);
  }

  const results = { ok: 0, failed: 0, errors: [] };

  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    const label = `[${i + 1}/${candidates.length}] ${c.bankDate} ${c.bankPayee?.slice(0, 30) || '?'} $${c.bankAmount}`;
    if (DRY_RUN) {
      console.log(`${label}  →  would PUT ${c.receiptFilename || 'receipt.pdf'} → BankTransactions/${c.xeroBankTransactionId}/Attachments/`);
      results.ok += 1;
      continue;
    }

    process.stdout.write(`${label}  …  `);
    const bytes = await loadReceiptBytes(c);
    if (!bytes) {
      console.log('FAIL (cannot load receipt bytes)');
      results.failed += 1;
      results.errors.push({ bankLineId: c.bankLineId, reason: 'cannot load receipt' });
      continue;
    }

    try {
      await xero.uploadAttachment(
        'BankTransactions',
        c.xeroBankTransactionId,
        bytes.filename,
        bytes.buffer,
        bytes.mime,
      );

      // Refresh mirror state so we don't re-pick this candidate.
      await sb
        .from('xero_transactions')
        .update({ has_attachments: true })
        .eq('xero_transaction_id', c.xeroBankTransactionId);

      console.log(`OK (${bytes.filename})`);
      results.ok += 1;
    } catch (err) {
      const msg = (err.message || String(err)).slice(0, 200);
      console.log(`FAIL ${msg}`);
      results.failed += 1;
      results.errors.push({ bankLineId: c.bankLineId, xero: c.xeroBankTransactionId, reason: msg });
    }
  }

  console.log();
  console.log('━'.repeat(72));
  console.log('Summary');
  console.log('━'.repeat(72));
  console.log(`Attached: ${results.ok}`);
  console.log(`Failed:   ${results.failed}`);
  if (results.errors.length) {
    console.log('\nFailures:');
    results.errors.slice(0, 5).forEach((e) => {
      console.log(`  • ${e.bankLineId}: ${e.reason}`);
    });
  }
  if (DRY_RUN) console.log('\nRun with --apply to actually upload to Xero.');
}

async function main() {
  if (ACTION === 'attach_evidence') {
    await executeAttachEvidence();
  } else {
    console.error(`Unsupported --action ${ACTION}. Supported: attach_evidence.`);
    console.error('For find_match_bill and transfer, use the HTTP API directly (POST /api/finance/xero-page-copilot/execute).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
