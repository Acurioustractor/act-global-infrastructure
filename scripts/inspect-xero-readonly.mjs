#!/usr/bin/env node
/** Existing access token only: no OAuth refresh, Supabase, uploads or persistence. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fetchXeroPages, verifyOrganisation } from './lib/finance/xero-read-safety.mjs';

export async function inspectXero({ token, tenantId, legalName, since = '2026-10-01', fetchImpl = fetch }) {
  if (!token || !tenantId || !legalName) throw new Error('Existing token, explicit tenant and legal name required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !Number.isFinite(Date.parse(since))) throw new Error('Invalid since date');
  const checkedAt = new Date().toISOString();
  let calls = 0;
  async function request(endpoint) {
    // Only constructed Accounting endpoints may be read; never accept arbitrary URLs.
    if (!/^(Organisation|Invoices|BankTransactions|Accounts)(\?|\/|$)/.test(endpoint)) throw new Error('Unsupported read endpoint');
    if (calls >= 240) throw new Error('Read request budget exhausted; result incomplete');
    if (calls++) await new Promise(resolve => setTimeout(resolve, 1100));
    const response = await fetchImpl(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'xero-tenant-id': tenantId, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Xero read failed (HTTP ${response.status}); no token refresh attempted`);
    return response.json();
  }
  const organisation = verifyOrganisation((await request('Organisation')).Organisations, legalName);
  const [year, month, day] = since.split('-').map(Number);
  const where = encodeURIComponent(`Date>=DateTime(${year},${month},${day})`);
  const collections = [];
  for (const [endpoint, idField] of [['Invoices', 'InvoiceID'], ['BankTransactions', 'BankTransactionID']]) {
    const records = await fetchXeroPages(request, `${endpoint}?where=${where}&order=Date DESC`, endpoint, { idField, maxPages: 20 });
    const inspected = [];
    for (const record of records) {
      let attachments = [];
      if (record.HasAttachments) {
        const data = await request(`${endpoint}/${encodeURIComponent(record[idField])}/Attachments`);
        if (!Array.isArray(data.Attachments)) throw new Error('Missing attachment collection');
        attachments = data.Attachments.map(a => ({ AttachmentID: a.AttachmentID, FileName: a.FileName, MimeType: a.MimeType, ContentLength: a.ContentLength }));
      }
      inspected.push({ source: endpoint, xeroId: record[idField], Contact: record.Contact, Date: record.Date, UpdatedDateUTC: record.UpdatedDateUTC,
        Total: record.Total, TotalTax: record.TotalTax, CurrencyCode: record.CurrencyCode ?? null, Reference: record.Reference,
        Status: record.Status, HasAttachments: record.HasAttachments, BankAccount: record.BankAccount,
        LineItems: record.LineItems, attachments });
    }
    collections.push({ source: endpoint, records: inspected });
  }
  const accounts = await request('Accounts');
  if (!Array.isArray(accounts.Accounts)) throw new Error('Missing account collection');
  return { status: 'completed', checkedAt, completedAt: new Date().toISOString(), tenantId,
    organisation: { OrganisationID: organisation.OrganisationID, Name: organisation.Name, LegalName: organisation.LegalName, TaxNumber: organisation.TaxNumber },
    scope: { since, complete: true, description: 'Accounting API records; excludes unreconciled bank-feed statement queue' }, collections,
    harvestAccount: accounts.Accounts.filter(a => a.Code === '555').map(a => ({ AccountID: a.AccountID, Code: a.Code, Name: a.Name, Status: a.Status })) };
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => { const i = arg.indexOf('='); return [arg.slice(0, i), arg.slice(i + 1)]; }));
  const tokenFile = args['--token-file'] || '.xero-tokens.json';
  const tokens = JSON.parse(readFileSync(tokenFile, 'utf8'));
  if (!tokens.access_token || Number(tokens.expires_at) <= Date.now()) throw new Error('Existing local access token expired; approval needed before credential refresh/persistence');
  console.log(JSON.stringify(await inspectXero({ token: tokens.access_token, tenantId: args['--tenant'], legalName: args['--legal-name'], since: args['--since'] || '2026-10-01' }), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(JSON.stringify({ status: 'failed', checkedAt: new Date().toISOString(), error: error.message })); process.exitCode = 1; });
}
