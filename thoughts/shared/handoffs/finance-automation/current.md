---
date: 2026-03-17T22:00:00Z
session_name: finance-automation
branch: main
status: active
---

# Work Stream: finance-automation

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-03-18T07:30:00Z
**Goal:** Unified financial overview — current actuals + pipeline with confidence + scenario planning
**Branch:** main
**Plan file:** `thoughts/shared/plans/project-financial-clarity-review.md`
**Test:** Visit `localhost:3002/finance/projects` (hub) and `/finance/projects/ACT-EL` (detail)

### Now
[->] User wants unified financial overview: (1) all current $ in one view, (2) pipeline opportunities with confidence levels, (3) scenario planning for $ in/out per project. Need to plan this — involves unifying 25 finance pages, 6 revenue streams, 8,387 unified opportunities, 3 revenue scenarios, 13 project budgets. About to /clear and reconnect Supabase MCP for easier DB access.

### Next Task (User Request — Big Feature)
**"Full sweep to align everything in the frontend":**
1. Current state overview — show ALL current $ (actuals from Xero)
2. Pipeline view — all possible $ with confidence levels (from opportunities_unified + ghl_opportunities)
3. Scenario planning — model $ coming in and spending on specific projects

**Existing data to leverage:**
- `revenue_streams` (6 streams) — configured but $0 MRR tracked
- `revenue_scenarios` (3: conservative/moderate/aggressive) + `revenue_stream_projections` (180 rows)
- `opportunities_unified` (8,387 rows!) — grant + strategic opportunities
- `ghl_opportunities` (123 rows) — CRM pipeline
- `project_budgets` (13 rows) — FY26 budgets set this session
- `project_monthly_financials` — actuals by project/month
- `/finance/revenue-planning/page.tsx` — already has scenario comparison UI
- `/finance/revenue/page.tsx` — has pipeline items + revenue entries

**Existing finance pages (25 total):**
- Main hub (`/finance`) — income/expenses/net/receivables, monthly chart, top contacts
- Projects hub (`/finance/projects`) — per-project P&L with tier filter (NEW this session)
- Project detail (`/finance/projects/[code]`) — budget, R&D, salary, revenue (NEW this session)
- Board report (`/finance/board`) — studio economics, runway, R&D summary
- Revenue (`/finance/revenue`) — streams + pipeline items
- Revenue planning (`/finance/revenue-planning`) — 3 scenarios, 10-year projections
- Cashflow (`/finance/cashflow`) — burn rate, runway
- Runway (`/finance/runway`) — detailed runway calc
- R&D tracking (`/finance/rd-tracking`) — R&D spend by project
- Subscriptions (`/finance/subscriptions`) — SaaS audit
- Receipts (`/finance/receipts`) + receipt-pipeline — receipt capture
- Reconciliation, tagger, data-quality, health, flow, debt, tax, weekly-review, accountant, business, dext-setup, ecosystem, reports

### This Session (2026-03-18, session 6 — Data Population + Cleanup + ACT-CP)
- [x] Applied salary_allocations migration to Supabase
- [x] Full revenue/income intelligence audit (3 parallel agents: emails, GHL/Notion, Xero)
- [x] Fixed Regional Arts Australia: ACT-GD → ACT-HV (per user)
- [x] Added 21 new vendor_project_rules (PICC, Sonas, Berry Obsession, Harvest vendors, JH partners)
- [x] Populated 13 FY26 budgets (expense + revenue for 7 projects incl PICC $1.2M NIAA)
- [x] Populated 12 salary allocations (Ben + Nic, $200K/yr each, split across 6 projects)
- [x] Re-tagged 45 transactions + 36 invoices with correct project codes
- [x] Recalculated project_monthly_financials
- [x] Discovered $3.6M PICC/NIAA contract (Year 1 $1.2M active)
- [x] Mapped $311K outstanding receivables by project
- [x] Fixed vendor assignments (3 rounds): SMART→ACT-SM, Ingkerreke→ACT-OO, Rotary→ACT-GD, Dusseldorp→ACT-JH, Brisbane Powerhouse→ACT-CF, Julalikari→ACT-GD, Mala'la→ACT-GD
- [x] Added Margin % column to hub page + board page Studio Economics
- [x] Created ACT-HQ project for overhead/founder transfers
- [x] Moved 182 Nic transfer transactions from ACT-IN → ACT-HQ ($268K)
- [x] Tagged 43 remaining untagged transactions as ACT-HQ (small overhead)
- [x] **100% FY26 transaction coverage** — 14 projects, 0 untagged
- [x] Re-tagged 18 Amazon orders (Sep-Nov 2025) from ACT-IN → ACT-UA (Palm Island photo studio)
- [x] Created ACT-CP (Community Capital) project — event in Bowral via Social Impact Hub Foundation
- [x] Tagged Social Impact Hub Foundation invoices ($26,730) → ACT-CP
- [x] Tagged Humanitix invoices ($315) + TryBooking ($61) → ACT-CP
- [x] Updated vendor rules: Social Impact Hub Foundation, Humanitix, TryBooking → ACT-CP
- [x] CC event expense details (candles, canvas, Amazon) — can't identify from bank data alone, defer to Xero manual review
- [x] Final monthly financials recalculated (38 records from 43 buckets)

### This Session (2026-03-17, session 5 — Project Financial Clarity)
- [x] **Phase 1: All-Projects Hub** — `/finance/projects` page + API, tier filter, ecosystem-first sort, summary cards
- [x] **Phase 2: Budget + R&D on detail** — Budget vs actual section, R&D eligibility card with vendor breakdown, 43.5% offset calc
- [x] **Phase 3: Salary allocation model** — Migration `20260317100000_salary_allocations.sql`, integrated into detail API + page
- [x] **Phase 4: Revenue + Studio Model** — Revenue streams per project, Studio Economics table on board report with R&D offset
- [x] **CEO/COO review** — Written to `thoughts/shared/plans/project-financial-clarity-review.md`
- [x] **Bug fix:** API was using `act_projects` (wrong) — fixed to `projects` (correct table)
- [x] **Nav link added** — "Projects P&L" first item under Finance sidebar
- [x] **Full ecosystem audit** — 6 ecosystem projects mapped with live data coverage

### Previous Sessions
- [x] Session 4: Receipt v2, capture-receipts metadata-first, unknown charge detection, subscription dashboard
- [x] Session 3: Xero API research, phantom payables, financial intelligence report
- [x] Session 2: Xero re-auth, 20 receipts uploaded, vendor aliases 15→60+, project tagging 57%→99%
- [x] Session 1: Dext import, BAS analysis, Pty Ltd transition plan

### Ecosystem Projects — Live Data (from audit)
| Code | Project | Contacts | Txns | Emails | Opps | Health |
|------|---------|----------|------|--------|------|--------|
| ACT-JH | JusticeHub | 833 | 4 | 1,434 | 3 | 85 |
| ACT-IN | Infrastructure | 1 | 1,000 | 1,502 | 0 | 72 |
| ACT-HV | The Harvest | 5 | 60 | 403 | 24 | 100 |
| ACT-GD | Goods | 145 | 79 | 221 | 6 | 100 |
| ACT-EL | Empathy Ledger | 14 | 3 | 64 | 21 | 84 |
| ACT-FM | The Farm | 0 | 59 | 21 | 0 | 53 |

### Blocked
- **Aleisha Keating 27 AUTHORISED invoices** ($12,150) — she's gone, needs voiding in Xero UI (can't void via sync)
- **DISPUTED 6 transactions** ($260) — need user decision on project assignment or write-off
- **CC event expenses** — candle/canvas/craft supplies bought on Amazon mixed with other projects, need Xero manual review

### Next (Priority Order)
1. [ ] **BUILD: Unified financial overview** — current $ + pipeline + scenarios (user's main request)
   - Show all current actuals in one view
   - Add pipeline opportunities with confidence levels
   - Scenario planning: model $ in/out per project
2. [ ] **Void Aleisha Keating invoices in Xero** — 27 × $450 = $12,150 stale receivables
3. [ ] **Handle DISPUTED transactions** — 6 txns ($260) need project assignment
4. [ ] **Link grants pipeline to project P&L** — won grants → Xero invoices
5. [ ] **Notion integration** — budget sync, monthly P&L notifications
6. [ ] **Overhead allocation model** — split ACT-HQ costs across ecosystem projects

### Key Metrics (Updated Session 6)
- **68+ total projects** (27 active + ACT-HQ + ACT-CP new): 6 ecosystem, 12+ studio, 15 satellite
- **85+ vendor rules** — event vendors now included (Humanitix, TryBooking, Social Impact Hub)
- **8,387 unified opportunities** in pipeline (from GrantScope + GHL + manual)
- **123 GHL opportunities** — CRM pipeline
- **6 revenue streams** configured, 3 scenarios (conservative/moderate/aggressive), 180 projection rows
- **13 FY26 budgets** set, **12 salary allocations** populated
- **Project tagging FY26:** 100% — ALL transactions tagged
- **BAS Q3 due:** April 28, 2026
- **FY26 actuals:** $284K revenue (bank), $458K expenses across 14 projects
- **ACT-CP revenue:** $26,730 from Social Impact Hub Foundation ($4,950 paid, $21,780 outstanding)

### Decisions
- **Table name:** `projects` not `act_projects` — corrected in API
- **Community Capital code:** Use ACT-CP (ACT-CC is taken by Conservation Collective)
- **Ecosystem projects sort first** in hub (by tier, then by expense magnitude)
- **Salary allocation separate table** — not in project_budgets, because needs person-level R&D evidence
- **Revenue streams linked via** `revenue_streams.project_codes` (array contains)

### Key Files Created/Modified This Session
| File | Changes |
|------|---------|
| `apps/command-center/src/app/finance/projects/page.tsx` | NEW: All-projects hub with tier filter |
| `apps/command-center/src/app/api/finance/projects/route.ts` | NEW: Hub API aggregating financials |
| `apps/command-center/src/app/finance/projects/[code]/page.tsx` | Budget vs actual, R&D eligibility, salary allocation, revenue streams sections |
| `apps/command-center/src/app/api/finance/projects/[code]/route.ts` | Added budgets, R&D vendors, salary allocations, revenue streams queries |
| `apps/command-center/src/app/finance/board/page.tsx` | Studio Economics section with contribution margins + R&D offset |
| `apps/command-center/src/lib/nav-data.ts` | Added "Projects P&L" nav link |
| `supabase/migrations/20260317100000_salary_allocations.sql` | NEW: project_salary_allocations table |
| `thoughts/shared/plans/project-financial-clarity-review.md` | CEO/COO review with gaps, Notion integration, project audit |

### Architecture
```
projects table (68 rows)
  ├── project_monthly_financials (pre-calculated P&L by month)
  ├── project_budgets (FY targets — needs population)
  ├── project_salary_allocations (NEW — time % × cost)
  ├── vendor_project_rules (64 rules → transaction tagging)
  ├── revenue_streams (linked via project_codes array)
  ├── project_health (health scores from compute-project-health.mjs)
  └── xero_transactions (tagged with project_code)

/finance/projects (hub) → /api/finance/projects
/finance/projects/[code] (detail) → /api/finance/projects/[code]
/finance/board (studio economics) → /api/finance/projects (reused)
```

### Notion Integration Plan (5 workflows, not yet built)
1. **Project Budget DB** — Notion ↔ project_budgets bidirectional sync
2. **Monthly P&L Notifications** — auto-post to project Notion pages at month close
3. **Time Allocation Tracker** — weekly Notion table → project_salary_allocations
4. **Event P&L Template** — Notion template with pre-filled categories
5. **Financial Health Alerts** — budget >80%, spend spikes, revenue drops

### GHL/Grants Integration State
- **Bidirectional sync working:** grant_opportunities ↔ ghl_opportunities (every 6h)
- **Project alignment:** align-ghl-opportunities.mjs auto-assigns codes at 70%+ confidence
- **Missing GHL stages:** Grant Awarded, Grant Declined, Acquittal Due not yet created
- **Won grants → Xero:** Manual only (via grants-pipeline.mjs CLI). Needs automation.
- **opportunities_unified:** 21 strategic opportunities seeded, weighted pipeline ~$800K-1M

### Open Questions
- **Harvest instalments:** How many, what amounts, what dates? User wants to add all
- **Community Capital:** Is this an event? A project? What's the scope?
- **Salary splits:** What % does Ben spend on each ecosystem project? Nic?
- **Budget targets:** What are reasonable FY26 budgets for each ecosystem project?
- **R&D advisor contacted?** (deadline April 30, 2026)

---

## Context

### Project Financial Clarity System
```
/finance/projects (hub)
  ├── Summary cards: Revenue, Expenses, Net, R&D Spend
  ├── Tier filter: All / Ecosystem / Studio / Satellite
  └── Table: Project | Tier | Revenue | Expenses | Net | R&D% | Budget | →

/finance/projects/[code] (detail)
  ├── Summary cards (same as before)
  ├── Budget vs Actual (progress bar, utilisation %, variance)
  ├── R&D Eligibility (spend, %, 43.5% offset, top vendors)
  ├── Revenue Streams (linked streams with monthly targets)
  ├── Salary Allocations (person × % × cost, R&D eligible flag)
  ├── Monthly Trend (bar chart)
  ├── Variance Explanations
  ├── Expense/Revenue Breakdown
  └── Recent Transactions

/finance/board (studio economics section)
  └── Table: Project | Tier | Revenue | Cost | Net | R&D Offset | Net+R&D
```
