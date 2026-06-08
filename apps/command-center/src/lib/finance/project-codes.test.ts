import assert from 'node:assert/strict'
import test from 'node:test'
import { LEGACY_WRAPPERS, normalizeProjectCode, foldMonthlyByCanonical } from './project-codes'

// ---------------------------------------------------------------------------
// Legacy-fold money math for the cost-drill P&L table. project_monthly_financials
// stores legacy codes (ACT-HQ / ACT-CG / ACT-PC) separately; the cost-drill view folds
// them to canonical (ACT-CORE / ACT-CS / ACT-PI) before showing per-project P&L.
//
// A silent wrong total is the expensive finance failure, so the fold is pinned to
// hand-computed totals on FIXED fixture data here, BEFORE the async API composes it.
// (Live numbers are a moving target — every reassignment changes them — so they live
// in the provenance sidecar, not as a test oracle.)
// ---------------------------------------------------------------------------

test('normalizeProjectCode: upper/trim and fold legacy wrappers', () => {
  assert.equal(normalizeProjectCode('ACT-HQ'), 'ACT-CORE')
  assert.equal(normalizeProjectCode('act-cg'), 'ACT-CS')
  assert.equal(normalizeProjectCode(' act-pc '), 'ACT-PI')
  assert.equal(normalizeProjectCode('ACT-BV'), 'ACT-FM') // Black Cockatoo Valley merged into The Farm 2026-06-08
  assert.equal(normalizeProjectCode('act-bcv'), 'ACT-FM')
  assert.equal(normalizeProjectCode('ACT-JH'), 'ACT-JH') // non-legacy passes through
  assert.equal(normalizeProjectCode(null), null)
  assert.equal(normalizeProjectCode(''), null)
})

test('LEGACY_WRAPPERS matches the resolver fold map', () => {
  assert.deepEqual(LEGACY_WRAPPERS, { 'ACT-CG': 'ACT-CS', 'ACT-HQ': 'ACT-CORE', 'ACT-PC': 'ACT-PI', 'ACT-BV': 'ACT-FM', 'ACT-BCV': 'ACT-FM' })
})

test('foldMonthlyByCanonical: merges legacy rows into their canonical code', () => {
  const rows = [
    { project_code: 'ACT-HQ', revenue: 268308, expenses: 244042 },
    { project_code: 'ACT-CORE', revenue: 271644, expenses: 264064 },
    { project_code: 'ACT-CG', revenue: 1000, expenses: 400 },
    { project_code: 'ACT-CS', revenue: 500, expenses: 100 },
    { project_code: 'ACT-PC', revenue: 0, expenses: 200 },
    { project_code: 'ACT-PI', revenue: 365200, expenses: 28773 },
  ]
  const out = foldMonthlyByCanonical(rows)
  const byCode = new Map(out.map((r) => [r.code, r]))

  // ACT-HQ folds into ACT-CORE: 268308+271644 rev, 244042+264064 exp
  assert.deepEqual(byCode.get('ACT-CORE'), { code: 'ACT-CORE', revenue: 539952, expenses: 508106, net: 31846 })
  // ACT-CG → ACT-CS
  assert.deepEqual(byCode.get('ACT-CS'), { code: 'ACT-CS', revenue: 1500, expenses: 500, net: 1000 })
  // ACT-PC → ACT-PI
  assert.deepEqual(byCode.get('ACT-PI'), { code: 'ACT-PI', revenue: 365200, expenses: 28973, net: 336227 })
  // no legacy codes survive in the output
  assert.equal(byCode.has('ACT-HQ'), false)
  assert.equal(byCode.has('ACT-CG'), false)
  assert.equal(byCode.has('ACT-PC'), false)
})

test('foldMonthlyByCanonical: sums revenue/expenses across months and computes net = rev - exp', () => {
  const rows = [
    { project_code: 'ACT-JH', revenue: 60000, expenses: 500 },
    { project_code: 'ACT-JH', revenue: 57655, expenses: 571 },
  ]
  const out = foldMonthlyByCanonical(rows)
  // The under-attribution shape we're here to fix: revenue attributed, expenses near-zero.
  assert.deepEqual(out, [{ code: 'ACT-JH', revenue: 117655, expenses: 1071, net: 116584 }])
})

test('foldMonthlyByCanonical: sorts by expenses desc and skips null/empty codes', () => {
  const rows = [
    { project_code: 'ACT-JH', revenue: 100, expenses: 5 },
    { project_code: 'ACT-IN', revenue: 0, expenses: 999 },
    { project_code: null, revenue: 50, expenses: 50 },
    { project_code: '', revenue: 10, expenses: 10 },
  ]
  const out = foldMonthlyByCanonical(rows)
  assert.deepEqual(out.map((r) => r.code), ['ACT-IN', 'ACT-JH'])
})

test('foldMonthlyByCanonical: org totals are conserved by the fold (no drop, no double-count)', () => {
  const rows = [
    { project_code: 'ACT-HQ', revenue: 268308, expenses: 244042 },
    { project_code: 'ACT-CORE', revenue: 271644, expenses: 264064 },
    { project_code: 'ACT-JH', revenue: 117655, expenses: 1071 },
    { project_code: 'ACT-IN', revenue: 744, expenses: 154567 },
  ]
  const out = foldMonthlyByCanonical(rows)
  const totRev = out.reduce((a, r) => a + r.revenue, 0)
  const totExp = out.reduce((a, r) => a + r.expenses, 0)
  // Folding only relabels — it must not change the org totals.
  assert.equal(totRev, 268308 + 271644 + 117655 + 744)
  assert.equal(totExp, 244042 + 264064 + 1071 + 154567)
})
