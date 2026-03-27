# Financial Cockpit — Interactive Money Management

## What This Is NOT
This is NOT rebuilding the existing finance infrastructure. We already have:
- `/finance/overview` — comprehensive dashboard with health score, scenarios, sparklines
- `/finance/project-plan` — project actuals + pipeline + cash flow timeline
- `/finance/pipeline-kanban` — drag-and-drop stage management
- `/finance/revenue-planning` — 10-year scenario comparison
- `xero_invoices`, `xero_transactions`, `opportunities_unified`, `revenue_scenarios` tables
- `lib/finance/calculations.ts` — 17 pure calculation functions

## What This IS
Three new interactive "work through it" experiences — like the Rapid Tagger but for invoices, pipeline, and revenue planning. The tagger taught us: card-based, keyboard-driven, progress-tracking UIs make boring work feel productive. Apply that to the three financial pillars.

## Why Now
GBE repayable finance is incoming. ACT needs expert-level visibility into:
- What we owe vs what's coming in (invoices)
- What funding is likely vs uncertain (pipeline confidence)
- When revenue-generating projects start earning (revenue sequencing)

---

## Module 1: Invoice Command `/finance/invoices`

### What It Does
Work through all invoices — receivables (money owed TO us) and payables (money WE owe). See overdue items, chase payments, tag to projects, understand cash timing.

### Data Source
Existing `xero_invoices` table (1,500+ records synced from Xero).

### Layout
```
┌─────────────────────────────────────────────────────┐
│ HERO CARDS                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │Receivable│ │ Overdue  │ │ Payable  │ │ Due This││
│ │  $124K   │ │  $18K    │ │  $47K    │ │  Week   ││
│ │ 23 items │ │ 5 items  │ │ 31 items │ │ $8.2K   ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────────────────┤
│ FILTER PILLS (like bulk tagger)                     │
│ [All] [Overdue 5] [Due Soon 8] [Receivable 23]     │
│ [Payable 31] [Paid ✓] [By Project ▾]               │
├─────────────────────────────────────────────────────┤
│ INVOICE LIST (sortable, filterable)                 │
│                                                     │
│ ↑ ACCREC  Qld Govt — JH Pilot     $45,000  Overdue │
│   ACCREC  NIAA — Palm Island       $32,000  30 days │
│ ↓ ACCPAY  Bionic Group             $4,705   Due Fri │
│   ACCPAY  Telstra                  $1,200   Paid ✓  │
│                                                     │
│ Click any row → expand: line items, project tag,    │
│ payment history, days outstanding, chase actions     │
└─────────────────────────────────────────────────────┘
```

### Key Features
- **Direction clarity**: Green ↑ for money coming IN (ACCREC), Red ↓ for money going OUT (ACCPAY)
- **Overdue highlighting**: Red badges with days overdue, sorted to top
- **Project tagging**: Each invoice shows project tag, click to re-tag (reuse tagger pattern)
- **Due date timeline**: Visual bar showing when payments cluster
- **Filter pills**: Same pattern as bulk tagger — click to filter by status, direction, project
- **Sort**: By amount, date, days outstanding, project, vendor

### API
`GET /api/finance/invoices` — queries `xero_invoices` with filters
- Returns: items with computed `daysOverdue`, `daysUntilDue`, direction
- Groups: summary stats (total receivable, payable, overdue, due this week)
- Uses existing `xero_invoices` table — no new tables needed

---

## Module 2: Pipeline Confidence `/finance/pipeline`

### What It Does
Focused review of the funding pipeline. Not a kanban (we have that) — a confidence-scoring and planning tool. Work through each opportunity, update confidence, flag GBE repayable items, see weighted totals update in real time.

### Data Source
Existing `opportunities_unified` table.

### Layout
```
┌─────────────────────────────────────────────────────┐
│ PIPELINE SUMMARY                                    │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │ Total    │ │ Weighted │ │Repayable │ │Confirmed││
│ │Pipeline  │ │ Value    │ │Obligation│ │ Won     ││
│ │ $1.2M    │ │ $487K    │ │ $350K    │ │ $89K    ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────────────────┤
│ FILTER: [All] [Grants] [GBE ⚠️] [Philanthropy]     │
│         [Commercial] [By Project ▾] [By Stage ▾]   │
├─────────────────────────────────────────────────────┤
│ OPPORTUNITY CARDS (expandable)                      │
│                                                     │
│ ┌─ NIAA Community Safety ──────────────────────┐   │
│ │ $450K · Grant · ACT-JH · Shortlisted         │   │
│ │ ████████████░░░ 75% confidence                │   │
│ │ Expected: Apr 2026 · Applied: Jan 2026        │   │
│ │ [Update confidence ▾] [Add note] [View Kanban]│   │
│ └───────────────────────────────────────────────┘   │
│                                                     │
│ ┌─ GBE Pilot Facility ─────── ⚠️ REPAYABLE ───┐   │
│ │ $350K · GBE · ACT-FM · Pursuing              │   │
│ │ ████░░░░░░░░░░░ 30% confidence               │   │
│ │ Repayment: 5yr @ 3% · $70K/yr obligation     │   │
│ │ Expected: Jul 2026                            │   │
│ │ [Update confidence ▾] [Model repayment]       │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key Features
- **Confidence slider**: Drag to update probability, weighted totals recalculate live
- **GBE repayable flag**: Prominent warning badge, repayment terms inline, annual obligation calculated
- **Repayment modeller**: For repayable items — input term, rate, see annual obligation vs projected revenue
- **Stage progression**: Show where each opportunity is, days in current stage
- **Pipeline by project**: Toggle to see pipeline grouped by project — which projects have funding coming?
- **Expected close timeline**: Visual timeline showing when decisions are expected

### API
`GET /api/finance/pipeline-review` — queries `opportunities_unified`
- Returns: items with stage, probability, repayable flag, days in stage
- Computed: total weighted, total repayable obligation, by-project breakdown
- `PATCH /api/finance/pipeline-update` already exists for stage/probability updates

### New Column (if missing)
- Check if `opportunities_unified` has `is_repayable`, `repayment_terms` columns
- If not, add via migration (2 columns, no data loss)

---

## Module 3: Revenue Sequencing `/finance/revenue`

### What It Does
Interactive revenue planning for ACT's revenue-generating projects. Not 10-year scenarios (we have that) — monthly/quarterly planning for the next 12-18 months. When does each project start earning? What's the ramp? What revenue can ACT count on to service GBE repayments?

### Data Source
Existing `revenue_scenarios`, `revenue_stream_projections`, `revenue_streams` tables. Plus `xero_invoices` (ACCREC) for actual revenue.

### Layout
```
┌─────────────────────────────────────────────────────┐
│ REVENUE STREAMS                                     │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│ │GOODS      │ │The Harvest│ │ The Farm  │          │
│ │$2.4K/mo   │ │$0 (pre-rev│ │$1.8K/mo   │          │
│ │Online+Mkt │ │ launch Q3)│ │Events+Stay│          │
│ └───────────┘ └───────────┘ └───────────┘          │
├─────────────────────────────────────────────────────┤
│ 18-MONTH REVENUE TIMELINE                           │
│                                                     │
│         Apr May Jun Jul Aug Sep Oct Nov Dec ...      │
│ GOODS   ██  ██  ███ ███ ████ ████ █████ █████      │
│ Harvest          ░░  ░░  ██  ██  ███ ████           │
│ Farm    █   █   ██  ███ ████ ████ ████ ████         │
│ JH           ░░  ░░  ░░  ██  ██  ███               │
│ ─────── ─── ─── ─── ─── ─── ─── ─── ───           │
│ TOTAL   $4K $4K $7K $12K $18K $22K $28K $35K       │
│                                                     │
│ ═══ GBE Repayment Line ($5.8K/mo) ════════════     │
│                                                     │
│ ⚠️ Revenue covers GBE repayment from: Oct 2026     │
├─────────────────────────────────────────────────────┤
│ STREAM DETAIL (click to expand)                     │
│                                                     │
│ GOODS on Country:                                   │
│  ├─ Online sales: $800/mo → $2K/mo (6mo ramp)      │
│  ├─ Markets: $400/mo (seasonal, +50% Nov-Feb)       │
│  └─ Wholesale: $0 → $1.5K/mo (starts Aug)          │
│                                                     │
│ Assumptions: [editable text per stream]              │
│ Confidence: ████████░░ 80%                          │
└─────────────────────────────────────────────────────┘
```

### Key Features
- **Monthly granularity**: Not 10-year abstractions — actual month-by-month for next 18 months
- **Actual vs projected**: Overlay real ACCREC revenue from Xero on projected amounts
- **GBE repayment line**: Horizontal line showing when total revenue crosses the repayment obligation threshold
- **Stream ramp modelling**: Per-stream monthly targets with ramp curves (linear, hockey stick, seasonal)
- **Editable assumptions**: Click any stream to edit growth rate, start date, seasonal adjustments
- **Revenue confidence**: Per-stream confidence level, feeds into weighted totals
- **Break-even marker**: Visual indicator of when ACT becomes revenue-positive

### API
`GET /api/finance/revenue-model` — combines:
- `revenue_streams` for stream definitions
- `revenue_stream_projections` for monthly targets
- `xero_invoices` (ACCREC, grouped by month) for actuals
- Computed: monthly totals, cumulative, break-even point, GBE coverage date

### New Table
`revenue_monthly_targets` — granular monthly targets per stream:
- `id`, `stream_id` (FK to revenue_streams), `month` (YYYY-MM)
- `projected_amount`, `actual_amount`, `confidence` (0-100)
- `assumptions` (text), `created_at`, `updated_at`

This is more granular than the existing 10-year `revenue_stream_projections` (which are annual).

---

## Implementation Order

### Phase 1: Invoice Command (fastest, most useful immediately)
- New page: `src/app/finance/invoices/page.tsx`
- New API: `src/app/api/finance/invoices/route.ts`
- Uses existing `xero_invoices` — no migration needed
- ~60 min

### Phase 2: Pipeline Confidence
- New page: `src/app/finance/pipeline/page.tsx`
- New API: `src/app/api/finance/pipeline-review/route.ts`
- Check/add `is_repayable`, `repayment_terms` to `opportunities_unified`
- Reuses existing `PATCH /api/finance/pipeline-update`
- ~60 min

### Phase 3: Revenue Sequencing
- New page: `src/app/finance/revenue/page.tsx`
- New API: `src/app/api/finance/revenue-model/route.ts`
- New table: `revenue_monthly_targets`
- Needs some seed data (stream targets)
- ~90 min

### Phase 4: Nav + Integration
- Add 3 new nav items under Finance
- Cross-link between modules (invoice → project → pipeline)
- ~15 min

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/finance/invoices/page.tsx` | **NEW** — invoice command page |
| `src/app/api/finance/invoices/route.ts` | **NEW** — invoice query API |
| `src/app/finance/pipeline/page.tsx` | **NEW** — pipeline confidence page |
| `src/app/api/finance/pipeline-review/route.ts` | **NEW** — pipeline review API |
| `src/app/finance/revenue/page.tsx` | **NEW** — revenue sequencing page |
| `src/app/api/finance/revenue-model/route.ts` | **NEW** — revenue model API |
| `src/lib/nav-data.ts` | **MODIFY** — add 3 nav items |
| Migration for `revenue_monthly_targets` | **NEW** — monthly granular targets |
| Migration for `opportunities_unified` columns | **NEW** — if repayable columns missing |

## What We're NOT Doing
- NOT rebuilding overview, project-plan, pipeline-kanban, or revenue-planning
- NOT creating new `invoices` or `funding_opportunities` tables (already have `xero_invoices` and `opportunities_unified`)
- NOT duplicating calculation functions (reuse `lib/finance/calculations.ts`)
- NOT replacing the kanban (it's good for stage management; this is for confidence review)
- NOT replacing 10-year scenarios (they serve strategic planning; this serves tactical monthly planning)
