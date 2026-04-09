#!/usr/bin/env node
/**
 * Gmail → Xero Pipeline — for each unreceipted SPEND txn, search Gmail,
 * pick the best candidate message, download its PDF attachment, upload to
 * Supabase Storage, create a receipt_emails row linked to the Xero txn,
 * and push the PDF to Xero via the Attachments API.
 *
 * Full closed loop from "Gmail has a receipt Dext missed" to "receipt
 * attached in Xero". Idempotent: re-running is safe.
 *
 * Strategy:
 *   1. Load unreceipted txns for the quarter (same filter as bas-completeness)
 *   2. For each, run the same Gmail query as gmail-deep-search.mjs
 *   3. Of the hits, pick the "best" — prefer messages with a real PDF
 *      attachment ≥ 10KB, closest to txn date
 *   4. If a best hit exists and the PDF isn't already in receipt_emails
 *      (by gmail_message_id), download the PDF, upload to Supabase Storage,
 *      create receipt_emails row, push to Xero
 *
 * Safe: --dry-run by default. --apply to execute.
 * Idempotent: checks for existing receipt_emails row by gmail_message_id.
 *
 * Usage:
 *   node scripts/gmail-to-xero-pipeline.mjs Q3                 # dry run
 *   node scripts/gmail-to-xero-pipeline.mjs Q3 --apply         # execute
 *   node scripts/gmail-to-xero-pipeline.mjs Q2 Q3 --apply --limit 20
 *   node scripts/gmail-to-xero-pipeline.mjs Q3 --apply --vendors Qantas
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
const VENDOR_FILTER = args.includes('--vendors') ? args[args.indexOf('--vendors') + 1].split(',').map(s => s.toLowerCase().trim()) : null;
const FY = args.includes('--fy') ? parseInt(args[args.indexOf('--fy') + 1]) : 26;

const QUARTERS = (() => {
  const y1 = 2000 + FY - 1, y2 = 2000 + FY;
  return {
    Q1: { start: `${y1}-07-01`, end: `${y1}-09-30`, label: `Q1 FY${FY}` },
    Q2: { start: `${y1}-10-01`, end: `${y1}-12-31`, label: `Q2 FY${FY}` },
    Q3: { start: `${y2}-01-01`, end: `${y2}-03-31`, label: `Q3 FY${FY}` },
    Q4: { start: `${y2}-04-01`, end: `${y2}-06-30`, label: `Q4 FY${FY}` },
  };
})();

// ============================================================================
// BWS SECRET LOADER (same pattern as gmail-deep-search.mjs)
// ============================================================================
let _secretCache = null;
function loadSecrets() {
  if (_secretCache) return _secretCache;
  try {
    const token = execSync('security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null', { encoding: 'utf8' }).trim();
    const result = execSync(`BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`, { encoding: 'utf8' });
    const secrets = JSON.parse(result);
    _secretCache = {};
    for (const s of secrets) _secretCache[s.key] = s.value;
    return _secretCache;
  } catch { return {}; }
}
function getSecret(name) { return loadSecrets()[name] || process.env[name]; }

// ============================================================================
// GMAIL
// ============================================================================
async function getGmailForUser(userEmail) {
  const keyJson = getSecret('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.JWT({
    email: credentials.client_email, key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: userEmail,
  });
  await auth.authorize();
  return google.gmail({ version: 'v1', auth });
}

function getDelegatedUsers() {
  const multi = getSecret('GOOGLE_DELEGATED_USERS');
  if (multi) return multi.split(',').map(e => e.trim()).filter(Boolean);
  const single = getSecret('GOOGLE_DELEGATED_USER');
  if (single) return [single.trim()];
  throw new Error('GOOGLE_DELEGATED_USERS not configured');
}

// ============================================================================
// XERO
// ============================================================================
const TOKEN_FILE = '.xero-tokens.json';
function loadXeroTokens() {
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
  return true;
}
async function xeroFetch(endpoint, method = 'GET', body = null, contentType = null, _retry = false) {
  const headers = {
    'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
    'xero-tenant-id': XERO_TENANT_ID,
    'Accept': 'application/json',
  };
  if (contentType) headers['Content-Type'] = contentType;
  if (body instanceof Buffer) headers['Content-Length'] = body.length.toString();
  const r = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, { method, headers, body });
  if (r.status === 401 && !_retry) { await refreshXeroToken(); return xeroFetch(endpoint, method, body, contentType, true); }
  return r;
}

// ============================================================================
// VENDOR → QUERY (same mapping as gmail-deep-search.mjs)
// ============================================================================
const VENDOR_QUERY_MAP = {
  'apple': '(from:apple.com OR from:itunes.com) (receipt OR invoice)',
  'apple pty ltd': '(from:apple.com OR from:itunes.com) (receipt OR invoice)',
  'qantas': 'from:qantas.com (receipt OR invoice OR itinerary OR tax invoice)',
  'uber': 'from:uber.com receipt',
  'webflow': 'from:webflow.com (receipt OR invoice)',
  'stripe': 'from:stripe.com (receipt OR invoice)',
  'anthropic': 'from:anthropic.com (receipt OR invoice)',
  'openai': 'from:openai.com (receipt OR invoice)',
  'claude.ai': 'from:anthropic.com (receipt OR invoice)',
  'google': '(from:google.com OR from:googlepayments.com) (receipt OR invoice OR charge)',
  'google australia': '(from:google.com) (receipt OR invoice)',
  'google workspace': 'from:google.com (workspace OR g suite) (invoice OR receipt)',
  'chatgpt': 'from:openai.com (receipt OR subscription)',
  'notion labs': 'from:notion.so (receipt OR invoice)',
  'figma': 'from:figma.com (receipt OR invoice)',
  'vercel': 'from:vercel.com (receipt OR invoice)',
  'bitwarden': 'from:bitwarden.com (receipt OR invoice)',
  'firecrawl': 'from:firecrawl.dev (receipt OR invoice)',
  'cursor ai': 'from:cursor.sh (receipt OR invoice)',
  'dialpad': 'from:dialpad.com (receipt OR invoice)',
  'linkedin singapore': 'from:linkedin.com (receipt OR invoice)',
  'mighty networks': 'from:mightynetworks.com (receipt OR invoice)',
  'squarespace': 'from:squarespace.com (receipt OR invoice)',
  'highlevel': 'from:gohighlevel.com (receipt OR invoice)',
  'telstra': 'from:telstra.com.au (bill OR invoice)',
  'agl': 'from:agl.com.au (bill OR invoice)',
  'booking.com': 'from:booking.com (confirmation OR receipt)',
  'amazon': 'from:amazon (receipt OR invoice OR order)',
  'bunnings': 'from:bunnings.com.au receipt',
  'xero': 'from:xero.com (invoice OR receipt)',
  'nab': '', 'nab fee': '',
};
function buildQuery(vendor, txDate) {
  const key = (vendor || '').toLowerCase().trim();
  let base = VENDOR_QUERY_MAP[key];
  if (base === '') return null;
  if (!base) {
    const safe = key.replace(/[^a-z0-9 ]/g, '').trim();
    if (!safe) return null;
    const firstToken = safe.split(' ')[0];
    base = `(from:${firstToken} OR "${safe}") (receipt OR invoice OR tax)`;
  }
  const d = new Date(txDate);
  const after = new Date(d.getTime() - 7*86400000).toISOString().slice(0,10).replace(/-/g,'/');
  const before = new Date(d.getTime() + 7*86400000).toISOString().slice(0,10).replace(/-/g,'/');
  return `${base} after:${after} before:${before}`;
}

// ============================================================================
// MESSAGE WALKING — find the best PDF attachment
// ============================================================================
function findPdfPart(part) {
  if (!part) return null;
  if (part.mimeType === 'application/pdf' && part.body?.attachmentId && (part.body?.size || 0) >= 5000) {
    return part;
  }
  if (part.parts) {
    for (const p of part.parts) {
      const found = findPdfPart(p);
      if (found) return found;
    }
  }
  return null;
}

function getHeader(headers, name) {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

// ============================================================================
// PIPELINE
// ============================================================================
async function loadMissingTxns(quarter) {
  const NO_RECEIPT_EXACT = new Set(['nab','nab fee','nab international fee','nab fx margin','bank fee','dishonour fee','merchant fee','service fee','stripe fee','paypal fee','interest charge','interest','bank interest','account fee']);
  const { data } = await sb.from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, type, has_attachments, status, line_items, bank_account')
    .eq('type', 'SPEND')
    .eq('status', 'AUTHORISED')
    .eq('has_attachments', false)
    .gte('date', quarter.start)
    .lte('date', quarter.end)
    .order('total', { ascending: false });
  return (data || []).filter(tx => {
    const name = (tx.contact_name || '').toLowerCase().trim();
    if (NO_RECEIPT_EXACT.has(name)) return false;
    if (name.includes('bank fee') || name.includes('dishonour') || name.includes('interest charge') || name.includes('international fee') || name.includes('fx margin')) return false;
    if (Array.isArray(tx.line_items) && tx.line_items.length > 0 && tx.line_items.every(li => li.tax_type === 'BASEXCLUDED')) return false;
    return true;
  });
}

async function findBestMessage(gmailClients, tx) {
  const query = buildQuery(tx.contact_name, tx.date);
  if (!query) return null;

  const candidates = [];
  for (const [mailbox, client] of gmailClients) {
    try {
      const { data } = await client.users.messages.list({ userId: 'me', q: query, maxResults: 5 });
      for (const m of data.messages || []) {
        // Check if we already have this gmail_message_id linked in receipt_emails
        const { data: existing } = await sb.from('receipt_emails')
          .select('id, status')
          .eq('gmail_message_id', m.id)
          .limit(1);
        if (existing && existing.length > 0) continue;

        // Get full message to inspect attachments
        const full = await client.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const pdf = findPdfPart(full.data.payload);

        const headers = full.data.payload?.headers || [];
        const msgDate = new Date(parseInt(full.data.internalDate));
        const txDate = new Date(tx.date);
        const daysDiff = Math.abs(msgDate - txDate) / 86400000;

        candidates.push({
          mailbox,
          client,
          messageId: m.id,
          threadId: full.data.threadId,
          from: getHeader(headers, 'From'),
          subject: getHeader(headers, 'Subject'),
          date: msgDate.toISOString(),
          daysDiff,
          kind: pdf ? 'pdf' : 'eml',
          pdfPart: pdf,
          pdfSize: pdf ? pdf.body.size : 0,
        });
      }
    } catch (e) { /* per-mailbox errors silent */ }
  }

  if (candidates.length === 0) return null;
  // Prefer PDF over EML, then smaller date diff, then larger PDF
  candidates.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'pdf' ? -1 : 1;
    if (a.daysDiff !== b.daysDiff) return a.daysDiff - b.daysDiff;
    return b.pdfSize - a.pdfSize;
  });
  return candidates[0];
}

// Download the raw RFC 822 message as a Buffer (used for .eml fallback when
// no PDF attachment is present — preserves full email for Xero upload).
async function downloadEml(client, messageId) {
  const { data } = await client.users.messages.get({ userId: 'me', id: messageId, format: 'raw' });
  const b64 = data.raw.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

async function downloadPdf(client, messageId, attachmentId) {
  const { data } = await client.users.messages.attachments.get({ userId: 'me', messageId, id: attachmentId });
  // Gmail returns base64url
  const b64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

async function uploadToStorage(buffer, filename) {
  const path = `gmail-deep-search/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const contentType = filename.endsWith('.eml') ? 'message/rfc822' : 'application/pdf';
  const { error } = await sb.storage.from('receipt-attachments').upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`storage upload: ${error.message}`);
  return path;
}

async function createReceiptRow(tx, candidate, storagePath, buffer, filename) {
  const isEml = candidate.kind === 'eml';
  const row = {
    source: 'gmail',
    mailbox: candidate.mailbox,
    gmail_message_id: candidate.messageId,
    vendor_name: tx.contact_name,
    amount_detected: Math.abs(Number(tx.total)),
    currency: 'AUD',
    received_at: candidate.date,
    subject: candidate.subject,
    from_email: candidate.from,
    attachment_url: storagePath,
    attachment_filename: filename,
    attachment_content_type: isEml ? 'message/rfc822' : 'application/pdf',
    attachment_size_bytes: buffer.length,
    xero_bank_transaction_id: tx.xero_transaction_id,
    status: 'matched',
    match_confidence: isEml ? 85 : 95,
    match_method: 'gmail_deep_search',
  };
  const { data, error } = await sb.from('receipt_emails').insert(row).select('id').single();
  if (error) throw new Error(`insert row: ${error.message}`);
  return data.id;
}

async function pushToXero(txnId, filename, buffer, contentType = 'application/pdf') {
  const r = await xeroFetch(
    `BankTransactions/${txnId}/Attachments/${encodeURIComponent(filename)}`,
    'PUT',
    buffer,
    contentType
  );
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Xero PUT ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  loadXeroTokens();
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  if (quarterArgs.length === 0) { console.error('Specify quarters'); process.exit(1); }

  console.log('=== Gmail → Xero Pipeline ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN');
  console.log('Quarters:', quarterArgs.join(', '));

  // Auth Gmail
  const users = getDelegatedUsers();
  const gmailClients = new Map();
  for (const u of users) {
    try { gmailClients.set(u, await getGmailForUser(u)); } catch (e) { console.error(`auth fail ${u}: ${e.message}`); }
  }
  console.log(`Gmail mailboxes: ${gmailClients.size}/${users.length}`);

  // Load candidates
  const missing = [];
  for (const q of quarterArgs) {
    const txns = await loadMissingTxns(QUARTERS[q]);
    missing.push(...txns.map(t => ({ ...t, _q: q })));
  }
  let candidates = missing;
  if (VENDOR_FILTER) candidates = candidates.filter(t => VENDOR_FILTER.some(v => (t.contact_name||'').toLowerCase().includes(v)));
  if (LIMIT) candidates = candidates.slice(0, LIMIT);
  console.log(`Txns to process: ${candidates.length}\n`);

  const stats = { probed: 0, matched: 0, noMatch: 0, pushed: 0, failed: 0, skipped: 0 };
  const failures = [];

  for (let i = 0; i < candidates.length; i++) {
    const tx = candidates[i];
    stats.probed++;
    const label = `[${i+1}/${candidates.length}] ${(tx.contact_name||'?').slice(0,22).padEnd(22)} $${tx.total} ${tx.date}`;

    try {
      const best = await findBestMessage(gmailClients, tx);
      if (!best) { stats.noMatch++; console.log(`  ⚪ ${label} — no Gmail candidate`); continue; }

      const kindLabel = best.kind === 'pdf' ? `PDF ${(best.pdfSize/1024).toFixed(0)}KB` : 'EML fallback';
      console.log(`  🟢 ${label} — ${best.mailbox} "${best.subject.slice(0,40)}" (${kindLabel}, ${Math.round(best.daysDiff)}d)`);

      if (!APPLY) {
        stats.matched++;
        await new Promise(rs => setTimeout(rs, 300));
        continue;
      }

      // Download: PDF attachment if present, otherwise raw .eml
      let buffer, filename, contentType;
      if (best.kind === 'pdf') {
        buffer = await downloadPdf(best.client, best.messageId, best.pdfPart.body.attachmentId);
        filename = best.pdfPart.filename || `receipt-${tx.xero_transaction_id.slice(0,8)}.pdf`;
        contentType = 'application/pdf';
      } else {
        buffer = await downloadEml(best.client, best.messageId);
        const safeSubject = (best.subject || 'receipt').replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 50).trim();
        filename = `${safeSubject || 'receipt'}-${tx.xero_transaction_id.slice(0,8)}.eml`;
        contentType = 'message/rfc822';
      }

      // Upload to storage
      const storagePath = await uploadToStorage(buffer, filename);

      // Create receipt_emails row
      const receiptId = await createReceiptRow(tx, best, storagePath, buffer, filename);

      // Push to Xero (via the existing Attachments API)
      await pushToXero(tx.xero_transaction_id, filename, buffer, contentType);

      // Mark as uploaded in DB
      await sb.from('receipt_emails').update({ status: 'uploaded' }).eq('id', receiptId);

      stats.matched++;
      stats.pushed++;
      console.log(`      → pushed ${best.kind.toUpperCase()} to Xero txn ${tx.xero_transaction_id.slice(0,8)}`);
    } catch (e) {
      stats.failed++;
      failures.push({ tx, err: e.message });
      console.log(`  ❌ ${label} — ${e.message.slice(0, 100)}`);
    }

    // Xero rate limit: ~54/min. We're doing ~1 per iteration + extra reads. Sleep 1.2s.
    await new Promise(rs => setTimeout(rs, 1200));
  }

  console.log('\n=== Summary ===');
  console.log(`  Probed: ${stats.probed}`);
  console.log(`  Matched (has PDF): ${stats.matched}`);
  console.log(`  No match: ${stats.noMatch}`);
  console.log(`  Pushed to Xero: ${stats.pushed}`);
  console.log(`  Failed: ${stats.failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.slice(0, 10).forEach(f => console.log(`  ${f.tx.contact_name} $${f.tx.total}: ${f.err.slice(0,100)}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
