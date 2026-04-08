#!/usr/bin/env node
/**
 * Sync Bill Attachments to Bank Transactions — for each ACCPAY bill in Xero
 * with an attached receipt where a matching SPEND bank transaction is unreceipted,
 * copies the attachment from the bill to the bank transaction.
 *
 * Why: Connectors like Qantas Business Rewards, Uber Business, Virgin, Webflow,
 * Booking.com auto-create ACCPAY bills in Xero with PDF receipts attached. But
 * when the bank feed delivers the matching payment line, Xero creates a SEPARATE
 * SPEND bank transaction that has no attachment of its own. Our BAS confidence
 * score checks `has_attachments` on the bank transaction side, so these appear
 * as "missing receipts" even though the receipt is already in Xero.
 *
 * This script closes the gap by:
 *   1. Finding ACCPAY bills (AUTHORISED or PAID) with has_attachments=true
 *   2. Finding an unreceipted SPEND bank txn matching on vendor + date ±14d + amount
 *   3. GET the attachment bytes from the bill via Xero API
 *   4. PUT those bytes onto the matching bank transaction
 *   5. Update xero_transactions.has_attachments=true in our mirror
 *
 * The original bill is left untouched — proper reconciliation in the Xero UI
 * can still happen later. This just gives the bank txn its own evidence.
 *
 * Usage:
 *   node scripts/sync-bill-attachments-to-txns.mjs                      # Dry run, Q2+Q3
 *   node scripts/sync-bill-attachments-to-txns.mjs --apply                # Apply
 *   node scripts/sync-bill-attachments-to-txns.mjs --apply --limit 5      # Small batch
 *   node scripts/sync-bill-attachments-to-txns.mjs Q2 Q3 --apply          # Explicit quarters
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
const XERO_API = 'https://api.xero.com/api.xro/2.0';

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26' },
};

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
  writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: Date.now() + d.expires_in * 1000 - 60000,
  }, null, 2));
  await sb.from('xero_tokens').upsert({
    id: 'default',
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: new Date(Date.now() + d.expires_in * 1000 - 60000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return true;
}

async function xeroFetch(endpoint, method = 'GET', accept = 'application/json', body = null, contentType = null, _retry = false) {
  const headers = {
    'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
    'xero-tenant-id': XERO_TENANT_ID,
    'Accept': accept,
  };
  if (contentType) headers['Content-Type'] = contentType;
  if (body && body instanceof Buffer) headers['Content-Length'] = body.length.toString();
  const r = await fetch(`${XERO_API}/${endpoint}`, { method, headers, body });
  if (r.status === 401 && !_retry) {
    await refreshXeroToken();
    return xeroFetch(endpoint, method, accept, body, contentType, true);
  }
  return r;
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function getBillAttachments(billId) {
  const r = await xeroFetch(`Invoices/${billId}/Attachments`);
  if (!r.ok) return null;
  const data = await r.json();
  return data.Attachments || [];
}

async function downloadBillAttachment(billId, fileName) {
  const r = await xeroFetch(`Invoices/${billId}/Attachments/${encodeURIComponent(fileName)}`, 'GET', '*/*');
  if (!r.ok) return null;
  const contentType = r.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, contentType };
}

async function uploadToTxn(txnId, fileName, buffer, contentType) {
  const r = await xeroFetch(
    `BankTransactions/${txnId}/Attachments/${encodeURIComponent(fileName)}`,
    'PUT',
    'application/json',
    buffer,
    contentType
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status}: ${text.slice(0, 200)}`);
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  const quarters = quarterArgs.length > 0 ? quarterArgs : ['Q2', 'Q3'];
  const ranges = quarters.map(q => QUARTERS[q]).filter(Boolean);

  console.log(`Sync Bill Attachments → Bank Txns — ${apply ? 'APPLY' : 'DRY RUN'} | quarters: ${quarters.join(', ')}${limit ? ` | limit: ${limit}` : ''}\n`);

  loadTokens();
  if (!XERO_ACCESS_TOKEN) {
    if (!(await refreshXeroToken())) {
      console.error('Auth failed. Run: node scripts/sync-xero-tokens.mjs');
      process.exit(1);
    }
  }

  // Find matching (txn, bill) pairs where txn lacks attachment and bill has one
  const rangeClause = ranges.map(r => `(tx.date >= '${r.start}' AND tx.date <= '${r.end}')`).join(' OR ');
  const matches = await q(`
    SELECT DISTINCT ON (tx.xero_transaction_id)
      tx.xero_transaction_id, tx.date as txn_date, tx.contact_name as txn_vendor,
      abs(tx.total)::numeric(12,2) as amount,
      inv.xero_id as bill_id, inv.invoice_number, inv.status as bill_status,
      inv.contact_name as bill_vendor, inv.date as bill_date
    FROM xero_transactions tx
    JOIN xero_invoices inv ON inv.type = 'ACCPAY'
      AND inv.has_attachments = true
      AND inv.date BETWEEN tx.date - interval '14 days' AND tx.date + interval '14 days'
      AND abs(abs(tx.total) - inv.total) < 0.50
      AND (
        lower(tx.contact_name) = lower(inv.contact_name)
        OR lower(tx.contact_name) LIKE '%' || lower(split_part(inv.contact_name, ' ', 1)) || '%'
      )
    WHERE tx.type = 'SPEND'
      AND tx.has_attachments = false
      AND (${rangeClause})
    ORDER BY tx.xero_transaction_id, abs(tx.date - inv.date)
    ${limit ? `LIMIT ${limit}` : ''}
  `);

  console.log(`Found ${matches.length} (txn, bill) pairs to sync`);
  if (matches.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const totalValue = matches.reduce((s, m) => s + Number(m.amount), 0);
  console.log(`Total recoverable value: ${fmt(totalValue)}  (GST: ${fmt(totalValue / 11)})`);

  if (!apply) {
    console.log('\nSample (first 15):');
    for (const m of matches.slice(0, 15)) {
      console.log(`  ${m.txn_date}  ${(m.txn_vendor || '?').slice(0, 20).padEnd(20)} ${fmt(m.amount).padStart(12)}  ← bill ${m.invoice_number || m.bill_id.slice(0, 8)} (${m.bill_status})`);
    }
    if (matches.length > 15) console.log(`  ... and ${matches.length - 15} more`);
    console.log('\n(dry run — pass --apply to download from bills and attach to txns)');
    return;
  }

  // Apply
  let ok = 0, err = 0, skip = 0;
  const failures = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const label = `[${i + 1}/${matches.length}] ${m.txn_date} ${(m.txn_vendor || '?').slice(0, 20).padEnd(20)} ${fmt(m.amount).padStart(12)}`;
    try {
      const attachments = await getBillAttachments(m.bill_id);
      if (!attachments || attachments.length === 0) { skip++; console.log(`  ⚪ ${label} — bill has no attachments`); continue; }

      // Use the first attachment (bills usually have one)
      const att = attachments[0];
      const dl = await downloadBillAttachment(m.bill_id, att.FileName);
      if (!dl) { err++; console.log(`  ❌ ${label} — download failed`); continue; }

      await uploadToTxn(m.xero_transaction_id, att.FileName, dl.buffer, dl.contentType);

      // Update mirror
      await sb.from('xero_transactions')
        .update({ has_attachments: true, updated_at: new Date().toISOString() })
        .eq('xero_transaction_id', m.xero_transaction_id);

      ok++;
      console.log(`  ✅ ${label} ← ${att.FileName}`);
    } catch (e) {
      err++;
      failures.push({ txn_id: m.xero_transaction_id, reason: e.message });
      console.log(`  ❌ ${label} — ${e.message}`);
    }
    // Xero rate limit: 60/min — we make ~3 calls per pair, so sleep 500ms between pairs
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Copied:  ${ok}`);
  console.log(`  Skipped: ${skip}`);
  console.log(`  Failed:  ${err}`);
  if (failures.length > 0) {
    console.log('\n  First 5 failures:');
    for (const f of failures.slice(0, 5)) console.log(`    ${f.txn_id.slice(0, 8)}: ${f.reason}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
