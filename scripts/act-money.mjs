#!/usr/bin/env node

/**
 * ACT Money - Xero Financial Queries
 *
 * Commands:
 *   balance              - Show account balances
 *   invoices [--status]  - List invoices
 *   expenses [--month]   - Show expenses
 *   profit [--period]    - Profit & loss summary
 *   contacts [--query]   - Search Xero contacts
 *
 * Usage:
 *   act-money balance
 *   act-money invoices --status overdue
 *   act-money expenses --month jan
 *
 * Note: Requires Xero OAuth2 setup. Run `act-money setup` first.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load secrets from Bitwarden
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

// Xero OAuth2 credentials
const XERO_CLIENT_ID = getSecret('XERO_CLIENT_ID');
const XERO_CLIENT_SECRET = getSecret('XERO_CLIENT_SECRET');
const XERO_TENANT_ID = getSecret('XERO_TENANT_ID');

// Token storage
const TOKEN_PATH = path.join(process.env.HOME, '.clawdbot', 'xero-tokens.json');

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Warning: Could not load Xero tokens:', e.message);
  }
  return null;
}

function saveTokens(tokens) {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

// Refresh access token
async function refreshAccessToken() {
  const tokens = loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error('No refresh token. Run `act-money setup` first.');
  }

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const newTokens = await response.json();
  saveTokens({
    ...newTokens,
    tenant_id: tokens.tenant_id || XERO_TENANT_ID,
  });

  return newTokens.access_token;
}

// Xero API request
async function xeroRequest(endpoint, options = {}) {
  const tokens = loadTokens();
  let accessToken = tokens?.access_token;

  // Check if token needs refresh (expired or about to expire)
  if (!accessToken || (tokens.expires_at && Date.now() > tokens.expires_at - 60000)) {
    accessToken = await refreshAccessToken();
  }

  const tenantId = tokens?.tenant_id || XERO_TENANT_ID;

  const url = `https://api.xero.com/api.xro/2.0${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Try refresh and retry once
    accessToken = await refreshAccessToken();
    const retryResponse = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Xero-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    if (!retryResponse.ok) {
      throw new Error(`Xero API error: ${retryResponse.status}`);
    }
    return retryResponse.json();
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Xero API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Check if Xero is configured
function checkXeroConfig() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
    console.log(`
⚠️  Xero not configured

To set up Xero integration:

1. Create a Xero App at https://developer.xero.com/app/manage
   - App type: Web app
   - Redirect URI: http://localhost:3000/callback

2. Add secrets to Bitwarden Secrets Manager:
   - XERO_CLIENT_ID
   - XERO_CLIENT_SECRET
   - XERO_TENANT_ID (your organisation ID)

3. Run: act-money setup
   (Opens browser to authorize and get tokens)

For now, showing placeholder data...
`);
    return false;
  }

  const tokens = loadTokens();
  if (!tokens?.access_token) {
    console.log(`
⚠️  Xero not authorized

Run: act-money setup
`);
    return false;
  }

  return true;
}

// Show account balances
async function showBalances() {
  console.log('\n💰 ACCOUNT BALANCES\n');

  if (!checkXeroConfig()) {
    // Show placeholder
    console.log('  (Xero not connected - showing placeholder)');
    console.log('');
    console.log('  Bank Account              $XX,XXX.XX');
    console.log('  Business Savings          $XX,XXX.XX');
    console.log('  Petty Cash                   $XXX.XX');
    console.log('  ──────────────────────────────────────');
    console.log('  Total                     $XX,XXX.XX');
    return;
  }

  try {
    const data = await xeroRequest('/Accounts?where=Type=="BANK"');
    const accounts = data.Accounts || [];

    let total = 0;
    for (const account of accounts) {
      const balance = account.BankBalance || 0;
      total += balance;
      console.log(`  ${account.Name.padEnd(25)} $${balance.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
    }

    console.log('  ──────────────────────────────────────');
    console.log(`  Total                     $${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
  console.log();
}

// List invoices
async function listInvoices(options = {}) {
  const statusFilter = options.status ? ` (${options.status})` : '';
  console.log(`\n📄 INVOICES${statusFilter}\n`);

  if (!checkXeroConfig()) {
    console.log('  (Xero not connected - showing placeholder)');
    console.log('');
    console.log('  INV-001   Client A        $1,500.00   PAID');
    console.log('  INV-002   Client B        $2,500.00   AWAITING PAYMENT');
    console.log('  INV-003   Client C          $750.00   OVERDUE');
    return;
  }

  try {
    let where = 'Type=="ACCREC"'; // Accounts Receivable (sales invoices)

    if (options.status) {
      const statusMap = {
        'draft': 'DRAFT',
        'submitted': 'SUBMITTED',
        'authorised': 'AUTHORISED',
        'paid': 'PAID',
        'voided': 'VOIDED',
        'overdue': 'AUTHORISED',
      };
      const xeroStatus = statusMap[options.status.toLowerCase()];
      if (xeroStatus) {
        where += `&&Status=="${xeroStatus}"`;
      }
    }

    const data = await xeroRequest(`/Invoices?where=${encodeURIComponent(where)}&order=Date DESC`);
    const invoices = data.Invoices || [];

    // For overdue filter, also check due date
    let filteredInvoices = invoices;
    if (options.status?.toLowerCase() === 'overdue') {
      const today = new Date();
      filteredInvoices = invoices.filter(inv => {
        if (inv.Status !== 'AUTHORISED') return false;
        const dueDate = new Date(inv.DueDateString);
        return dueDate < today;
      });
    }

    if (filteredInvoices.length === 0) {
      console.log('  No invoices found.');
      return;
    }

    for (const inv of filteredInvoices.slice(0, 15)) {
      const number = (inv.InvoiceNumber || inv.InvoiceID.slice(0, 8)).padEnd(12);
      const contact = (inv.Contact?.Name || 'Unknown').slice(0, 20).padEnd(20);
      const amount = `$${inv.Total?.toLocaleString('en-AU', { minimumFractionDigits: 2 }) || '0.00'}`.padStart(12);
      const status = inv.Status;

      let statusEmoji = '📋';
      if (status === 'PAID') statusEmoji = '✅';
      else if (status === 'AUTHORISED') {
        const dueDate = new Date(inv.DueDateString);
        statusEmoji = dueDate < new Date() ? '🔴' : '🟡';
      }

      console.log(`  ${statusEmoji} ${number} ${contact} ${amount}  ${status}`);
    }

    // Summary
    const totalOwed = filteredInvoices
      .filter(i => i.Status === 'AUTHORISED')
      .reduce((sum, i) => sum + (i.AmountDue || 0), 0);

    if (totalOwed > 0) {
      console.log('');
      console.log(`  Total outstanding: $${totalOwed.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  console.log();
}

// Show expenses
async function showExpenses(options = {}) {
  const monthFilter = options.month ? ` (${options.month})` : '';
  console.log(`\n💸 EXPENSES${monthFilter}\n`);

  if (!checkXeroConfig()) {
    console.log('  (Xero not connected - showing placeholder)');
    console.log('');
    console.log('  Software & SaaS           $1,200.00');
    console.log('  Travel                      $500.00');
    console.log('  Office Supplies             $150.00');
    console.log('  ──────────────────────────────────────');
    console.log('  Total                     $1,850.00');
    return;
  }

  try {
    // Get bills (accounts payable)
    let where = 'Type=="ACCPAY"';

    // Date filter
    if (options.month) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.indexOf(options.month.toLowerCase().slice(0, 3));
      if (monthIndex >= 0) {
        const year = new Date().getFullYear();
        const startDate = new Date(year, monthIndex, 1);
        const endDate = new Date(year, monthIndex + 1, 0);
        where += `&&Date>="${startDate.toISOString().split('T')[0]}"&&Date<="${endDate.toISOString().split('T')[0]}"`;
      }
    }

    const data = await xeroRequest(`/Invoices?where=${encodeURIComponent(where)}&order=Date DESC`);
    const bills = data.Invoices || [];

    // Group by account/category
    const byCategory = {};
    for (const bill of bills) {
      for (const line of bill.LineItems || []) {
        const category = line.AccountCode || 'Uncategorized';
        if (!byCategory[category]) byCategory[category] = 0;
        byCategory[category] += line.LineAmount || 0;
      }
    }

    let total = 0;
    for (const [category, amount] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category.padEnd(25)} $${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
      total += amount;
    }

    console.log('  ──────────────────────────────────────');
    console.log(`  Total                     $${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
  console.log();
}

// Profit & Loss summary
async function showProfitLoss(options = {}) {
  console.log('\n📊 PROFIT & LOSS SUMMARY\n');

  if (!checkXeroConfig()) {
    console.log('  (Xero not connected - showing placeholder)');
    console.log('');
    console.log('  Revenue                  $XX,XXX.XX');
    console.log('  Cost of Sales            ($X,XXX.XX)');
    console.log('  ──────────────────────────────────────');
    console.log('  Gross Profit             $XX,XXX.XX');
    console.log('');
    console.log('  Operating Expenses       ($X,XXX.XX)');
    console.log('  ──────────────────────────────────────');
    console.log('  Net Profit               $XX,XXX.XX');
    return;
  }

  try {
    // Get P&L report
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const fromDate = startOfYear.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const data = await xeroRequest(`/Reports/ProfitAndLoss?fromDate=${fromDate}&toDate=${toDate}`);
    const report = data.Reports?.[0];

    if (!report) {
      console.log('  No report data available.');
      return;
    }

    // Parse report rows
    for (const section of report.Rows || []) {
      if (section.Title) {
        console.log(`\n  ${section.Title}`);
      }
      for (const row of section.Rows || []) {
        if (row.RowType === 'Row' && row.Cells) {
          const label = row.Cells[0]?.Value || '';
          const value = row.Cells[1]?.Value || '';
          if (label && value) {
            console.log(`    ${label.padEnd(25)} ${value}`);
          }
        }
        if (row.RowType === 'SummaryRow' && row.Cells) {
          const label = row.Cells[0]?.Value || '';
          const value = row.Cells[1]?.Value || '';
          console.log('  ──────────────────────────────────────');
          console.log(`  ${label.padEnd(25)} ${value}`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  console.log();
}

// Search contacts
async function searchContacts(query) {
  console.log(`\n👥 CONTACTS: "${query}"\n`);

  if (!checkXeroConfig()) {
    console.log('  (Xero not connected)');
    return;
  }

  try {
    const data = await xeroRequest(`/Contacts?where=Name.Contains("${query}")`);
    const contacts = data.Contacts || [];

    if (contacts.length === 0) {
      console.log('  No contacts found.');
      return;
    }

    for (const contact of contacts.slice(0, 10)) {
      console.log(`  ${contact.Name}`);
      if (contact.EmailAddress) console.log(`    📧 ${contact.EmailAddress}`);
      if (contact.Balances?.AccountsReceivable?.Outstanding) {
        console.log(`    💰 Owes: $${contact.Balances.AccountsReceivable.Outstanding.toLocaleString()}`);
      }
      console.log();
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// OAuth2 setup flow
async function setupOAuth() {
  console.log(`
🔐 XERO OAUTH SETUP

1. Make sure you have created a Xero app at:
   https://developer.xero.com/app/manage

2. Add these secrets to Bitwarden:
   - XERO_CLIENT_ID: ${XERO_CLIENT_ID ? '✅ Set' : '❌ Not set'}
   - XERO_CLIENT_SECRET: ${XERO_CLIENT_SECRET ? '✅ Set' : '❌ Not set'}
   - XERO_TENANT_ID: ${XERO_TENANT_ID ? '✅ Set' : '❌ Not set (will be fetched during auth)'}

3. To complete OAuth flow, visit this URL:
   https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${XERO_CLIENT_ID}&redirect_uri=http://localhost:3000/callback&scope=openid profile email accounting.transactions accounting.contacts accounting.reports.read offline_access

4. After authorizing, you'll be redirected to localhost with a code.
   Run: act-money authorize <code>
`);
}

// Exchange auth code for tokens
async function authorizeWithCode(code) {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
    console.log('Error: XERO_CLIENT_ID and XERO_CLIENT_SECRET must be set.');
    return;
  }

  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange failed:', error);
    return;
  }

  const tokens = await response.json();

  // Get tenant ID
  const connectionsResponse = await fetch('https://api.xero.com/connections', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const connections = await connectionsResponse.json();
  const tenantId = connections[0]?.tenantId;

  saveTokens({
    ...tokens,
    tenant_id: tenantId,
    expires_at: Date.now() + (tokens.expires_in * 1000),
  });

  console.log('✅ Xero authorized successfully!');
  console.log(`   Tenant: ${connections[0]?.tenantName || tenantId}`);
}

// Parse CLI arguments
function parseArgs(args) {
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      i += value === true ? 1 : 2;
    } else {
      i++;
    }
  }
  return options;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'balance':
      case 'balances':
        await showBalances();
        break;

      case 'invoices':
        await listInvoices(options);
        break;

      case 'expenses':
        await showExpenses(options);
        break;

      case 'profit':
      case 'pnl':
        await showProfitLoss(options);
        break;

      case 'contacts':
        const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        await searchContacts(query || '');
        break;

      case 'setup':
        await setupOAuth();
        break;

      case 'authorize':
        const code = args[1];
        if (!code) {
          console.log('Usage: act-money authorize <code>');
          process.exit(1);
        }
        await authorizeWithCode(code);
        break;

      default:
        console.log(`
💰 ACT Money - Xero Financial Queries

Usage:
  act-money balance              Show account balances
  act-money invoices [--status]  List invoices (draft, paid, overdue)
  act-money expenses [--month]   Show expenses by category
  act-money profit               Profit & loss summary
  act-money contacts [query]     Search Xero contacts

  act-money setup                Show OAuth setup instructions
  act-money authorize <code>     Complete OAuth with auth code

Status filters for invoices:
  draft, submitted, authorised, paid, voided, overdue

Examples:
  act-money balance
  act-money invoices --status overdue
  act-money expenses --month jan
  act-money contacts "Client Name"
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
