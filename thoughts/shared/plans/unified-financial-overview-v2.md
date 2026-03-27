# Unified Financial Overview v2 — Implementation Plan

**Date:** 2026-03-21
**Status:** Approved via CEO Plan Review (SCOPE EXPANSION mode)
**Goal:** Transform the existing financial overview into a world-class CEO cockpit — real cash balance, sparklines, smart nudges, interactive scenarios, and consolidated page architecture.

---

## Decisions Made (from review)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Cash balance source | Xero bank accounts API → new Supabase table |
| 2 | DRY APIs | Extract shared `src/lib/finance/` modules |
| 3 | Landing page | Redirect `/finance` → `/finance/overview` |
| 4 | Error gaps | Fix pipeline truncation + null due_date now |
| 5 | Grants reconciliation | Proper matching via contact name → Xero invoices |
| 6 | Auth | Accept no-auth for now → TODO |
| 7 | Tests | Unit tests for extracted calculation functions |
| 8 | Caching | Cache-Control: 5 min on API response |
| 9 | Traffic light | Build now |
| 10 | Sparklines | Build now |
| 11 | Smart nudges | Build now |
| 12 | Data freshness | Build now |
| 13 | Month deltas | Build now |
| 14 | Page consolidation | Build now — audit + remove redundant pages |
| 15 | Scenario builder | Build now — interactive sliders/toggles |
| 16 | Board PDF | TODO (deferred) |

---

## Phase 1: Shared Finance Modules (Foundation)

**Files:** `apps/command-center/src/lib/finance/`

### 1a. Create `src/lib/finance/actuals.ts`
Extract from `/api/finance/overview/route.ts` and `/api/finance/projects/route.ts`:
- `aggregateProjectFinancials(monthlyData, projects, budgets)` → per-project actuals with budget %
- `calculateReceivablesAging(invoices, now)` → `{ current, overdue30, overdue60, overdue90 }`
  - **FIX:** Guard against null `due_date` — skip invoice + log warning
- `calculateMonthlyBurn(monthlyTotals)` → average monthly expense over completed months
- `calculateRunway(cashInBank, avgMonthlyBurn, avgMonthlyRevenue)` → months remaining
  - **FIX:** Use cash in bank (from Xero bank accounts), not `fyNet + receivables`

### 1b. Create `src/lib/finance/pipeline.ts`
Extract from `/api/finance/overview/route.ts` and `/api/finance/pipeline-viz/route.ts`:
- `buildStageFunnel(opportunities)` → stage breakdown with weighted values
- `getTopOpportunities(opportunities, limit)` → sorted by weighted value
- `getPipelineByProject(opportunities)` → pipeline per project code
- **FIX:** Add count check — if query returns exactly `.limit()` count, add `truncated: true` flag

### 1c. Create `src/lib/finance/scenarios.ts`
Extract from `/api/finance/overview/route.ts` and `/api/finance/revenue-scenarios/route.ts`:
- `formatScenarios(scenariosData)` → `Record<string, { fy26Total, fy27Total, description, assumptions }>`

### 1d. Create `src/lib/finance/calculations.ts`
Pure functions (easily unit-testable):
- `runway(cashInBank: number, monthlyBurn: number, monthlyRevenue: number): number`
- `budgetPct(expenses: number, annualBudget: number): number | null`
- `overheadAllocation(hqExpenses: number, projectExpenses: Map<string, number>): AllocationResult[]`
- `weightedValue(value: number, probability: number): number`
- `reconciliationStatus(grantValue: number, matchedRevenue: number): 'reconciled' | 'partial' | 'unreconciled'`

### 1e. Create `src/lib/finance/format.ts`
Extract from page.tsx:
- `formatMoney(n: number): string`
- `formatMoneyCompact(n: number): string`

### 1f. Unit tests: `src/lib/finance/__tests__/calculations.test.ts`
Test each pure function:
- runway with positive cash, zero burn, negative cash
- budgetPct with zero budget → null
- overheadAllocation with zero total expenses → 0 share
- receivablesAging with null due_date → skipped
- reconciliationStatus thresholds (90% = reconciled, >0 = partial, 0 = unreconciled)

**Acceptance:** `npx tsc --noEmit` passes. Tests pass. Both `/api/finance/overview` and `/api/finance/projects` import from shared modules and return identical results to current.

---

## Phase 2: Xero Bank Accounts + Fixed Runway

### 2a. Sync Xero bank account balances
- Check if `xero_bank_accounts` table already exists in Supabase
- If not, create migration: `xero_bank_accounts` table with columns: `account_id`, `name`, `bank_account_number`, `currency_code`, `current_balance`, `updated_at`
- Extend `scripts/sync-xero-to-supabase.mjs` (or create new `sync-xero-bank-accounts.mjs`) to fetch from Xero `/Accounts?where=Type=="BANK"` endpoint
- Run sync to populate initial data

### 2b. Add cash balance to overview API
- Query `xero_bank_accounts` in the parallel Promise.all
- Add `cashInBank: number` to actuals response
- Fix runway calculation: `cashInBank / (avgMonthlyBurn - avgMonthlyRevenue)`
- If burn > revenue (net negative), runway = cash / net monthly burn
- If revenue > burn (net positive), runway = Infinity (or a large number with note)

### 2c. Update overview page
- Replace "Net Position" hero card with "Cash in Bank" as card #1
- Keep Net Position as a secondary metric below

**Acceptance:** Cash balance shows real Xero bank balance. Runway calculation uses actual cash.

---

## Phase 3: Bug Fixes + Data Quality

### 3a. Pipeline truncation guard
In `src/lib/finance/pipeline.ts`:
- After query, check if `result.data.length === limit`
- If so, set `truncated: true` on response
- Page shows subtle warning: "Showing first 500 of X opportunities"

### 3b. Null due_date guard
In `src/lib/finance/actuals.ts` → `calculateReceivablesAging()`:
- Skip invoices where `due_date` is null or invalid
- Log: `console.warn('Skipping invoice with null due_date:', inv.contact_name)`

### 3c. Proper grants reconciliation
In overview API:
- For each realized grant, find matching Xero invoices by `contact_name` (from `opportunities_unified.funder` or `contact_name`)
- Match grant contact → xero_invoices WHERE contact_name ILIKE grant funder AND type = 'ACCREC'
- Sum matched invoice amounts → compare to grant value
- This requires `funder` or `contact_name` field on `opportunities_unified` — check if it exists

### 3d. Cache-Control header
Add to `/api/finance/overview/route.ts`:
```typescript
const response = NextResponse.json(data)
response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
return response
```

**Acceptance:** No NaN in aging. Grants reconciliation shows accurate status. Pipeline shows truncation warning when applicable.

---

## Phase 4: Delight Features

### 4a. Traffic light mood indicator
At page top, above "Right Now" section:
- Compute composite health score from:
  - Runway: >6mo = green, 3-6mo = amber, <3mo = red
  - Burn trend: decreasing = green, stable = amber, increasing = red
  - Receivables: <20% overdue = green, 20-50% = amber, >50% = red
  - Budget: all <80% = green, any >80% = amber, any >100% = red
- Display as colored banner: "Financial Health: Strong / Attention Needed / Action Required"
- Subtle background glow matching health color

### 4b. Sparklines on hero cards
- Add monthly data series to API response: `sparklineData: { months: string[], revenue: number[], expenses: number[], net: number[] }`
- Render tiny inline SVG sparklines (no library needed — 20-30 lines of SVG)
- Show last 6 completed months
- Revenue sparkline: green, Expenses: red, Burn: orange, Cash/Net: emerald/red

### 4c. Smart nudges
Add to API response: `nudges: Array<{ type, message, severity, action? }>`
Generate from:
- **Overdue invoices:** Any receivable >30 days overdue → "Chase $X from [contact] ([days] days overdue)"
- **Upcoming deadlines:** BAS due date → "BAS Q3 due [date] ([weeks] weeks)"
- **Pipeline closing soon:** Opportunities with `expected_close` within 30 days → "Follow up: [title] closing [date]"
- **Budget warnings:** Any project >80% of budget → "[project] at [pct]% of budget"
- **Stale data:** If last Xero sync >24h ago → "Financial data may be stale — last sync [time]"
- Limit to top 5 most urgent

### 4d. Data freshness indicator
- Display `generatedAt` from API response
- Query `xero_sync_log` (or similar) for last sync timestamp
- Show at page bottom: "Data as of [time] · Last Xero sync: [time]"

### 4e. Month-over-month deltas
- Add to API: `monthDeltas: { revenue: number, expenses: number, net: number, burn: number }` (current month vs previous completed month)
- Display as "+$12K (+4.2%)" or "-$3K (-6.1%)" below hero card numbers
- Green for improvements (revenue up, expenses down), red for deterioration

**Acceptance:** Page opens with health banner. Hero cards show sparklines + deltas. Nudges section shows actionable items. Timestamp visible.

---

## Phase 5: Interactive Scenario Builder

### 5a. Scenario builder UI
Below the existing 3 static scenarios, add an interactive section:
- **"Model a Scenario" card** with:
  - Toggle list of pipeline opportunities: "Win PICC Year 2 ($1.2M)" [toggle on/off]
  - Slider: "New hire" ($0 - $200K/yr)
  - Slider: "Additional monthly expenses" ($0 - $20K/mo)
  - Toggle: "Event revenue" (add Harvest, Community Capital estimates)
- All client-side calculation — no API needed
- Shows resulting: adjusted runway, FY26 net, monthly burn
- Simple cash flow chart: 6-month forward projection line graph
  - X axis: months (Apr-Sep 2026)
  - Y axis: projected cash balance
  - Line shifts as user toggles/slides

### 5b. Data requirements
- Pipeline opportunities already in API response (top 15 by weighted value)
- Current cash balance (from Phase 2)
- Monthly burn (from existing API)
- No new API endpoint needed — all calculation is client-side

### 5c. Chart implementation
- Use simple SVG line chart (no charting library needed for one line)
- Or use Tremor's AreaChart if already imported (check dependencies)
- Show 3 lines: current trajectory, modeled scenario, break-even line

**Acceptance:** User can toggle pipeline wins on/off, adjust hire cost and extra expenses. Chart updates in real-time. Shows resulting runway change.

---

## Phase 6: Page Consolidation

### 6a. Audit existing finance pages
For each of the 11 finance pages, determine:
- Is the content fully covered by overview? → Remove page, redirect to overview
- Is it a drill-down from overview? → Keep, link from overview
- Is it an operational tool? → Keep in nav

Expected outcome:
| Page | Action | Rationale |
|------|--------|-----------|
| `/finance` (original landing) | Redirect → `/finance/overview` | Replaced by overview |
| `/finance/overview` | Keep (this IS the landing now) | Core page |
| `/finance/projects` | Keep | Drill-down for per-project detail |
| `/finance/projects/[code]` | Keep | Individual project detail |
| `/finance/board` | Keep | Board-specific view (role filtered) |
| `/finance/pipeline-kanban` | Keep | Operational pipeline management |
| `/finance/pipeline-viz` | Evaluate | May overlap with overview pipeline section |
| `/finance/revenue-planning` | Evaluate | May overlap with scenario builder |
| `/finance/tagger` | Keep | Operational tool |
| `/finance/reconciliation` | Keep | Operational tool |
| `/finance/accountant` | Keep | Operational tool |

### 6b. Remove/redirect redundant pages
- If `/finance/pipeline-viz` is fully covered by overview pipeline section → redirect
- If `/finance/revenue-planning` is fully covered by scenario builder → redirect or keep as "advanced" view
- Update nav-data.ts to remove redirected pages

### 6c. Redirect `/finance` → `/finance/overview`
Create `apps/command-center/src/app/finance/page.tsx` as:
```typescript
import { redirect } from 'next/navigation'
export default function FinancePage() {
  redirect('/finance/overview')
}
```
Or use Next.js middleware. This is the LAST step — only after everything else works.

**Acceptance:** Clean nav with 6-8 finance pages max. No dead links. `/finance` loads overview.

---

## Phase Order (Sequential)

```
Phase 1: Shared modules + tests     (~45 min) → tsc + test
Phase 2: Xero bank accounts + cash  (~30 min) → verify cash shows
Phase 3: Bug fixes + cache          (~30 min) → verify no NaN, grants accurate
Phase 4: Delight features           (~90 min) → verify all 5 delights render
Phase 5: Scenario builder           (~60 min) → verify interactive sliders work
Phase 6: Page consolidation         (~30 min) → verify clean nav, no dead links
                                    ─────────
                              Total: ~4.5 hours
```

**Commit at each phase boundary.** Run `npx tsc --noEmit` between phases.

---

## TODOs (Deferred)

| Item | Priority | Effort | Depends On |
|------|----------|--------|-----------|
| Add authentication to finance APIs | P2 | M | - |
| Board pack PDF export (one-click quarterly report) | P2 | L | Overview complete |
| Real-time Telegram alerts (runway < 3 months) | P3 | M | Cash balance + nudges |
| Click-to-drill on every number (inline expansion) | P3 | L | Component extraction |

---

## Key Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/finance/actuals.ts` | NEW — shared actuals module |
| `src/lib/finance/pipeline.ts` | NEW — shared pipeline module |
| `src/lib/finance/scenarios.ts` | NEW — shared scenarios module |
| `src/lib/finance/calculations.ts` | NEW — pure calculation functions |
| `src/lib/finance/format.ts` | NEW — money formatting utilities |
| `src/lib/finance/__tests__/calculations.test.ts` | NEW — unit tests |
| `src/app/api/finance/overview/route.ts` | MODIFY — use shared modules, add cash, nudges, sparklines |
| `src/app/api/finance/projects/route.ts` | MODIFY — use shared modules |
| `src/app/finance/overview/page.tsx` | MODIFY — add all delight features + scenario builder |
| `src/app/finance/page.tsx` | MODIFY — redirect to /finance/overview |
| `src/lib/nav-data.ts` | MODIFY — clean up redundant nav items |
| `supabase/migrations/YYYYMMDD_xero_bank_accounts.sql` | NEW — bank accounts table |
| `scripts/sync-xero-bank-accounts.mjs` | NEW or extend existing sync |
