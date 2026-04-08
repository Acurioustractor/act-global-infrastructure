#!/usr/bin/env node
/**
 * Bulk Upload Receipts — takes a folder of portal-downloaded receipts (Qantas,
 * Uber, Stripe, etc.), matches each file to a Xero SPEND transaction, and
 * uploads via the Xero Attachments API.
 *
 * Handles three input modes:
 *
 *   1. Folder with filename convention:
 *        ./receipts/qantas/2025-11-15_234.50.pdf
 *        ./receipts/qantas/2025-11-18-187.68-flight-bne-syd.pdf
 *      Vendor from folder name, date + amount parsed from filename.
 *
 *   2. Manifest CSV (best for portal CSV exports):
 *        filename,vendor,date,amount
 *        qantas-INV123.pdf,Qantas,2025-11-15,234.50
 *
 *   3. Simple folder mode (no date/amount in filename):
 *      Uses the folder name as vendor and matches to any unreceipted Xero
 *      SPEND from that vendor, oldest first. Lowest precision — use manifest
 *      mode when you have the data.
 *
 * Usage:
 *   node scripts/bulk-upload-receipts.mjs --folder ./receipts/qantas --vendor Qantas
 *   node scripts/bulk-upload-receipts.mjs --manifest ./qantas-export.csv --folder ./receipts/qantas
 *   node scripts/bulk-upload-receipts.mjs --folder ./receipts/qantas --apply
 *
 * Defaults to dry-run; pass --apply to actually upload.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Xero auth — reusing the same token-refresh pattern as upload-receipts-to-xero.mjs
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = '.xero-tokens.json';

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (t.access_token) XERO_ACCESS_TOKEN = t.access_token;
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch {}
}

async function refreshToken() {
  if (!XERO_CLIENT_ID || !XERO_REFRESH_TOKEN) return false;
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
  try {
    const { writeFileSync } = await import('fs');
    writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000 - 60000 }, null, 2));
  } catch {}
  return true;
}

async function uploadAttachment(bankTxId, fileName, fileBuffer, contentType, _retry = false) {
  const url = `https://api.xero.com/api.xro/2.0/BankTransactions/${bankTxId}/Attachments/${encodeURIComponent(fileName)}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length.toString(),
      'Accept': 'application/json',
    },
    body: fileBuffer,
  });
  if (r.status === 401 && !_retry) {
    await refreshToken();
    return uploadAttachment(bankTxId, fileName, fileBuffer, contentType, true);
  }
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Xero ${r.status}: ${txt.slice(0, 200)}`);
  }
  return true;
}

function contentTypeFor(filename) {
  const ext = extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.heic') return 'image/heic';
  return 'application/octet-stream';
}

// Parse date + amount from filenames like:
//   2025-11-15_234.50.pdf
//   2025-11-15-234.50-description.pdf
//   INV123_2025-11-15_234.50.pdf
function parseFilename(name) {
  // Strip extension so the amount regex doesn't get confused by `.pdf`
  const base = name.replace(/\.[^.]+$/, '');
  const dateMatch = base.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
  // Look for amount AFTER the date so we don't capture digits from the date itself
  const afterDate = date ? base.slice(base.indexOf(dateMatch[0]) + dateMatch[0].length) : base;
  const amountMatch = afterDate.match(/(\d+(?:\.\d{1,2}))/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  return { date, amount };
}

function parseCSVLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseManifest(csvPath) {
  const txt = readFileSync(csvPath, 'utf8');
  const lines = txt.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (vals[j] || '').trim();
    rows.push(row);
  }
  return rows;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aw = new Set(a.split(/\W+/).filter(Boolean));
  const bw = new Set(b.split(/\W+/).filter(Boolean));
  let common = 0;
  for (const w of aw) if (bw.has(w)) common++;
  return common / Math.max(aw.size, bw.size, 1);
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function findMatchingTxn(vendor, date, amount) {
  // Window: vendor match + date ±7 days + amount ±2% (if provided)
  const vendorSafe = String(vendor || '').replace(/'/g, "''");
  const d = new Date(date);
  const start = new Date(d); start.setDate(start.getDate() - 7);
  const end = new Date(d); end.setDate(end.getDate() + 7);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const candidates = await q(`
    SELECT xero_transaction_id, date, contact_name, total::numeric(12,2)
    FROM xero_transactions
    WHERE type = 'SPEND' AND has_attachments = false
      AND date >= '${startStr}' AND date <= '${endStr}'
      AND contact_name ILIKE '%${vendorSafe.split(/\s+/)[0]}%'
  `);

  if (candidates.length === 0) return null;

  // Score
  const scored = candidates.map(c => {
    const vSim = similarity(vendor, c.contact_name);
    const dayDiff = Math.abs((new Date(c.date) - d) / 86400000);
    const txAmount = Math.abs(Number(c.total));
    let score = 0;
    if (vSim >= 0.5) score += 40 * vSim;
    if (amount != null) {
      const diff = Math.abs(amount - txAmount) / txAmount;
      if (diff < 0.02) score += 50;
      else if (diff < 0.05) score += 30;
      else if (diff < 0.10) score += 15;
    } else {
      score += 25; // partial credit when we can't verify amount
    }
    if (dayDiff < 2) score += 20;
    else if (dayDiff < 5) score += 10;
    return { txn: c, score, vSim, dayDiff };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best.score >= 60 ? best : null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const folderIdx = args.indexOf('--folder');
  const folder = folderIdx !== -1 ? args[folderIdx + 1] : null;
  const manifestIdx = args.indexOf('--manifest');
  const manifest = manifestIdx !== -1 ? args[manifestIdx + 1] : null;
  const vendorIdx = args.indexOf('--vendor');
  const defaultVendor = vendorIdx !== -1 ? args[vendorIdx + 1] : null;

  if (!folder) {
    console.error('Usage: node scripts/bulk-upload-receipts.mjs --folder <path> [--vendor <name>] [--manifest <csv>] [--apply]');
    process.exit(1);
  }
  if (!existsSync(folder)) {
    console.error(`Folder not found: ${folder}`);
    process.exit(1);
  }

  // Build a list of items to process
  const items = [];
  if (manifest) {
    const rows = parseManifest(manifest);
    for (const r of rows) {
      items.push({
        filePath: join(folder, r.filename),
        vendor: r.vendor || defaultVendor,
        date: r.date,
        amount: r.amount ? parseFloat(r.amount) : null,
      });
    }
    console.log(`Manifest: ${rows.length} rows`);
  } else {
    const files = readdirSync(folder).filter(f => !f.startsWith('.') && statSync(join(folder, f)).isFile());
    const vendor = defaultVendor || basename(folder);
    for (const f of files) {
      const { date, amount } = parseFilename(f);
      items.push({
        filePath: join(folder, f),
        vendor,
        date: date || new Date(statSync(join(folder, f)).mtime).toISOString().slice(0, 10),
        amount,
      });
    }
    console.log(`Folder scan: ${files.length} files, vendor=${vendor}`);
  }

  loadTokens();
  if (apply && !XERO_ACCESS_TOKEN) {
    console.log('Refreshing Xero token...');
    if (!(await refreshToken())) {
      console.error('Token refresh failed — run `node scripts/xero-auth.mjs` first');
      process.exit(1);
    }
  }

  let matched = 0, noMatch = 0, uploaded = 0, failed = 0, skipped = 0;
  const results = [];

  for (const item of items) {
    if (!existsSync(item.filePath)) {
      console.log(`  ⚠ missing: ${item.filePath}`);
      skipped++;
      continue;
    }
    const match = await findMatchingTxn(item.vendor, item.date, item.amount);
    const fname = basename(item.filePath);
    if (!match) {
      console.log(`  ❌ ${fname} — no match (${item.vendor}, ${item.date}, ${item.amount || '?'})`);
      noMatch++;
      results.push({ ...item, fname, status: 'no-match' });
      continue;
    }
    matched++;
    const m = match;
    console.log(`  ✓ ${fname} → ${m.txn.date} ${m.txn.contact_name} $${m.txn.total} (${Math.round(m.score)}%)`);
    results.push({ ...item, fname, status: 'matched', txnId: m.txn.xero_transaction_id, score: m.score });

    if (apply) {
      try {
        const buffer = readFileSync(item.filePath);
        await uploadAttachment(m.txn.xero_transaction_id, fname, buffer, contentTypeFor(fname));
        uploaded++;
        // Update mirror so subsequent runs don't re-match
        await sb.from('xero_transactions')
          .update({ has_attachments: true, updated_at: new Date().toISOString() })
          .eq('xero_transaction_id', m.txn.xero_transaction_id);
        await new Promise(r => setTimeout(r, 1100)); // Xero rate limit
      } catch (e) {
        console.log(`    ❌ upload failed: ${e.message}`);
        failed++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Files:       ${items.length}`);
  console.log(`  Matched:     ${matched}`);
  console.log(`  No match:    ${noMatch}`);
  console.log(`  Skipped:     ${skipped}`);
  if (apply) {
    console.log(`  Uploaded:    ${uploaded}`);
    console.log(`  Failed:      ${failed}`);
  } else {
    console.log(`  (dry run — pass --apply to upload)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
