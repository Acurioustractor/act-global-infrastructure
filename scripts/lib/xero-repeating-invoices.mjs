#!/usr/bin/env node
/**
 * Xero RepeatingInvoices API Module
 *
 * Fetches scheduled/recurring invoices from Xero for subscription discovery.
 * Uses OAuth infrastructure from sync-xero-to-supabase.mjs
 *
 * Usage:
 *   import { fetchRepeatingInvoices } from './lib/xero-repeating-invoices.mjs';
 *   const invoices = await fetchRepeatingInvoices();
 *
 * CLI:
 *   node scripts/lib/xero-repeating-invoices.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });

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

const TOKEN_FILE = join(__dirname, '../../.xero-tokens.json');

// ============================================================================
// TOKEN MANAGEMENT (shared with sync-xero-to-supabase.mjs)
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
  } catch (e) {
    // Ignore
  }
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
    console.warn('Could not save tokens:', e.message);
  }
}

async function loadTokenFromSupabase() {
  if (!SUPABASE_KEY) return null;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase
      .from('xero_tokens')
      .select('refresh_token, access_token, expires_at')
      .eq('id', 'default')
      .single();

    if (error || !data || data.refresh_token === 'placeholder') {
      return null;
    }

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
  if (!SUPABASE_KEY) return;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const expiresAt = new Date(Date.now() + (expiresIn * 1000) - 60000);

    await supabase
      .from('xero_tokens')
      .upsert({
        id: 'default',
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'xero-repeating-invoices'
      }, { onConflict: 'id' });
  } catch (e) {
    console.warn('Could not save token to Supabase:', e.message);
  }
}

async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) {
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
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: XERO_REFRESH_TOKEN
      })
    });

    if (!response.ok) {
      return false;
    }

    const tokens = await response.json();
    XERO_ACCESS_TOKEN = tokens.access_token;
    XERO_REFRESH_TOKEN = tokens.refresh_token;

    saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    await saveTokenToSupabase(tokens.refresh_token, tokens.access_token, tokens.expires_in);

    return true;
  } catch (error) {
    return false;
  }
}

async function ensureValidToken() {
  // 1. Try Supabase
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens) {
    if (supabaseTokens.valid && supabaseTokens.access_token) {
      XERO_ACCESS_TOKEN = supabaseTokens.access_token;
      XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
      return true;
    }
    if (supabaseTokens.refresh_token) {
      XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
    }
  }

  // 2. Try local stored tokens
  if (loadStoredTokens()) {
    return true;
  }

  // 3. Try refresh
  return await refreshAccessToken();
}

// ============================================================================
// XERO API
// ============================================================================

async function xeroRequest(endpoint, options = {}) {
  if (!XERO_ACCESS_TOKEN || !XERO_TENANT_ID) {
    throw new Error('Xero credentials not configured');
  }

  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;

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
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return xeroRequest(endpoint, options);
      }
      throw new Error('Token refresh failed');
    }
    const errorText = await response.text();
    throw new Error(`Xero API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// ============================================================================
// REPEATING INVOICES
// ============================================================================

/**
 * Fetch all repeating invoices (scheduled recurring bills/invoices) from Xero
 *
 * @returns {Promise<Array>} Array of repeating invoice objects
 */
export async function fetchRepeatingInvoices() {
  await ensureValidToken();

  const data = await xeroRequest('RepeatingInvoices');

  if (!data?.RepeatingInvoices) {
    return [];
  }

  return data.RepeatingInvoices.map(invoice => {
    // Parse Xero date format
    const parseXeroDate = (dateStr) => {
      if (!dateStr) return null;
      const match = dateStr.match(/\/Date\((\d+)([+-]\d+)?\)\//);
      if (match) {
        return new Date(parseInt(match[1])).toISOString().split('T')[0];
      }
      return dateStr;
    };

    // Calculate billing cycle from unit
    const getBillingCycle = (unit, unitValue) => {
      if (unit === 'MONTHLY' && unitValue === 1) return 'monthly';
      if (unit === 'MONTHLY' && unitValue === 3) return 'quarterly';
      if (unit === 'MONTHLY' && unitValue === 12) return 'annual';
      if (unit === 'YEARLY') return 'annual';
      if (unit === 'WEEKLY') return unitValue === 52 ? 'annual' : 'unknown';
      return 'monthly'; // Default
    };

    return {
      xero_id: invoice.RepeatingInvoiceID,
      type: invoice.Type, // ACCPAY = expense, ACCREC = revenue
      contact_name: invoice.Contact?.Name,
      contact_id: invoice.Contact?.ContactID,
      status: invoice.Status, // DRAFT, AUTHORISED
      total: parseFloat(invoice.Total) || 0,
      subtotal: parseFloat(invoice.SubTotal) || 0,
      currency: invoice.CurrencyCode || 'AUD',
      reference: invoice.Reference,

      // Schedule
      schedule_unit: invoice.Schedule?.Unit,
      schedule_period: invoice.Schedule?.Period,
      billing_cycle: getBillingCycle(invoice.Schedule?.Unit, invoice.Schedule?.Period),
      start_date: parseXeroDate(invoice.Schedule?.StartDate),
      next_scheduled_date: parseXeroDate(invoice.Schedule?.NextScheduledDate),
      end_date: parseXeroDate(invoice.Schedule?.EndDate),

      // Line items (for category detection)
      line_items: (invoice.LineItems || []).map(li => ({
        description: li.Description,
        quantity: li.Quantity,
        unit_amount: li.UnitAmount,
        account_code: li.AccountCode,
        line_amount: li.LineAmount
      })),

      // Discovery metadata
      discovery_confidence: 95, // High confidence from Xero scheduled invoices
      discovery_source: 'xero_repeating'
    };
  });
}

/**
 * Convert Xero repeating invoice to subscription candidate format
 *
 * @param {Object} invoice - Xero repeating invoice
 * @returns {Object} Subscription candidate
 */
export function toSubscriptionCandidate(invoice) {
  // Only expenses (ACCPAY) are subscriptions we pay
  if (invoice.type !== 'ACCPAY') {
    return null;
  }

  // Detect category from account codes
  const detectCategory = (lineItems) => {
    const codes = lineItems.map(li => li.account_code).filter(Boolean);
    if (codes.some(c => c?.startsWith('635'))) return 'ai'; // Software
    if (codes.some(c => c?.startsWith('640'))) return 'infrastructure'; // Travel (wrong match)
    if (codes.some(c => c?.startsWith('650'))) return 'marketing'; // Marketing
    return 'operations';
  };

  return {
    vendor_name: invoice.contact_name,
    detected_amount: invoice.total,
    detected_currency: invoice.currency,
    detected_cycle: invoice.billing_cycle,
    discovery_source: 'xero_repeating',
    discovery_confidence: 95,
    xero_repeating_invoice_id: invoice.xero_id,
    next_payment_date: invoice.next_scheduled_date,
    category: detectCategory(invoice.line_items),
    evidence: [{
      type: 'xero_repeating_invoice',
      xero_id: invoice.xero_id,
      contact: invoice.contact_name,
      total: invoice.total,
      schedule: `${invoice.schedule_period} ${invoice.schedule_unit}`,
      next_date: invoice.next_scheduled_date
    }]
  };
}

/**
 * Get subscription candidates from Xero RepeatingInvoices
 *
 * @returns {Promise<Array>} Array of subscription candidates
 */
export async function getXeroSubscriptionCandidates() {
  const invoices = await fetchRepeatingInvoices();

  return invoices
    .map(toSubscriptionCandidate)
    .filter(Boolean);
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Xero RepeatingInvoices Discovery');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const invoices = await fetchRepeatingInvoices();

    console.log(`Found ${invoices.length} repeating invoices:\n`);

    // Separate expenses (ACCPAY) from revenue (ACCREC)
    const expenses = invoices.filter(i => i.type === 'ACCPAY');
    const revenue = invoices.filter(i => i.type === 'ACCREC');

    if (expenses.length > 0) {
      console.log('📤 EXPENSES (Subscriptions we pay):');
      console.log('─'.repeat(60));

      for (const inv of expenses) {
        console.log(`  ${inv.contact_name.padEnd(30)} $${inv.total.toFixed(2).padStart(10)} ${inv.billing_cycle.padEnd(10)} → ${inv.next_scheduled_date || 'not scheduled'}`);
      }

      const totalMonthly = expenses.reduce((sum, inv) => {
        if (inv.billing_cycle === 'monthly') return sum + inv.total;
        if (inv.billing_cycle === 'quarterly') return sum + (inv.total / 3);
        if (inv.billing_cycle === 'annual') return sum + (inv.total / 12);
        return sum;
      }, 0);

      console.log('─'.repeat(60));
      console.log(`  Total monthly (estimated):       $${totalMonthly.toFixed(2)}`);
      console.log(`  Total annual (estimated):        $${(totalMonthly * 12).toFixed(2)}`);
    }

    if (revenue.length > 0) {
      console.log('\n📥 REVENUE (Recurring income):');
      console.log('─'.repeat(60));

      for (const inv of revenue) {
        console.log(`  ${inv.contact_name.padEnd(30)} $${inv.total.toFixed(2).padStart(10)} ${inv.billing_cycle.padEnd(10)} → ${inv.next_scheduled_date || 'not scheduled'}`);
      }
    }

    // Show candidates
    console.log('\n\n📋 Subscription Candidates for Discovery:');
    console.log('─'.repeat(60));

    const candidates = await getXeroSubscriptionCandidates();
    for (const c of candidates) {
      console.log(`  ${c.vendor_name.padEnd(30)} $${c.detected_amount.toFixed(2).padStart(10)} ${c.detected_cycle.padEnd(10)} (${c.discovery_confidence}% conf)`);
    }

    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run CLI if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
