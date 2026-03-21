#!/usr/bin/env node
/**
 * Xero Full Audit — Pull everything from Xero to build complete picture
 * Contacts, tracking categories, account codes, tax rates, org info, repeating invoices
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');
const XERO_API = 'https://api.xero.com/api.xro/2.0';

function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.access_token) {
        XERO_ACCESS_TOKEN = tokens.access_token;
        if (tokens.refresh_token) XERO_REFRESH_TOKEN = tokens.refresh_token;
        return true;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

async function refreshAccessToken() {
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: XERO_CLIENT_ID,
      refresh_token: XERO_REFRESH_TOKEN,
    }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  XERO_ACCESS_TOKEN = data.access_token;
  XERO_REFRESH_TOKEN = data.refresh_token;
  writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000) - 60000,
  }, null, 2));
  return true;
}

async function xeroGet(endpoint) {
  let response = await fetch(`${XERO_API}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': 'application/json',
    },
  });
  if (response.status === 401) {
    await refreshAccessToken();
    response = await fetch(`${XERO_API}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
        'xero-tenant-id': XERO_TENANT_ID,
        'Accept': 'application/json',
      },
    });
  }
  if (!response.ok) {
    console.log(`  WARN: ${endpoint} returned ${response.status}`);
    return null;
  }
  return response.json();
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  loadStoredTokens();
  if (!XERO_ACCESS_TOKEN) await refreshAccessToken();

  const report = [];
  const push = (s) => { report.push(s); console.log(s); };

  push('# Xero Full Audit — ' + new Date().toISOString().slice(0, 10));
  push('');

  // 1. Organisation
  push('## 1. Organisation');
  const org = await xeroGet('Organisation');
  if (org?.Organisations?.[0]) {
    const o = org.Organisations[0];
    push(`- **Name:** ${o.Name}`);
    push(`- **Legal Name:** ${o.LegalName}`);
    push(`- **ABN:** ${o.TaxNumber}`);
    push(`- **Entity Type:** ${o.OrganisationType}`);
    push(`- **Registration:** ${o.RegistrationNumber || 'N/A'}`);
    push(`- **Country:** ${o.CountryCode}`);
    push(`- **Base Currency:** ${o.BaseCurrency}`);
    push(`- **Financial Year End:** ${o.FinancialYearEndDay}/${o.FinancialYearEndMonth}`);
    push(`- **GST Registered:** ${o.PaysTax}`);
    push(`- **Sales Tax Basis:** ${o.SalesTaxBasis}`);
    push(`- **Sales Tax Period:** ${o.SalesTaxPeriod}`);
    push(`- **Short Code:** ${o.ShortCode}`);
    push(`- **Edition:** ${o.Edition}`);
    push(`- **Version:** ${o.Version}`);
    push(`- **Class:** ${o.Class}`);
    push(`- **Created:** ${o.CreatedDateUTC}`);
  }
  push('');
  await sleep(1100);

  // 2. Tracking Categories
  push('## 2. Tracking Categories');
  const tracking = await xeroGet('TrackingCategories');
  if (tracking?.TrackingCategories) {
    for (const cat of tracking.TrackingCategories) {
      push(`### ${cat.Name} (${cat.Status})`);
      push(`- ID: ${cat.TrackingCategoryID}`);
      push(`- Options: ${cat.Options?.length || 0}`);
      for (const opt of cat.Options || []) {
        push(`  - ${opt.Name} (${opt.Status}) — ID: ${opt.TrackingOptionID}`);
      }
    }
  }
  push('');
  await sleep(1100);

  // 3. Chart of Accounts
  push('## 3. Chart of Accounts');
  const accounts = await xeroGet('Accounts');
  if (accounts?.Accounts) {
    const byType = {};
    for (const a of accounts.Accounts) {
      byType[a.Type] = byType[a.Type] || [];
      byType[a.Type].push(a);
    }
    for (const [type, accts] of Object.entries(byType).sort()) {
      push(`### ${type} (${accts.length})`);
      for (const a of accts.sort((x, y) => (x.Code || '').localeCompare(y.Code || ''))) {
        const tax = a.TaxType ? ` [${a.TaxType}]` : '';
        push(`- ${a.Code || '?'}: ${a.Name}${tax}${a.Status !== 'ACTIVE' ? ' (ARCHIVED)' : ''}`);
      }
    }
  }
  push('');
  await sleep(1100);

  // 4. Tax Rates
  push('## 4. Tax Rates');
  const taxRates = await xeroGet('TaxRates');
  if (taxRates?.TaxRates) {
    for (const t of taxRates.TaxRates.filter(t => t.Status === 'ACTIVE')) {
      push(`- **${t.Name}** (${t.TaxType}): ${t.EffectiveRate}% — ${t.ReportTaxType}`);
    }
  }
  push('');
  await sleep(1100);

  // 5. Contacts Summary
  push('## 5. Contacts (Top Vendors by Spend)');
  const contacts = await xeroGet('Contacts?where=IsSupplier==true&order=Name');
  if (contacts?.Contacts) {
    push(`Total supplier contacts: ${contacts.Contacts.length}`);
    push('');
    push('| Contact | Email | Tax # | Default Account |');
    push('|---------|-------|-------|-----------------|');
    for (const c of contacts.Contacts.slice(0, 100)) {
      const email = c.EmailAddress || '-';
      const tax = c.TaxNumber || '-';
      const acct = c.DefaultAccountCode || '-';
      push(`| ${c.Name} | ${email} | ${tax} | ${acct} |`);
    }
  }
  push('');
  await sleep(1100);

  // 6. Repeating Invoices (subscriptions)
  push('## 6. Repeating Invoices');
  const repeating = await xeroGet('RepeatingInvoices');
  if (repeating?.RepeatingInvoices) {
    push(`Total: ${repeating.RepeatingInvoices.length}`);
    for (const ri of repeating.RepeatingInvoices) {
      const contact = ri.Contact?.Name || '?';
      const total = ri.Total || 0;
      const schedule = ri.Schedule;
      const freq = schedule ? `every ${schedule.Period} ${schedule.Unit}(s)` : '?';
      push(`- **${contact}** $${total} — ${freq} (${ri.Status})`);
    }
  }
  push('');
  await sleep(1100);

  // 7. Bank Accounts
  push('## 7. Bank Accounts');
  const banks = await xeroGet('Accounts?where=Type=="BANK"');
  if (banks?.Accounts) {
    for (const b of banks.Accounts) {
      push(`- **${b.Name}** (${b.Code}): ${b.BankAccountNumber || 'N/A'} — ${b.CurrencyCode} — ${b.Status}`);
    }
  }
  push('');
  await sleep(1100);

  // 8. Budgets
  push('## 8. Budgets');
  const budgets = await xeroGet('Budgets');
  if (budgets?.Budgets) {
    push(`Total: ${budgets.Budgets.length}`);
    for (const b of budgets.Budgets) {
      push(`- **${b.Description || b.BudgetName}** (${b.Type}) — ${b.Status}`);
    }
  }
  push('');
  await sleep(1100);

  // 9. Manual Journals (R&D related)
  push('## 9. Manual Journals (last 20)');
  const journals = await xeroGet('ManualJournals?order=Date DESC&page=1');
  if (journals?.ManualJournals) {
    push(`Total in response: ${journals.ManualJournals.length}`);
    for (const j of journals.ManualJournals.slice(0, 20)) {
      push(`- ${j.Date?.slice(0, 10)} — ${j.Narration?.slice(0, 80)} (${j.Status})`);
    }
  }
  push('');

  // 10. Payment Services
  push('## 10. BrandingThemes');
  const themes = await xeroGet('BrandingThemes');
  if (themes?.BrandingThemes) {
    for (const t of themes.BrandingThemes) {
      push(`- **${t.Name}** — ${t.BrandingThemeID}`);
    }
  }
  push('');

  // Save report
  const outPath = 'thoughts/shared/reports/xero-full-audit-' + new Date().toISOString().slice(0, 10) + '.md';
  writeFileSync(outPath, report.join('\n'));
  console.log(`\nSaved to ${outPath}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
