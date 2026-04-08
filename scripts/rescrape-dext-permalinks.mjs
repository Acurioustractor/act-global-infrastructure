#!/usr/bin/env node
/**
 * Rescrape Dext Permalinks — pulls receipt files from Dext permalinks for any
 * receipt_emails row whose attachment_url is still `https://rbnk.me/*`.
 *
 * Critical before Dext cancellation: rbnk.me permalinks die once the account
 * is cancelled, so any row that still points at one needs to be pulled into
 * Supabase Storage first.
 *
 * For each target row:
 *   1. GET the permalink, follow redirects
 *   2. Upload to `receipt-attachments/dext-import/<item_id>.<ext>`
 *   3. UPDATE receipt_emails SET attachment_url = the new storage path
 *
 * Usage:
 *   node scripts/rescrape-dext-permalinks.mjs               # Dry run
 *   node scripts/rescrape-dext-permalinks.mjs --apply        # Download + upload
 *   node scripts/rescrape-dext-permalinks.mjs --apply --limit 20  # Test batch
 *   node scripts/rescrape-dext-permalinks.mjs --apply --concurrency 5
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = 'receipt-attachments';
const DELAY_MS = 500; // Polite rate limit between fetches in the same worker

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

function extFromContentType(ct) {
  if (!ct) return 'bin';
  if (ct.includes('pdf')) return 'pdf';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('tiff')) return 'tiff';
  if (ct.includes('heic')) return 'heic';
  return 'bin';
}

async function downloadPermalink(url) {
  const r = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'ACT-Receipt-Pipeline/1.0' },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = r.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, contentType: ct };
}

async function uploadToStorage(storagePath, buffer, contentType) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage: ${error.message}`);
  return storagePath;
}

async function processRow(row) {
  try {
    const { buffer, contentType } = await downloadPermalink(row.attachment_url);
    const ext = extFromContentType(contentType);
    const storagePath = `dext-import/${row.dext_item_id}.${ext}`;
    await uploadToStorage(storagePath, buffer, contentType);

    const { error } = await sb.from('receipt_emails')
      .update({
        attachment_url: storagePath,
        attachment_content_type: contentType,
        attachment_size_bytes: buffer.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (error) return { row, status: 'db_error', reason: error.message };

    return { row, status: 'ok', size: buffer.length, contentType };
  } catch (e) {
    return { row, status: 'error', reason: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const concIdx = args.indexOf('--concurrency');
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 3;

  console.log(`Rescrape Dext Permalinks — ${apply ? 'APPLY' : 'DRY RUN'} | concurrency: ${concurrency}${limit ? ` | limit: ${limit}` : ''}\n`);

  // Find rows still pointing at rbnk.me (i.e., not yet scraped to local storage)
  const rows = await q(`
    SELECT id, dext_item_id, attachment_url, vendor_name, status
    FROM receipt_emails
    WHERE attachment_url LIKE 'https://rbnk.me/%'
      AND dext_item_id IS NOT NULL
    ORDER BY received_at DESC
    ${limit ? `LIMIT ${limit}` : ''}
  `);

  console.log(`Found ${rows.length} rows still pointing at rbnk.me permalinks`);
  if (rows.length === 0) {
    console.log('✅ All Dext files already in local storage.');
    return;
  }

  if (!apply) {
    console.log('\nSample (first 10):');
    for (const r of rows.slice(0, 10)) {
      console.log(`  ${r.dext_item_id}  ${(r.vendor_name || '?').slice(0, 30).padEnd(30)}  ${r.status.padEnd(10)}  ${r.attachment_url}`);
    }
    if (rows.length > 10) console.log(`  ... and ${rows.length - 10} more`);
    console.log(`\n(dry run — pass --apply to download ${rows.length} files)`);
    return;
  }

  // Process with bounded concurrency + polite spacing
  let idx = 0, ok = 0, err = 0, totalBytes = 0;
  const errors = [];

  async function worker() {
    while (idx < rows.length) {
      const myIdx = idx++;
      const row = rows[myIdx];
      const result = await processRow(row);
      if (result.status === 'ok') {
        ok++;
        totalBytes += result.size;
        if (ok % 25 === 0 || myIdx === rows.length - 1) {
          console.log(`  Progress: ${myIdx + 1}/${rows.length} — ${ok} OK, ${err} failed`);
        }
      } else {
        err++;
        errors.push({ id: row.dext_item_id, reason: result.reason });
        console.log(`  ❌ ${row.dext_item_id}: ${result.reason}`);
      }
      // Pace per worker
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  const t0 = Date.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`\n=== Summary ===`);
  console.log(`  Downloaded: ${ok}`);
  console.log(`  Failed:     ${err}`);
  console.log(`  Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Duration:   ${elapsed}s`);

  if (err > 0 && errors.length > 0) {
    console.log(`\n  First 10 errors:`);
    for (const e of errors.slice(0, 10)) console.log(`    ${e.id}: ${e.reason}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
