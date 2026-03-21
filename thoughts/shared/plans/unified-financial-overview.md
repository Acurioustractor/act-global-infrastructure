# Unified Financial Overview — Plan

**Date:** 2026-03-18
**Goal:** Single page showing (1) current actuals, (2) pipeline with confidence, (3) scenario planning per project
**Route:** `/finance/overview` (new page, becomes the finance landing page)

---

## Problem

Finance data is spread across 25 pages. User wants ONE view that answers:
- "How much money do we have and where is it going?" (actuals)
- "What money might come in?" (pipeline + confidence)
- "What happens if X or Y?" (scenarios)

---

## Critical Fix First: FY26 Monthly Financials Are Empty

The `project_monthly_financials` table has NO FY26 data (last entry is June 2025). The projects hub API depends on this table. Must run `calculate-project-monthly-financials.mjs` before building the overview.

---

## Architecture

### New API: `/api/finance/overview`

Single endpoint returning all three layers:

```typescript
{
  // Layer 1: Current Actuals (from xero_transactions + project_monthly_financials)
  actuals: {
    cashInBank: number           // from xero bank accounts
    fyRevenue: number            // FY26 total received
    fyExpenses: number           // FY26 total spent
    fyNet: number
    receivables: number          // outstanding ACCREC
    payables: number             // outstanding ACCPAY
    monthlyBurn: number          // avg monthly expense
    runway: number               // months at current burn
    byProject: Array<{
      code: string, name: string, tier: string,
      revenue: number, expenses: number, net: number,
      budgetPct: number | null
    }>
  }

  // Layer 2: Pipeline (from opportunities_unified, filtered to actionable)
  pipeline: {
    totalWeighted: number        // SUM(value_mid * probability)
    byStage: Array<{ stage: string, count: number, value: number, avgProb: number }>
    topOpportunities: Array<{    // top 20 by weighted value
      title: string, value: number, probability: number,
      stage: string, project_codes: string[], expected_close: string
    }>
    byProject: Array<{           // pipeline per project
      code: string, weighted: number, count: number
    }>
  }

  // Layer 3: Scenarios (from revenue_scenarios + revenue_stream_projections)
  scenarios: {
    conservative: { fy26Total: number, fy27Total: number }
    moderate: { fy26Total: number, fy27Total: number }
    aggressive: { fy26Total: number, fy27Total: number }
  }
}
```

### New Page: `/finance/overview`

Three horizontal sections stacked:

#### Section 1: "Right Now" — Current Position
- **4 hero cards:** Cash in Bank | FY26 Net | Monthly Burn | Runway (months)
- **Mini table:** Top 6 projects by spend, showing: Revenue | Expenses | Net | Budget %
- **Receivables/Payables** summary with aging buckets

#### Section 2: "What's Coming" — Pipeline
- **Weighted pipeline total** as hero number
- **Stage funnel:** Researching → Pursuing → Submitted → Realized (horizontal bar)
- **Top 10 opportunities** table: Name | Value | Probability | Stage | Project | Expected Close
- Skip the 7,787 low-probability GrantScope grants (prob=10, stage=identified) — they're noise

#### Section 3: "What If" — Scenarios
- **3-column comparison:** Conservative | Moderate | Aggressive
- For each: FY26 total, FY27 total, key assumptions
- Pulled from existing `revenue_scenarios` + `revenue_stream_projections` tables
- Link to full `/finance/revenue-planning` page for deep dive

---

## Implementation Phases

### Phase 0: Fix FY26 Data (5 min)
- Run `node scripts/calculate-project-monthly-financials.mjs`
- Verify FY26 data appears in `project_monthly_financials`

### Phase 1: API `/api/finance/overview` (30 min)
- Single route, 4 parallel Supabase queries
- Filter pipeline to probability > 10 OR stage != 'identified'
- Include receivables/payables from xero_invoices

### Phase 2: Overview Page — Section 1 "Right Now" (30 min)
- Hero cards + project mini-table
- Reuse patterns from existing `/finance/projects/page.tsx`

### Phase 3: Overview Page — Section 2 "Pipeline" (30 min)
- Stage funnel visualization
- Top opportunities table
- Filter out GrantScope noise

### Phase 4: Overview Page — Section 3 "Scenarios" (20 min)
- 3-column scenario comparison
- Pull from existing revenue_scenarios API

### Phase 5: Nav + Polish (10 min)
- Add "Overview" as first item in Finance nav
- Make it the default `/finance` redirect or replace current finance landing

---

## Outstanding Items (Not in This Build)

- [ ] **Void Aleisha Keating invoices** — 27 x $450 = $12,150 stale receivables (Xero API script)
- [ ] **prepare-bas.mjs** — BAS worksheet for accountant (April 28 deadline)
- [ ] **Receipt coverage** — Qantas/Uber portal downloads (manual user action)
- [ ] **Overhead allocation** — split ACT-HQ costs across projects
- [ ] **Notion budget sync** — bidirectional budget management

---

## Data Available

| Source | Rows | Key Fields |
|--------|------|-----------|
| xero_transactions (FY26) | 1,497 | project_code, total, date, contact_name |
| opportunities_unified | 8,387 (213 actionable) | stage, probability, value_mid, project_codes |
| ghl_opportunities | 123 | pipeline stage, value |
| revenue_scenarios | 3 | conservative/moderate/aggressive |
| revenue_stream_projections | 180 | 10-year by stream |
| project_budgets | 13 | FY26 targets |
| xero_invoices (receivables) | ~300 | ACCREC, outstanding |
| xero_invoices (payables) | ~262 | ACCPAY, outstanding |
