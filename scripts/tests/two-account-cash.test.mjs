// Fixture tests for the two-account cash pipeline pure functions. No env, no network.
// Run: node --test scripts/tests/two-account-cash.test.mjs
//
// The class of bug this pins (CLAUDE.md money-math rule): wrong account scoping.
// ACT cash on hand is ONLY NAB Visa ACT #8815 + NJ Marchesi T/as ACT Everyday.
// If NM Personal (-$388,937) or the Maximiser savings ever leak in, cash is wildly wrong
// (the snapshot .cash bug renders -$152K/-$375K). A manual glance won't catch it; this test does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTwoAccountCash } from '../lib/two-account-cash-lib.mjs';

const round2 = (n) => Number(Number(n).toFixed(2));

// --- Fixture A: the live mirror as queried 2026-06-15 (ground truth) ---
const LIVE_0615 = [
  { name: 'NAB Visa ACT #8815', status: 'ACTIVE', current_balance: 64869.99, balance_updated_at: '2026-06-15T20:06:19Z' },
  { name: 'NJ Marchesi T/as ACT Everyday', status: 'ACTIVE', current_balance: 56821.48, balance_updated_at: '2026-06-15T20:06:19Z' },
  { name: 'NJ Marchesi T/as ACT Maximiser', status: 'ACTIVE', current_balance: null, balance_updated_at: '2026-06-15T20:06:19Z' },
  { name: 'NM Personal ', status: 'ACTIVE', current_balance: -388937.60, balance_updated_at: '2026-06-15T20:06:19Z' }, // trailing space on purpose
  { name: 'Heritage Visa CC ', status: 'ARCHIVED', current_balance: null, balance_updated_at: '2026-06-15T20:06:19Z' },
];
// 7.5h after the 06-15 20:06Z sync
const NOW_FRESH = Date.parse('2026-06-16T03:36:19Z');

test('two-account cash = #8815 + Everyday ONLY (current mirror = $121,691.47)', () => {
  const r = computeTwoAccountCash(LIVE_0615, { nowMs: NOW_FRESH });
  assert.equal(round2(r.cash), 121691.47);
  assert.deepEqual(r.included.map((a) => a.name).sort(), ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']);
  assert.equal(r.complete, true);
});

test('NM Personal (-$388,937) NEVER leaks into cash (the bug this guards)', () => {
  const r = computeTwoAccountCash(LIVE_0615, { nowMs: NOW_FRESH });
  assert.ok(r.cash > 0, 'cash must be positive, not dragged negative by NM Personal');
  const excludedNames = r.excluded.map((a) => a.name.trim());
  assert.ok(excludedNames.includes('NM Personal'), 'NM Personal must be excluded');
  assert.ok(excludedNames.includes('NJ Marchesi T/as ACT Maximiser'), 'Maximiser savings excluded');
  assert.ok(excludedNames.includes('Heritage Visa CC'), 'archived account excluded');
  assert.ok(!r.included.some((a) => a.name.trim() === 'NM Personal'));
});

// --- Fixture B: the founders-OS plan canonical figure (2026-06-10), regression anchor ---
// $223,761.05 = Everyday +$288,981.73 + #8815 -$65,220.68 (proves negative-CC netting).
const MIRROR_0610 = [
  { name: 'NJ Marchesi T/as ACT Everyday', status: 'ACTIVE', current_balance: 288981.73, balance_updated_at: '2026-06-05T00:00:00Z' },
  { name: 'NAB Visa ACT #8815', status: 'ACTIVE', current_balance: -65220.68, balance_updated_at: '2026-06-05T00:00:00Z' },
  { name: 'NM Personal ', status: 'ACTIVE', current_balance: -375991.57, balance_updated_at: '2026-06-05T00:00:00Z' },
];

test('regression: 2026-06-10 founders-OS canonical cash = $223,761.05 (negative CC nets down)', () => {
  const r = computeTwoAccountCash(MIRROR_0610, { nowMs: Date.parse('2026-06-10T00:00:00Z'), staleHours: 24 * 30 });
  assert.equal(round2(r.cash), 223761.05);
});

// --- Freshness gate: never present a stale number as current ---
test('freshness gate: fresh under threshold, stale over it', () => {
  const fresh = computeTwoAccountCash(LIVE_0615, { nowMs: NOW_FRESH, staleHours: 26 });
  assert.equal(fresh.stale, false);
  const stale = computeTwoAccountCash(LIVE_0615, { nowMs: NOW_FRESH + 30 * 3.6e6, staleHours: 26 });
  assert.equal(stale.stale, true);
  // displayable requires fresh AND complete (the N3 canon gate is applied by the consumer, not here)
  assert.equal(fresh.displayable, true);
  assert.equal(stale.displayable, false);
});

// --- Completeness: a missing or null operating balance must not ship as a whole number ---
test('completeness: missing #8815 => incomplete, not a partial cash figure', () => {
  const onlyEveryday = LIVE_0615.filter((a) => a.name !== 'NAB Visa ACT #8815');
  const r = computeTwoAccountCash(onlyEveryday, { nowMs: NOW_FRESH });
  assert.equal(r.complete, false);
  assert.equal(r.displayable, false);
});

test('completeness: a null operating balance => incomplete', () => {
  const nullVisa = LIVE_0615.map((a) =>
    a.name === 'NAB Visa ACT #8815' ? { ...a, current_balance: null } : a);
  const r = computeTwoAccountCash(nullVisa, { nowMs: NOW_FRESH });
  assert.equal(r.complete, false);
});

// --- The #8815 provisional caveat is always carried (unreconciled lines) ---
test('card caveat present: #8815 balance is mirror-provisional', () => {
  const r = computeTwoAccountCash(LIVE_0615, { nowMs: NOW_FRESH });
  assert.match(r.cardCaveat, /#8815/);
});
