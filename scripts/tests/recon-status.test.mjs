// Fixture tests for recon-status pure helpers. No env, no network.
// Run: node --test scripts/tests/recon-status.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACT_ACCOUNTS, FY26_QUARTERS, CAVEAT_RECONCILED, CAVEAT_ATTACHMENTS,
  quarterFor, quarterCaseSql, fmtMoney, classifyFreshness,
  pivotReconcileState, mdTable, buildMarkdown,
} from '../lib/recon-status-lib.mjs';

test('FY26 quarter windows are exactly the locked dates', () => {
  assert.deepEqual(FY26_QUARTERS.map((q) => [q.key, q.start, q.end]), [
    ['Q1', '2025-07-01', '2025-09-30'],
    ['Q2', '2025-10-01', '2025-12-31'],
    ['Q3', '2026-01-01', '2026-03-31'],
    ['Q4', '2026-04-01', '2026-06-30'],
  ]);
});

test('quarterFor maps boundary dates correctly', () => {
  assert.equal(quarterFor('2025-07-01').key, 'Q1');
  assert.equal(quarterFor('2025-09-30').key, 'Q1');
  assert.equal(quarterFor('2025-10-01').key, 'Q2');
  assert.equal(quarterFor('2025-12-31').key, 'Q2');
  assert.equal(quarterFor('2026-01-01').key, 'Q3');
  assert.equal(quarterFor('2026-03-31').key, 'Q3');
  assert.equal(quarterFor('2026-04-01').key, 'Q4');
  assert.equal(quarterFor('2026-06-30').key, 'Q4');
  assert.equal(quarterFor('2025-06-30'), null); // FY25
  assert.equal(quarterFor('2026-07-01'), null); // FY27
  assert.equal(quarterFor(null), null);
  assert.equal(quarterFor('2026-01-15T03:00:00Z').key, 'Q3'); // timestamps truncate to date
});

test('quarterCaseSql embeds the column and every boundary date', () => {
  const sql = quarterCaseSql('t.date');
  assert.ok(sql.startsWith('CASE '));
  assert.ok(sql.includes('t.date BETWEEN'));
  for (const q of FY26_QUARTERS) {
    assert.ok(sql.includes(`'${q.start}'`), `missing ${q.start}`);
    assert.ok(sql.includes(`'${q.end}'`), `missing ${q.end}`);
    assert.ok(sql.includes(`THEN '${q.key}'`), `missing ${q.key}`);
  }
});

test('fmtMoney whole-dollar formatting', () => {
  assert.equal(fmtMoney(1234.56), '$1,235');
  assert.equal(fmtMoney(0), '$0');
  assert.equal(fmtMoney(-50), '-$50');
  assert.equal(fmtMoney(2500000), '$2,500,000');
  assert.equal(fmtMoney(null), '—');
  assert.equal(fmtMoney(undefined), '—');
  assert.equal(fmtMoney('1000'), '$1,000'); // numeric strings from exec_sql
});

test('classifyFreshness: fresh under 26h, STALE over, unknown when missing', () => {
  const now = '2026-06-11T10:00:00Z';
  assert.deepEqual(classifyFreshness('2026-06-11T08:00:00Z', now), { state: 'fresh', hoursSince: 2, loud: false });
  const fresh = classifyFreshness('2026-06-10T08:30:00Z', now); // 25.5h
  assert.equal(fresh.state, 'fresh');
  const stale = classifyFreshness('2026-06-10T07:00:00Z', now); // 27h
  assert.equal(stale.state, 'STALE');
  assert.equal(stale.loud, true);
  assert.equal(stale.hoursSince, 27);
  const unknown = classifyFreshness(null, now);
  assert.equal(unknown.state, 'unknown');
  assert.equal(unknown.loud, true);
});

test('pivotReconcileState splits reconciled vs unreconciled per account x quarter', () => {
  const rows = [
    { bank_account: 'NAB Visa ACT #8815', quarter: 'Q3', is_reconciled: false, n: 10, total: 1000 },
    { bank_account: 'NAB Visa ACT #8815', quarter: 'Q3', is_reconciled: true, n: 90, total: 9000.5 },
    { bank_account: 'NJ Marchesi T/as ACT Everyday', quarter: 'Q4', is_reconciled: true, n: 5, total: '250' },
    { bank_account: 'NAB Visa ACT #8815', quarter: null, is_reconciled: false, n: 99, total: 99999 }, // outside FY26: dropped
  ];
  const out = pivotReconcileState(rows);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    bank_account: 'NAB Visa ACT #8815', quarter: 'Q3',
    unreconciled_n: 10, unreconciled_total: 1000, reconciled_n: 90, reconciled_total: 9000.5,
  });
  assert.deepEqual(out[1], {
    bank_account: 'NJ Marchesi T/as ACT Everyday', quarter: 'Q4',
    unreconciled_n: 0, unreconciled_total: 0, reconciled_n: 5, reconciled_total: 250,
  });
});

test('mdTable renders header, separator, rows; empty -> _no rows_', () => {
  const md = mdTable([{ a: 1, b: 'x' }, { a: 2, b: null }]);
  const lines = md.split('\n');
  assert.equal(lines[0], '| a | b |');
  assert.equal(lines[1], '|---|---|');
  assert.equal(lines[2], '| 1 | x |');
  assert.equal(lines[3], '| 2 | — |');
  assert.equal(mdTable([]), '_no rows_');
});

const cannedReport = {
  generatedAt: '2026-06-11T10:00:00.000Z',
  accounts: ACT_ACCOUNTS,
  sections: {
    reconcileState: { rows: [{ bank_account: 'NAB Visa ACT #8815', quarter: 'Q3', unreconciled_n: 10, unreconciled_total: '$1,000', reconciled_n: 90, reconciled_total: '$9,001' }] },
    untagged: { rows: [{ quarter: 'Q3', n: 4, total: '$321' }] },
    receipts: {
      spend: { rows: [{ quarter: 'Q3', has_attachments: true, n: 50, total: '$5,000' }] },
      emailsByStatus: { rows: [{ status: 'uploaded', n: 12 }] },
      docCounts: { finance_receipt_documents: 100, finance_receipt_bank_line_links: 'unavailable: table absent' },
    },
    duplicateRadar: { rows: [{ quarter: 'Q3', dup_groups: 2, txns_covered: 5 }] },
    matchTargets: { rows: [{ n: 7, total: '$7,777', with_receipt: 3 }] },
    freshness: {
      rows: [
        { bank_account: 'NAB Visa ACT #8815', max_date: '2026-06-10', max_updated: '2026-06-11T08:00:00Z', rows_24h: 3, rows_7d: 40, state: 'fresh', hours_since: 2 },
        { bank_account: 'NJ Marchesi T/as ACT Everyday', max_date: '2026-06-01', max_updated: '2026-06-08T08:00:00Z', rows_24h: 0, rows_7d: 1, state: 'STALE', hours_since: 74 },
      ],
    },
  },
};

test('buildMarkdown: structure, all 6 sections, both caveats, stale flag', () => {
  const md = buildMarkdown(cannedReport);
  assert.ok(md.includes('Generated: 2026-06-11T10:00:00.000Z'));
  assert.ok(md.includes('NAB Visa ACT #8815'));
  assert.ok(md.includes('NJ Marchesi T/as ACT Everyday'));
  assert.ok(md.includes('## 1. Reconcile state'));
  assert.ok(md.includes('## 2. Untagged genuine SPEND'));
  assert.ok(md.includes('## 3. Receipts'));
  assert.ok(md.includes('## 4. Duplicate radar'));
  assert.ok(md.includes('## 5. Match targets'));
  assert.ok(md.includes('## 6. Freshness'));
  assert.ok(md.includes(CAVEAT_RECONCILED), 'is_reconciled drift caveat missing');
  assert.ok(md.includes(CAVEAT_ATTACHMENTS), 'has_attachments drift caveat missing');
  assert.ok(md.includes('finance_receipt_documents: 100'));
  assert.ok(md.includes('finance_receipt_bank_line_links: unavailable: table absent'));
  assert.ok(md.includes('STALE: NJ Marchesi T/as ACT Everyday'));
  assert.ok(md.includes('74h old'));
});

test('buildMarkdown: unavailable sections render gracefully, never throw', () => {
  const md = buildMarkdown({
    generatedAt: '2026-06-11T10:00:00.000Z',
    accounts: ACT_ACCOUNTS,
    sections: {
      reconcileState: { unavailable: 'exec_sql failed: timeout' },
      untagged: null,
      receipts: {},
      duplicateRadar: { unavailable: 'missing column' },
      matchTargets: { rows: [] },
      freshness: { unavailable: 'no updated_at' },
    },
  });
  assert.ok(md.includes('unavailable: exec_sql failed: timeout'));
  assert.ok(md.includes('unavailable: no data'));
  assert.ok(md.includes('unavailable: missing column'));
  assert.ok(md.includes('unavailable: no updated_at'));
  assert.ok(md.includes('_no rows_'));
  assert.ok(md.includes(CAVEAT_RECONCILED)); // caveat present even when sections fail
});
