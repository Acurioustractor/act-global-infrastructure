#!/usr/bin/env node
/**
 * Refresh Xero OAuth2 token and verify connection.
 * Quick utility — no args needed.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== Xero Token Refresh ===\n');

  // Get refresh token from Supabase
  const { data: tokenRow } = await supabase
    .from('xero_tokens')
    .select('refresh_token, access_token, expires_at, updated_by')
    .eq('id', 'default')
    .single();

  if (!tokenRow || !tokenRow.refresh_token) {
    console.error('No refresh token in Supabase. Run: node scripts/xero-auth.mjs');
    process.exit(1);
  }

  console.log(`Last updated by: ${tokenRow.updated_by}`);
  console.log(`Last expires_at: ${tokenRow.expires_at}`);
  console.log(`Currently valid: ${new Date(tokenRow.expires_at) > new Date()}\n`);

  // Refresh
  const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Refresh FAILED: ${response.status}`);
    console.error(err);
    console.error('\nRefresh token may be expired. Re-authenticate:');
    console.error('  node scripts/xero-auth.mjs');
    process.exit(1);
  }

  const tokens = await response.json();
  console.log('Token refreshed successfully!');
  console.log(`Scope: ${tokens.scope || 'not returned'}`);
  console.log(`Expires in: ${tokens.expires_in}s\n`);

  // Save to Supabase
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000) - 60000);
  await supabase.from('xero_tokens').upsert({
    id: 'default',
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: 'manual-refresh',
  }, { onConflict: 'id' });
  console.log('Saved to Supabase');

  // Save local
  writeFileSync('.xero-tokens.json', JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt.getTime(),
  }, null, 2));
  console.log('Saved to .xero-tokens.json');

  // Verify: get connections
  console.log('\nVerifying connection...');
  const connResp = await fetch('https://api.xero.com/connections', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  });
  const conns = await connResp.json();
  for (const c of conns) {
    console.log(`  Tenant: ${c.tenantName} (${c.tenantId})`);
  }

  // Verify: check scopes by testing endpoints
  console.log('\nTesting API access...');
  const tenantId = conns[0]?.tenantId;
  if (!tenantId) {
    console.error('No tenant found!');
    process.exit(1);
  }

  const endpoints = [
    { name: 'Organisation', url: 'https://api.xero.com/api.xro/2.0/Organisation' },
    { name: 'BankTransactions', url: 'https://api.xero.com/api.xro/2.0/BankTransactions?page=1&pageSize=1' },
    { name: 'Invoices', url: 'https://api.xero.com/api.xro/2.0/Invoices?page=1&pageSize=1' },
    { name: 'Contacts', url: 'https://api.xero.com/api.xro/2.0/Contacts?page=1&pageSize=1' },
    { name: 'TrackingCategories', url: 'https://api.xero.com/api.xro/2.0/TrackingCategories' },
    { name: 'ManualJournals', url: 'https://api.xero.com/api.xro/2.0/ManualJournals?page=1&pageSize=1' },
    { name: 'Reports/ProfitAndLoss', url: 'https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss' },
    { name: 'Reports/BalanceSheet', url: 'https://api.xero.com/api.xro/2.0/Reports/BalanceSheet' },
    { name: 'Budgets', url: 'https://api.xero.com/api.xro/2.0/Budgets' },
    { name: 'RepeatingInvoices', url: 'https://api.xero.com/api.xro/2.0/RepeatingInvoices' },
    { name: 'Payments', url: 'https://api.xero.com/api.xro/2.0/Payments?page=1&pageSize=1' },
  ];

  for (const ep of endpoints) {
    try {
      const r = await fetch(ep.url, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'xero-tenant-id': tenantId,
          'Accept': 'application/json',
        },
      });
      const status = r.ok ? '✓' : `✗ ${r.status}`;
      console.log(`  ${status.padEnd(8)} ${ep.name}`);
    } catch (e) {
      console.log(`  ✗ ERR   ${ep.name}: ${e.message}`);
    }
  }

  // Check current scopes
  console.log('\n=== Current Scopes ===');
  if (tokens.scope) {
    for (const scope of tokens.scope.split(' ')) {
      console.log(`  ${scope}`);
    }
  } else {
    console.log('  (scopes not returned in refresh response — check via auth flow)');
  }

  // Check what scopes we NEED for full suite
  const NEEDED_SCOPES = [
    'openid', 'profile', 'email', 'offline_access',
    'accounting.transactions',           // read+write bank transactions
    'accounting.transactions.read',      // read transactions
    'accounting.contacts',               // read+write contacts
    'accounting.contacts.read',          // read contacts
    'accounting.attachments',            // upload attachments
    'accounting.settings',               // tracking categories read+write
    'accounting.settings.read',          // tracking categories read
    'accounting.reports.read',           // P&L, balance sheet, budget
    'accounting.budgets.read',           // budget reports
    'accounting.journals.read',          // manual journals read
  ];

  console.log('\n=== Scope Recommendations ===');
  console.log('Current auth scopes in xero-auth.mjs should include:');
  console.log(`  ${NEEDED_SCOPES.join(' ')}`);

  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
