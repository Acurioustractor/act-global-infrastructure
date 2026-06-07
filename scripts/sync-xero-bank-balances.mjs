#!/usr/bin/env node
/**
 * Sync Xero bank account metadata + closing balances to xero_bank_accounts table.
 * Uses Accounts API for metadata and Reports/BankSummary for balances.
 */
import '../lib/load-env.mjs';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const tokens = JSON.parse(readFileSync(path.join(process.cwd(), '.xero-tokens.json'), 'utf8'));
let tenantId = process.env.XERO_TENANT_ID;
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

let headers = {
  'Authorization': `Bearer ${tokens.access_token}`,
  'xero-tenant-id': tenantId,
  'Accept': 'application/json',
};

// Xero accounting calls can return 403 until the token's tenant context has
// been resolved through /connections. Prefer the configured tenant if present.
const connResp = await fetch('https://api.xero.com/connections', {
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`,
    'Accept': 'application/json',
  },
});
const connections = await connResp.json();
if (!connResp.ok || !Array.isArray(connections) || connections.length === 0) {
  console.error('Could not resolve Xero tenant connections');
  console.error(JSON.stringify(connections).slice(0, 500));
  process.exit(1);
}
const connection = connections.find(c => c.tenantId === tenantId) || connections[0];
tenantId = connection.tenantId;
headers = { ...headers, 'xero-tenant-id': tenantId };
console.log(`Tenant: ${connection.tenantName} (${tenantId})`);

// 1. Fetch bank accounts metadata
const acctResp = await fetch('https://api.xero.com/api.xro/2.0/Accounts?where=Type%3D%3D%22BANK%22', { headers });
const acctData = await acctResp.json();
console.log(`Bank accounts: ${acctData.Accounts.length}`);
for (const a of acctData.Accounts) {
  console.log(`  ${a.Name} (${a.Code}) Status: ${a.Status}`);
}

// 2. Fetch bank summary report for closing balances
function ymd(date) {
  return date.toISOString().split('T')[0];
}

const todayDate = new Date();
const fromDate = new Date(todayDate);
fromDate.setUTCDate(1);
if (ymd(fromDate) === ymd(todayDate)) {
  fromDate.setUTCMonth(fromDate.getUTCMonth() - 1);
}
const today = ymd(todayDate);
const summaryResp = await fetch(`https://api.xero.com/api.xro/2.0/Reports/BankSummary?fromDate=${ymd(fromDate)}&toDate=${today}`, { headers });
const summaryData = await summaryResp.json();

const report = summaryData.Reports && summaryData.Reports[0];
if (!report) {
  console.error('No BankSummary report returned');
  console.error(JSON.stringify(summaryData).slice(0, 500));
  process.exit(1);
}

// Parse bank summary to get closing balances
const balances = {};
for (const section of report.Rows || []) {
  if (section.RowType === 'Section' && section.Rows) {
    for (const row of section.Rows) {
      if (row.RowType === 'Row' && row.Cells) {
        const name = row.Cells[0] && row.Cells[0].Value;
        const closingBalance = parseFloat((row.Cells[4] && row.Cells[4].Value) || '0');
        const attrs = row.Cells[0] && row.Cells[0].Attributes;
        const accountId = attrs && attrs[0] && attrs[0].Value;
        if (accountId) {
          balances[accountId] = { name, closingBalance };
          console.log(`  Balance: ${name} = $${closingBalance.toLocaleString()}`);
        }
      }
    }
  }
}

// 3. Upsert bank accounts with balances
const now = new Date().toISOString();
console.log('\nSaving to Supabase...');
for (const account of acctData.Accounts) {
  const balance = balances[account.AccountID];
  const record = {
    xero_id: account.AccountID,
    name: account.Name,
    code: account.Code,
    type: account.Type,
    bank_account_number: account.BankAccountNumber || null,
    currency_code: account.CurrencyCode || 'AUD',
    status: account.Status,
    current_balance: balance ? balance.closingBalance : null,
    balance_updated_at: now,
    updated_at: now,
  };
  const { error } = await supabase.from('xero_bank_accounts').upsert(record, { onConflict: 'xero_id' });
  if (error) {
    console.error(`  Error for ${account.Name}: ${error.message}`);
  } else {
    console.log(`  Saved: ${account.Name} — $${record.current_balance}`);
  }
}

// 4. Verify
const { data: rows } = await supabase.from('xero_bank_accounts').select('name, current_balance, balance_updated_at');
console.log('\nVerification:');
let total = 0;
for (const r of rows) {
  console.log(`  ${r.name}: $${r.current_balance}`);
  total += r.current_balance || 0;
}
console.log(`\n  Total cash in bank: $${total.toLocaleString()}`);
