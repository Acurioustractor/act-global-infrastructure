import assert from 'node:assert/strict'
import test from 'node:test'
import {
  budgetVariancePct,
  buildProjectPLRows,
  computeRunwayMonths,
  monthStartISO,
  monthlyBurnFromTrailing,
  pctConsumed,
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

// ---------------------------------------------------------------------------
// Per-project P&L (slice 2). Budget variance / % consumed both divide by budget,
// so a zero/absent budget must yield null (shown as "—"), never NaN/Infinity. The
// join sums monthly rows per project and classifies funded (income covers spend).
// ---------------------------------------------------------------------------
test('budgetVariancePct: (actual − budget)/budget %, null when no budget', () => {
  assert.equal(budgetVariancePct(120000, 100000), 20) // 20% over
  assert.equal(budgetVariancePct(80000, 100000), -20) // 20% under
  assert.equal(budgetVariancePct(50000, 0), null) // no budget → null, not Infinity
})

test('pctConsumed: actual/budget %, null when no budget', () => {
  assert.equal(pctConsumed(75000, 100000), 75)
  assert.equal(pctConsumed(50000, 0), null)
})

test('buildProjectPLRows: sums monthly rows per project, joins budget, classifies funded; sorted by spend', () => {
  const monthly = [
    { project_code: 'ACT-GD', revenue: 30000, expenses: 50000 },
    { project_code: 'ACT-GD', revenue: 20000, expenses: 30000 }, // ACT-GD: income 50k, spend 80k, net −30k
    { project_code: 'ACT-HV', revenue: 100000, expenses: 60000 }, // ACT-HV: income 100k, spend 60k, net +40k
    { project_code: null, revenue: 999, expenses: 999 }, // null code → skipped
  ]
  const budgets = [
    { project_code: 'ACT-GD', annual_budget: 100000 },
    { project_code: 'ACT-HV', annual_budget: 0 }, // no budget → variance/consumed null
  ]
  const names = new Map<string, string | null>([
    ['ACT-GD', 'Goods'],
    ['ACT-HV', 'Harvest'],
  ])
  const rows = buildProjectPLRows(monthly, budgets, names)

  assert.equal(rows.length, 2)
  // sorted by spend desc → ACT-GD (80k) first
  assert.deepEqual(
    rows.map((r) => r.code),
    ['ACT-GD', 'ACT-HV'],
  )

  const gd = rows[0]
  assert.equal(gd.name, 'Goods')
  assert.equal(gd.income, 50000)
  assert.equal(gd.spend, 80000)
  assert.equal(gd.net, -30000)
  assert.equal(gd.budget, 100000)
  assert.equal(gd.variancePct, -20) // 80k vs 100k budget = 20% under
  assert.equal(gd.pctConsumed, 80)
  assert.equal(gd.funded, false) // income 50k < spend 80k → ACT-subsidised

  const hv = rows[1]
  assert.equal(hv.net, 40000)
  assert.equal(hv.variancePct, null) // no budget
  assert.equal(hv.pctConsumed, null)
  assert.equal(hv.funded, true) // income 100k >= spend 60k → self-sustaining
})
