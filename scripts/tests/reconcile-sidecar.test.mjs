// Fixture tests for reconcile-sidecar pure functions. No env, no network.
// Run: node --test scripts/tests/reconcile-sidecar.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scopeWindow, accountsFor, findTwins, classifyLine, suggestCoding,
  evidenceForTxn, gmailLink, summarize, buildHtml, BANNER, DRIFT_CAVEAT, KEEPER_REMINDER,
} from '../lib/reconcile-sidecar-lib.mjs';

// --- scope windows (FY26) ---
test('scope windows match FY26 quarters', () => {
  assert.deepEqual(scopeWindow('q2'), { start: '2025-10-01', end: '2025-12-31' });
  assert.deepEqual(scopeWindow('q3'), { start: '2026-01-01', end: '2026-03-31' });
  assert.deepEqual(scopeWindow('q2q3'), { start: '2025-10-01', end: '2026-03-31' });
  assert.deepEqual(scopeWindow('q4'), { start: '2026-04-01', end: '2026-06-30' });
  assert.deepEqual(scopeWindow('fy26'), { start: '2025-07-01', end: '2026-06-30' });
  assert.deepEqual(scopeWindow('Q2Q3'), { start: '2025-10-01', end: '2026-03-31' });
  assert.throws(() => scopeWindow('q9'));
});

test('two-account rule: account filter is exact', () => {
  assert.deepEqual(accountsFor('visa'), ['NAB Visa ACT #8815']);
  assert.deepEqual(accountsFor('everyday'), ['NJ Marchesi T/as ACT Everyday']);
  assert.deepEqual(accountsFor('both'), ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']);
  assert.throws(() => accountsFor('savings'));
});

// --- bill-twin EXISTS pattern: amount within 0.02, date within +/-14d ---
const line = { id: 't1', date: '2025-11-10', contact_name: 'Telstra', total: 120.00, bank_account: 'NAB Visa ACT #8815' };

test('findTwins: amount within 0.02 and date within 14d', () => {
  const bills = [
    { xero_id: 'b1', date: '2025-11-12', total: 120.01, status: 'PAID', invoice_number: 'INV-1' },   // in
    { xero_id: 'b2', date: '2025-11-10', total: 120.03, status: 'PAID', invoice_number: 'INV-2' },   // amount out
    { xero_id: 'b3', date: '2025-11-25', total: 120.00, status: 'PAID', invoice_number: 'INV-3' },   // 15d out... 25-10=15 -> out
    { xero_id: 'b4', date: '2025-11-24', total: -120.00, status: 'AUTHORISED', invoice_number: 'INV-4' }, // 14d, abs amount -> in
  ];
  const twins = findTwins(line, bills).map(b => b.xero_id);
  assert.deepEqual(twins, ['b1', 'b4']);
});

// --- classifier: exactly one bucket ---
test('PAID twin + unreconciled spend-money -> LIKELY-PHANTOM-DUP with keeper reminder shape', () => {
  const twins = [{ xero_id: 'b1', date: '2025-11-12', total: 120, status: 'PAID', invoice_number: 'INV-1', contact_name: 'Telstra' }];
  const c = classifyLine(line, twins, []);
  assert.equal(c.bucket, 'LIKELY-PHANTOM-DUP');
  assert.match(c.action, /verify keeper receipt BEFORE delete/i);
  assert.match(c.action, /INV-1/);
});

test('AUTHORISED twin (no PAID) -> MATCH-BILL naming the bill', () => {
  const twins = [{ xero_id: 'b4', date: '2025-11-12', total: 120, status: 'AUTHORISED', invoice_number: 'INV-4', contact_name: 'Telstra' }];
  const c = classifyLine(line, twins, []);
  assert.equal(c.bucket, 'MATCH-BILL');
  assert.match(c.action, /Match in Xero UI to bill INV-4/);
});

test('PAID twin outranks AUTHORISED twin -> phantom, not match', () => {
  const twins = [
    { xero_id: 'a', status: 'AUTHORISED', invoice_number: 'INV-A', total: 120, date: '2025-11-11' },
    { xero_id: 'p', status: 'PAID', invoice_number: 'INV-P', total: 120, date: '2025-11-11' },
  ];
  assert.equal(classifyLine(line, twins, []).bucket, 'LIKELY-PHANTOM-DUP');
});

test('no twin + evidence -> CREATE-IN-UI with precomputed coding', () => {
  const c = classifyLine(line, [], [{ kind: 'receipt_email', label: 'x', url: 'y' }]);
  assert.equal(c.bucket, 'CREATE-IN-UI');
  assert.match(c.action, /^Create in UI/);
  assert.ok(c.coding);
});

test('no twin + no evidence -> NEEDS-RECEIPT with one-line ask', () => {
  const c = classifyLine(line, [], []);
  assert.equal(c.bucket, 'NEEDS-RECEIPT');
  assert.equal(c.action, 'forward receipt for Telstra 2025-11-10 $120.00');
});

test('SPEND-TRANSFER never receipt-chased, never phantom even with a twin', () => {
  const xfer = { ...line, type: 'SPEND-TRANSFER', contact_name: 'NAB Visa ACT' };
  const paidTwin = [{ xero_id: 'b1', status: 'PAID', invoice_number: 'INV-1', total: 120, date: '2025-11-11' }];
  const c = classifyLine(xfer, paidTwin, []);
  assert.equal(c.bucket, 'CREATE-IN-UI');
  assert.match(c.action, /Transfer between own accounts/);
  assert.match(c.action, /no receipt needed/);
});

// --- coding lints ---
test('groceries-like vendor never 493 Travel', () => {
  const c = suggestCoding('Woolworths Maleny', '493');
  assert.notEqual(c.account, '493');
  assert.ok(c.flags.some(f => /never 493 Travel/.test(f)));
});

test('overseas vendor -> GST-Free; personal-looking -> 880 Drawings flag', () => {
  assert.match(suggestCoding('Anthropic PBC').gst, /GST-Free/);
  assert.ok(suggestCoding('Netflix.com').flags.some(f => /880 Drawings/.test(f)));
  const plain = suggestCoding('Bunnings Warehouse', '461');
  assert.equal(plain.account, '461');
  assert.equal(plain.gst, null);
  assert.deepEqual(plain.flags, []);
});

// --- evidence join ---
test('evidence join: gmail link includes message id + mailbox; xero attachment labelled', () => {
  const txn = { has_attachments: true };
  const ev = evidenceForTxn(txn, {
    emails: [{ gmail_message_id: 'abc123', mailbox: 'accounts', vendor_name: 'Telstra' }],
    docs: [{ source: 'dext_receipt', vendor_name: 'Telstra', attachment_filename: 'r.pdf', attachment_url: 'https://x/r.pdf' }],
  });
  assert.equal(ev.length, 3);
  assert.ok(ev.some(e => e.label === 'attached in Xero'));
  const email = ev.find(e => e.kind === 'receipt_email');
  assert.equal(email.url, 'https://mail.google.com/mail/u/0/#all/abc123');
  assert.match(email.label, /accounts/);
  const doc = ev.find(e => e.kind === 'finance_doc');
  assert.equal(doc.url, 'https://x/r.pdf');
});

test('no evidence -> empty list (renders NONE downstream)', () => {
  assert.deepEqual(evidenceForTxn({ has_attachments: false }, {}), []);
  assert.equal(gmailLink(null), null);
});

// --- money summary (pin totals so a truncation-class bug shows) ---
test('summarize: per account x bucket count + $', () => {
  const rows = [
    { bank_account: 'NAB Visa ACT #8815', bucket: 'MATCH-BILL', total: -100.5 },
    { bank_account: 'NAB Visa ACT #8815', bucket: 'MATCH-BILL', total: 49.5 },
    { bank_account: 'NJ Marchesi T/as ACT Everyday', bucket: 'NEEDS-RECEIPT', total: 10 },
  ];
  const s = summarize(rows);
  assert.deepEqual(s, [
    { account: 'NAB Visa ACT #8815', bucket: 'MATCH-BILL', count: 2, total: 150 },
    { account: 'NJ Marchesi T/as ACT Everyday', bucket: 'NEEDS-RECEIPT', count: 1, total: 10 },
  ]);
});

// --- HTML builder ---
test('HTML includes sticky banner, drift caveat, keeper reminder, sections + totals', () => {
  const rows = [{
    id: 't1', date: '2025-11-10', contact_name: 'Telstra', total: 120, bank_account: 'NAB Visa ACT #8815',
    bucket: 'LIKELY-PHANTOM-DUP', action: 'Deletion candidate', evidence: [],
    twin: { xero_id: 'b1', invoice_number: 'INV-1', status: 'PAID' },
  }];
  const html = buildHtml({
    scope: 'q2q3', accounts: ['NAB Visa ACT #8815'], generatedAt: '2026-06-11',
    buckets: { 'LIKELY-PHANTOM-DUP': rows, 'MATCH-BILL': [], 'CREATE-IN-UI': [], 'NEEDS-RECEIPT': [] },
  });
  assert.ok(html.includes(BANNER.replace(/&/g, '&amp;').replace(/</g, '&lt;')) || html.includes('Never bulk-accept green Match suggestions'));
  assert.match(html, /is_reconciled DRIFTS vs Xero/);
  assert.match(html, /Verify the keeper bill holds the receipt BEFORE any delete/);
  assert.match(html, /LIKELY-PHANTOM-DUP — 1 lines/);
  assert.match(html, /INV-1/);
  assert.match(html, /\$120\.00/);
  // mirror-stale section only when verify ran
  assert.ok(!html.includes('MIRROR-STALE'));
  const verified = buildHtml({
    scope: 'q2q3', accounts: ['NAB Visa ACT #8815'], generatedAt: '2026-06-11',
    buckets: { 'MIRROR-STALE': rows }, verify: '1 verified',
  });
  assert.match(verified, /MIRROR-STALE/);
});
