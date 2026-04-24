#!/usr/bin/env node
/**
 * Export current Xero tenant's chart of accounts + tracking categories + tax rates
 * + org details + contacts summary → config/xero-chart.json
 *
 * This becomes the source-of-truth for recreating the same setup in a new Xero
 * tenant (e.g. new Pty Ltd). Run once on the current tenant; use output to seed
 * the new one via Xero UI (chart import via CSV, tracking manually, etc.)
 *
 * Usage:
 *   node scripts/export-xero-chart.mjs
 *   node scripts/export-xero-chart.mjs --out custom-path.json
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
const TOKEN_FILE = '.xero-tokens.json';
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx !== -1 ? args[outIdx + 1] : join(process.cwd(), 'config', 'xero-chart.json');

function loadToken() {
  if (existsSync(TOKEN_FILE)) return JSON.parse(readFileSync(TOKEN_FILE, 'utf8')).access_token;
  return process.env.XERO_ACCESS_TOKEN;
}

async function xeroGet(path) {
  const token = loadToken();
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  console.log(`Exporting Xero chart from tenant ${XERO_TENANT_ID}\n`);

  const [accountsRes, trackingRes, taxRatesRes, orgRes] = await Promise.all([
    xeroGet('Accounts'),
    xeroGet('TrackingCategories?includeArchived=false'),
    xeroGet('TaxRates'),
    xeroGet('Organisation'),
  ]);

  const org = orgRes.Organisations?.[0] || {};

  // Accounts: simplify to essential fields for re-creation
  const accounts = (accountsRes.Accounts || []).map((a) => ({
    Code: a.Code,
    Name: a.Name,
    Type: a.Type,            // EXPENSE, REVENUE, BANK, etc.
    TaxType: a.TaxType,      // e.g. INPUT, OUTPUT
    Status: a.Status,         // ACTIVE, ARCHIVED
    Description: a.Description,
    Class: a.Class,           // ASSET, LIABILITY, etc.
    ReportingCode: a.ReportingCode,
    ReportingCodeName: a.ReportingCodeName,
    EnablePaymentsToAccount: a.EnablePaymentsToAccount,
    ShowInExpenseClaims: a.ShowInExpenseClaims,
    BankAccountType: a.BankAccountType,
    CurrencyCode: a.CurrencyCode,
    BankAccountNumber: a.BankAccountNumber ? '[REDACTED]' : null,  // don't export actual bank number
  }));

  // Tracking categories with options
  const tracking = (trackingRes.TrackingCategories || []).map((tc) => ({
    Name: tc.Name,
    Status: tc.Status,
    TrackingCategoryID: tc.TrackingCategoryID,
    Options: (tc.Options || []).map((o) => ({
      Name: o.Name,
      Status: o.Status,
      TrackingOptionID: o.TrackingOptionID,
    })),
  }));

  // Tax rates
  const taxRates = (taxRatesRes.TaxRates || []).map((t) => ({
    Name: t.Name,
    TaxType: t.TaxType,
    Status: t.Status,
    ReportTaxType: t.ReportTaxType,
    DisplayTaxRate: t.DisplayTaxRate,
    EffectiveRate: t.EffectiveRate,
    CanApplyToAssets: t.CanApplyToAssets,
    CanApplyToEquity: t.CanApplyToEquity,
    CanApplyToExpenses: t.CanApplyToExpenses,
    CanApplyToLiabilities: t.CanApplyToLiabilities,
    CanApplyToRevenue: t.CanApplyToRevenue,
  }));

  const output = {
    exported_at: new Date().toISOString(),
    source_tenant: {
      TenantID: XERO_TENANT_ID,
      OrganisationID: org.OrganisationID,
      Name: org.Name,
      LegalName: org.LegalName,
      BaseCurrency: org.BaseCurrency,
      CountryCode: org.CountryCode,
      OrganisationType: org.OrganisationType,
      FinancialYearEndDay: org.FinancialYearEndDay,
      FinancialYearEndMonth: org.FinancialYearEndMonth,
      TaxNumber: org.TaxNumber ? '[REDACTED]' : null,
    },
    summary: {
      accounts_total: accounts.length,
      accounts_active: accounts.filter((a) => a.Status === 'ACTIVE').length,
      tracking_categories: tracking.length,
      tracking_options_total: tracking.reduce((s, t) => s + t.Options.length, 0),
      tax_rates_active: taxRates.filter((t) => t.Status === 'ACTIVE').length,
    },
    accounts,
    tracking_categories: tracking,
    tax_rates: taxRates,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2));

  console.log(`✓ Exported to ${OUT}`);
  console.log(`  Accounts:             ${output.summary.accounts_total} (${output.summary.accounts_active} active)`);
  console.log(`  Tracking categories:  ${output.summary.tracking_categories} w/ ${output.summary.tracking_options_total} options`);
  console.log(`  Tax rates (active):   ${output.summary.tax_rates_active}`);
  console.log(`  Organisation:         ${output.source_tenant.Name}`);
  console.log('');
  console.log('Use this file to seed a new Xero tenant:');
  console.log('  1. Chart of accounts: Xero → Settings → Import → Chart of accounts (use Xero CSV template)');
  console.log('  2. Tracking categories: recreate manually (no bulk API endpoint)');
  console.log('  3. Tax rates: usually default AU rates cover it');
}

main().catch((e) => { console.error(e); process.exit(1); });
