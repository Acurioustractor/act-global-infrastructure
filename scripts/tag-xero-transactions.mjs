#!/usr/bin/env node

/**
 * Tag Xero Transactions with Project Tracking Categories
 *
 * Reads untagged transactions from Supabase, looks up project codes from
 * vendor_project_rules, and writes tracking categories back to Xero API.
 *
 * Usage:
 *   node scripts/tag-xero-transactions.mjs              # Dry run
 *   node scripts/tag-xero-transactions.mjs --apply       # Write to Xero
 *   node scripts/tag-xero-transactions.mjs --verbose     # Show details
 *   node scripts/tag-xero-transactions.mjs --limit 20    # Limit batch size
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { getTrackingMap, buildTrackingPayload } from './lib/xero-tracking.mjs';
import { sendTelegram } from './lib/telegram.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');
const XERO_API = 'https://api.xero.com/api.xro/2.0';
const XERO_DELAY_MS = 1100;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERBOSE = args.includes('--verbose');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 50;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================================================
// XERO AUTH (reused pattern from upload-receipts-to-xero.mjs)
// ============================================================================

function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.access_token && tokens.expires_at > Date.now()) {
        XERO_ACCESS_TOKEN = tokens.access_token;
        return true;
      }
      if (tokens.refresh_token) XERO_REFRESH_TOKEN = tokens.refresh_token;
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
    if (data.access_token && new Date(data.expires_at).getTime() > Date.now()) {
      return { access_token: data.access_token, refresh_token: data.refresh_token, valid: true };
    }
    return { refresh_token: data.refresh_token, valid: false };
  } catch (e) { return null; }
}

async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) return false;
  try {
    const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN })
    });
    if (!response.ok) return false;
    const tokens = await response.json();
    XERO_ACCESS_TOKEN = tokens.access_token;
    XERO_REFRESH_TOKEN = tokens.refresh_token;
    saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    return true;
  } catch (e) { return false; }
}

async function ensureValidToken() {
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens?.valid) {
    XERO_ACCESS_TOKEN = supabaseTokens.access_token;
    XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
    return true;
  }
  if (supabaseTokens?.refresh_token) XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
  if (loadStoredTokens()) return true;
  return await refreshAccessToken();
}

// ============================================================================
// XERO BANK TRANSACTION UPDATE
// ============================================================================

async function updateBankTransactionTracking(bankTransactionId, trackingPayload) {
  // First, get the current bank transaction to preserve line items
  const getResponse = await fetch(`${XERO_API}/BankTransactions/${bankTransactionId}`, {
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': 'application/json',
    },
  });

  if (!getResponse.ok) {
    if (getResponse.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return updateBankTransactionTracking(bankTransactionId, trackingPayload);
    }
    throw new Error(`GET BankTransaction ${getResponse.status}`);
  }

  const txData = await getResponse.json();
  const bankTx = txData.BankTransactions?.[0];
  if (!bankTx) throw new Error('Bank transaction not found in Xero');

  // Update line items with tracking
  const lineItems = bankTx.LineItems || [];
  for (const item of lineItems) {
    item.Tracking = trackingPayload;
  }

  // If no line items, we can't add tracking (Xero requires line items for tracking)
  if (lineItems.length === 0) {
    throw new Error('No line items — cannot add tracking');
  }

  // PUT the updated transaction
  const putResponse = await fetch(`${XERO_API}/BankTransactions/${bankTransactionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      BankTransactions: [{
        BankTransactionID: bankTransactionId,
        LineItems: lineItems,
      }],
    }),
  });

  if (!putResponse.ok) {
    const errText = await putResponse.text();
    throw new Error(`UPDATE BankTransaction ${putResponse.status}: ${errText}`);
  }

  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Tag Xero Transactions with Project Codes ===');
  if (!APPLY) log('DRY RUN — use --apply to write to Xero');

  // Auth
  const tokenOk = await ensureValidToken();
  if (!tokenOk) {
    log('ERROR: Could not authenticate with Xero. Run: node scripts/xero-auth.mjs');
    process.exit(1);
  }
  log('Xero authenticated');

  // Fetch tracking category map from Xero
  const tracking = await getTrackingMap(XERO_ACCESS_TOKEN, XERO_TENANT_ID);
  if (!tracking.categoryId) {
    log('ERROR: No tracking categories found in Xero. Create "Project Tracking" category first.');
    return;
  }
  log(`Tracking category: "${tracking.categoryName}" with ${tracking.allOptions.length} options`);
  if (VERBOSE) {
    for (const [code, info] of Object.entries(tracking.map)) {
      if (!code.startsWith('_')) log(`  ${code} → ${info.optionName}`);
    }
  }

  // --- PHASE 1: Tag untagged transactions in Supabase using vendor_project_rules ---
  const { data: rules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, project_code, aliases');

  const vendorToProject = new Map();
  for (const rule of rules || []) {
    vendorToProject.set(rule.vendor_name.toLowerCase(), rule.project_code);
    for (const alias of rule.aliases || []) {
      vendorToProject.set(alias.toLowerCase(), rule.project_code);
    }
  }
  log(`Vendor→project rules: ${vendorToProject.size} entries`);

  // Find untagged transactions in Supabase
  const untaggedPages = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, contact_name, total, date, project_code, type, is_reconciled')
      .is('project_code', null)
      .not('contact_name', 'is', null)
      .in('type', ['SPEND', 'RECEIVE', 'SPEND-TRANSFER'])
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) { log(`ERROR: ${error.message}`); break; }
    untaggedPages.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  log(`Untagged transactions in Supabase: ${untaggedPages.length}`);

  let supabaseTagged = 0;
  for (const tx of untaggedPages) {
    const contact = (tx.contact_name || '').toLowerCase();
    const code = vendorToProject.get(contact);
    if (code) {
      if (APPLY) {
        await supabase
          .from('xero_transactions')
          .update({ project_code: code, project_code_source: 'vendor_rule' })
          .eq('id', tx.id);
      }
      supabaseTagged++;
    }
  }
  log(`Supabase tags applied: ${supabaseTagged}${APPLY ? '' : ' (dry run)'}`);

  // --- PHASE 1.5: Unknown Charge Detection ---
  // Find vendors with 2+ charges in last 90 days that aren't in vendor_project_rules
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: recurring } = await supabase.rpc('exec_sql', { query: `
      SELECT contact_name, COUNT(*) as occurrences,
             ROUND(SUM(total)::numeric, 2) as total,
             ROUND(AVG(total)::numeric, 2) as avg_charge,
             MAX(date) as last_seen
      FROM xero_transactions
      WHERE type = 'SPEND'
        AND date >= '${ninetyDaysAgo}'
        AND contact_name IS NOT NULL
        AND project_code IS NULL
        AND contact_name NOT IN ('NAB', 'NAB Fee', 'NAB International Fee')
      GROUP BY contact_name
      HAVING COUNT(*) >= 2
      ORDER BY total DESC
    ` });

    if (recurring?.length > 0) {
      log(`\n⚠ UNKNOWN RECURRING CHARGES DETECTED: ${recurring.length} vendors`);
      const lines = recurring.map(r =>
        `• *${r.contact_name}* — ${r.occurrences}x charges, $${r.total} total (~$${r.avg_charge}/charge, last: ${r.last_seen})`
      );

      for (const r of recurring) {
        log(`  ${r.contact_name}: ${r.occurrences}x, $${r.total} total`);
      }

      // Send Telegram alert
      if (APPLY) {
        const msg = `🚨 *Unknown Recurring Charges Detected*\n\n` +
          `${recurring.length} vendor(s) with 2+ charges in last 90 days not in vendor rules:\n\n` +
          lines.join('\n') +
          `\n\nReply with vendor name to whitelist, or check Xero to investigate.`;
        const sent = await sendTelegram(msg);
        if (sent) log('  Telegram alert sent');
      }
    } else {
      log('No unknown recurring charges detected ✓');
    }
  } catch (err) {
    log(`  Unknown charge detection error: ${err.message}`);
  }

  // --- PHASE 2: Push tracking categories to Xero for un-reconciled transactions ---
  const { data: toPush, error } = await supabase
    .from('xero_transactions')
    .select('id, xero_transaction_id, contact_name, total, date, project_code, type, is_reconciled')
    .not('project_code', 'is', null)
    .not('xero_transaction_id', 'is', null)
    .eq('is_reconciled', false)
    .in('type', ['SPEND', 'RECEIVE', 'SPEND-TRANSFER'])
    .order('date', { ascending: false })
    .limit(LIMIT);

  if (error) { log(`ERROR: ${error.message}`); return; }
  log(`Un-reconciled transactions to push to Xero: ${toPush.length}`);

  let tagged = 0;
  let skipped = 0;
  let failed = 0;

  for (const tx of toPush) {
    const code = tx.project_code;
    const trackingInfo = tracking.map[code];

    if (!trackingInfo) {
      if (VERBOSE) log(`  SKIP (no tracking option for ${code}): ${tx.contact_name}`);
      skipped++;
      continue;
    }

    const payload = buildTrackingPayload(trackingInfo.categoryId, trackingInfo.optionId);

    if (VERBOSE) {
      log(`  TAG ${tx.contact_name} $${tx.total} [${code}] → ${trackingInfo.optionName}`);
    }

    if (!APPLY) {
      tagged++;
      continue;
    }

    try {
      await updateBankTransactionTracking(tx.xero_transaction_id, payload);
      tagged++;
      await new Promise(r => setTimeout(r, XERO_DELAY_MS));
    } catch (err) {
      log(`  FAIL ${tx.contact_name}: ${err.message}`);
      failed++;
      await new Promise(r => setTimeout(r, XERO_DELAY_MS));
    }
  }

  log(`\n=== Results ===`);
  log(`Supabase tagged: ${supabaseTagged} | Xero tagged: ${tagged} | Skipped: ${skipped} | Failed: ${failed}`);
}

if (!supabase) {
  console.error('Supabase credentials not configured');
  process.exit(1);
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
