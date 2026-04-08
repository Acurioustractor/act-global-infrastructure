#!/usr/bin/env node
/**
 * Sync Xero ME Receipts — pulls receipt attachments from Xero bank transactions
 * that were uploaded via the Xero ME mobile app (or any other Xero-side source)
 * and mirrors them to Supabase Storage with EXIF GPS extraction and calendar-
 * based project-code suggestions.
 *
 * Why: Xero ME receipts live ONLY in Xero. We don't have the image files locally,
 * which means no OCR reprocessing, no location-aware tagging, no independent
 * backup. This script closes that gap.
 *
 * For each target bank transaction:
 *   1. GET /BankTransactions/{id}/Attachments — list attachments
 *   2. GET /BankTransactions/{id}/Attachments/{fileName} — download bytes
 *   3. Upload to Supabase Storage: xero-me/<tx_id>/<fileName>
 *   4. If JPEG/HEIC: extract EXIF GPS + capture datetime via exifr
 *   5. INSERT receipt_emails row with source='xero_me' + metadata
 *   6. Cross-reference GPS (or date) with calendar_events → suggest project code
 *
 * Does NOT write project codes to Xero — outputs a suggestions report for
 * human review. The existing tag-xero-transactions.mjs cron handles vendor-
 * based project tagging automatically.
 *
 * Usage:
 *   node scripts/sync-xero-me-receipts.mjs                   # Dry run, last 120 days
 *   node scripts/sync-xero-me-receipts.mjs --apply            # Download + write
 *   node scripts/sync-xero-me-receipts.mjs --apply --days 60  # Custom window
 *   node scripts/sync-xero-me-receipts.mjs --apply --limit 5  # Small test batch
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import exifr from 'exifr';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Xero auth (reuses the same pattern as other scripts)
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = '.xero-tokens.json';
const XERO_API = 'https://api.xero.com/api.xro/2.0';
const BUCKET = 'receipt-attachments';

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

async function xeroFetch(endpoint, accept = 'application/json', _retry = false) {
  const r = await fetch(`${XERO_API}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': accept,
    },
  });
  if (r.status === 401 && !_retry) {
    await refreshXeroToken();
    return xeroFetch(endpoint, accept, true);
  }
  return r;
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

// City/region → project code hints (seed list — can be expanded via a rules table later)
const LOCATION_HINTS = [
  { keywords: ['palm island', 'bwgcolman'], project: 'ACT-PI', label: 'Palm Island' },
  { keywords: ['darwin', 'palmerston', 'nt', 'northern territory'], project: 'ACT-NT', label: 'Darwin/NT' },
  { keywords: ['cairns', 'atherton', 'kuranda'], project: 'ACT-FNQ', label: 'Far North QLD' },
  { keywords: ['brisbane', 'gold coast', 'sunshine coast', 'toowoomba', 'qld'], project: 'ACT-QLD', label: 'SE QLD' },
  { keywords: ['maleny', 'witta', 'conondale'], project: 'ACT-HV', label: 'Hinterland/Witta' },
  { keywords: ['sydney', 'nsw', 'new south wales'], project: 'ACT-NSW', label: 'Sydney/NSW' },
  { keywords: ['melbourne', 'vic', 'victoria'], project: 'ACT-VIC', label: 'Melbourne/VIC' },
  { keywords: ['adelaide', 'sa', 'south australia'], project: 'ACT-SA', label: 'Adelaide/SA' },
  { keywords: ['perth', 'wa', 'western australia'], project: 'ACT-WA', label: 'Perth/WA' },
];

function suggestProjectFromLocation(locationText) {
  if (!locationText) return null;
  const lower = locationText.toLowerCase();
  for (const h of LOCATION_HINTS) {
    for (const kw of h.keywords) {
      if (lower.includes(kw)) return { code: h.project, label: h.label, via: 'location_match' };
    }
  }
  return null;
}

async function getCalendarEventsForDate(dateISO) {
  const r = await q(`
    SELECT title, location, project_code, detected_project_code, manual_project_code
    FROM calendar_events
    WHERE start_time::date = '${dateISO}'::date
      AND status != 'cancelled'
    LIMIT 10
  `);
  return r;
}

async function suggestProjectFromCalendar(dateISO) {
  const events = await getCalendarEventsForDate(dateISO);
  for (const e of events) {
    const code = e.manual_project_code || e.project_code || e.detected_project_code;
    if (code) return { code, label: e.title?.slice(0, 40) || 'calendar event', via: 'calendar_match' };
  }
  return null;
}

async function extractExif(buffer, mediaType) {
  if (!/^image\/(jpeg|jpg|heic|tiff)/i.test(mediaType || '')) return null;
  try {
    const exif = await exifr.parse(buffer, {
      pick: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'DateTimeOriginal', 'CreateDate', 'Make', 'Model'],
    });
    if (!exif) return null;
    const gps = (exif.GPSLatitude && exif.GPSLongitude)
      ? { lat: exif.GPSLatitude, lon: exif.GPSLongitude, altitude: exif.GPSAltitude || null }
      : null;
    return {
      gps,
      captured_at: exif.DateTimeOriginal || exif.CreateDate || null,
      device: exif.Make ? `${exif.Make} ${exif.Model || ''}`.trim() : null,
    };
  } catch (e) {
    return null;
  }
}

async function reverseGeocodeHint(lat, lon) {
  // Cheap offline hint: Australia-coarse bounding boxes, no API call.
  // For precise geocoding, replace this with a Nominatim/Google call.
  if (lat == null || lon == null) return null;
  if (lat < -44 || lat > -10 || lon < 113 || lon > 154) return 'International';
  if (lat > -26 && lon > 140) return 'QLD (far north)';
  if (lat > -29 && lon > 138 && lon < 153) return 'QLD (SE)';
  if (lat < -33 && lat > -38 && lon > 140 && lon < 152) return 'VIC';
  if (lat < -30 && lat > -36 && lon > 148) return 'NSW';
  if (lat < -31 && lon < 120) return 'WA';
  if (lat > -16 && lon < 140) return 'NT';
  return 'Australia (region unknown)';
}

async function processTxn(txn, apply) {
  try {
    // 1. List attachments on this bank transaction
    const listResp = await xeroFetch(`BankTransactions/${txn.xero_transaction_id}/Attachments`);
    if (!listResp.ok) return { txn, status: 'error', reason: `list ${listResp.status}` };
    const listData = await listResp.json();
    const attachments = listData.Attachments || [];
    if (attachments.length === 0) return { txn, status: 'skip', reason: 'no attachments' };

    const downloaded = [];
    for (const att of attachments) {
      // 2. Download attachment bytes
      const dlResp = await xeroFetch(
        `BankTransactions/${txn.xero_transaction_id}/Attachments/${encodeURIComponent(att.FileName)}`,
        '*/*'
      );
      if (!dlResp.ok) {
        downloaded.push({ att, error: `download ${dlResp.status}` });
        continue;
      }
      const contentType = dlResp.headers.get('content-type') || att.MimeType || 'application/octet-stream';
      const buffer = Buffer.from(await dlResp.arrayBuffer());

      // 3. Extract EXIF for images
      const exifData = await extractExif(buffer, contentType);

      // 4. Upload to Supabase Storage
      const storagePath = `xero-me/${txn.xero_transaction_id}/${att.FileName}`;
      if (apply) {
        const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });
        if (upErr) {
          downloaded.push({ att, error: `storage: ${upErr.message}` });
          continue;
        }
      }

      // 5. Compute project-code suggestion
      let suggestion = null;
      if (exifData?.gps) {
        const region = await reverseGeocodeHint(exifData.gps.lat, exifData.gps.lon);
        suggestion = suggestProjectFromLocation(region);
        if (suggestion) suggestion.via = 'exif_gps';
      }
      if (!suggestion) {
        suggestion = await suggestProjectFromCalendar(txn.date);
      }

      // 6. Create receipt_emails row
      const metadata = {
        xero_attachment_id: att.AttachmentID,
        xero_file_name: att.FileName,
        xero_mime_type: att.MimeType,
        xero_include_online: att.IncludeOnline,
      };
      if (exifData) metadata.exif = exifData;
      if (suggestion) metadata.project_suggestion = suggestion;

      if (apply) {
        const { error: insErr } = await sb.from('receipt_emails').insert({
          gmail_message_id: `xero-me-${txn.xero_transaction_id}-${att.AttachmentID}`,
          mailbox: 'xero_me',
          from_email: null,
          subject: `Xero ME receipt for ${txn.contact_name || 'unknown'} ${att.FileName}`,
          received_at: txn.date,
          vendor_name: txn.contact_name,
          amount_detected: Math.abs(Number(txn.total)),
          currency: 'AUD',
          attachment_url: storagePath,
          attachment_filename: att.FileName,
          attachment_content_type: contentType,
          attachment_size_bytes: buffer.length,
          xero_bank_transaction_id: txn.xero_transaction_id,
          match_confidence: 100,
          match_method: 'xero_me_sync',
          project_code: txn.project_code,
          status: 'uploaded', // already in Xero
          source: 'xero_me',
        });
        if (insErr) {
          downloaded.push({ att, error: `insert: ${insErr.message}` });
          continue;
        }
      }

      downloaded.push({ att, storagePath, exif: exifData, suggestion, size: buffer.length });
    }

    return { txn, status: 'ok', downloaded };
  } catch (e) {
    return { txn, status: 'error', reason: e.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const daysIdx = args.indexOf('--days');
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1], 10) : 120;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

  console.log(`Sync Xero ME Receipts — ${apply ? 'APPLY' : 'DRY RUN'} | days: ${days}${limit ? ` | limit: ${limit}` : ''}\n`);

  loadTokens();
  if (!XERO_ACCESS_TOKEN) {
    console.log('Refreshing Xero token...');
    if (!(await refreshXeroToken())) {
      console.error('Auth failed. Run: node scripts/sync-xero-tokens.mjs');
      process.exit(1);
    }
  }

  // Target: Xero bank transactions with attachments where we have NO
  // corresponding receipt_emails row (i.e., never synced from any source)
  const rows = await q(`
    SELECT tx.xero_transaction_id, tx.date, tx.contact_name, tx.total::numeric(12,2) as total,
           tx.project_code, tx.entity_code, tx.bank_account
    FROM xero_transactions tx
    LEFT JOIN receipt_emails re ON re.xero_bank_transaction_id = tx.xero_transaction_id
    WHERE tx.has_attachments = true
      AND tx.date >= CURRENT_DATE - ${days}
      AND re.id IS NULL
    ORDER BY tx.date DESC
    ${limit ? `LIMIT ${limit}` : 'LIMIT 500'}
  `);

  console.log(`Found ${rows.length} Xero transactions with attachments, no local mirror`);
  if (rows.length === 0) {
    console.log('Nothing to sync.');
    return;
  }

  let ok = 0, err = 0, skip = 0, totalFiles = 0, totalBytes = 0;
  const suggestions = [];
  const withGps = [];

  for (let i = 0; i < rows.length; i++) {
    const tx = rows[i];
    const result = await processTxn(tx, apply);
    if (result.status === 'ok') {
      ok++;
      totalFiles += result.downloaded.length;
      for (const d of result.downloaded) {
        if (d.error) { err++; continue; }
        totalBytes += d.size || 0;
        if (d.exif?.gps) withGps.push({ tx, exif: d.exif });
        if (d.suggestion) suggestions.push({ tx, suggestion: d.suggestion, current: tx.project_code });
      }
      const tag = result.downloaded.some(d => d.exif?.gps) ? '📍' : result.downloaded.some(d => d.suggestion) ? '🏷️ ' : '  ';
      console.log(`  ${tag} [${i + 1}/${rows.length}] ${tx.date} ${(tx.contact_name || '?').slice(0, 24).padEnd(24)} $${Math.abs(Number(tx.total)).toFixed(2).padStart(10)} — ${result.downloaded.length} file(s)`);
    } else if (result.status === 'skip') {
      skip++;
    } else {
      err++;
      console.log(`  ❌ [${i + 1}/${rows.length}] ${tx.xero_transaction_id.slice(0, 8)}: ${result.reason}`);
    }
    await new Promise(r => setTimeout(r, 1100)); // Xero rate limit
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Transactions synced: ${ok}`);
  console.log(`  Files downloaded:    ${totalFiles}`);
  console.log(`  Total size:          ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Skipped:             ${skip}`);
  console.log(`  Errors:              ${err}`);
  console.log(`  With GPS metadata:   ${withGps.length}`);
  console.log(`  Project suggestions: ${suggestions.length}`);

  if (suggestions.length > 0) {
    console.log(`\n=== Project-code suggestions ===`);
    for (const s of suggestions.slice(0, 20)) {
      const currTag = s.current ? `[current: ${s.current}]` : '[untagged]';
      console.log(`  ${s.tx.date} ${(s.tx.contact_name || '?').slice(0, 24).padEnd(24)} → ${s.suggestion.code.padEnd(8)} (${s.suggestion.via}) ${currTag}`);
    }
    if (suggestions.length > 20) console.log(`  ... and ${suggestions.length - 20} more`);
  }

  if (!apply) console.log(`\n(dry run — pass --apply to download files and insert receipt_emails rows)`);
}

main().catch(e => { console.error(e); process.exit(1); });
