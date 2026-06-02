import assert from 'node:assert/strict'
import test from 'node:test'
import {
  budgetVariancePct,
  buildAttentionAlerts,
  buildProjectPLRows,
  classifyPipeline,
  computeRunwayMonths,
  concentrationPct,
  gstFromRows,
  invoiceAging,
  projectedCashFlow,
  monthStartISO,
  monthlyBurnFromTrailing,
  monthlySubscriptionRunRate,
  next90DayInflows,
  oppStageBucket,
  pctConsumed,
  pileForOpp,
  pileMix,
  stalledOpps,
  summarizePeopleSpend,
  summarizePipeline,
  topOpenOpps,
  trailingMonthsWindow,
  weekStartISO,
  FY27_PILE_TARGET,
  type PipelineOpp,
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

// ---------------------------------------------------------------------------
// Line-item money math (slices 3+4). People costs = ACT accounts 477/478/486
// (wages/super/subcontractors); founder drawings = 880/882 (owner draw, NOT a
// business people cost — flagged separately). GST collected/paid split by tx type.
// line_items arrive as a JSON array OR a JSON string — both must parse.
// ---------------------------------------------------------------------------
test('summarizePeopleSpend: sums 477/478/486 as payroll, 880/882 as drawings, by project', () => {
  const rows = [
    { type: 'SPEND', project_code: 'ACT-HV', line_items: [{ AccountCode: '477', LineAmount: 5000 }, { AccountCode: '429', LineAmount: 1000 }] },
    { type: 'ACCPAY', project_code: 'ACT-HV', line_items: [{ AccountCode: '478', LineAmount: 500 }] },
    { type: 'SPEND', project_code: 'ACT-GD', line_items: [{ AccountCode: '486', LineAmount: 2000 }] },
    { type: 'SPEND', project_code: null, line_items: [{ AccountCode: '880', LineAmount: 3000 }] }, // drawings, not payroll
    { type: 'SPEND', project_code: 'ACT-GD', line_items: '[{"AccountCode":"477","LineAmount":1000}]' }, // string form
  ]
  const p = summarizePeopleSpend(rows)
  assert.equal(p.payroll, 8500) // 5000 + 500 + 2000 + 1000 (429 is not a people account)
  assert.equal(p.drawings, 3000) // 880 — owner draw, excluded from payroll
  assert.deepEqual(p.byProject, [
    { code: 'ACT-HV', amount: 5500 },
    { code: 'ACT-GD', amount: 3000 },
  ])
})

test('gstFromRows: 10% of line_amount by tax_type — OUTPUT collected, INPUT paid, exempt → 0', () => {
  // Tax amount is NOT stored; it's derived as 10% of the tax-exclusive line_amount, and direction
  // comes from tax_type (OUTPUT=income, INPUT=expense), NOT the transaction type.
  const rows = [
    { type: 'RECEIVE', line_items: [{ tax_type: 'OUTPUT', line_amount: 1000 }] }, // collected 100
    { type: 'SPEND', line_items: [{ tax_type: 'INPUT', line_amount: 500 }, { tax_type: 'INPUT', line_amount: 200 }] }, // paid 70
    { type: 'SPEND', line_items: [{ tax_type: 'GSTFREE', line_amount: 300 }] }, // 0
    { type: 'SPEND', line_items: [{ tax_type: 'BASEXCLUDED', line_amount: 999 }] }, // 0
    { type: 'SPEND', line_items: '[{"tax_type":"INPUT","line_amount":100}]' }, // string form → paid 10
  ]
  const g = gstFromRows(rows)
  assert.equal(g.collected, 100) // 1000 × 10%
  assert.equal(g.paid, 80) // (500 + 200 + 100) × 10%
  assert.equal(g.net, 20) // owed to the ATO
})

// ---------------------------------------------------------------------------
// Commitments / "betting on" (slice 5). Forward subscription run-rate normalises
// every active/pending sub to a monthly figure (annual ÷ 12); cancelled excluded.
// ---------------------------------------------------------------------------
test('monthlySubscriptionRunRate: monthly figure, annual÷12, cancelled excluded', () => {
  const rows = [
    { account_status: 'active', billing_cycle: 'monthly', amount: 100, expected_amount: null },
    { account_status: 'active', billing_cycle: 'annual', amount: 1200, expected_amount: null }, // → 100/mo
    { account_status: 'pending_migration', billing_cycle: 'monthly', amount: 50, expected_amount: null },
    { account_status: 'active', billing_cycle: 'usage', amount: 30, expected_amount: null }, // usage treated as monthly est.
    { account_status: 'cancelled', billing_cycle: 'monthly', amount: 999, expected_amount: null }, // excluded
    { account_status: 'active', billing_cycle: 'monthly', amount: null, expected_amount: 25 }, // falls back to expected_amount
  ]
  assert.equal(monthlySubscriptionRunRate(rows), 305) // 100 + 100 + 50 + 30 + 25
})

// ---------------------------------------------------------------------------
// Pipeline classification (slices 5/6). The GHL "Grants" pipeline is a GrantScope
// radar dump (~$272M, ~10x the real book) — ALWAYS excluded. The Goods Demand
// Register is aspirational buyer EOIs — broken out as a demand signal, not counted
// in the worked-pipeline headline. Stage buckets normalise the GHL stage vocab.
// ---------------------------------------------------------------------------
test('classifyPipeline: Grants→radar, Goods Demand Register→demand, else→worked', () => {
  assert.equal(classifyPipeline('Grants'), 'radar')
  assert.equal(classifyPipeline('Goods — Demand Register'), 'demand')
  assert.equal(classifyPipeline('A Curious Tractor'), 'worked')
  assert.equal(classifyPipeline(null), 'worked')
})

test('oppStageBucket: realized/won→won, lost/expired→lost, else→open', () => {
  assert.equal(oppStageBucket('realized'), 'won')
  assert.equal(oppStageBucket('won'), 'won')
  assert.equal(oppStageBucket('lost'), 'lost')
  assert.equal(oppStageBucket('expired'), 'lost')
  assert.equal(oppStageBucket('pursuing'), 'open')
  assert.equal(oppStageBucket('identified'), 'open')
  assert.equal(oppStageBucket(null), 'open')
})

test('pileForOpp: grant→Grants regardless of code, else project_code lookup, else Other/Uncoded', () => {
  assert.equal(pileForOpp('grant', ['ACT-HV']), 'Grants') // grant rule wins over code
  assert.equal(pileForOpp('deal', ['ACT-GD']), 'Flow')
  assert.equal(pileForOpp('deal', ['ACT-EL']), 'Voice')
  assert.equal(pileForOpp('deal', ['ACT-HV']), 'Ground')
  assert.equal(pileForOpp('deal', ['WATCH']), 'Other') // has a code, unmapped, no pipeline hint → Other
  assert.equal(pileForOpp('deal', null), 'Uncoded') // no code → Uncoded
  assert.equal(pileForOpp('deal', []), 'Uncoded')
  // pipeline-name fallback when no mapped code (the high-value Goods opps are untagged):
  assert.equal(pileForOpp('deal', null, 'Goods Supporter Journey'), 'Flow')
  assert.equal(pileForOpp('deal', ['WATCH'], 'Goods — Buyer Pipeline'), 'Flow') // hint beats unmapped-code Other
  assert.equal(pileForOpp('deal', null, 'Empathy Ledger'), 'Voice')
  assert.equal(pileForOpp('grant', null, 'Goods Supporter Journey'), 'Grants') // grant rule still wins
  assert.equal(pileForOpp('deal', ['ACT-GD'], 'Empathy Ledger'), 'Flow') // mapped code beats pipeline hint
})

const PIPE = (o: Partial<PipelineOpp>): PipelineOpp => ({
  title: o.title ?? 'x', pipelineName: o.pipelineName ?? null, pile: o.pile ?? null,
  valueMid: o.valueMid ?? 0, probability: o.probability ?? 0, stage: o.stage ?? 'pursuing',
  contactName: o.contactName ?? null, expectedClose: o.expectedClose ?? null, updatedAt: o.updatedAt ?? null,
})

test('summarizePipeline: open worked (headline) and demand split out; radar dropped; won worked separate', () => {
  const opps = [
    PIPE({ pipelineName: 'A Curious Tractor', valueMid: 100000, probability: 35, stage: 'pursuing' }), // worked open, w 35000
    PIPE({ pipelineName: null, valueMid: 50000, probability: 50, stage: 'submitted' }), // worked open, w 25000
    PIPE({ pipelineName: 'Goods — Demand Register', valueMid: 200000, probability: 10, stage: 'identified' }), // demand open, w 20000
    PIPE({ pipelineName: 'Grants', valueMid: 9999999, probability: 35, stage: 'pursuing' }), // RADAR → dropped
    PIPE({ pipelineName: 'A Curious Tractor', valueMid: 80000, probability: 100, stage: 'realized' }), // worked WON
    PIPE({ pipelineName: 'A Curious Tractor', valueMid: 12345, probability: 0, stage: 'lost' }), // worked lost → ignored
  ]
  const s = summarizePipeline(opps)
  assert.deepEqual(s.worked, { count: 2, value: 150000, weighted: 60000 })
  assert.deepEqual(s.demand, { count: 1, value: 200000, weighted: 20000 })
  assert.deepEqual(s.wonWorked, { count: 1, value: 80000, weighted: 80000 })
})

// ---------------------------------------------------------------------------
// Opportunities & pile mix (slice 6). Pile mix compares open-worked pipeline value
// by pile against the FY27 revenue target (Voice $200K / Flow $1.45M / Ground $150K
// / Grants $1M). Concentration = the single biggest funder's share of the book.
// ---------------------------------------------------------------------------
test('pileMix: open worked value by pile vs FY27 target %, fixed Voice/Flow/Ground/Grants order', () => {
  const opps = [
    PIPE({ pile: 'Flow', valueMid: 60000, stage: 'pursuing' }),
    PIPE({ pile: 'Voice', valueMid: 20000, stage: 'pursuing' }),
    PIPE({ pile: 'Ground', valueMid: 20000, stage: 'pursuing' }),
    PIPE({ pipelineName: 'Grants', pile: 'Other', valueMid: 999999, stage: 'pursuing' }), // radar dropped
    PIPE({ pile: 'Flow', valueMid: 80000, stage: 'lost' }), // not open → ignored
  ]
  const rows = pileMix(opps) // total open worked value = 100000
  assert.deepEqual(rows.map((r) => r.pile), ['Voice', 'Flow', 'Ground', 'Grants'])
  const flow = rows.find((r) => r.pile === 'Flow')!
  assert.equal(flow.value, 60000)
  assert.equal(flow.actualPct, 60) // 60000/100000
  assert.equal(flow.targetPct, 51.8) // 1450000 / 2800000
  const grants = rows.find((r) => r.pile === 'Grants')!
  assert.equal(grants.value, 0)
  assert.equal(grants.actualPct, 0)
  assert.equal(grants.targetPct, 35.7) // 1000000 / 2800000
  // sanity: the four target components sum to $2.8M (headline doc says $2.6M — components are authoritative)
  assert.equal(Object.values(FY27_PILE_TARGET).reduce((a, b) => a + b, 0), 2800000)
})

test('concentrationPct: single biggest funder share of open worked value; null contacts excluded from top', () => {
  const opps = [
    PIPE({ contactName: 'Snow Foundation', valueMid: 60000, stage: 'pursuing' }),
    PIPE({ contactName: 'PICC', valueMid: 30000, stage: 'pursuing' }),
    PIPE({ contactName: null, valueMid: 10000, stage: 'pursuing' }), // in denominator, can't be "top"
    PIPE({ contactName: 'Snow Foundation', valueMid: 999, stage: 'lost' }), // not open → ignored
  ]
  const c = concentrationPct(opps) // denominator 100000
  assert.equal(c.topName, 'Snow Foundation')
  assert.equal(c.value, 60000)
  assert.equal(c.pct, 60)
})

test('next90DayInflows: open worked opps with expectedClose within the window', () => {
  const now = new Date('2026-06-03T00:00:00Z') // window 2026-06-03 .. 2026-09-01
  const opps = [
    PIPE({ valueMid: 50000, expectedClose: '2026-06-20', stage: 'pursuing' }), // in
    PIPE({ valueMid: 30000, expectedClose: '2026-08-01', stage: 'submitted' }), // in
    PIPE({ valueMid: 99999, expectedClose: '2026-12-01', stage: 'pursuing' }), // out (too far)
    PIPE({ valueMid: 12345, expectedClose: null, stage: 'pursuing' }), // out (no date)
    PIPE({ valueMid: 7777, expectedClose: '2026-06-20', stage: 'realized' }), // out (won, not open)
  ]
  const r = next90DayInflows(opps, now, 90)
  assert.deepEqual(r, { count: 2, value: 80000 })
})

test('topOpenOpps: open worked opps sorted by value desc, top N', () => {
  const opps = [
    PIPE({ title: 'big', valueMid: 100000, probability: 35, stage: 'pursuing' }),
    PIPE({ title: 'mid', valueMid: 50000, probability: 50, stage: 'submitted' }),
    PIPE({ title: 'small', valueMid: 1000, stage: 'pursuing' }),
    PIPE({ title: 'demand', pipelineName: 'Goods — Demand Register', valueMid: 999999, stage: 'pursuing' }), // not worked
    PIPE({ title: 'won', valueMid: 999999, stage: 'realized' }), // not open
  ]
  const top = topOpenOpps(opps, 2)
  assert.deepEqual(top.map((o) => o.title), ['big', 'mid'])
  assert.equal(top[0].weighted, 35000) // 100000 × 35%
})

test('stalledOpps: open worked opps not updated in N days, by value desc', () => {
  const now = new Date('2026-06-03T00:00:00Z') // 60-day cutoff = 2026-04-04
  const opps = [
    PIPE({ title: 'stale', valueMid: 50000, updatedAt: '2026-01-01T00:00:00Z', stage: 'pursuing' }), // stalled
    PIPE({ title: 'fresh', valueMid: 100000, updatedAt: '2026-06-01T00:00:00Z', stage: 'pursuing' }), // recent
    PIPE({ title: 'stale-won', valueMid: 70000, updatedAt: '2026-01-01T00:00:00Z', stage: 'realized' }), // won, ignored
  ]
  const stalled = stalledOpps(opps, now, 60)
  assert.deepEqual(stalled.map((o) => o.title), ['stale'])
})

// ---------------------------------------------------------------------------
// Dashboard restructure (2026-06-03): the synthesised 13-week cash headline +
// invoice aging. The cash number is HARD DATA ONLY (cash + collectible AR − burn);
// it must NEVER subtract phantom AP (the $503K of 100%-overdue, 16-month-old bills
// would print a false −$300K headline). Aging buckets feed both AR (income) and the
// AP data-quality alert. Both are emitted dollars → pinned to hand-computed totals.
// ---------------------------------------------------------------------------
test('projectedCashFlow: cash + collectible AR − burn×months; can go negative (a real signal)', () => {
  assert.equal(projectedCashFlow(225786, 164250, 64278, 3), 197202) // 225786 + 164250 − 192834
  assert.equal(projectedCashFlow(100000, 0, 50000, 3), -50000) // negative is a real warning, never clamp
  assert.equal(projectedCashFlow(100000, 50000, 0, 3), 150000) // no burn
  assert.equal(projectedCashFlow(100000, 0, 64278, 0), 100000) // zero horizon = just cash
})

test('invoiceAging: buckets open (amount_due>0) invoices by due_date; excludes $0; oldest by invoice date; newly-overdue this week', () => {
  const now = new Date('2026-06-03T00:00:00Z') // window end = now+91d = 2026-09-02; newly-overdue = due in [2026-05-27, 2026-06-03)
  const rows = [
    { amount_due: 100, due_date: '2026-05-01', date: '2026-04-01' }, // overdue (not newly — before 05-27)
    { amount_due: 50, due_date: '2026-06-20', date: '2026-06-01' }, // due in window
    { amount_due: 30, due_date: '2026-12-01', date: '2026-11-01' }, // due later
    { amount_due: 20, due_date: null, date: '2026-03-01' }, // open but undated
    { amount_due: 0, due_date: '2026-05-01', date: '2020-01-01' }, // paid → excluded (incl. from oldest)
    { amount_due: 10, due_date: '2026-01-15', date: '2025-12-01' }, // overdue, oldest open invoice
    { amount_due: 15, due_date: '2026-05-28', date: '2026-05-15' }, // NEWLY overdue (within last 7d)
  ]
  const a = invoiceAging(rows, now, 91)
  assert.equal(a.total, 225) // 100+50+30+20+10+15
  assert.equal(a.overdue, 125) // 100+10+15
  assert.equal(a.newlyOverdue, 15) // only the 2026-05-28 one crossed due in the last 7 days
  assert.equal(a.dueInWindow, 50)
  assert.equal(a.dueLater, 30)
  assert.equal(a.undated, 20)
  assert.equal(a.count, 6) // amount_due>0 rows
  assert.equal(a.oldestDate, '2025-12-01') // $0 row's 2020 date must NOT win
  assert.equal(a.overdue + a.dueInWindow, 175) // collectible — what the 13-week number consumes
})

// ---------------------------------------------------------------------------
// Attention panel (the dashboard's top tier). Grilled rule: fire ONLY real,
// trustworthy items; when nothing fires, return [] and the UI shows all-clear —
// NEVER manufacture an insight. Critical sorts before warning before info.
// ---------------------------------------------------------------------------
const AGING_ZERO = { total: 0, overdue: 0, newlyOverdue: 0, dueInWindow: 0, dueLater: 0, undated: 0, count: 0, oldestDate: null }

test('buildAttentionAlerts: fires only real items, critical-first; detects phantom AP', () => {
  const alerts = buildAttentionAlerts({
    runwayMonths: 3.5,
    ar: { ...AGING_ZERO, total: 164250, overdue: 103750, dueInWindow: 60500, count: 17, oldestDate: '2025-06-01' },
    ap: { ...AGING_ZERO, total: 503125, overdue: 503125, count: 311, oldestDate: '2025-01-28' },
    concentration: { topName: 'X', pct: 8.1, value: 1000000 },
    projects: [{ code: 'ACT-GD', name: 'Goods', pctConsumed: 130 }],
    untaggedIncome: 90000,
    untaggedIncomeCount: 12,
    oppDateCoveragePct: 12,
  })
  const keys = alerts.map((a) => a.key)
  assert.ok(keys.includes('phantom-ap'), 'phantom AP fires')
  assert.ok(keys.includes('overdue-ar'), 'overdue AR fires')
  assert.ok(keys.includes('runway'), 'runway < 6 fires')
  assert.ok(keys.includes('over-budget'), 'over-budget project fires')
  assert.ok(keys.includes('untagged-income'), 'untagged income fires')
  assert.ok(keys.includes('opp-date-coverage'), 'low close-date coverage fires')
  assert.ok(!keys.includes('concentration'), 'concentration 8.1% < 50 does NOT fire')
  assert.equal(alerts[0].severity, 'critical') // phantom AP is critical and sorts first
})

test('buildAttentionAlerts: healthy inputs → empty (UI renders the all-clear)', () => {
  const alerts = buildAttentionAlerts({
    runwayMonths: 12,
    ar: { ...AGING_ZERO },
    ap: { ...AGING_ZERO },
    concentration: { topName: null, pct: null, value: 0 },
    projects: [],
    untaggedIncome: 0,
    untaggedIncomeCount: 0,
    oppDateCoveragePct: 100,
  })
  assert.deepEqual(alerts, [])
})
