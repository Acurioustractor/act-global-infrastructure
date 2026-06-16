// Branch-table tests for the whole-picture money-display gating. No env, no network.
// Run: node --test scripts/tests/whole-picture-money-display.test.mjs
//
// The class of bug this pins: a sensitive figure SHOWING when it must stay withheld, or staying
// withheld after the gate flips. The whole-picture surface is built on "never present a stale figure
// as current" — and the subtle trap is that a sidecar's `gated`/`bankable` flag is FROZEN at build
// time, so a stalled cron leaves the flag stuck true while the data rots. These tests prove the
// front-gate (present + fresh) overrides the frozen flag, and that the moment a FRESH sidecar reports
// gated:true the number un-withholds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashDisplay, rdDisplay, SIDE_FRESH_H } from '../lib/whole-picture-money-display-lib.mjs';

const NOW = Date.parse('2026-06-16T00:00:00Z');
const built = (hAgo) => new Date(NOW - hAgo * 3.6e6).toISOString();

// ---- a FRESH, GATED-ON cash sidecar (the un-withheld state) ----
const CASH_LIVE = {
  generated_at: built(2),
  cash: 121691.47,
  asOf: '2026-06-15T20:06:19Z',
  gated: true,
  withhold_reason: null,
  card_caveat: '#8815 (NAB Visa) carries unreconciled statement lines - mirror balance provisional.',
};

test('cash: absent sidecar => withheld, "no pipeline" reason', () => {
  const d = cashDisplay(null, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.match(d.reason, /no pipeline yet/);
  assert.equal(d.value, null);
});

test('cash: fresh + gated => SHOWS the figure with as-of + card caveat', () => {
  const d = cashDisplay(CASH_LIVE, { nowMs: NOW });
  assert.equal(d.show, true);
  assert.equal(d.value, '$121,691'); // money0 rounds for display; exact cents live in the sidecar
  assert.equal(d.asOf, '2026-06-15T20:06:19Z');
  assert.match(d.reason, /#8815/); // standing caveat travels with the shown number
});

test('cash: gated:false => withheld, surfaces the sidecar withhold_reason verbatim (label upgrades)', () => {
  const pendingN3 = { ...CASH_LIVE, gated: false, withhold_reason: 'pending N3 - founders have not declared the canonical money truth' };
  const d = cashDisplay(pendingN3, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.equal(d.reason, 'pending N3 - founders have not declared the canonical money truth');
});

test('cash: STALE sidecar overrides a frozen gated:true (pipeline-stalled guard)', () => {
  // The cron stopped 40h ago; gated is still true from that run. Must NOT show.
  const stale = { ...CASH_LIVE, generated_at: built(SIDE_FRESH_H + 4) };
  const d = cashDisplay(stale, { nowMs: NOW });
  assert.equal(d.show, false, 'a frozen gated:true must not survive a stale sidecar');
  assert.match(d.reason, /pipeline stalled/);
});

test('cash: undated sidecar => withheld (cannot prove freshness)', () => {
  const d = cashDisplay({ ...CASH_LIVE, generated_at: 'not-a-date' }, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.match(d.reason, /pipeline stalled/);
});

// ---- R&D basis sidecar ----
const RD_AT_RISK = {
  generated_at: built(2),
  gross_flagged: 325947.23,
  founder_drawings: 238653.88,
  founder_pct: 73.2,
  defensible_basis_ceiling: 87293.35,
  offset_435_on_ceiling: 37972.61,
  bankable: false,
};

test('rd: not bankable => withheld, but the reason carries the honest at-risk read', () => {
  const d = rdDisplay(RD_AT_RISK, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.match(d.reason, /at risk/);
  assert.match(d.reason, /\$325,947/);          // gross flagged
  assert.match(d.reason, /73% founder drawings/); // stripped share
  assert.match(d.reason, /collapse-to-~\$55K/);   // documented downside
});

test('rd: records cured => SHOWS the defensible ceiling + the 43.5% offset', () => {
  const cured = { ...RD_AT_RISK, bankable: true };
  const d = rdDisplay(cured, { nowMs: NOW });
  assert.equal(d.show, true);
  assert.equal(d.value, '$87,293');
  assert.match(d.reason, /43.5% offset ~\$37,973/);
});

test('rd: stale sidecar overrides a frozen bankable:true', () => {
  const staleCured = { ...RD_AT_RISK, bankable: true, generated_at: built(SIDE_FRESH_H + 1) };
  const d = rdDisplay(staleCured, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.match(d.reason, /pipeline stalled/);
});

test('rd: absent => withheld, "no pipeline" reason', () => {
  const d = rdDisplay(null, { nowMs: NOW });
  assert.equal(d.show, false);
  assert.match(d.reason, /no pipeline yet/);
});
