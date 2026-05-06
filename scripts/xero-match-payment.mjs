#!/usr/bin/env node
/**
 * Create a Payment in Xero linking an invoice to a bank deposit.
 *
 * After this runs:
 *   - Invoice status flips to PAID (or partially-paid if amount < total)
 *   - The bank line shows as reconciled
 *   - Our next sync picks up both changes
 *
 * Usage:
 *   node scripts/xero-match-payment.mjs --invoice INV-0295 --account "ACT Trading" --date 2026-04-24 --amount 27500
 *   node scripts/xero-match-payment.mjs --invoice INV-0314 --account-id <bank-account-uuid> --amount 84700
 *   node scripts/xero-match-payment.mjs --list-bank-accounts        # show available bank accounts
 *
 * If --amount omitted, uses the invoice's amount_due.
 * If --date omitted, uses today.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const arg = (name) => {
  const a = args.find(x => x.startsWith(`--${name}`));
  if (!a) return null;
  if (a.includes('=')) return a.split('=').slice(1).join('=');
  const i = args.indexOf(a);
  return args[i + 1];
};
const FLAG_LIST_ACCOUNTS = args.includes('--list-bank-accounts');

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function getAccessToken() {
  const tokenPath = join(process.env.HOME, 'Code/act-global-infrastructure/.xero-tokens.json');
  if (!existsSync(tokenPath)) throw new Error('No .xero-tokens.json — run sync-xero-tokens.mjs first');
  let tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
  if (new Date(tokens.expires_at) < new Date(Date.now() + 60 * 1000)) {
    log('Refreshing token...');
    const res = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const fresh = await res.json();
    tokens.access_token = fresh.access_token;
    tokens.refresh_token = fresh.refresh_token;
    tokens.expires_at = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  }
  return tokens.access_token;
}

async function xeroFetch(path, accessToken, init = {}) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': process.env.XERO_TENANT_ID,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Xero ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

async function listBankAccounts(token) {
  log('Fetching bank accounts...');
  const data = await xeroFetch('Accounts?where=' + encodeURIComponent('Type=="BANK" AND Status=="ACTIVE"'), token);
  const accs = (data?.Accounts || []);
  console.log('\nAvailable bank accounts:');
  for (const a of accs) {
    console.log(`  ${a.AccountID}  ·  ${a.Name.padEnd(40)}  ·  Code: ${a.Code || '-'}  ·  ${a.BankAccountNumber || ''}`);
  }
  console.log(`\nUse the AccountID with --account-id, or quote the Name with --account "..."`);
}

async function findInvoice(invoiceNumber) {
  const { data } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_due, status, type')
    .eq('invoice_number', invoiceNumber).limit(1);
  if (!data || data.length === 0) throw new Error(`Invoice ${invoiceNumber} not found in Supabase mirror`);
  return data[0];
}

async function resolveAccount(token, idOrName) {
  if (!idOrName) throw new Error('Need --account-id or --account "Name"');
  // If it looks like a UUID, use directly
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(idOrName)) return { id: idOrName, name: '(by id)' };
  const data = await xeroFetch('Accounts?where=' + encodeURIComponent(`Type=="BANK" AND Name=="${idOrName.replace(/"/g, '\\"')}"`), token);
  const acc = data?.Accounts?.[0];
  if (!acc) throw new Error(`Bank account "${idOrName}" not found`);
  return { id: acc.AccountID, name: acc.Name };
}

async function createPayment({ invoiceId, accountId, amount, date, reference }) {
  const token = await getAccessToken();
  const payload = {
    Payments: [{
      Invoice: { InvoiceID: invoiceId },
      Account: { AccountID: accountId },
      Amount: amount,
      Date: date,
      ...(reference && { Reference: reference }),
    }],
  };
  const data = await xeroFetch('Payments', token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data?.Payments?.[0];
}

async function main() {
  const token = await getAccessToken();

  if (FLAG_LIST_ACCOUNTS) {
    await listBankAccounts(token);
    return;
  }

  const invoiceNumber = arg('invoice');
  if (!invoiceNumber) {
    console.log('Usage: --invoice INV-XXXX --account "Bank Name" [--amount X] [--date YYYY-MM-DD]');
    console.log('       --list-bank-accounts to see options');
    process.exit(1);
  }

  log(`Looking up invoice ${invoiceNumber}...`);
  const inv = await findInvoice(invoiceNumber);
  log(`  ${inv.invoice_number} · ${inv.contact_name} · total ${inv.total} · due ${inv.amount_due} · status ${inv.status}`);

  const accountSelector = arg('account-id') || arg('account');
  const account = await resolveAccount(token, accountSelector);
  log(`  Bank account: ${account.name} (${account.id})`);

  const amount = parseFloat(arg('amount') || inv.amount_due);
  const date = arg('date') || new Date().toISOString().slice(0, 10);
  const reference = arg('reference');

  log(`\n→ Creating payment: ${invoiceNumber} ← $${amount} on ${date}${reference ? ` ref "${reference}"` : ''}`);
  const payment = await createPayment({
    invoiceId: inv.xero_id,
    accountId: account.id,
    amount,
    date,
    reference,
  });
  log(`✓ Payment created: ${payment.PaymentID} · status ${payment.Status}`);
  log(`  Invoice should now show PAID — re-run sync-xero-to-supabase.mjs invoices --days=7 to refresh.`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
