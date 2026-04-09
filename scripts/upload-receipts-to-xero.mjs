#!/usr/bin/env node
/**
 * Upload Receipt Attachments to Xero
 *
 * Takes matched receipts from receipt_emails table and uploads their
 * attachments to the corresponding Xero bank transactions via the
 * Xero Attachments API.
 *
 * Usage:
 *   node scripts/upload-receipts-to-xero.mjs              # Upload all matched receipts
 *   node scripts/upload-receipts-to-xero.mjs --dry-run    # Preview without uploading
 *   node scripts/upload-receipts-to-xero.mjs --limit 10   # Upload first 10 only
 *   node scripts/upload-receipts-to-xero.mjs --status     # Show pipeline status
 *
 * Requires:
 *   - Xero OAuth2 tokens (same as sync-xero-to-supabase.mjs)
 *   - receipt_emails table with status='matched' and xero_bank_transaction_id set
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATUS_ONLY = args.includes('--status');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

// Rate limiting: Xero allows 60 calls/minute
const XERO_DELAY_MS = 1100; // ~55 calls/min to be safe

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// XERO OAUTH2 (reused from sync-xero-to-supabase.mjs)
// ============================================================================

function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.access_token && tokens.expires_at > Date.now()) {
        XERO_ACCESS_TOKEN = tokens.access_token;
        return true;
      }
      if (tokens.refresh_token) {
        XERO_REFRESH_TOKEN = tokens.refresh_token;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

function saveTokens(accessToken, refreshToken, expiresIn) {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (expiresIn * 1000) - 60000
    }, null, 2));
  } catch (e) {
    console.warn('Could not save tokens locally:', e.message);
  }
}

async function saveTokenToSupabase(refreshToken, accessToken, expiresIn) {
  if (!supabase) return;
  try {
    const expiresAt = new Date(Date.now() + (expiresIn * 1000) - 60000);
    await supabase.from('xero_tokens').upsert({
      id: 'default',
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'upload-receipts'
    }, { onConflict: 'id' });
  } catch (e) { /* ignore */ }
}

async function loadTokenFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('xero_tokens')
      .select('refresh_token, access_token, expires_at')
      .eq('id', 'default')
      .single();
    if (error || !data || data.refresh_token === 'placeholder') return null;
    if (data.access_token && data.expires_at) {
      const expiresAt = new Date(data.expires_at).getTime();
      if (expiresAt > Date.now()) {
        return { access_token: data.access_token, refresh_token: data.refresh_token, valid: true };
      }
    }
    return { refresh_token: data.refresh_token, valid: false };
  } catch (e) { return null; }
}

async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) {
    log('ERROR: Missing OAuth credentials for token refresh');
    return false;
  }
  try {
    const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN })
    });
    if (!response.ok) {
      const errorText = await response.text();
      log(`Token refresh failed: ${response.status} — ${errorText}`);
      return false;
    }
    const tokens = await response.json();
    XERO_ACCESS_TOKEN = tokens.access_token;
    XERO_REFRESH_TOKEN = tokens.refresh_token;
    saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    await saveTokenToSupabase(tokens.refresh_token, tokens.access_token, tokens.expires_in);
    log('Token refreshed');
    return true;
  } catch (error) {
    log(`Token refresh error: ${error.message}`);
    return false;
  }
}

async function ensureValidToken() {
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens) {
    if (supabaseTokens.valid) {
      XERO_ACCESS_TOKEN = supabaseTokens.access_token;
      XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
      return true;
    }
    if (supabaseTokens.refresh_token) XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
  }
  if (loadStoredTokens()) return true;
  return await refreshAccessToken();
}

// ============================================================================
// XERO ATTACHMENTS API
// ============================================================================

/**
 * Upload a file to a Xero entity (BankTransaction or Invoice) as an attachment
 *
 * API: PUT /api.xro/2.0/{endpoint}/{ID}/Attachments/{FileName}
 * Content-Type must match the file type (application/pdf, image/jpeg, etc.)
 * Body is raw file bytes.
 */
async function uploadAttachmentToXero(entityId, fileName, fileBuffer, contentType, entityType = 'BankTransactions', _retried = false) {
  const url = `https://api.xero.com/api.xro/2.0/${entityType}/${entityId}/Attachments/${encodeURIComponent(fileName)}`;

  const response = await fetch(url, {
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

  if (!response.ok) {
    if (response.status === 401 && !_retried) {
      log('Token expired during upload, refreshing...');
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return uploadAttachmentToXero(entityId, fileName, fileBuffer, contentType, entityType, true);
      }
      throw new Error('Token refresh failed during upload');
    }
    if (response.status === 401) {
      throw new Error('401 Unauthorized — likely missing accounting.attachments scope. Re-run: node scripts/xero-auth.mjs');
    }
    const errorText = await response.text();
    throw new Error(`Xero Attachments API ${response.status}: ${errorText}`);
  }

  // Parse response — Xero may return JSON or XML depending on headers
  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch {
    // If response is not JSON but status was OK, upload succeeded
    return { Attachments: [{ AttachmentID: 'ok', FileName: fileName }] };
  }
}

/**
 * Check if a Xero Bank Transaction already has attachments
 */
async function getExistingAttachments(entityId, entityType = 'BankTransactions', _retried = false) {
  const url = `https://api.xero.com/api.xro/2.0/${entityType}/${entityId}/Attachments`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !_retried) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return getExistingAttachments(entityId, entityType, true);
    }
    return null;
  }

  const data = await response.json();
  return data.Attachments || [];
}

// ============================================================================
// SUPABASE STORAGE
// ============================================================================

async function downloadFromStorage(attachmentUrl) {
  if (!attachmentUrl) return null;

  // If it's a Supabase Storage path in the receipt-attachments bucket
  if (attachmentUrl.startsWith('receipt-attachments/') || attachmentUrl.startsWith('dext-import/')) {
    const storagePath = attachmentUrl.startsWith('receipt-attachments/')
      ? attachmentUrl.replace('receipt-attachments/', '')
      : attachmentUrl; // dext-import/ paths are folders inside the bucket
    const { data, error } = await supabase.storage
      .from('receipt-attachments')
      .download(storagePath);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return { buffer: Buffer.from(await data.arrayBuffer()), contentType: null, fileName: null };
  }

  // If it's a full URL, fetch directly
  if (attachmentUrl.startsWith('http')) {
    const response = await fetch(attachmentUrl);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const ct = response.headers.get('content-type') || null;
    // Extract filename from content-disposition if available
    const cd = response.headers.get('content-disposition') || '';
    const fnMatch = cd.match(/filename="?([^";\n]+)"?/);
    const fn = fnMatch ? fnMatch[1] : null;
    return { buffer: Buffer.from(await response.arrayBuffer()), contentType: ct, fileName: fn };
  }

  // If it's a local file path (for Dext migration)
  if (existsSync(attachmentUrl)) {
    return { buffer: readFileSync(attachmentUrl), contentType: null, fileName: null };
  }

  throw new Error(`Cannot resolve attachment: ${attachmentUrl}`);
}

// ============================================================================
// PIPELINE STATUS
// ============================================================================

async function showStatus() {
  log('=== Receipt Pipeline Status ===\n');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `SELECT status, count(*)::int as cnt FROM receipt_emails GROUP BY status ORDER BY cnt DESC`
  });

  if (error) {
    log(`Error: ${error.message}`);
    return;
  }

  const counts = {};
  let total = 0;
  for (const row of data) {
    counts[row.status] = row.cnt;
    total += row.cnt;
  }
  console.log(`  Total receipts: ${total}`);
  console.log('');
  for (const [status, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const pct = total > 0 ? Math.round(count * 100 / total) : 0;
    const bar = '#'.repeat(Math.round(pct / 2));
    console.log(`  ${status.padEnd(12)} ${String(count).padStart(5)}  ${bar} ${pct}%`);
  }

  // Show recent uploads
  const { data: recent } = await supabase.rpc('exec_sql', {
    query: `SELECT vendor_name, amount_detected, status, updated_at
            FROM receipt_emails ORDER BY updated_at DESC LIMIT 10`
  });

  if (recent?.length) {
    console.log('\n  Recent activity:');
    for (const r of recent) {
      const amt = r.amount_detected ? `$${r.amount_detected}` : '?';
      const vendor = (r.vendor_name || 'Unknown').substring(0, 25);
      console.log(`    ${r.status.padEnd(10)} ${vendor.padEnd(27)} ${amt.padStart(10)}  ${new Date(r.updated_at).toLocaleDateString()}`);
    }
  }
}

// ============================================================================
// MAIN: UPLOAD MATCHED RECEIPTS
// ============================================================================

async function uploadMatchedReceipts() {
  log('=== Upload Matched Receipts to Xero ===\n');

  // Auth
  const tokenOk = await ensureValidToken();
  if (!tokenOk) {
    log('ERROR: Could not authenticate with Xero. Run: node scripts/xero-auth.mjs');
    process.exit(1);
  }
  log('Xero authenticated');

  // Fetch matched receipts ready for upload (exec_sql bypasses PostgREST cache for new table)
  const { data: receipts, error } = await supabase.rpc('exec_sql', {
    query: `SELECT * FROM receipt_emails
            WHERE status = 'matched'
            AND (xero_bank_transaction_id IS NOT NULL OR xero_invoice_id IS NOT NULL)
            AND attachment_url IS NOT NULL
            ORDER BY received_at ASC
            LIMIT ${LIMIT}`
  });

  if (error) {
    log(`ERROR fetching receipts: ${error.message}`);
    process.exit(1);
  }

  if (!receipts?.length) {
    log('No matched receipts ready for upload.');
    return;
  }

  log(`Found ${receipts.length} matched receipts to upload${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const receipt of receipts) {
    const vendor = receipt.vendor_name || 'Unknown';
    const amt = receipt.amount_detected ? `$${receipt.amount_detected}` : '?';
    const fileName = receipt.attachment_filename || `receipt-${receipt.id.slice(0, 8)}.pdf`;
    const contentType = receipt.attachment_content_type || 'application/pdf';

    // Determine if this is a bank transaction or invoice match
    const isInvoice = !receipt.xero_bank_transaction_id && receipt.xero_invoice_id;
    const entityId = isInvoice ? receipt.xero_invoice_id : receipt.xero_bank_transaction_id;
    const entityType = isInvoice ? 'Invoices' : 'BankTransactions';
    const entityLabel = isInvoice ? 'INV' : 'TXN';

    log(`${vendor} ${amt} → ${entityLabel}:${entityId.slice(0, 8)}...`);

    if (DRY_RUN) {
      log(`  [DRY RUN] Would upload ${fileName} (${contentType})`);
      uploaded++;
      continue;
    }

    try {
      // Pre-flight: confirm the Xero entity is not DELETED/VOIDED.
      // Xero returns 500 (not 4xx) on PUT to deleted entities, which used to
      // surface as opaque "Xero Attachments API 500" errors. Check Status first.
      const entityResp = await fetch(
        `https://api.xero.com/api.xro/2.0/${entityType}/${entityId}`,
        { headers: { 'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`, 'xero-tenant-id': XERO_TENANT_ID, 'Accept': 'application/json' } }
      );
      if (entityResp.ok) {
        const entityData = await entityResp.json();
        const entity = entityData.BankTransactions?.[0] || entityData.Invoices?.[0];
        const xStatus = entity?.Status;
        if (xStatus === 'DELETED' || xStatus === 'VOIDED') {
          log(`  SKIP: Xero entity is ${xStatus} — cannot attach. Resetting to captured.`);
          await supabase.from('receipt_emails').update({
            status: 'captured',
            xero_bank_transaction_id: null,
            xero_invoice_id: null,
            xero_transaction_id: null,
            error_message: `Xero entity ${entityId} is ${xStatus} — match invalidated`,
          }).eq('id', receipt.id);
          // Also fix the mirror so the matcher stops re-matching to this entity
          if (entityType === 'BankTransactions') {
            await supabase.from('xero_transactions')
              .update({ has_attachments: true })
              .eq('xero_transaction_id', entityId);
          }
          skipped++;
          await sleep(XERO_DELAY_MS);
          continue;
        }
      }

      // Check for existing attachments (don't duplicate)
      const existing = await getExistingAttachments(entityId, entityType);
      if (existing && existing.length > 0) {
        log(`  SKIP: Transaction already has ${existing.length} attachment(s)`);
        await supabase.rpc('update_receipt_match', {
          receipt_id: receipt.id,
          new_status: 'uploaded',
          new_error_message: `Already had ${existing.length} attachment(s) — skipped duplicate upload`,
        });
        skipped++;
        await sleep(XERO_DELAY_MS);
        continue;
      }

      // Download attachment from storage
      const download = await downloadFromStorage(receipt.attachment_url);
      if (!download || !download.buffer || download.buffer.length === 0) {
        throw new Error('Empty or missing attachment file');
      }
      const fileBuffer = download.buffer;
      // Use detected content type and filename from download if available
      const actualContentType = download.contentType || contentType;
      const actualFileName = download.fileName || fileName;

      log(`  Uploading ${actualFileName} (${(fileBuffer.length / 1024).toFixed(1)} KB, ${actualContentType})...`);

      // Upload to Xero
      const result = await uploadAttachmentToXero(
        entityId,
        actualFileName,
        fileBuffer,
        actualContentType,
        entityType
      );

      // Mark as uploaded
      await supabase.rpc('update_receipt_match', {
        receipt_id: receipt.id,
        new_status: 'uploaded',
        new_error_message: null,
        new_retry_count: receipt.retry_count || 0,
      });

      const attachmentId = result?.Attachments?.[0]?.AttachmentID || 'ok';
      log(`  UPLOADED (${attachmentId})`);
      uploaded++;

    } catch (err) {
      log(`  FAILED: ${err.message}`);
      const retryCount = (receipt.retry_count || 0) + 1;
      const newStatus = retryCount >= 3 ? 'failed' : 'matched'; // retry if < 3 attempts

      await supabase.rpc('update_receipt_match', {
        receipt_id: receipt.id,
        new_status: newStatus,
        new_error_message: err.message,
        new_retry_count: retryCount,
      });

      failed++;
    }

    // Rate limit
    await sleep(XERO_DELAY_MS);
  }

  log(`\n=== Upload Summary ===`);
  log(`  Uploaded: ${uploaded}`);
  log(`  Skipped (already had attachment): ${skipped}`);
  log(`  Failed: ${failed}`);
  log(`  Total processed: ${uploaded + skipped + failed}/${receipts.length}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN
// ============================================================================

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

if (STATUS_ONLY) {
  await showStatus();
} else {
  await uploadMatchedReceipts();
}
