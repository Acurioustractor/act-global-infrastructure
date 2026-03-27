---
date: 2026-03-22T08:45:00+10:00
session_name: financial-cockpit
branch: main
status: active
---

# Work Stream: financial-cockpit

## Ledger
**Updated:** 2026-03-22T08:45:00+10:00
**Goal:** Build 3 interactive financial management modules (Invoice Command, Pipeline Confidence, Revenue Sequencing) plus nav integration. Done when all pages render with real data and compile clean.
**Branch:** main (uncommitted)
**Test:** `npx tsc --noEmit` (passes clean)

### Now
[->] All 4 phases complete and rendering. Ready for user review/commit.

### This Session
- [x] Calendar sidebar fix (tagger-v2: days=0→1, AEST timezone, show actual events)
- [x] ACT-PC project tag created in database
- [x] Bulk Tagger v1→v2→v3 (tag pills, inline re-tag, multi-select, search/filter)
- [x] Data audit: 93% invoices tagged (1,409/1,523), 114 untagged ($3.7K)
- [x] Financial Cockpit plan written to `thoughts/shared/plans/financial-cockpit-plan.md`
- [x] Phase 1: Invoice Command — API + page (`/finance/invoices`)
- [x] Phase 2: Pipeline Confidence — API + page (`/finance/pipeline`)
- [x] Phase 3: Revenue Sequencing — API + page (`/finance/revenue`)
- [x] Phase 4: Nav updated with 3 new items + Receipt icon import
- [x] TypeScript compiles clean
- [x] QA verified all 3 pages render with real data on 127.0.0.1:3001

### Next
- [ ] Commit all financial cockpit changes
- [ ] Consider limiting invoice list to unpaid by default (currently shows 1000 rows)
- [ ] Pipeline page shows $3.4B total — verify this is correct (500 opportunities, may include GrantScope data)
- [ ] Add cross-links on Invoice + Pipeline pages (Revenue already has them)
- [ ] Consider pagination or virtualization for large lists

### Decisions
- Reused existing `PATCH /api/finance/pipeline-update` for stage changes (no new endpoints needed)
- Revenue model pulls actual ACCREC from xero_invoices grouped by month (no new tables needed)
- All 3 modules follow same pattern: hero cards → filter pills → sortable list/cards → expandable detail
- Port 3001 conflict: Vite (Oochiumpa) on `*:3001`, Next.js on `[::1]:3001` — use 127.0.0.1 not localhost

### Open Questions
- UNCONFIRMED: Pipeline $3.4B total — seems high, may include GrantScope opportunities
- UNCONFIRMED: 1000 invoice rows — Supabase default limit, may need pagination for UX

### Workflow State
pattern: phase-based
phase: 4
total_phases: 4
retries: 0
max_retries: 3

#### Resolved
- goal: "Build 3 interactive financial cockpit modules"
- resource_allocation: balanced

#### Unknowns
- pipeline_data_accuracy: UNKNOWN (total seems very high)

#### Last Failure
(none)

---

## Context

### Files Created (This Session — Financial Cockpit)

| File | Purpose |
|------|---------|
| `src/app/api/finance/invoices/route.ts` | Invoice query API — xero_invoices with overdue/due stats |
| `src/app/finance/invoices/page.tsx` | Invoice Command — hero cards, filter pills, sortable list, expandable rows, re-tag |
| `src/app/api/finance/pipeline-review/route.ts` | Pipeline review API — opportunities_unified with stage/type/weighted |
| `src/app/finance/pipeline/page.tsx` | Pipeline Confidence — confidence bars, stage progression, project assignment |
| `src/app/api/finance/revenue-model/route.ts` | Revenue model API — streams + projections + actuals by month |
| `src/app/finance/revenue/page.tsx` | Revenue Sequencing — stream cards, monthly bar chart, scenario table |
| `src/app/finance/tagger-bulk/page.tsx` | Bulk Tagger — tag pills, inline re-tag, multi-select |
| `thoughts/shared/plans/financial-cockpit-plan.md` | Plan file for all 3 modules |

### Files Modified (This Session)

| File | Change |
|------|--------|
| `src/lib/nav-data.ts` | Added Receipt import + 3 nav items (Invoice Command, Pipeline Confidence, Revenue Sequencing) |
| `src/app/finance/tagger-v2/page.tsx` | Calendar sidebar: days=0→1, render actual events not just hint |
| `src/app/api/receipts/calendar-context/[txDate]/route.ts` | AEST timezone fix for date range |

### Key Data Verified

- **Invoice Command:** $93.3K receivable (2), $147K overdue (113), $54K payable (111), 887 paid
- **Pipeline:** $3.46B total, $344M weighted, 500 opportunities (494 grants, 6 deals)
- **Revenue:** $118K avg monthly, $1.3M FY26 YTD, 6 streams defined
- **Existing tables used:** xero_invoices, opportunities_unified, revenue_streams, revenue_stream_projections, revenue_scenarios, projects

### Existing Infrastructure Reused

- `PATCH /api/finance/pipeline-update` — stage changes + audit logging
- `POST /api/transactions/tag` — invoice re-tagging
- `lib/finance/format.ts` — formatMoney, formatMoneyCompact
- `lib/utils.ts` — cn() utility
- @tanstack/react-query — data fetching pattern
- glass-card styling pattern
