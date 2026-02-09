#!/usr/bin/env node
/**
 * Xero Bank Feed Sync
 *
 * Syncs unreconciled bank statement lines from Xero to Supabase.
 * This captures the raw bank feed data that needs to be reconciled.
 *
 * Usage:
 *   node scripts/sync-xero-bank-feed.mjs              - Sync all accounts
 *   node scripts/sync-xero-bank-feed.mjs --days=180   - Sync last 180 days
 *   node scripts/sync-xero-bank-feed.mjs --account=8815 - Sync specific account
 *
 * Created: 2026-01-27
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

// ============================================================================
// TOKEN MANAGEMENT (same as sync-xero-to-supabase.mjs)
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
  } catch (e) {}
  return false;
}

function saveTokens(accessToken, refreshToken, expiresIn) {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (expiresIn * 1000) - 60000
    }, null, 2));
  } catch (e) {}
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
  } catch (e) {
    return null;
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
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (e) {}
}

async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) return false;

  console.log('   Refreshing access token...');

  try {
    const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: XERO_REFRESH_TOKEN
      })
    });

    if (!response.ok) return false;

    const tokens = await response.json();
    XERO_ACCESS_TOKEN = tokens.access_token;
    XERO_REFRESH_TOKEN = tokens.refresh_token;

    saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    await saveTokenToSupabase(tokens.refresh_token, tokens.access_token, tokens.expires_in);

    console.log('   Token refreshed');
    return true;
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return false;
  }
}

async function ensureValidToken() {
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens?.valid && supabaseTokens.access_token) {
    XERO_ACCESS_TOKEN = supabaseTokens.access_token;
    XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
    return true;
  }
  if (supabaseTokens?.refresh_token) {
    XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
  }

  if (loadStoredTokens()) return true;

  if (XERO_ACCESS_TOKEN) {
    const testResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
      headers: {
        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Accept': 'application/json'
      }
    });
    if (testResponse.ok) return true;
  }

  return await refreshAccessToken();
}

// ============================================================================
// XERO API
// ============================================================================

async function xeroRequest(endpoint, options = {}) {
  if (!XERO_ACCESS_TOKEN || !XERO_TENANT_ID) {
    console.error('Xero credentials not configured');
    return null;
  }

  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return xeroRequest(endpoint, options);
      }
      console.error(`Xero API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Xero request failed:', error.message);
    return null;
  }
}

// ============================================================================
// SYNC BANK ACCOUNTS
// ============================================================================

async function syncBankAccounts() {
  console.log('\n   Fetching bank accounts...');

  const data = await xeroRequest('Accounts?where=Type=="BANK"');
  if (!data?.Accounts) {
    console.error('   No bank accounts found');
    return [];
  }

  console.log(`   Found ${data.Accounts.length} bank accounts`);

  const accounts = [];
  for (const account of data.Accounts) {
    const record = {
      xero_id: account.AccountID,
      name: account.Name,
      code: account.Code,
      type: account.Type,
      bank_account_number: account.BankAccountNumber,
      currency_code: account.CurrencyCode || 'AUD',
      status: account.Status,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      await supabase.from('xero_bank_accounts').upsert(record, { onConflict: 'xero_id' });
    }

    accounts.push(record);
    console.log(`      - ${account.Name} (${account.Code})`);
  }

  return accounts;
}

// ============================================================================
// SYNC BANK STATEMENTS
// ============================================================================

async function syncBankStatements(accountId, options = {}) {
  const daysBack = options.days || 120;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  console.log(`\n   Fetching statements for account ${accountId}...`);

  // Get bank statements using Reports API
  const fromDate = since.toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const data = await xeroRequest(
    `Reports/BankStatement?bankAccountID=${accountId}&fromDate=${fromDate}&toDate=${toDate}`
  );

  if (!data?.Reports?.[0]) {
    console.log('   No statement data from Reports API');
    return [];
  }

  const report = data.Reports[0];
  const rows = report.Rows || [];

  // Parse statement rows
  const statements = [];
  let currentSection = null;

  for (const row of rows) {
    if (row.RowType === 'Section') {
      currentSection = row.Title;
    } else if (row.RowType === 'Row' && row.Cells) {
      const cells = row.Cells;
      if (cells.length >= 4) {
        const statement = {
          bank_account_id: accountId,
          date: cells[0]?.Value,
          description: cells[1]?.Value,
          reference: cells[2]?.Value,
          amount: parseFloat(cells[3]?.Value?.replace(/,/g, '')) || 0,
          section: currentSection,
          synced_at: new Date().toISOString()
        };
        statements.push(statement);
      }
    }
  }

  console.log(`   Found ${statements.length} statement lines`);
  return statements;
}

// ============================================================================
// GET RECONCILED VS UNRECONCILED
// ============================================================================

async function getReconciliationStatus(options = {}) {
  const daysBack = options.days || 120;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  console.log('\n=========================================');
  console.log('  Fetching Reconciliation Status');
  console.log('=========================================\n');

  // 1. Get all bank transactions (reconciled items)
  console.log('   1. Fetching reconciled bank transactions...');
  const whereClause = `Date>=DateTime(${since.getFullYear()},${since.getMonth() + 1},${since.getDate()})`;
  const txnData = await xeroRequest(`BankTransactions?where=${encodeURIComponent(whereClause)}`);

  const reconciledTxns = txnData?.BankTransactions || [];
  console.log(`      Found ${reconciledTxns.length} reconciled transactions`);

  // Group by type
  const byType = {};
  const byAccount = {};

  for (const txn of reconciledTxns) {
    byType[txn.Type] = (byType[txn.Type] || 0) + 1;

    const accountName = txn.BankAccount?.Name || 'Unknown';
    if (!byAccount[accountName]) {
      byAccount[accountName] = { count: 0, total: 0, types: {} };
    }
    byAccount[accountName].count++;
    byAccount[accountName].total += Math.abs(parseFloat(txn.Total) || 0);
    byAccount[accountName].types[txn.Type] = (byAccount[accountName].types[txn.Type] || 0) + 1;
  }

  console.log('\n   By type:', byType);
  console.log('\n   By account:');
  for (const [name, data] of Object.entries(byAccount)) {
    console.log(`      ${name}: ${data.count} txns, $${data.total.toFixed(2)}`);
  }

  // 2. Save/update transactions in Supabase
  console.log('\n   2. Syncing to Supabase...');

  let synced = 0;
  let errors = 0;

  for (const txn of reconciledTxns) {
    try {
      const parseXeroDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/\/Date\((\d+)([+-]\d+)?\)\//);
        if (match) return new Date(parseInt(match[1])).toISOString().split('T')[0];
        return dateStr;
      };

      const record = {
        xero_transaction_id: txn.BankTransactionID,
        type: txn.Type,
        contact_name: txn.Contact?.Name,
        bank_account: txn.BankAccount?.Name,
        total: parseFloat(txn.Total) || 0,
        status: txn.Status || 'ACTIVE',
        date: parseXeroDate(txn.Date),
        has_attachments: txn.HasAttachments || false,
        line_items: (txn.LineItems || []).map(li => ({
          description: li.Description,
          quantity: li.Quantity,
          unit_amount: li.UnitAmount,
          account_code: li.AccountCode,
          line_amount: li.LineAmount
        })),
        synced_at: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase
          .from('xero_transactions')
          .upsert(record, { onConflict: 'xero_transaction_id' });

        if (error) throw error;
      }

      synced++;
    } catch (e) {
      errors++;
    }
  }

  console.log(`      Synced: ${synced}, Errors: ${errors}`);

  return {
    reconciled: reconciledTxns.length,
    byType,
    byAccount,
    synced,
    errors
  };
}

// ============================================================================
// DETECT MISSING RECEIPTS FROM SYNCED DATA
// ============================================================================

async function detectMissingReceipts(options = {}) {
  console.log('\n=========================================');
  console.log('  Detecting Missing Receipts');
  console.log('=========================================\n');

  if (!supabase) {
    console.error('Supabase not configured');
    return;
  }

  const daysBack = options.days || 120;
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  // Get SPEND transactions without attachments
  const { data: txns } = await supabase
    .from('xero_transactions')
    .select('*')
    .eq('type', 'SPEND')
    .eq('has_attachments', false)
    .gte('date', cutoffDate)
    .order('date', { ascending: false });

  console.log(`   Found ${txns?.length || 0} SPEND transactions without receipts`);

  // Skip patterns
  const SKIP_PATTERNS = [
    'nab fee', 'nab international', 'bank fee', 'interest',
    'internet payment', 'internet transfer', 'linked acc',
    'nicholas marchesi', 'nicholas', 'gopayid'
  ];

  const shouldSkip = (name) => {
    if (!name) return false;
    const lower = name.toLowerCase();
    return SKIP_PATTERNS.some(p => lower.includes(p));
  };

  // Categorize vendors
  const TRAVEL_VENDORS = ['uber', 'qantas', 'virgin', 'airbnb', 'booking.com', 'avis', 'budget', 'goget', 'cabcharge', 'lyft'];
  const SUBSCRIPTION_VENDORS = ['xero', 'zapier', 'webflow', 'notion', 'anthropic', 'openai', 'figma', 'adobe', 'slack', 'github', 'vercel', 'supabase', 'mighty networks', 'descript', 'codeguide', 'linkedin', 'docplay', 'amazon prime', 'audible', 'obsidian', 'bitwarden'];

  const categorize = (name) => {
    if (!name) return 'other';
    const lower = name.toLowerCase();
    if (TRAVEL_VENDORS.some(v => lower.includes(v))) return 'travel';
    if (SUBSCRIPTION_VENDORS.some(v => lower.includes(v))) return 'subscription';
    return 'other';
  };

  // Process and save to receipt_matches
  const toSave = [];
  const skipped = [];

  for (const txn of (txns || [])) {
    if (shouldSkip(txn.contact_name)) {
      skipped.push(txn);
      continue;
    }

    toSave.push({
      source_type: 'transaction',
      source_id: txn.xero_transaction_id,
      vendor_name: txn.contact_name,
      amount: Math.abs(txn.total || 0),
      transaction_date: txn.date,
      category: categorize(txn.contact_name),
      status: 'pending',
      week_start: getWeekStart(new Date(txn.date)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  console.log(`   Skipped ${skipped.length} (bank fees, transfers)`);
  console.log(`   To save: ${toSave.length}`);

  // Group by vendor for summary
  const byVendor = {};
  toSave.forEach(t => {
    byVendor[t.vendor_name] = (byVendor[t.vendor_name] || 0) + 1;
  });

  console.log('\n   Top vendors needing receipts:');
  Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([v, c]) => console.log(`      ${v}: ${c}`));

  // Upsert to receipt_matches
  if (toSave.length > 0) {
    let saved = 0;
    const batchSize = 100;

    for (let i = 0; i < toSave.length; i += batchSize) {
      const batch = toSave.slice(i, i + batchSize);

      // Check which ones already exist
      const sourceIds = batch.map(b => b.source_id);
      const { data: existing } = await supabase
        .from('receipt_matches')
        .select('source_id')
        .in('source_id', sourceIds);

      const existingIds = new Set((existing || []).map(e => e.source_id));
      const newItems = batch.filter(b => !existingIds.has(b.source_id));

      if (newItems.length > 0) {
        const { error } = await supabase.from('receipt_matches').insert(newItems);
        if (!error) saved += newItems.length;
      }
    }

    console.log(`\n   Saved ${saved} new items to receipt_matches`);
  }

  // Final count
  const { count } = await supabase
    .from('receipt_matches')
    .select('*', { count: 'exact', head: true })
    .gte('transaction_date', cutoffDate)
    .in('status', ['pending', 'email_suggested']);

  console.log(`\n   Total pending receipts (${daysBack} days): ${count}`);

  return { total: txns?.length, skipped: skipped.length, saved: toSave.length };
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const daysArg = args.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 120;

  console.log('=========================================');
  console.log('  Xero Bank Feed Sync');
  console.log('=========================================');
  console.log(`   Days back: ${days}`);

  // Validate config
  if (!XERO_TENANT_ID) {
    console.error('\n   Missing XERO_TENANT_ID');
    process.exit(1);
  }

  console.log('\n   Authenticating with Xero...');
  const hasToken = await ensureValidToken();
  if (!hasToken) {
    console.error('   Could not obtain Xero token');
    process.exit(1);
  }
  console.log('   Authenticated');

  // Run sync
  const status = await getReconciliationStatus({ days });

  // Detect missing receipts
  await detectMissingReceipts({ days });

  console.log('\n=========================================');
  console.log('  Sync Complete');
  console.log('=========================================\n');
}

main().catch(error => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
