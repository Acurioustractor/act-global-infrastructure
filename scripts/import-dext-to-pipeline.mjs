#!/usr/bin/env node
/**
 * Import Dext Export CSV into Receipt Pipeline
 *
 * One-time migration script to drain Dext items into the receipt_emails table.
 * Imports "Ready" and "To review" items (the ones stuck in Dext).
 * Published items are already in Xero — we import those too for tracking.
 *
 * CRITICAL: Run --scrape BEFORE cancelling Dext — permalinks die after cancellation.
 *
 * Usage:
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv                  # Import metadata only
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv --dry-run         # Preview
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv --all             # Include Published
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv --status ready,to-review
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv --scrape          # Download receipt files from Dext permalinks → Supabase Storage
 *   node scripts/import-dext-to-pipeline.mjs /path/to/dext-export.csv --scrape --all    # Scrape ALL including Published
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
// Simple CSV parser (avoids adding csv-parse dependency)
function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (values[j] || '').trim();
    }
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith('--'));
const DRY_RUN = args.includes('--dry-run');
const ALL = args.includes('--all');
const SCRAPE = args.includes('--scrape');
const statusIdx = args.indexOf('--status');
const STATUS_FILTER = statusIdx !== -1
  ? args[statusIdx + 1].split(',').map(s => s.trim().toLowerCase())
  : null;

// Scrape rate limiting (be polite to Dext servers)
const SCRAPE_DELAY_MS = 500;
const SCRAPE_CONCURRENCY = 3;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

if (!csvPath) {
  console.error('Usage: node scripts/import-dext-to-pipeline.mjs <csv-path> [--dry-run] [--all] [--status ready,to-review]');
  process.exit(1);
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

// ============================================================================
// PARSE CSV
// ============================================================================

const csvContent = readFileSync(csvPath, 'utf8');
const records = parseCSV(csvContent);

log(`Loaded ${records.length} records from Dext export`);

// ============================================================================
// FILTER & TRANSFORM
// ============================================================================

// Dext statuses we care about:
// "Ready" — extracted, ready to push to Xero (highest priority)
// "To review" — needs review but has data (can still import)
// "Published" — already in Xero (import for tracking/completeness)
// "Processing" — stuck, no data extracted (import as 'review')
// Skip: "Confirmed duplicate", "Deleted", "Archived", "Merged"

const SKIP_STATUSES = new Set(['confirmed duplicate', 'deleted', 'archived', 'merged']);

const STATUS_MAP = {
  'ready': 'captured',       // Ready in Dext → captured in our pipeline (needs Xero matching)
  'to review': 'review',     // Needs human review
  'published': 'uploaded',   // Already in Xero
  'processing': 'review',    // Stuck in Dext, needs manual attention
};

const filteredRecords = records.filter(r => {
  const status = (r.Status || '').toLowerCase();

  // Always skip noise
  if (SKIP_STATUSES.has(status)) return false;

  // Apply status filter if specified
  if (STATUS_FILTER) {
    return STATUS_FILTER.some(s => status.includes(s));
  }

  // Default: import everything except noise (or just actionable if not --all)
  if (ALL) return true;

  // Default: only Ready + To review (the actionable ones)
  return status === 'ready' || status === 'to review' || status === 'processing';
});

log(`Filtered to ${filteredRecords.length} actionable records`);

// ============================================================================
// STATUS BREAKDOWN
// ============================================================================

const statusCounts = {};
for (const r of filteredRecords) {
  const s = r.Status || 'Unknown';
  statusCounts[s] = (statusCounts[s] || 0) + 1;
}
console.log('\n  Status breakdown:');
for (const [status, count] of Object.entries(statusCounts).sort((a, b) => b - a)) {
  console.log(`    ${status}: ${count}`);
}

const supplierCounts = {};
for (const r of filteredRecords) {
  const s = r.Supplier || '(no supplier)';
  supplierCounts[s] = (supplierCounts[s] || 0) + 1;
}
console.log('\n  Top 15 suppliers:');
const topSuppliers = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [supplier, count] of topSuppliers) {
  console.log(`    ${supplier}: ${count}`);
}
console.log('');

// ============================================================================
// TRANSFORM TO receipt_emails FORMAT
// ============================================================================

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Dext format: "16-Mar-2026" or "11-Mar-2026"
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseAmount(amountStr) {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

const transformed = filteredRecords.map(r => {
  const dextStatus = (r.Status || '').toLowerCase();
  const pipelineStatus = STATUS_MAP[dextStatus] || 'review';

  return {
    gmail_message_id: `dext-${r['Item ID']}`, // Synthetic ID for dedup
    mailbox: (r['Submitted by'] || '').includes('Benjamin') ? 'benjamin@act.place' : 'nicholas@act.place',
    from_email: null, // Dext doesn't export sender email
    subject: r.Supplier ? `Receipt from ${r.Supplier}` : 'Receipt (imported from Dext)',
    received_at: parseDate(r.Date || r['Submitted at']),
    vendor_name: r.Supplier || null,
    amount_detected: parseAmount(r['Total Amount']),
    currency: r.Currency || 'AUD',
    attachment_url: r.Permalink || null, // Dext permalink (may not work after cancellation)
    attachment_filename: r.Supplier ? `${r.Supplier.replace(/[^a-zA-Z0-9]/g, '-')}-receipt.pdf` : 'receipt.pdf',
    attachment_content_type: 'application/pdf',
    status: pipelineStatus,
    source: 'dext_import',
    dext_item_id: r['Item ID'],
    match_method: dextStatus === 'published' ? 'dext_published' : null,
  };
});

log(`Transformed ${transformed.length} records for import`);

// ============================================================================
// SCRAPE RECEIPT FILES FROM DEXT PERMALINKS
// ============================================================================

/**
 * Download a receipt file from a Dext permalink URL.
 * Returns { buffer, contentType, filename } or null on failure.
 */
async function downloadDextReceipt(permalink) {
  if (!permalink) return null;

  try {
    const response = await fetch(permalink, {
      redirect: 'follow',
      headers: { 'User-Agent': 'ACT-Receipt-Pipeline/1.0' },
    });

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine extension from content type
    let ext = 'bin';
    if (contentType.includes('pdf')) ext = 'pdf';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('tiff')) ext = 'tiff';

    return { buffer, contentType, ext };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Upload a receipt file to Supabase Storage.
 * Returns the storage path on success.
 */
async function uploadToStorage(dextItemId, buffer, ext) {
  const storagePath = `dext-import/${dextItemId}.${ext}`;

  const { error } = await supabase.storage
    .from('receipt-attachments')
    .upload(storagePath, buffer, {
      contentType: ext === 'pdf' ? 'application/pdf' : `image/${ext}`,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

/**
 * Scrape all receipt files from Dext permalinks and store in Supabase Storage.
 * Updates receipt_emails rows with the new storage URL.
 */
async function scrapeReceiptFiles() {
  log('\n=== Scraping Receipt Files from Dext Permalinks ===');
  log('CRITICAL: Do this BEFORE cancelling Dext — URLs die after cancellation.\n');

  // Get all receipt_emails from dext_import that still have a Dext permalink
  // Uses raw SQL to bypass PostgREST schema cache issues with new tables
  const { data: receipts, error } = await supabase.rpc('exec_sql', {
    query: `SELECT id, dext_item_id, attachment_url, vendor_name, amount_detected
            FROM receipt_emails
            WHERE source = 'dext_import' AND attachment_url IS NOT NULL
            ORDER BY created_at ASC`
  });

  if (error) {
    log(`ERROR loading receipts: ${error.message}`);
    return;
  }

  // Filter to only those with Dext permalinks (not already scraped to storage)
  const toScrape = receipts.filter(r =>
    r.attachment_url &&
    r.attachment_url.startsWith('https://rbnk.me/')
  );

  if (toScrape.length === 0) {
    log('No Dext permalinks to scrape. All receipts already in storage.');
    return;
  }

  log(`Found ${toScrape.length} Dext permalinks to scrape\n`);

  let downloaded = 0;
  let failed = 0;
  let totalBytes = 0;

  // Process in batches with concurrency limit
  for (let i = 0; i < toScrape.length; i += SCRAPE_CONCURRENCY) {
    const batch = toScrape.slice(i, i + SCRAPE_CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (receipt) => {
        const vendor = (receipt.vendor_name || 'unknown').substring(0, 20);
        const amt = receipt.amount_detected ? `$${receipt.amount_detected}` : '?';

        // Download from Dext
        const result = await downloadDextReceipt(receipt.attachment_url);

        if (!result || result.error) {
          log(`  FAIL  ${vendor.padEnd(22)} ${amt.padStart(10)}  ${result?.error || 'no response'}`);
          failed++;
          return;
        }

        // Upload to Supabase Storage
        const storagePath = await uploadToStorage(receipt.dext_item_id, result.buffer, result.ext);

        // Update the receipt_emails row with storage path
        const filename = receipt.vendor_name
          ? `${receipt.vendor_name.replace(/[^a-zA-Z0-9]/g, '-')}-receipt.${result.ext}`
          : `receipt.${result.ext}`;

        await supabase.rpc('update_receipt_attachment', {
          receipt_id: receipt.id,
          new_attachment_url: storagePath,
          new_filename: filename,
          new_content_type: result.contentType,
          new_size_bytes: result.buffer.length,
        });

        totalBytes += result.buffer.length;
        downloaded++;
        log(`  OK    ${vendor.padEnd(22)} ${amt.padStart(10)}  ${(result.buffer.length / 1024).toFixed(0)} KB  ${result.ext}`);
      })
    );

    // Progress every 30 items
    if ((i + SCRAPE_CONCURRENCY) % 30 === 0 || i + SCRAPE_CONCURRENCY >= toScrape.length) {
      const pct = Math.round((i + SCRAPE_CONCURRENCY) * 100 / toScrape.length);
      log(`  Progress: ${Math.min(i + SCRAPE_CONCURRENCY, toScrape.length)}/${toScrape.length} (${pct}%) — ${downloaded} OK, ${failed} failed`);
    }

    // Rate limit between batches
    await new Promise(r => setTimeout(r, SCRAPE_DELAY_MS));
  }

  log(`\n=== Scrape Summary ===`);
  log(`  Downloaded: ${downloaded}`);
  log(`  Failed: ${failed}`);
  log(`  Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  log(`  Storage bucket: receipt-attachments/dext-import/`);
}

// ============================================================================
// IMPORT
// ============================================================================

if (DRY_RUN) {
  log('DRY RUN — no records inserted');
  console.log('\n  Sample records:');
  for (const r of transformed.slice(0, 5)) {
    console.log(`    ${(r.vendor_name || 'Unknown').padEnd(30)} $${(r.amount_detected || 0).toFixed(2).padStart(10)}  ${r.status.padEnd(10)}  ${r.received_at?.slice(0, 10) || 'no date'}`);
  }
  console.log(`    ... and ${transformed.length - 5} more`);
  process.exit(0);
}

// Batch insert via RPC (bypasses PostgREST table cache issues)
const BATCH_SIZE = 50;
let inserted = 0;
let errors = 0;

for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
  const batch = transformed.slice(i, i + BATCH_SIZE);

  const { data, error } = await supabase.rpc('insert_receipt_emails', {
    rows: batch,
  });

  if (error) {
    log(`ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    errors += batch.length;
  } else {
    inserted += data || 0;
  }

  // Progress
  if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= transformed.length) {
    log(`  Progress: ${Math.min(i + BATCH_SIZE, transformed.length)}/${transformed.length}`);
  }
}

const skipped = transformed.length - inserted - errors;

log(`\n=== Import Summary ===`);
log(`  Inserted: ${inserted}`);
log(`  Skipped (duplicates): ${skipped}`);
log(`  Errors: ${errors}`);
log(`  Total: ${transformed.length}`);

// Show pipeline status after import
try {
  const { data: statusData } = await supabase.rpc('insert_receipt_emails', { rows: [] });
  // Status query via PostgREST may fail if cache is stale — that's OK
  const { data: countData, error: countErr } = await supabase
    .from('receipt_emails')
    .select('status');
  if (countData && !countErr) {
    const counts = {};
    for (const r of countData) counts[r.status] = (counts[r.status] || 0) + 1;
    console.log('\n  Pipeline status after import:');
    for (const [s, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${s}: ${c}`);
    }
  }
} catch {
  // Non-critical — data is already imported
}

// ============================================================================
// SCRAPE (if requested)
// ============================================================================

if (SCRAPE) {
  await scrapeReceiptFiles();
}
