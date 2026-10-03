import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchXeroPages, syncFailed, verifyOrganisation, receiptMatchesTransaction } from '../../../scripts/lib/finance/xero-read-safety.mjs';
import { inspectXero } from '../../../scripts/inspect-xero-readonly.mjs';

test('failed second page rejects rather than returning partial success', async () => {
  let calls = 0;
  await assert.rejects(fetchXeroPages(async () => ++calls === 1 ? { Invoices: Array.from({ length: 100 }, (_, i) => ({ InvoiceID: String(i) })) } : null, 'Invoices', 'Invoices', { idField: 'InvoiceID' }), /page 2/);
});
test('empty collection succeeds but missing collection fails', async () => {
  assert.deepEqual(await fetchXeroPages(async () => ({ Invoices: [] }), 'Invoices', 'Invoices'), []);
  await assert.rejects(fetchXeroPages(async () => ({}), 'Invoices', 'Invoices'), /missing collection/);
});
test('100 rows requires a following page; immutable IDs and duplicate pages are checked', async () => {
  let calls = 0;
  const rows = Array.from({ length: 100 }, (_, i) => ({ InvoiceID: String(i) }));
  assert.equal((await fetchXeroPages(async url => { assert.match(url, /pageSize=100/); return { Invoices: ++calls === 1 ? rows : [] }; }, 'Invoices', 'Invoices', { idField: 'InvoiceID' })).length, 100);
  assert.equal(calls, 2);
  await assert.rejects(fetchXeroPages(async () => ({ Invoices: rows }), 'Invoices', 'Invoices', { idField: 'InvoiceID' }), /duplicate/);
  await assert.rejects(fetchXeroPages(async () => ({ Invoices: [{}] }), 'Invoices', 'Invoices', { idField: 'InvoiceID' }), /immutable ID/);
  await assert.rejects(fetchXeroPages(async () => ({ Invoices: rows }), 'Invoices', 'Invoices', { maxPages: 1 }), /incomplete/);
});
test('numeric errors and missing migration fail even without error details', () => {
  assert.equal(syncFailed({ invoices: { errors: 1 } }), true);
  assert.equal(syncFailed({ invoices: { needsMigration: true } }), true);
  assert.equal(syncFailed({ invoices: { errors: 0 }, transactions: { errors: 0 } }), false);
});
test('requires explicit exact legal organisation, never first-tenant default', () => {
  assert.throws(() => verifyOrganisation([{ LegalName: 'Nicholas Marchesi' }], 'A Curious Tractor Pty Ltd'), /does not match/);
  assert.throws(() => verifyOrganisation([{ Name: 'ACT' }]), /Explicit/);
  assert.throws(() => verifyOrganisation([{ Name: 'ACT' }, { Name: 'Other' }], 'ACT'), /exactly one/);
});
test('receipt foreign key and external bank ID are distinct namespaces', () => {
  const tx = { id: 'internal-uuid', xero_transaction_id: 'external-uuid' };
  assert.equal(receiptMatchesTransaction({ xero_transaction_id: 'internal-uuid' }, tx), true);
  assert.equal(receiptMatchesTransaction({ xero_bank_transaction_id: 'external-uuid' }, tx), true);
  assert.equal(receiptMatchesTransaction({ xero_transaction_id: 'external-uuid' }, tx), false);
});
test('read inspector fails on 401 with one GET and no refresh', async () => {
  const calls = [];
  await assert.rejects(inspectXero({ token: 'mock', tenantId: 'explicit', legalName: 'ACT', fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: false, status: 401 }; } }), /HTTP 401/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers['xero-tenant-id'], 'explicit');
});
test('wrong legal tenant stops before reading transactions', async () => {
  let calls = 0;
  await assert.rejects(inspectXero({ token: 'mock', tenantId: 'explicit', legalName: 'ACT', fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ Organisations: [{ LegalName: 'Other' }] }) }; } }), /does not match/);
  assert.equal(calls, 1);
});

// Exercise the legacy runner's real functions with an in-memory database and transport.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function runnerHarness(request) {
  const source = readFileSync(new URL('../../../scripts/sync-xero-to-supabase.mjs', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('function loadStoredTokens('), source.indexOf('main().catch'));
  const logs = [];
  const stateWrites = [];
  const sandbox = { console: { log() {}, error() {}, warn() {} }, process: { env: {}, stdout: { write() {} } },
    stats: { invoices: { synced: 0, errors: 0 }, transactions: { synced: 0, errors: 0 }, startTime: Date.now() },
    supabase: { from: () => ({ insert: async record => { logs.push(record); return {}; }, upsert: async () => ({ error: { message: 'mock persistence failure' } }), select: () => ({ eq: () => ({ single: async () => ({ error: { code: 'PGRST301' } }) }) }) }) },
    fetchXeroPages, syncFailed, verifyOrganisation, Date, setTimeout, URLSearchParams,
    existsSync: () => false, writeFileSync: (...args) => stateWrites.push(args),
    PROJECT_CODES: {}, XERO_TENANT_ID: 'mock-tenant' };
  const api = vm.runInNewContext(body + '\nxeroRequest = injectedRequest; ({syncInvoices,syncTransactions,logSync,writeSyncState,saveTokenToSupabase,loadTokenFromSupabase});', { ...sandbox, injectedRequest: request });
  return { api, logs, stateWrites };
}
test('real invoice and transaction sync reject malformed transport pages', async () => {
  const { api } = runnerHarness(async () => null);
  await assert.rejects(api.syncInvoices({ days: 1 }), /failed fetch/);
  await assert.rejects(api.syncTransactions({ days: 1 }), /failed fetch/);
});
test('real sync log marks numeric errors failed and valid empty sync completed', async () => {
  const { api, logs } = runnerHarness(async () => ({ Invoices: [], BankTransactions: [] }));
  await api.logSync('invoices', { invoices: { synced: 3, errors: 1 } });
  assert.equal(logs[0].status, 'failed');
  assert.equal(logs[0].errors.length, 1);
  const result = await api.syncInvoices({ days: 1 });
  await api.logSync('invoices', { invoices: result });
  assert.equal(logs[1].status, 'completed');
});
test('read inspector preserves currency, IDs and attachment metadata through GETs', async () => {
  const calls = [];
  const responses = [
    { Organisations: [{ LegalName: 'ACT', OrganisationID: 'org' }] },
    { Invoices: [{ InvoiceID: 'invoice-id', CurrencyCode: 'NZD', Total: 147, HasAttachments: true }] },
    { Attachments: [{ AttachmentID: 'attachment-id', FileName: 'receipt.pdf' }] },
    { BankTransactions: [{ BankTransactionID: 'bank-id', CurrencyCode: 'AUD', Reference: '329473110', Total: 274 }] },
    { Accounts: [{ Code: '555', AccountID: 'account-id', Name: 'Harvest pizza supplies' }] },
  ];
  const result = await inspectXero({ token: 'mock', tenantId: 'tenant', legalName: 'ACT', fetchImpl: async (url, options) => {
    calls.push({ url, method: options.method }); return { ok: true, json: async () => responses.shift() };
  } });
  assert.equal(result.status, 'completed');
  assert.equal(result.collections[0].records[0].CurrencyCode, 'NZD');
  assert.equal(result.collections[0].records[0].attachments[0].AttachmentID, 'attachment-id');
  assert.equal(result.collections[1].records[0].xeroId, 'bank-id');
  assert.equal(result.harvestAccount[0].Code, '555');
  assert.ok(calls.every(c => c.method === 'GET'));
  assert.ok(calls.some(c => c.url.includes('Invoices/invoice-id/Attachments')));
});

test('real token persistence failure fails closed instead of silently succeeding', async () => {
  const { api } = runnerHarness(async () => null);
  await assert.rejects(api.saveTokenToSupabase('mock-refresh', 'mock-access', 1800), /could not be saved/);
});

test('shared token read failure rejects before credential fallback or refresh', async () => {
  const { api } = runnerHarness(async () => null);
  await assert.rejects(api.loadTokenFromSupabase(), /refresh not attempted/);
});
