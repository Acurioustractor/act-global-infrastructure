# Project Financial Clarity System — CEO/COO Review

**Date:** 2026-03-17
**Context:** All 4 phases shipped (hub, detail+budget+R&D, salary allocation, revenue+studio). This review covers gaps, Notion integration, and project audit.

---

## 1. What We Built (Status Check)

| Component | Status | Notes |
|-----------|--------|-------|
| All-Projects Hub `/finance/projects` | Built | Tier filter, ecosystem-first sort, summary cards |
| Project Detail budget+R&D | Built | Budget vs actual, R&D eligibility, vendor breakdown |
| Salary Allocation table | Migration ready | Needs applying + manual data entry |
| Revenue per project | Built | Linked via `revenue_streams.project_codes` |
| Studio Economics on Board | Built | Contribution margin table with R&D offset |
| Nav link | Added | "Projects P&L" first under Finance |

**Bug fixed during build:** API was using `act_projects` table (doesn't exist) — corrected to `projects`.

---

## 2. CEO View: What's Missing for "Super Clear P&L Per Project"

### A. Data Gaps (Action Required)

| Gap | Impact | Fix |
|-----|--------|-----|
| **Salary allocation data empty** | No founder time costs on any project | Need to populate `project_salary_allocations` table with Ben + Nic time splits |
| **Budget data sparse** | Budget vs actual shows "no budget set" for most projects | Need FY26 budgets for at least the 5 ecosystem projects |
| **Event revenue not tracked** | Community Capital, 10x10 Retreat income invisible | Need Humanitix/Eventbrite/TryBooking vendor rules + project codes |
| **Event expenses not tagged** | Venue hire, catering, printing for events not linked to event project codes | Need vendor rules for event-specific vendors |
| **In-kind contributions invisible** | Pro-bono, donated services, volunteer hours — real value, not tracked | Consider `project_inkind_contributions` table |
| **Grant income attribution** | Some grants land in bank as lump sums without project codes | Need matching rules for grant disbursement contacts |

### B. Strategic Blind Spots

1. **Cost of delivery per revenue dollar** — We show net but don't show the ratio. A project earning $50K with $48K costs is worse than one earning $10K with $5K costs. Add "margin %" column.
2. **Overhead allocation** — ACT-HQ costs (rent, insurance, accounting) aren't split across projects. All HQ costs look like one project's burden.
3. **Cash vs accrual** — P&L uses bank transactions (cash basis). Some projects have invoiced but unpaid revenue. Consider showing "Invoiced" vs "Received" columns.
4. **Time-to-revenue** — How long from first expense to first dollar earned per project? Useful for investment projects like The Harvest.

### C. What's Working Well

- Transaction tagging at 99%+ coverage (Q3 FY26)
- Finance Engine automating receipt capture + matching
- R&D eligibility flagging at vendor rule level — good for AusIndustry evidence
- Subscription audit identified $4-5K savings
- Board report now has full studio economics view

---

## 3. COO View: Notion Integration Opportunities

### Current Notion State
- 30 databases synced to Supabase via `sync-notion-to-supabase.mjs`
- Notion Workers: 40 AI agent tools on Cloudflare (grant deadlines, daily briefing, contact lookup, project health, financial summary)
- Telegram bot: 19 tools including project lookup and financial queries

### Recommended Notion Workflows

#### Workflow 1: Project Budget Dashboard (Notion Database)
**What:** A Notion database where project leads can view and update their project budgets.
**How:**
- Create Notion DB "Project Budgets FY26" with columns: Project, Annual Budget, Category, Notes
- Bidirectional sync: Notion ↔ `project_budgets` table via a new sync script
- Notion Agent tool: "What's my budget status?" → queries `/api/finance/projects/[code]`
**Value:** Non-technical team members can manage budgets without SQL

#### Workflow 2: Monthly P&L Notifications (Notion Agent)
**What:** At month close, Notion Agent automatically posts a P&L summary to each project's Notion page.
**How:**
- New Notion Worker: `project-monthly-pnl` — calls the project detail API
- Triggered by `calculate-project-monthly-financials.mjs` completion
- Posts formatted block to project's Notion page: Revenue, Expenses, Net, Budget status
**Value:** Project leads see financials without visiting dashboard

#### Workflow 3: Salary Time Allocation Tracker (Notion)
**What:** Ben and Nic log weekly time splits across projects in a Notion table.
**How:**
- Notion DB "Weekly Time Allocation" — Person, Week, Project, Hours, %
- Sync script aggregates to `project_salary_allocations` monthly
- R&D time tracking evidence generated automatically
**Value:** R&D Tax Incentive compliance + accurate project costing

#### Workflow 4: Event P&L Template (Notion Template)
**What:** For events like Community Capital, a Notion template that captures: ticket revenue, sponsorship, venue costs, catering, travel, printing.
**How:**
- Notion template with pre-filled expense categories
- Link to Xero via project code (e.g. ACT-CC or ACT-EV-001)
- Post-event: auto-generate P&L from tagged transactions
**Value:** Event organisers see full cost picture in one place

#### Workflow 5: Financial Health Alert (Notion Agent)
**What:** Proactive alerts when project financials hit thresholds.
**How:**
- Existing Notion Worker `project-health` enhanced to check:
  - Budget utilisation > 80% → "Approaching budget limit"
  - Monthly spend spike > 50% → "Unusual expense increase"
  - Revenue drop > 30% → "Revenue declining"
- Posts alert to project page + Telegram notification
**Value:** No surprises at quarter end

---

## 4. Project Code Audit

### Ecosystem Projects (Tier: ecosystem) — These MUST have complete P&L

| Code | Project | Financial Data? | Budget Set? | Revenue Tracked? | Action |
|------|---------|----------------|-------------|-----------------|--------|
| ACT-EL | Empathy Ledger | Yes (via vendors) | No | Minimal | Set FY26 budget, identify revenue streams |
| ACT-JH | JusticeHub | Yes | No | Grant income | Set FY26 budget |
| ACT-GD | Goods on Country | Yes (strong) | No | Orange Sky contract | Set FY26 budget, ensure OS revenue tagged |
| ACT-FM | The Farm | Likely sparse | No | Land-related? | Set FY26 budget, verify vendor rules |
| ACT-HV | The Harvest | Yes (some) | No | Event revenue? | Set FY26 budget, add event vendor rules |
| ACT-IN | Intelligence/Bot | Yes (strong) | No | SaaS potential | Set FY26 budget |

### Studio Projects (Tier: studio) — Should have basic tracking

| Code | Project | Notes |
|------|---------|-------|
| ACT-ST | The Studio | Creative services — needs revenue tracking |
| ACT-AR | Art | Exhibition/commission income |
| ACT-10 | 10x10 Retreat | Event-based — needs event P&L template |

### HQ / Operations

| Code | Project | Notes |
|------|---------|-------|
| ACT-HQ | Headquarters | Overhead — should be split across projects eventually |
| ACT-FN | Finance | Meta: cost of running finance itself |

### Missing Project Codes (Potential Gaps)

| Need | Suggested Code | Rationale |
|------|---------------|-----------|
| Community Capital events | ACT-CC or ACT-EV-CC | Dedicated P&L per event |
| Consulting revenue | ACT-CS | Services income currently lumped into HQ |
| GrantScope (if ACT-funded) | ACT-GS | Separate R&D project |
| Black Cockatoo Valley | ACT-BCV | Land project — capital expenditure tracking |

---

## 5. Community Capital — Full P&L Test Case

To prove the system works end-to-end, we need to run Community Capital through it:

### Step 1: Create Project Code
- Add `ACT-CC` (or `ACT-EV-CC`) to `projects` table
- Set tier: `studio`, status: `active`

### Step 2: Tag Revenue
- Add vendor rules for: Humanitix, Eventbrite, TryBooking → `ACT-CC`
- Tag any sponsorship invoices (ACCREC) with project code
- Tag bank deposits from event platforms

### Step 3: Tag Expenses
- Add vendor rules for: venue hire vendor, caterer, printer, etc.
- Tag travel expenses (flights, accommodation) for event
- Tag marketing/promotion costs

### Step 4: Set Budget
- Insert into `project_budgets`: expected event costs + revenue target
- Now budget vs actual tracking works

### Step 5: Verify
- Visit `/finance/projects/ACT-CC` — should show full event P&L
- Check hub page `/finance/projects` — should appear in list
- Board page studio economics should include it

### Step 6: Notion Integration
- Create Notion page for event
- Post P&L summary after event closes

---

## 6. Immediate Actions (Priority Order)

1. **Apply salary allocation migration** — `psql` the migration file
2. **Populate salary data** — Ben + Nic time splits for FY26
3. **Set budgets for 5 ecosystem projects** — even rough estimates
4. **Create ACT-CC project** for Community Capital test case
5. **Add event vendor rules** (Humanitix etc.)
6. **Tag Community Capital transactions** in Xero
7. **Build Notion budget sync** (Workflow 1 above)
8. **Add margin % column** to hub and board tables

---

## 7. 12-Month Vision

```
NOW (Mar 2026)                    Q4 FY26 (Jun 2026)              FY27 (Jul 2026+)
┌─────────────┐                  ┌──────────────────┐            ┌──────────────────┐
│ Per-project  │                 │ All ecosystem     │           │ Auto-budgets     │
│ P&L hub     │                 │ projects have     │           │ from historical  │
│ built       │                 │ budgets + salary  │           │                  │
│             │ ───────────▶    │ allocations       │ ────────▶ │ Notion-first     │
│ Budget +    │                 │                   │           │ budget mgmt      │
│ R&D inline  │                 │ Notion P&L sync   │           │                  │
│             │                 │ working           │           │ Forecast engine  │
│ Studio      │                 │                   │           │ with scenarios   │
│ economics   │                 │ Event P&L         │           │                  │
│ on board    │                 │ template proven   │           │ PDF board pack   │
└─────────────┘                  └──────────────────┘            └──────────────────┘
```
