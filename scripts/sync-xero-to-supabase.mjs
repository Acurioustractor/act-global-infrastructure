#!/usr/bin/env node
/**
 * Xero to Supabase Financial Sync
 *
 * Syncs financial data from Xero to Supabase for project-level tracking.
 * Links invoices to GHL contacts and tracks costs per project code.
 *
 * Data synced:
 *   - Invoices (ACCREC + ACCPAY) - linked to contacts and projects
 *   - Bank transactions (RECEIVE, SPEND, TRANSFER)
 *   - Sync logs for audit trail
 *
 * Usage:
 *   node scripts/sync-xero-to-supabase.mjs invoices     - Sync invoices
 *   node scripts/sync-xero-to-supabase.mjs transactions - Sync bank transactions
 *   node scripts/sync-xero-to-supabase.mjs full         - Full sync (invoices + transactions)
 *   node scripts/sync-xero-to-supabase.mjs setup        - Show setup instructions
 *
 * Environment Variables:
 *   XERO_CLIENT_ID          - Xero OAuth client ID
 *   XERO_CLIENT_SECRET      - Xero OAuth client secret
 *   XERO_TENANT_ID          - Xero organization ID
 *   XERO_REFRESH_TOKEN      - OAuth refresh token (for automated runs)
 *
 * Created: 2026-01-23
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

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Token storage file for persisting refreshed tokens
const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

// Load project codes for tracking category mapping
let PROJECT_CODES = {};
try {
  PROJECT_CODES = JSON.parse(readFileSync('config/project-codes.json', 'utf8'));
} catch (e) {
  console.warn('Could not load project codes config');
}

// Sync stats
const stats = {
  invoices: { synced: 0, errors: 0, matched_contacts: 0, matched_projects: 0 },
  transactions: { synced: 0, errors: 0, matched_projects: 0 },
  startTime: Date.now()
};

// ============================================================================
// OAUTH2 TOKEN MANAGEMENT
// ============================================================================

/**
 * Load tokens from storage file if available
 */
function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.access_token && tokens.expires_at > Date.now()) {
        XERO_ACCESS_TOKEN = tokens.access_token;
        console.log('   Loaded valid access token from storage');
        return true;
      }
      if (tokens.refresh_token) {
        XERO_REFRESH_TOKEN = tokens.refresh_token;
      }
    }
  } catch (e) {
    // Ignore errors - will use env tokens
  }
  return false;
}

/**
 * Save tokens to storage file (local backup)
 */
function saveTokens(accessToken, refreshToken, expiresIn) {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (expiresIn * 1000) - 60000 // 1 minute buffer
    }, null, 2));
  } catch (e) {
    console.warn('Could not save tokens locally:', e.message);
  }
}

/**
 * Save refresh token to Supabase (shared between local and CI)
 */
async function saveTokenToSupabase(refreshToken, accessToken, expiresIn) {
  if (!supabase) return;

  try {
    const expiresAt = new Date(Date.now() + (expiresIn * 1000) - 60000);
    const { error } = await supabase
      .from('xero_tokens')
      .upsert({
        id: 'default',
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local'
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Could not save token to Supabase:', error.message);
    } else {
      console.log('   Token saved to Supabase (shared storage)');
    }
  } catch (e) {
    console.warn('Supabase token save error:', e.message);
  }
}

/**
 * Load refresh token from Supabase (shared between local and CI)
 */
async function loadTokenFromSupabase() {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('xero_tokens')
      .select('refresh_token, access_token, expires_at')
      .eq('id', 'default')
      .single();

    if (error || !data || data.refresh_token === 'placeholder') {
      return null;
    }

    // Check if access token is still valid
    if (data.access_token && data.expires_at) {
      const expiresAt = new Date(data.expires_at).getTime();
      if (expiresAt > Date.now()) {
        console.log('   Loaded valid access token from Supabase');
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          valid: true
        };
      }
    }

    console.log('   Loaded refresh token from Supabase');
    return { refresh_token: data.refresh_token, valid: false };
  } catch (e) {
    console.warn('Supabase token load error:', e.message);
    return null;
  }
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) {
    console.error('Missing OAuth credentials for token refresh');
    console.error('Required: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REFRESH_TOKEN');
    return false;
  }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return false;
    }

    const tokens = await response.json();
    XERO_ACCESS_TOKEN = tokens.access_token;
    XERO_REFRESH_TOKEN = tokens.refresh_token;

    // Save for future use - both locally and to Supabase
    saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    await saveTokenToSupabase(tokens.refresh_token, tokens.access_token, tokens.expires_in);

    console.log('   Access token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return false;
  }
}

/**
 * Ensure we have a valid access token
 */
async function ensureValidToken() {
  // 1. Try Supabase shared storage first (works for both local and CI)
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens) {
    if (supabaseTokens.valid && supabaseTokens.access_token) {
      XERO_ACCESS_TOKEN = supabaseTokens.access_token;
      XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
      return true;
    }
    // Use refresh token from Supabase if available
    if (supabaseTokens.refresh_token) {
      XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
    }
  }

  // 2. Try local stored tokens
  if (loadStoredTokens()) {
    return true;
  }

  // 3. If we have an access token from env, test it
  if (XERO_ACCESS_TOKEN) {
    const testResponse = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
      headers: {
        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Accept': 'application/json'
      }
    });

    if (testResponse.ok) {
      return true;
    }
  }

  // 4. Try refreshing with whatever refresh token we have
  return await refreshAccessToken();
}

// ============================================================================
// XERO API WRAPPER
// ============================================================================

/**
 * Make authenticated request to Xero API
 */
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
        'Accept': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token and retry once
        console.log('   Token expired, attempting refresh...');
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return xeroRequest(endpoint, options);
        }
        console.error('Token refresh failed');
      } else {
        const errorText = await response.text();
        console.error(`Xero API error: ${response.status} - ${errorText}`);
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Xero request failed:', error.message);
    return null;
  }
}

// ============================================================================
// CONTACT MATCHING
// ============================================================================

/**
 * Load GHL contacts for matching
 */
let ghlContactsCache = null;

async function loadGHLContacts() {
  if (ghlContactsCache) return ghlContactsCache;

  if (!supabase) {
    ghlContactsCache = { byName: {}, byEmail: {} };
    return ghlContactsCache;
  }

  try {
    const { data: contacts, error } = await supabase
      .from('ghl_contacts')
      .select('id, first_name, last_name, email, company_name');

    if (error) {
      console.warn('Could not load GHL contacts for matching:', error.message);
      ghlContactsCache = { byName: {}, byEmail: {} };
      return ghlContactsCache;
    }

    // Build lookup indexes
    const byName = {};
    const byEmail = {};

    for (const contact of contacts || []) {
      // Index by email (lowercase)
      if (contact.email) {
        byEmail[contact.email.toLowerCase()] = contact.id;
      }

      // Index by full name (lowercase, normalized)
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim().toLowerCase();
      if (fullName) {
        byName[fullName] = contact.id;
      }

      // Also index by company name
      if (contact.company_name) {
        byName[contact.company_name.toLowerCase()] = contact.id;
      }
    }

    ghlContactsCache = { byName, byEmail };
    console.log(`   Loaded ${contacts?.length || 0} GHL contacts for matching`);
    return ghlContactsCache;
  } catch (e) {
    console.warn('Error loading GHL contacts:', e.message);
    ghlContactsCache = { byName: {}, byEmail: {} };
    return ghlContactsCache;
  }
}

/**
 * Try to match Xero contact to GHL contact
 */
async function matchContactToGHL(xeroContactName, xeroContactEmail) {
  const contacts = await loadGHLContacts();

  // Try email match first (most reliable)
  if (xeroContactEmail) {
    const emailMatch = contacts.byEmail[xeroContactEmail.toLowerCase()];
    if (emailMatch) return emailMatch;
  }

  // Try name match
  if (xeroContactName) {
    const normalizedName = xeroContactName.toLowerCase().trim();
    const nameMatch = contacts.byName[normalizedName];
    if (nameMatch) return nameMatch;

    // Try fuzzy match - check if name contains or is contained by any GHL name
    for (const [name, id] of Object.entries(contacts.byName)) {
      if (normalizedName.includes(name) || name.includes(normalizedName)) {
        return id;
      }
    }
  }

  return null;
}

// ============================================================================
// PROJECT CODE DETECTION
// ============================================================================

/**
 * Detect project code from Xero tracking categories
 */
function detectProjectFromTracking(trackingCategories) {
  if (!trackingCategories?.length) return null;

  for (const tracking of trackingCategories) {
    // Look for Project tracking category
    if (tracking.Name === 'Project' || tracking.Name === 'Tracking' || tracking.Name === 'Region') {
      const trackingValue = (tracking.Option || '').toLowerCase();

      // Find matching project by xero_tracking field
      for (const [code, proj] of Object.entries(PROJECT_CODES.projects || {})) {
        const xeroTracking = (proj.xero_tracking || '').toLowerCase();
        if (xeroTracking && xeroTracking === trackingValue) {
          return code;
        }
      }
    }
  }

  return null;
}

/**
 * Detect project code from reference or description text
 */
function detectProjectFromText(text) {
  if (!text) return null;

  const normalizedText = text.toLowerCase();

  // Check each project for matching keywords
  for (const [code, proj] of Object.entries(PROJECT_CODES.projects || {})) {
    // Check project code itself (e.g., "ACT-JH")
    if (normalizedText.includes(code.toLowerCase())) {
      return code;
    }

    // Check project name
    if (proj.name && normalizedText.includes(proj.name.toLowerCase())) {
      return code;
    }

    // Check xero_tracking value
    if (proj.xero_tracking && normalizedText.includes(proj.xero_tracking.toLowerCase())) {
      return code;
    }

    // Check GHL tags
    for (const tag of proj.ghl_tags || []) {
      if (normalizedText.includes(tag.toLowerCase())) {
        return code;
      }
    }
  }

  return null;
}

/**
 * Detect project code from invoice/transaction
 */
function detectProjectCode(record) {
  // 1. Try tracking categories first
  const allTracking = record.LineItems?.flatMap(l => l.Tracking || []) || [];
  const trackingProject = detectProjectFromTracking(allTracking);
  if (trackingProject) return trackingProject;

  // 2. Try reference field
  const refProject = detectProjectFromText(record.Reference);
  if (refProject) return refProject;

  // 3. Try line item descriptions
  for (const lineItem of record.LineItems || []) {
    const descProject = detectProjectFromText(lineItem.Description);
    if (descProject) return descProject;
  }

  // 4. Try contact name as last resort
  const contactProject = detectProjectFromText(record.Contact?.Name);
  if (contactProject) return contactProject;

  return null;
}

// ============================================================================
// SYNC INVOICES
// ============================================================================

async function syncInvoices(options = {}) {
  console.log('\n=========================================');
  console.log('  Syncing Invoices from Xero');
  console.log('=========================================\n');

  const daysBack = options.days || 90;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  console.log(`   Fetching invoices since: ${sinceStr} (${daysBack} days)`);

  // Build where clause for date filter
  const whereClause = `Date>=DateTime(${since.getFullYear()},${since.getMonth() + 1},${since.getDate()})`;
  const data = await xeroRequest(`Invoices?where=${encodeURIComponent(whereClause)}&order=Date DESC`);

  if (!data?.Invoices) {
    console.error('   No invoice data received');
    return { synced: 0, errors: 0 };
  }

  console.log(`   Found ${data.Invoices.length} invoices`);

  const errors = [];

  for (const invoice of data.Invoices) {
    try {
      // Detect project code
      const projectCode = detectProjectCode(invoice);
      if (projectCode) stats.invoices.matched_projects++;

      // Match contact to GHL
      const contactId = await matchContactToGHL(
        invoice.Contact?.Name,
        invoice.Contact?.EmailAddress
      );
      if (contactId) stats.invoices.matched_contacts++;

      // Parse Xero date format (\/Date(timestamp)\/)
      const parseXeroDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/\/Date\((\d+)([+-]\d+)?\)\//);
        if (match) {
          return new Date(parseInt(match[1])).toISOString().split('T')[0];
        }
        return dateStr;
      };

      // Build record matching database schema
      const record = {
        xero_id: invoice.InvoiceID,
        tenant_id: XERO_TENANT_ID,
        invoice_number: invoice.InvoiceNumber,
        reference: invoice.Reference,
        contact_name: invoice.Contact?.Name,
        contact_id: invoice.Contact?.ContactID, // Xero contact ID
        contact_xero_id: invoice.Contact?.ContactID,
        status: invoice.Status,
        type: invoice.Type, // ACCREC or ACCPAY
        total: parseFloat(invoice.Total) || 0,
        subtotal: parseFloat(invoice.SubTotal) || 0,
        total_tax: parseFloat(invoice.TotalTax) || 0,
        amount_due: parseFloat(invoice.AmountDue) || 0,
        amount_paid: parseFloat(invoice.AmountPaid) || 0,
        currency_code: invoice.CurrencyCode || 'AUD',
        date: parseXeroDate(invoice.Date),
        due_date: parseXeroDate(invoice.DueDate),
        has_attachments: invoice.HasAttachments || false,
        line_items: (invoice.LineItems || []).map(li => ({
          description: li.Description,
          quantity: li.Quantity,
          unit_amount: li.UnitAmount,
          account_code: li.AccountCode,
          tax_type: li.TaxType,
          line_amount: li.LineAmount,
          tracking: li.Tracking
        })),
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase
          .from('xero_invoices')
          .upsert(record, { onConflict: 'xero_id' });

        if (error) {
          if (error.code === '42P01') {
            console.error('   Table xero_invoices does not exist');
            console.log('   Run migration: supabase db push');
            return { synced: 0, errors: 1, needsMigration: true };
          }
          // Log first error for debugging
          if (stats.invoices.errors === 0) {
            console.error('\n   First error:', error.code, error.message);
          }
          throw error;
        }
      }

      stats.invoices.synced++;
      process.stdout.write('.');

    } catch (error) {
      stats.invoices.errors++;
      errors.push({
        entity_id: invoice.InvoiceID,
        error_message: error.message,
        timestamp: new Date().toISOString()
      });
      process.stdout.write('!');
    }
  }

  console.log('\n');
  console.log(`   Synced: ${stats.invoices.synced}`);
  console.log(`   Errors: ${stats.invoices.errors}`);
  console.log(`   Matched to GHL contacts: ${stats.invoices.matched_contacts}`);
  console.log(`   Matched to projects: ${stats.invoices.matched_projects}`);

  return { synced: stats.invoices.synced, errors: stats.invoices.errors, errorDetails: errors };
}

// ============================================================================
// SYNC TRANSACTIONS
// ============================================================================

async function syncTransactions(options = {}) {
  console.log('\n=========================================');
  console.log('  Syncing Bank Transactions from Xero');
  console.log('=========================================\n');

  const daysBack = options.days || 90;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  console.log(`   Fetching transactions since: ${sinceStr} (${daysBack} days)`);

  // Build where clause for date filter
  const whereClause = `Date>=DateTime(${since.getFullYear()},${since.getMonth() + 1},${since.getDate()})`;
  const data = await xeroRequest(`BankTransactions?where=${encodeURIComponent(whereClause)}&order=Date DESC`);

  if (!data?.BankTransactions) {
    console.error('   No transaction data received');
    return { synced: 0, errors: 0 };
  }

  console.log(`   Found ${data.BankTransactions.length} transactions`);

  const errors = [];
  const byProject = {};
  const byType = { RECEIVE: 0, SPEND: 0, TRANSFER: 0 };

  for (const txn of data.BankTransactions) {
    try {
      // Detect project code
      const projectCode = detectProjectCode(txn);
      if (projectCode) {
        stats.transactions.matched_projects++;
        byProject[projectCode] = byProject[projectCode] || { total: 0, count: 0 };
        byProject[projectCode].total += parseFloat(txn.Total) || 0;
        byProject[projectCode].count++;
      }

      // Track by type
      if (txn.Type && byType.hasOwnProperty(txn.Type)) {
        byType[txn.Type]++;
      }

      // Parse Xero date format
      const parseXeroDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/\/Date\((\d+)([+-]\d+)?\)\//);
        if (match) {
          return new Date(parseInt(match[1])).toISOString().split('T')[0];
        }
        return dateStr;
      };

      // Build record matching schema
      const record = {
        xero_transaction_id: txn.BankTransactionID,
        type: txn.Type, // RECEIVE, SPEND, TRANSFER
        contact_name: txn.Contact?.Name,
        bank_account: txn.BankAccount?.Name,
        project_code: projectCode,
        total: parseFloat(txn.Total) || 0,
        status: txn.Status || 'ACTIVE',
        date: parseXeroDate(txn.Date),
        line_items: (txn.LineItems || []).map(li => ({
          description: li.Description,
          quantity: li.Quantity,
          unit_amount: li.UnitAmount,
          account_code: li.AccountCode,
          tax_type: li.TaxType,
          line_amount: li.LineAmount,
          tracking: li.Tracking
        })),
        synced_at: new Date().toISOString()
      };

      if (supabase) {
        const { error } = await supabase
          .from('xero_transactions')
          .upsert(record, { onConflict: 'xero_transaction_id' });

        if (error) {
          if (error.code === '42P01') {
            console.error('   Table xero_transactions does not exist');
            console.log('   Run migration: supabase db push');
            return { synced: 0, errors: 1, needsMigration: true };
          }
          throw error;
        }
      }

      stats.transactions.synced++;
      process.stdout.write('.');

    } catch (error) {
      stats.transactions.errors++;
      errors.push({
        entity_id: txn.BankTransactionID,
        error_message: error.message,
        timestamp: new Date().toISOString()
      });
      process.stdout.write('!');
    }
  }

  console.log('\n');
  console.log(`   Synced: ${stats.transactions.synced}`);
  console.log(`   Errors: ${stats.transactions.errors}`);
  console.log(`   Matched to projects: ${stats.transactions.matched_projects}`);
  console.log(`   By type: RECEIVE=${byType.RECEIVE}, SPEND=${byType.SPEND}, TRANSFER=${byType.TRANSFER}`);

  // Show project breakdown
  if (Object.keys(byProject).length > 0) {
    console.log('\n   Transactions by Project:');
    const sorted = Object.entries(byProject).sort((a, b) => b[1].total - a[1].total);
    for (const [code, data] of sorted.slice(0, 10)) {
      const proj = PROJECT_CODES.projects?.[code];
      console.log(`      ${code}: $${data.total.toFixed(2)} (${data.count} txns)`);
      if (proj) console.log(`         -> ${proj.name}`);
    }
  }

  return { synced: stats.transactions.synced, errors: stats.transactions.errors, errorDetails: errors, byProject };
}

// ============================================================================
// SYNC LOG
// ============================================================================

async function logSync(syncType, results) {
  if (!supabase) return;

  try {
    const allErrors = [
      ...(results.invoices?.errorDetails || []),
      ...(results.transactions?.errorDetails || [])
    ];

    const record = {
      sync_type: syncType,
      records_synced: (results.invoices?.synced || 0) + (results.transactions?.synced || 0),
      errors: allErrors.length > 0 ? allErrors : [],
      started_at: new Date(stats.startTime).toISOString(),
      completed_at: new Date().toISOString(),
      status: allErrors.length === 0 ? 'completed' : 'completed'
    };

    const { error } = await supabase
      .from('xero_sync_log')
      .insert(record);

    if (error && error.code !== '42P01') {
      console.warn('Failed to log sync:', error.message);
    }
  } catch (e) {
    console.warn('Error logging sync:', e.message);
  }
}

// ============================================================================
// FULL SYNC
// ============================================================================

async function fullSync(options = {}) {
  console.log('\n=========================================');
  console.log('  Full Xero -> Supabase Sync');
  console.log('=========================================\n');

  const results = {
    invoices: await syncInvoices(options),
    transactions: await syncTransactions(options)
  };

  // Log the sync
  await logSync('full', results);

  // Summary
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('\n=========================================');
  console.log('  Sync Complete');
  console.log('=========================================\n');
  console.log(`   Invoices synced: ${results.invoices.synced}`);
  console.log(`   Transactions synced: ${results.transactions.synced}`);
  console.log(`   Total errors: ${results.invoices.errors + results.transactions.errors}`);
  console.log(`   Duration: ${duration}s`);

  const totalErrors = results.invoices.errors + results.transactions.errors;
  if (totalErrors > 0) {
    process.exit(1);
  }

  return results;
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

function showSetup() {
  console.log(`
Xero Financial Sync Setup
=========================================

1. CREATE XERO APP
   Go to: https://developer.xero.com/myapps
   - Create new app with OAuth 2.0
   - App type: Web app
   - Redirect URI: https://your-domain.com/xero/callback
   - Scopes: openid profile email accounting.transactions.read accounting.contacts.read

2. CONFIGURE ENVIRONMENT
   Add to .env.local or GitHub secrets:

   XERO_CLIENT_ID=your_client_id
   XERO_CLIENT_SECRET=your_client_secret
   XERO_TENANT_ID=your_org_id
   XERO_REFRESH_TOKEN=your_refresh_token

3. GET INITIAL TOKENS
   Option A: Manual OAuth flow
   - Use Xero's OAuth 2.0 playground
   - Complete auth flow to get refresh token

   Option B: Use a token helper script
   - Run: node scripts/xero-auth.mjs login

4. CREATE DATABASE TABLES
   Apply migration: supabase db push
   Or run: supabase migration up

5. SYNC DATA
   Manual: node scripts/sync-xero-to-supabase.mjs full
   Auto: GitHub Actions workflow runs daily at 6am AEST

Required Tables (from migration):
  - xero_invoices     - All invoices (receivables + payables)
  - xero_transactions - Bank transactions
  - xero_sync_log     - Audit trail of sync operations

Views Available:
  - v_project_financials   - Financial summary by project
  - v_monthly_revenue      - Monthly revenue breakdown
  - v_outstanding_invoices - Unpaid invoices with aging

Token Refresh:
  The script automatically refreshes tokens when needed.
  Tokens are cached in .xero-tokens.json for persistence.
`);
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const command = process.argv[2] || 'help';
  const daysArg = process.argv.find(a => a.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 90;

  console.log('=========================================');
  console.log('  Xero -> Supabase Financial Sync');
  console.log('=========================================');

  // Validate configuration for sync commands
  if (['invoices', 'transactions', 'full'].includes(command)) {
    console.log('\n   Checking configuration...');

    if (!XERO_TENANT_ID) {
      console.error('\n   Missing XERO_TENANT_ID');
      console.error('   Run: node scripts/sync-xero-to-supabase.mjs setup');
      process.exit(1);
    }

    if (!SUPABASE_KEY) {
      console.error('\n   Missing Supabase service role key');
      console.error('   Set SUPABASE_SHARED_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    // Ensure we have valid token
    const hasToken = await ensureValidToken();
    if (!hasToken) {
      console.error('\n   Could not obtain valid Xero access token');
      console.error('   Check XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REFRESH_TOKEN');
      process.exit(1);
    }

    console.log('   Configuration OK');
  }

  switch (command) {
    case 'invoices':
      await syncInvoices({ days });
      await logSync('invoices', { invoices: stats.invoices });
      break;

    case 'transactions':
      await syncTransactions({ days });
      await logSync('transactions', { transactions: stats.transactions });
      break;

    case 'full':
      await fullSync({ days });
      break;

    case 'setup':
      showSetup();
      break;

    default:
      console.log(`
Commands:
  invoices      - Sync invoices (ACCREC + ACCPAY)
  transactions  - Sync bank transactions
  full          - Full sync (invoices + transactions)
  setup         - Show setup instructions

Options:
  --days=N      - Number of days to sync (default: 90)

Examples:
  node scripts/sync-xero-to-supabase.mjs full
  node scripts/sync-xero-to-supabase.mjs invoices --days=30
  node scripts/sync-xero-to-supabase.mjs transactions --days=180

Data Flow:
  Xero -> Supabase -> Project views -> Dashboards/Reports

Project Matching:
  1. Xero tracking categories (e.g., "Project: JusticeHub")
  2. Invoice reference field
  3. Line item descriptions
  4. Contact name patterns

Contact Matching:
  Attempts to link Xero contacts to GHL contacts by:
  1. Email address (exact match)
  2. Contact/company name (fuzzy match)
`);
  }
}

main().catch(error => {
  console.error('\nFatal error:', error.message);
  process.exit(1);
});
