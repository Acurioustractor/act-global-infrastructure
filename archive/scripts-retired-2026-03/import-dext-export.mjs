#!/usr/bin/env node
/**
 * Import Dext Export — parse receipt filenames into dext_receipts table
 *
 * Dext export naming conventions:
 *   "Vendor Name - YYYY-MM-DD - DextID.ext"
 *   "YYYY-MM-DD - DextID.ext"  (unknown supplier, date-only)
 *
 * Usage:
 *   node scripts/import-dext-export.mjs /path/to/dext-export-dir
 *   node scripts/import-dext-export.mjs /path/to/dext-export-dir --dry-run
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env.local

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const exportDir = args.find(a => !a.startsWith('--'));

if (!exportDir) {
  console.error('Usage: node scripts/import-dext-export.mjs /path/to/dext-export-dir [--dry-run]');
  process.exit(1);
}

// Parse filename into structured receipt data
function parseFilename(filename) {
  const ext = extname(filename).toLowerCase();
  const fileType = ext.replace('.', '');
  const baseName = filename.replace(ext, '');

  // Pattern 1: "Vendor Name - YYYY-MM-DD - DextID"
  const vendorMatch = baseName.match(/^(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/);
  if (vendorMatch) {
    return {
      vendor_name: vendorMatch[1].trim(),
      receipt_date: vendorMatch[2],
      dext_id: vendorMatch[3].trim(),
      file_type: fileType,
      filename,
    };
  }

  // Pattern 2: "YYYY-MM-DD - DextID" (no vendor name)
  const dateOnlyMatch = baseName.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(.+)$/);
  if (dateOnlyMatch) {
    return {
      vendor_name: 'Unknown Supplier',
      receipt_date: dateOnlyMatch[1],
      dext_id: dateOnlyMatch[2].trim(),
      file_type: fileType,
      filename,
    };
  }

  // Fallback: can't parse
  return {
    vendor_name: null,
    receipt_date: null,
    dext_id: null,
    file_type: fileType,
    filename,
  };
}

async function main() {
  console.log('=== Dext Export Import ===');
  console.log(`Directory: ${exportDir}`);
  if (DRY_RUN) console.log('DRY RUN — no database writes');

  const files = readdirSync(exportDir).filter(f => {
    const ext = extname(f).toLowerCase();
    return ['.pdf', '.jpg', '.jpeg', '.png'].includes(ext);
  });

  console.log(`Found ${files.length} receipt files\n`);

  const records = [];
  const parseErrors = [];

  for (const file of files) {
    const parsed = parseFilename(file);
    if (!parsed.receipt_date) {
      parseErrors.push(file);
      continue;
    }
    records.push(parsed);
  }

  // Stats
  const vendors = [...new Set(records.map(r => r.vendor_name))];
  const unknownCount = records.filter(r => r.vendor_name === 'Unknown Supplier').length;

  console.log(`Parsed: ${records.length} receipts`);
  console.log(`Unique vendors: ${vendors.length}`);
  console.log(`Unknown supplier: ${unknownCount}`);
  console.log(`Parse errors: ${parseErrors.length}`);

  if (parseErrors.length > 0) {
    console.log('\nUnparseable files:');
    for (const f of parseErrors) {
      console.log(`  ${f}`);
    }
  }

  // Date range
  const dates = records.map(r => r.receipt_date).sort();
  console.log(`\nDate range: ${dates[0]} to ${dates[dates.length - 1]}`);

  // Top vendors by receipt count
  const vendorCounts = {};
  for (const r of records) {
    vendorCounts[r.vendor_name] = (vendorCounts[r.vendor_name] || 0) + 1;
  }
  const topVendors = Object.entries(vendorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log('\nTop vendors:');
  for (const [name, count] of topVendors) {
    console.log(`  ${String(count).padStart(4)}x ${name}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Run without --dry-run to import.');
    return;
  }

  // Upsert into dext_receipts
  console.log(`\nImporting ${records.length} records...`);

  // Batch upsert in chunks of 50
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('dext_receipts')
      .upsert(batch, { onConflict: 'filename', ignoreDuplicates: true });

    if (error) {
      console.error(`Batch ${i / 50 + 1} error:`, error.message);
      skipped += batch.length;
    } else {
      imported += batch.length;
    }
  }

  console.log(`\nImported: ${imported} | Skipped: ${skipped}`);

  // Verify
  const { count } = await supabase.from('dext_receipts').select('*', { count: 'exact', head: true });
  console.log(`Total dext_receipts in DB: ${count}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
