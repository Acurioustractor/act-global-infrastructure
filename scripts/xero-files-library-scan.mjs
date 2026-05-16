#!/usr/bin/env node
/**
 * Xero Files Library Scan — queries Xero's Files API to list every file
 * in the Files library and cross-references them against unreceipted
 * transactions. Catches receipts Nic or the accountant dumped into the
 * Files library manually rather than attaching to specific txns.
 *
 * Output: `thoughts/shared/reports/xero-files-library-{date}.md`
 *
 * Safe: read-only. Surfaces candidates for human review.
 *
 * Requires Xero OAuth scopes `files` and `files.read`.
 *
 * Usage:
 *   node scripts/xero-files-library-scan.mjs          # full scan
 *   node scripts/xero-files-library-scan.mjs Q2       # filter to quarter
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = '.xero-tokens.json';

const FILES_API = 'https://api.xero.com/files.xro/1.0';

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (t.access_token) XERO_ACCESS_TOKEN = t.access_token;
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch {}
}

async function refreshXeroToken() {
  const creds = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN }),
  });
  if (!r.ok) return false;
  const d = await r.json();
  XERO_ACCESS_TOKEN = d.access_token;
  XERO_REFRESH_TOKEN = d.refresh_token;
  writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000 - 60000 }, null, 2));
  if (SUPABASE_KEY) {
    const expiresAt = new Date(Date.now() + d.expires_in * 1000 - 60000).toISOString();
    await sb.from('xero_tokens').upsert({
      id: 'default',
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
      updated_by: 'xero-files-library-scan',
    }, { onConflict: 'id' });
  }
  if (existsSync('.env.local')) {
    let envBody = readFileSync('.env.local', 'utf8');
    const line = `XERO_REFRESH_TOKEN=${d.refresh_token}`;
    if (/^XERO_REFRESH_TOKEN=/m.test(envBody)) {
      envBody = envBody.replace(/^XERO_REFRESH_TOKEN=.*/m, line);
    } else {
      envBody = `${envBody.trimEnd()}\n${line}\n`;
    }
    writeFileSync('.env.local', envBody);
  }
  return true;
}

async function xeroGet(url, _retries = 0) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${XERO_ACCESS_TOKEN}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
  });
  if (r.status === 401 && _retries === 0) { await refreshXeroToken(); return xeroGet(url, 1); }
  if (r.status === 429 && _retries < 5) {
    const retryAfter = parseInt(r.headers.get('Retry-After') || '60');
    console.log(`  ⏳ 429 — sleeping ${retryAfter}s`);
    await new Promise(res => setTimeout(res, (retryAfter + 1) * 1000));
    return xeroGet(url, _retries + 1);
  }
  return r;
}

async function exitWithFilesApiError(response) {
  const body = await response.text();
  if (response.status === 401) {
    console.error('Files API error: 401 Unauthorized');
    console.error('');
    console.error('The Xero OAuth connection is not authorised for the Files API.');
    console.error('Add the `files.read` scope to the ACT Xero app, re-authorise Xero, then rerun this scan.');
    console.error('');
    console.error('Raw response:', body);
    process.exit(1);
  }
  console.error('Files API error:', response.status, body);
  process.exit(1);
}

async function main() {
  loadTokens();
  console.log('=== Xero Files Library Scan ===\n');

  // Fetch all files (paginated)
  const allFiles = [];
  let page = 1;
  while (true) {
    const r = await xeroGet(`${FILES_API}/Files?pagesize=100&page=${page}`);
    if (!r.ok) await exitWithFilesApiError(r);
    const j = await r.json();
    const items = j.Items || j.items || [];
    if (items.length === 0) break;
    allFiles.push(...items);
    console.log(`  page ${page}: ${items.length} files (cumulative: ${allFiles.length})`);
    if (items.length < 100) break;
    page++;
    await new Promise(rs => setTimeout(rs, 1100));
  }
  console.log(`\nTotal files in Xero Files library: ${allFiles.length}`);

  // Also fetch folders
  const rFolders = await xeroGet(`${FILES_API}/Folders`);
  const folders = rFolders.ok ? ((await rFolders.json()).Folders || []) : [];
  const folderById = new Map();
  for (const f of folders) folderById.set(f.Id, f.Name);
  console.log(`Folders: ${folders.length}`);

  // Load unreceipted txns to cross-reference
  const { data: txns } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date')
    .eq('type', 'SPEND')
    .eq('status', 'AUTHORISED')
    .eq('has_attachments', false)
    .gte('date', '2025-07-01');

  console.log(`Unreceipted SPEND txns to check against: ${txns.length}`);

  // Classify files: are they linked to something (AssociatedEntity) or floating?
  const floating = [];
  const associated = [];
  for (const f of allFiles) {
    const isAssoc = f.AssociatedObjectType && f.AssociatedObjectType !== 'Unknown';
    if (isAssoc) {
      associated.push(f);
    } else {
      floating.push(f);
    }
  }
  console.log(`Associated to entities: ${associated.length}`);
  console.log(`Floating (unassociated): ${floating.length}`);

  // Heuristic: floating files whose name mentions a missing vendor
  const missingVendors = new Set((txns || []).map(t => (t.contact_name || '').toLowerCase().split(' ')[0]).filter(Boolean));

  const vendorMatches = [];
  for (const f of floating) {
    const name = (f.Name || '').toLowerCase();
    for (const v of missingVendors) {
      if (v.length > 3 && name.includes(v)) {
        vendorMatches.push({ file: f, vendor: v });
        break;
      }
    }
  }

  // Write report
  const reportPath = `thoughts/shared/reports/xero-files-library-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [];
  lines.push(`# Xero Files Library Scan`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(`- Total files in library: ${allFiles.length}`);
  lines.push(`- Folders: ${folders.length}`);
  lines.push(`- Associated to a Xero entity: ${associated.length}`);
  lines.push(`- Floating (not linked): ${floating.length}`);
  lines.push(`- Floating files matching a missing-vendor name: ${vendorMatches.length}`);
  lines.push(``);

  if (folders.length > 0) {
    lines.push(`## Folders`);
    for (const f of folders) {
      const count = allFiles.filter(af => af.FolderId === f.Id).length;
      lines.push(`- ${f.Name} (${count} files)`);
    }
    lines.push(``);
  }

  if (vendorMatches.length > 0) {
    lines.push(`## 🟢 Floating files matching unreceipted vendors`);
    lines.push(`These are strong candidates — a file sitting loose in the Files library with a name that matches a vendor whose bank txn has no receipt.`);
    lines.push(``);
    for (const { file, vendor } of vendorMatches) {
      lines.push(`- **${file.Name}** (vendor: ${vendor})`);
      lines.push(`  size: ${file.Size} bytes · created: ${file.CreatedDateUtc}`);
      lines.push(`  folder: ${folderById.get(file.FolderId) || '?'}`);
      lines.push(`  Xero File ID: \`${file.Id}\``);
      lines.push(``);
    }
  }

  if (floating.length > 0) {
    lines.push(`## All floating files (sample 30)`);
    for (const f of floating.slice(0, 30)) {
      lines.push(`- ${f.Name} (${f.Size} bytes, folder: ${folderById.get(f.FolderId) || '?'})`);
    }
  }

  writeFileSync(reportPath, lines.join('\n'));
  writeFileSync(`${reportPath}.provenance.md`, [
    '# Provenance: Xero Files Library Scan',
    '',
    `Report: ${reportPath}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Data Sources Queried',
    '- Xero Files API `GET /Files`.',
    '- Xero Files API `GET /Folders`.',
    '- Supabase `xero_transactions` for unreceipted SPEND transaction names.',
    '- Supabase `xero_tokens` for token refresh persistence if required.',
    '',
    '## Mutations',
    '- No Xero accounting or Files Library mutation was performed.',
    '- OAuth token mirrors may be rotated and persisted when the access token is expired.',
    '',
    '## Verified',
    '- File/folder counts come from live Xero Files API responses.',
    '- Missing-vendor comparisons use current Supabase Xero transaction mirror rows.',
    '',
    '## Inferred',
    '- Vendor matches are filename heuristics only; amount/date must be checked before linking.',
    '',
    '## Unknown',
    '- Whether a floating file is the correct receipt until a human confirms image/PDF content.',
    '',
    '## Reproduce',
    '```bash',
    'node scripts/xero-files-library-scan.mjs',
    '```',
    '',
  ].join('\n'));
  console.log(`\nReport: ${reportPath}`);
  console.log(`Provenance: ${reportPath}.provenance.md`);
}

main().catch(e => { console.error(e); process.exit(1); });
