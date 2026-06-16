// Fixture tests for the FY26 R&D-basis pure functions. No env, no network.
// Run: node --test scripts/tests/rd-basis.test.mjs
//
// The class of bug this pins: founder DRAWINGS counted as R&D. Drawings sit in equity and are
// R&D-INELIGIBLE; if they survive into the basis the 43.5% claim is overstated and collapses on
// ATO/SL review. isFounder mirrors scripts/reconciliation-worklist.mjs (/marchesi|^nicholas|^nic\b/i)
// — keep the two in sync. Live FY26 ground truth (2026-06-16): gross $325,947.23 (384 rows),
// founder drawings $238,653.88 (11 rows), defensible ceiling $87,293.35.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFounder, computeRdBasis } from '../lib/rd-basis-lib.mjs';

const round2 = (n) => Number(Number(n).toFixed(2));

// Fixture reproducing the live aggregate (founder 238,653.88 / defensible 87,293.35 / gross 325,947.23)
const RD_FIXTURE = [
  { contact_name: 'Nicholas Marchesi', amount: 200000.00 }, // founder drawing
  { contact_name: 'Nic Marchesi', amount: 38653.88 },       // founder drawing
  { contact_name: 'Anthropic', amount: 50000.00 },          // defensible R&D spend
  { contact_name: 'Cursor AI', amount: 37293.35 },          // defensible R&D spend
];

test('isFounder catches the founder, not look-alikes', () => {
  assert.equal(isFounder('Nicholas Marchesi'), true);
  assert.equal(isFounder('Nic Marchesi'), true);
  assert.equal(isFounder('NICHOLAS MARCHESI'), true);   // case-insensitive
  assert.equal(isFounder('Marchesi Family Trust'), true); // contains marchesi
  assert.equal(isFounder('Nicola Roxon'), false);        // 'nic' with no word boundary -> NOT founder
  assert.equal(isFounder('Anthropic'), false);
  assert.equal(isFounder(''), false);
  assert.equal(isFounder(null), false);
});

test('R&D basis strips founder drawings: defensible = gross - founder', () => {
  const r = computeRdBasis(RD_FIXTURE);
  assert.equal(round2(r.grossFlagged), 325947.23);
  assert.equal(round2(r.founderDrawings), 238653.88);
  assert.equal(r.founderRows, 2);
  assert.equal(round2(r.defensibleBasis), 87293.35);
});

test('defensible basis NEVER includes a founder row (the bug this guards)', () => {
  const r = computeRdBasis(RD_FIXTURE);
  // founder drawings are the majority here; defensible must be far below gross
  assert.ok(r.defensibleBasis < r.grossFlagged);
  assert.ok(r.founderDrawings > r.defensibleBasis, 'founder portion dominates — basis must exclude it');
  // 43.5% offset is computed on the DEFENSIBLE basis only, never the gross flag
  assert.equal(round2(r.offset435), round2(87293.35 * 0.435));
});

test('founder share is reported (drives the collapse-risk read)', () => {
  const r = computeRdBasis(RD_FIXTURE);
  assert.equal(Math.round(r.founderPct), 73); // 238653.88 / 325947.23 = 73.2%
});

test('empty input is safe (zeros, not NaN)', () => {
  const r = computeRdBasis([]);
  assert.equal(r.grossFlagged, 0);
  assert.equal(r.defensibleBasis, 0);
  assert.equal(r.founderPct, 0);
});
