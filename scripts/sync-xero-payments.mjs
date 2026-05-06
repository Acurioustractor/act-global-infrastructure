#!/usr/bin/env node
/**
 * Sync Xero /Payments endpoint into Supabase xero_payments table.
 *
 * Each Payment record links a bank deposit to an invoice (one Payment per
 * settlement). This is the source of truth for "which deposit paid which invoice"
 * — much more reliable than inferring from xero_invoices.amount_paid.
 *
 * Usage:
 *   node scripts/sync-xero-payments.mjs            # last 90 days
 *   node scripts/sync-xero-payments.mjs --days=365
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days'));
const DAYS = daysArg ? parseInt(daysArg.split(/[ =]/)[1], 10) : 90;

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// Load Xero token (using the same dual-store pattern as sync-xero-to-supabase.mjs)
async function getAccessToken() {
  const tokenPath = join(process.env.HOME, 'Code/act-global-infrastructure/.xero-tokens.json');
  if (!existsSync(tokenPath)) throw new Error('No .xero-tokens.json — run sync-xero-tokens.mjs first');
  let tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));

  // Refresh if expired
  if (new Date(tokens.expires_at) < new Date(Date.now() + 60 * 1000)) {
    log('Token expired, refreshing...');
    const res = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
    });
    if (!res.ok) throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
    const fresh = await res.json();
    tokens.access_token = fresh.access_token;
    tokens.refresh_token = fresh.refresh_token;
    tokens.expires_at = new Date(Date.now() + fresh.expires_in * 1000).toISOString();
    writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  }
  return tokens.access_token;
}

async function xeroFetch(path, accessToken) {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': process.env.XERO_TENANT_ID,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Xero ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function main() {
  log(`=== Xero Payments sync (last ${DAYS} days) ===`);
  const token = await getAccessToken();

  const sinceDate = new Date(Date.now() - DAYS * 86400000);
  const monthName = sinceDate.toLocaleString('en-US', { month: 'short' });
  const where = `Date >= DateTime(${sinceDate.getFullYear()}, ${sinceDate.getMonth() + 1}, ${sinceDate.getDate()})`;

  let allPayments = [];
  let page = 1;
  while (true) {
    log(`Fetching page ${page}...`);
    const data = await xeroFetch(`Payments?where=${encodeURIComponent(where)}&order=Date DESC&page=${page}`, token);
    if (!data?.Payments?.length) break;
    allPayments.push(...data.Payments);
    log(`  ${data.Payments.length} payments on page ${page} (running total: ${allPayments.length})`);
    if (data.Payments.length < 100) break;
    page += 1;
  }
  log(`Total payments fetched: ${allPayments.length}`);

  let synced = 0, errors = 0;
  for (const p of allPayments) {
    const parseDate = (s) => {
      if (!s) return null;
      const m = s.match(/\/Date\((\d+)([+-]\d+)?\)\//);
      return m ? new Date(parseInt(m[1])).toISOString().split('T')[0] : null;
    };
    const record = {
      xero_payment_id: p.PaymentID,
      payment_type: p.PaymentType,
      status: p.Status,
      invoice_xero_id: p.Invoice?.InvoiceID || null,
      invoice_number: p.Invoice?.InvoiceNumber || null,
      account_id: p.Account?.AccountID || null,
      account_name: p.Account?.Name || null,
      bank_account_code: p.Account?.Code || null,
      date: parseDate(p.Date),
      amount: parseFloat(p.Amount) || 0,
      currency_code: p.CurrencyRate ? 'AUD' : (p.CurrencyCode || 'AUD'),
      reference: p.Reference,
      is_reconciled: p.IsReconciled || false,
      has_account: p.HasAccount || false,
      has_validation_errors: p.HasValidationErrors || false,
      bank_amount: parseFloat(p.BankAmount) || null,
      raw_payload: p,
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('xero_payments').upsert(record, { onConflict: 'xero_payment_id' });
    if (error) { errors += 1; if (errors === 1) log(`First error: ${error.code} ${error.message}`); }
    else synced += 1;
  }
  log(`\nSynced ${synced} payments, ${errors} errors`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
