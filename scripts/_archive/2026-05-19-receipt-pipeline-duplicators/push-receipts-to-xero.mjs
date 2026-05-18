#!/usr/bin/env node
/**
 * Push Receipts to Xero — mirrors Dext's publish-to-Xero mechanism.
 *
 * For each row in receipt_emails that has a file + amount + vendor + date
 * AND is not already linked to Xero, create an ACCPAY DRAFT bill in Xero
 * with the receipt PDF attached. Once in Xero, Ben reviews/approves them
 * (bulk action available), and they appear in bank reconcile view.
 *
 * This is exactly what Dext does when it publishes — we just run it ourselves
 * so we can sunset Dext cleanly.
 *
 * Usage:
 *   node scripts/push-receipts-to-xero.mjs --dry-run        # Preview only
 *   node scripts/push-receipts-to-xero.mjs --limit 5        # Test 5 real
 *   node scripts/push-receipts-to-xero.mjs                  # Full run
 *   node scripts/push-receipts-to-xero.mjs --authorised     # Push as AUTHORISED (not DRAFT) — bolder
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AUTHORISED = args.includes('--authorised');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 500;
const minDateIdx = args.indexOf('--min-date');
// Default floor = Q1 FY26 end (30 Sep 2025 is the current tenant's BAS lock date)
const MIN_DATE = minDateIdx !== -1 ? args[minDateIdx + 1] : '2025-10-01';

// Xero API rate limit: 60 calls/min. Each bill = 2 calls (POST + PUT attachment) + 1 dedupe (local). Be safe at 2100ms per receipt.
const DELAY_MS = 2100;

// Default bill fields (used when vendor is unknown)
const DEFAULT_ACCOUNT_CODE = '429';       // catch-all expense
const DEFAULT_TAX_TYPE = 'INPUT';         // GST on Expenses
const LINE_AMOUNT_TYPES = 'Inclusive';    // amount_detected is gross

// Xero tracking category IDs (from existing bills)
const TRACK_BUSINESS_DIVISIONS_ID = '91448ff3-eb13-437a-9d97-4d2e52c86ca4';
const TRACK_PROJECT_ID = '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe';

// project_code → Xero Project Tracking option name
// Uses existing Xero options (including legacy names) to avoid duplicates.
// For options not yet in Xero, add via Accounting → Settings → Tracking Categories.
const PROJECT_TRACKING_NAME = {
  'ACT-10': 'ACT-10 — 10x10 Retreat',
  'ACT-BB': 'ACT-BB — Barkly Backbone',
  'ACT-BG': 'ACT-BG — BG Fit',
  'ACT-BM': 'ACT-BM — Bimberi',
  'ACT-BR': 'ACT-BR — ACT Bali Retreat',
  'ACT-BV': 'ACT-BV — Black Cockatoo Valley',
  'ACT-CA': 'ACT-CA — Caring for those who care',
  'ACT-CB': 'ACT-CB — Marriage Celebrant',
  'ACT-CF': 'ACT-CF — The Confessional',
  'ACT-CN': 'ACT-CN — Contained',
  'ACT-DG': 'ACT-DG — Diagrama',
  'ACT-DL': 'ACT-DL — DadLab',
  'ACT-DO': 'ACT-DO — Designing for Obsolescence',
  'ACT-EL': 'ACT-EL — Empathy Ledger',
  'ACT-ER': 'ACT-ER — PICC Elders Room',
  'ACT-FA': 'ACT-FA — Festival Activations',
  'ACT-FG': 'ACT-FG — Feel Good Project',
  'ACT-FM': 'ACT-FM — The Farm',
  'ACT-FO': 'ACT-FO — Fishers Oysters',
  'ACT-FP': 'ACT-FP — Fairfax PLACE Tech',
  'ACT-GD': 'ACT-GD — Goods',
  'ACT-GL': 'ACT-GL — Global Laundry Alliance',
  'ACT-GP': 'ACT-GP — Gold Phone',
  'ACT-HS': 'ACT-HS — Project Her-Self',
  'ACT-HV': 'ACT-HV — The Harvest Witta',
  'ACT-IN': 'ACT-IN — ACT Infrastructure',
  'ACT-JH': 'ACT-JH — JusticeHub',
  'ACT-JP': "ACT-JP — June's Patch",
  'ACT-MC': 'ACT-MC — Cars and Microcontrollers',
  'ACT-MD': 'ACT-MD — ACT Monthly Dinners',
  'ACT-MM': 'ACT-MM — MMEIC Justice',
  'ACT-MR': 'ACT-MR — MingaMinga Rangers',
  'ACT-MY': 'ACT-MY — Mounty Yarns',
  'ACT-OO': 'ACT-OO — Oonchiumpa',
  'ACT-PI': 'ACT-PI — PICC',
  'ACT-PS': 'ACT-PS — PICC Photo Studio',
  'ACT-RA': 'ACT-RA — Regional Arts Fellowship',
  'ACT-SM': 'ACT-SM — SMART',
  'ACT-SS': 'ACT-SS — Storm Stories',
  'ACT-TN': 'ACT-TN — TOMNET',
  'ACT-TR': 'ACT-TR — Treacher',
  'ACT-TW': "ACT-TW — Travelling Women's Car",
  'ACT-UA': 'ACT-UA — Uncle Allan Palm Island Art',
  'ACT-WE': 'ACT-WE — Westpac Summit 2025',
};

// In-memory vendor rule cache
let vendorRulesCache = null;
async function getVendorRules() {
  if (vendorRulesCache) return vendorRulesCache;
  const { data } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases, project_code, category, rd_eligible, xero_account_code, xero_tax_type, xero_currency, xero_business_division');
  vendorRulesCache = data || [];
  return vendorRulesCache;
}

function matchVendorRule(rules, vendorName) {
  if (!vendorName) return null;
  const v = vendorName.toLowerCase().trim();
  for (const r of rules) {
    if ((r.vendor_name || '').toLowerCase() === v) return r;
    if (Array.isArray(r.aliases) && r.aliases.some((a) => (a || '').toLowerCase() === v)) return r;
  }
  // Fuzzy contains match
  for (const r of rules) {
    const rv = (r.vendor_name || '').toLowerCase();
    if (rv && (v.includes(rv) || rv.includes(v))) return r;
  }
  return null;
}

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Xero auth (reused pattern) ────────────────────────────────────
function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (t.access_token && t.expires_at > Date.now()) { XERO_ACCESS_TOKEN = t.access_token; return true; }
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch {}
  return false;
}

function saveTokens(a, r, ex) {
  writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: a, refresh_token: r, expires_at: Date.now() + ex * 1000 - 60000 }, null, 2));
}

async function refreshAccessToken() {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${XERO_REFRESH_TOKEN}`,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const t = await res.json();
  XERO_ACCESS_TOKEN = t.access_token;
  XERO_REFRESH_TOKEN = t.refresh_token;
  saveTokens(t.access_token, t.refresh_token, t.expires_in);
}

async function ensureValidToken() {
  if (loadStoredTokens()) return;
  await refreshAccessToken();
}

async function xeroFetch(url, opts = {}, _retried = false, _netRetries = 0) {
  let res;
  try {
    res = await fetch(url, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Accept': 'application/json',
        ...(opts.headers || {}),
      },
    });
  } catch (err) {
    // Network-level failure — retry with exp backoff (max 3 attempts)
    if (_netRetries < 3) {
      const wait = 1000 * Math.pow(2, _netRetries);
      log(`  network fetch failed (${err.message}) — retrying in ${wait}ms`);
      await sleep(wait);
      return xeroFetch(url, opts, _retried, _netRetries + 1);
    }
    throw err;
  }
  if (res.status === 401 && !_retried) {
    await refreshAccessToken();
    return xeroFetch(url, opts, true);
  }
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    log(`  429 rate limit — sleeping ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return xeroFetch(url, opts, _retried);
  }
  return res;
}

// ── Core functions ────────────────────────────────────────────────

async function createBill(receipt, rule) {
  const accountCode = rule?.xero_account_code || DEFAULT_ACCOUNT_CODE;
  const taxType = rule?.xero_tax_type || DEFAULT_TAX_TYPE;
  const nativeCurrency = rule?.xero_currency || 'AUD';
  // Multi-currency not enabled on this Xero plan — always post as AUD and tag non-AUD in description
  const currency = 'AUD';
  const businessDiv = rule?.xero_business_division || 'A Curious Tractor';
  const projectCode = rule?.project_code;
  const projectTrackingName = projectCode ? PROJECT_TRACKING_NAME[projectCode] : null;

  const tracking = [
    { TrackingCategoryID: TRACK_BUSINESS_DIVISIONS_ID, Name: 'Business Divisions', Option: businessDiv },
  ];
  if (projectTrackingName) {
    tracking.push({ TrackingCategoryID: TRACK_PROJECT_ID, Name: 'Project Tracking', Option: projectTrackingName });
  }

  const currencyNote = nativeCurrency !== 'AUD' ? ` [native ${nativeCurrency} ${Number(receipt.amount_detected).toFixed(2)} — adjust AUD to match bank line]` : '';
  const descPrefix = rule
    ? `${rule.vendor_name} — ${rule.category || 'Expense'}${projectCode ? ` — ${projectCode}` : ''}${currencyNote}`
    : `Receipt auto-imported from ${receipt.source} — NEEDS CODING${currencyNote}`;

  const body = {
    Invoices: [{
      Type: 'ACCPAY',
      Status: AUTHORISED ? 'AUTHORISED' : 'DRAFT',
      LineAmountTypes: LINE_AMOUNT_TYPES,
      Date: receipt.received_at.slice(0, 10),
      DueDate: receipt.received_at.slice(0, 10),
      Contact: { Name: (rule?.vendor_name || receipt.vendor_name || 'Unknown Supplier').slice(0, 500) },
      Reference: `auto-pushed ${receipt.source} ${receipt.id.slice(0, 8)}`,
      CurrencyCode: currency,
      LineItems: [{
        Description: descPrefix,
        Quantity: 1,
        UnitAmount: Number(receipt.amount_detected).toFixed(2),
        AccountCode: accountCode,
        TaxType: taxType,
        Tracking: tracking,
      }],
    }],
  };

  const res = await xeroFetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create bill failed ${res.status}: ${text.slice(0, 4000)}`);
  }
  const data = await res.json();
  return data.Invoices?.[0];
}

async function attachFile(invoiceId, buffer, fileName, contentType) {
  const url = `https://api.xero.com/api.xro/2.0/Invoices/${invoiceId}/Attachments/${encodeURIComponent(fileName)}`;
  const res = await xeroFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': buffer.length.toString() },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Attach failed ${res.status}: ${text.slice(0, 400)}`);
  }
}

async function downloadFromStorage(attachmentUrl) {
  if (!attachmentUrl) return null;
  const storagePath = attachmentUrl.startsWith('receipt-attachments/')
    ? attachmentUrl.replace('receipt-attachments/', '')
    : attachmentUrl;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data, error } = await supabase.storage.from('receipt-attachments').download(storagePath);
      if (error) throw new Error(`Storage: ${error.message}`);
      return Buffer.from(await data.arrayBuffer());
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        const wait = 1000 * Math.pow(2, attempt);
        log(`  storage fetch failed (${err.message}) — retry in ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr;
}

async function alreadyInXero(receipt) {
  // Dedupe: same vendor (fuzzy contains) + amount (±$0.50) + date (±3 days)
  const amt = Number(receipt.amount_detected);
  const date = receipt.received_at.slice(0, 10);
  const { data } = await supabase
    .from('xero_invoices')
    .select('xero_id, contact_name, total, date, status')
    .eq('type', 'ACCPAY')
    .neq('status', 'VOIDED')
    .neq('status', 'DELETED')
    .gte('total', (amt - 0.5).toFixed(2))
    .lte('total', (amt + 0.5).toFixed(2))
    .gte('date', new Date(new Date(date).getTime() - 4 * 86400000).toISOString().slice(0, 10))
    .lte('date', new Date(new Date(date).getTime() + 4 * 86400000).toISOString().slice(0, 10))
    .limit(5);

  if (!data || data.length === 0) return null;

  const vendorNorm = (receipt.vendor_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!vendorNorm) return null;
  for (const bill of data) {
    const billNorm = (bill.contact_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (billNorm.includes(vendorNorm.slice(0, 6)) || vendorNorm.includes(billNorm.slice(0, 6))) {
      return bill;
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  log(`Push Receipts to Xero${DRY_RUN ? ' (DRY RUN)' : ''} — status=${AUTHORISED ? 'AUTHORISED' : 'DRAFT'}, limit=${LIMIT}, min-date=${MIN_DATE}\n`);

  await ensureValidToken();
  log('Xero authenticated');

  const vendorRules = await getVendorRules();
  log(`${vendorRules.length} vendor rules loaded\n`);

  // Fetch target receipts: anything with file + amount + vendor + date, not already in Xero
  const { data: receipts, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT id, source, status, vendor_name, amount_detected, received_at,
             attachment_url, attachment_filename, attachment_content_type, dext_item_id
      FROM receipt_emails
      WHERE status IN ('review', 'captured')
        AND amount_detected IS NOT NULL
        AND amount_detected > 0
        AND vendor_name IS NOT NULL
        AND vendor_name NOT ILIKE '%unknown%'
        AND attachment_url IS NOT NULL
        AND xero_invoice_id IS NULL
        AND xero_bank_transaction_id IS NULL
        AND received_at >= '${MIN_DATE}'
      ORDER BY received_at DESC
      LIMIT ${LIMIT}
    `
  });

  if (error) { log(`DB error: ${error.message}`); process.exit(1); }
  if (!receipts?.length) { log('Nothing to push.'); return; }

  log(`${receipts.length} receipts queued\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const r of receipts) {
    const vendor = (r.vendor_name || '?').slice(0, 30).padEnd(30);
    const amt = `$${Number(r.amount_detected).toFixed(2)}`.padStart(10);
    const date = r.received_at.slice(0, 10);
    const tag = `${date} ${vendor} ${amt}`;

    try {
      // Dedupe
      const existing = await alreadyInXero(r);
      if (existing) {
        log(`${tag}  SKIP — already in Xero as ${existing.xero_id.slice(0, 8)} (${existing.contact_name})`);
        if (!DRY_RUN) {
          await supabase.from('receipt_emails').update({
            status: 'uploaded',
            xero_invoice_id: existing.xero_id,
            error_message: 'Found existing Xero bill during push — linked instead of creating duplicate',
          }).eq('id', r.id);
        }
        skipped++;
        continue;
      }

      const rule = matchVendorRule(vendorRules, r.vendor_name);
      const ruleTag = rule
        ? `[${rule.vendor_name}→${rule.project_code || '?'} acct:${rule.xero_account_code} ${rule.xero_currency} ${rule.xero_tax_type}]`
        : '[no rule → placeholder 429]';

      if (DRY_RUN) {
        log(`${tag}  CREATE ${ruleTag}`);
        created++;
        continue;
      }

      // Create bill
      const bill = await createBill(r, rule);
      if (!bill?.InvoiceID) throw new Error('No InvoiceID returned');

      // Download + attach file
      const buf = await downloadFromStorage(r.attachment_url);
      if (!buf || buf.length === 0) throw new Error('Empty attachment file');
      const fname = r.attachment_filename || `receipt-${r.id.slice(0, 8)}.pdf`;
      const ctype = r.attachment_content_type || 'application/pdf';
      await attachFile(bill.InvoiceID, buf, fname, ctype);

      // Update DB
      await supabase.from('receipt_emails').update({
        status: 'uploaded',
        xero_invoice_id: bill.InvoiceID,
        error_message: null,
      }).eq('id', r.id);

      log(`${tag}  ✓ Bill ${bill.InvoiceID.slice(0, 8)} created + attached`);
      created++;
      await sleep(DELAY_MS);

    } catch (e) {
      log(`${tag}  ✗ ${e.message}`);
      if (!DRY_RUN) {
        await supabase.from('receipt_emails').update({
          error_message: e.message.slice(0, 500),
        }).eq('id', r.id);
      }
      failed++;
      await sleep(DELAY_MS);
    }
  }

  log(`\nDone. Created: ${created} | Skipped (dup): ${skipped} | Failed: ${failed}`);
  log(`Review bills in Xero: https://go.xero.com/AccountsPayable/Search.aspx?graph=draft`);
}

main().catch(e => { console.error(e); process.exit(1); });
