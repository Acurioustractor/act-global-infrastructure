import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeRunwayMonths,
  monthStartISO,
  monthlyBurnFromTrailing,
  trailingMonthsWindow,
  weekStartISO,
} from './ledger'

// ---------------------------------------------------------------------------
// Weekly business-strength snapshot — the pure money math. Burn, runway, and the
// month-boundary windows are the error-prone bits (a wrong window or a divide-by-zero
// runway is a silent, decision-relevant number), so they're pinned to hand-computed
// values here BEFORE the async fetchers compose them.
// All windows computed in UTC against a fixed "now" so the test is timezone-stable.
// ---------------------------------------------------------------------------

const NOW = new Date('2026-06-03T00:00:00Z')

test('monthStartISO: first day of the current month', () => {
  assert.equal(monthStartISO(NOW), '2026-06-01')
  assert.equal(monthStartISO(new Date('2026-01-15T00:00:00Z')), '2026-01-01')
})

test('trailingMonthsWindow: the N complete months BEFORE the current month', () => {
  // June 2026, n=3 → Mar/Apr/May 2026 → 2026-03-01 .. 2026-05-31 (current month excluded)
  assert.deepEqual(trailingMonthsWindow(NOW, 3), { start: '2026-03-01', end: '2026-05-31' })
  // year wrap: Feb 2026, n=3 → Nov/Dec 2025 + Jan 2026 → 2025-11-01 .. 2026-01-31
  assert.deepEqual(trailingMonthsWindow(new Date('2026-02-10T00:00:00Z'), 3), {
    start: '2025-11-01',
    end: '2026-01-31',
  })
})

test('weekStartISO: N days before now', () => {
  assert.equal(weekStartISO(NOW, 7), '2026-05-27')
})

test('monthlyBurnFromTrailing: avg monthly expense; guards divide-by-zero', () => {
  assert.equal(monthlyBurnFromTrailing(300000, 3), 100000) // $300K over 3 months = $100K/mo
  assert.equal(monthlyBurnFromTrailing(0, 0), 0) // no data → 0, not NaN
  assert.equal(monthlyBurnFromTrailing(50000, 0), 0)
})

test('computeRunwayMonths: cash / monthly burn (1dp); null when burn <= 0', () => {
  assert.equal(computeRunwayMonths(250000, 100000), 2.5)
  assert.equal(computeRunwayMonths(0, 100000), 0)
  assert.equal(computeRunwayMonths(250000, 0), null) // no burn → runway not meaningful, never Infinity
  assert.equal(computeRunwayMonths(250000, -10), null) // net-positive month → null, not negative runway
})
