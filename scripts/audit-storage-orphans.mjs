#!/usr/bin/env node
/**
 * Audit Storage Orphans — diffs files in Supabase Storage against
 * receipt_emails rows. Surfaces:
 *   - Files in storage with no receipt_emails row (storage orphans)
 *   - receipt_emails rows with attachment_url pointing to missing files (row orphans)
 *
 * Writes: thoughts/shared/reports/storage-orphans-{date}.md
 * Safe: read-only.
 *
 * Usage:
 *   node scripts/audit-storage-orphans.mjs
 *   node scripts/audit-storage-orphans.mjs --bucket receipt-attachments
 *   node scripts/audit-storage-orphans.mjs --folder dext-import
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const BUCKET = args.includes('--bucket') ? args[args.indexOf('--bucket') + 1] : 'receipt-attachments';
const FOLDER = args.includes('--folder') ? args[args.indexOf('--folder') + 1] : null;

async function listAllFiles(bucket, folder) {
  const files = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb.storage.from(bucket).list(folder || '', { limit: PAGE, offset });
    if (error) { console.error(error.message); return files; }
    if (!data || data.length === 0) break;
    for (const f of data) {
      // Recurse into subfolders
      if (!f.id && f.name) {
        const sub = await listAllFiles(bucket, (folder ? `${folder}/` : '') + f.name);
        files.push(...sub);
      } else {
        files.push({ ...f, path: (folder ? `${folder}/` : '') + f.name });
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return files;
}

async function main() {
  console.log('=== Storage Orphan Audit ===');
  console.log(`Bucket: ${BUCKET}${FOLDER ? ` / folder: ${FOLDER}` : ''}\n`);

  // 1. List all files in bucket
  const folders = FOLDER ? [FOLDER] : ['dext-import', 'xero-me', 'gmail', 'manual-upload'];
  const allFiles = [];
  for (const f of folders) {
    console.log(`Listing ${f}...`);
    const files = await listAllFiles(BUCKET, f);
    console.log(`  ${files.length} files`);
    allFiles.push(...files.map(file => ({ ...file, _folder: f })));
  }
  console.log(`\nTotal files: ${allFiles.length}`);

  // 2. Load all receipt_emails.attachment_url values
  const allUrls = new Set();
  let from = 0;
  while (true) {
    const { data } = await sb.from('receipt_emails')
      .select('id, attachment_url, attachment_filename')
      .not('attachment_url', 'is', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.attachment_url) allUrls.add(r.attachment_url);
      // Also index by filename (some rows may not have the full URL but have the filename)
      if (r.attachment_filename) allUrls.add(r.attachment_filename);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Unique receipt_emails attachment URLs/filenames: ${allUrls.size}`);

  // 3. Classify each file
  const orphans = [];
  const matched = [];
  for (const file of allFiles) {
    // Check if the file path, or the file name, or a prefix of the path exists in allUrls
    const inUrls = allUrls.has(file.path) || allUrls.has(file.name) ||
                   [...allUrls].some(u => u && (u.endsWith(file.name) || u.endsWith(file.path)));
    if (inUrls) {
      matched.push(file);
    } else {
      orphans.push(file);
    }
  }

  console.log(`\n=== Storage → receipt_emails ===`);
  console.log(`  Matched: ${matched.length}`);
  console.log(`  Orphans (files with no row): ${orphans.length}`);

  // 4. Reverse check: receipt_emails rows whose attachment_url doesn't match any file
  // Only counting files we actually found in storage
  const fileNames = new Set(allFiles.map(f => f.name));
  const filePaths = new Set(allFiles.map(f => f.path));
  const rowOrphans = [];
  from = 0;
  while (true) {
    const { data } = await sb.from('receipt_emails')
      .select('id, vendor_name, source, attachment_url, attachment_filename')
      .not('attachment_url', 'is', null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const fn = r.attachment_filename;
      const url = r.attachment_url;
      if (!fn && !url) continue;
      // Check if file exists
      const found = (fn && fileNames.has(fn)) || (url && [...filePaths].some(p => url.includes(p)));
      if (!found) rowOrphans.push(r);
    }
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`\n=== receipt_emails → Storage ===`);
  console.log(`  Row orphans (rows pointing to missing files): ${rowOrphans.length}`);

  // Write report
  const reportPath = `thoughts/shared/reports/storage-orphans-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [];
  lines.push(`# Storage Orphan Audit`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Bucket:** ${BUCKET}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Files in storage: ${allFiles.length}`);
  lines.push(`- receipt_emails rows with attachment references: ${allUrls.size}`);
  lines.push(`- 🟢 Matched (file + row): ${matched.length}`);
  lines.push(`- 🟡 Storage orphans (file without row): ${orphans.length}`);
  lines.push(`- 🟡 Row orphans (row without file): ${rowOrphans.length}`);
  lines.push(``);

  if (orphans.length > 0) {
    lines.push(`## Storage orphans (files without a receipt_emails row)`);
    lines.push(`These are files on disk that no receipt_emails row references. Either:`);
    lines.push(`- A row was deleted but the file wasn't cleaned up (safe to delete file)`);
    lines.push(`- A file was uploaded directly to storage without creating a tracking row (needs row created)`);
    lines.push(``);
    lines.push(`Sample (first 50):`);
    for (const f of orphans.slice(0, 50)) {
      lines.push(`- ${f.path} (${f.metadata?.size || '?'} bytes, ${f.created_at || '?'})`);
    }
    if (orphans.length > 50) lines.push(`- ... ${orphans.length - 50} more`);
    lines.push(``);
  }

  if (rowOrphans.length > 0) {
    lines.push(`## Row orphans (receipt_emails pointing to missing files)`);
    lines.push(`These are rows whose attachment_url references a file that no longer exists in storage. Either:`);
    lines.push(`- The file was deleted but the row wasn't cleaned up`);
    lines.push(`- The attachment_url is stale/wrong`);
    lines.push(``);
    for (const r of rowOrphans.slice(0, 50)) {
      lines.push(`- [${r.source}] ${r.vendor_name || '?'} — filename: ${r.attachment_filename || '?'} — url: ${r.attachment_url || '?'}`);
    }
    if (rowOrphans.length > 50) lines.push(`- ... ${rowOrphans.length - 50} more`);
    lines.push(``);
  }

  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
