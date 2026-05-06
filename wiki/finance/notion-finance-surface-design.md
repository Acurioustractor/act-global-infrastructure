---
title: ACT Finance Surface — Optimal Notion Workspace Design
status: Working spec for the next build
date: 2026-05-06
audience: Ben + Nic
purpose: Design the Notion surface that gives "everything in one place" — current state, upcoming, forecast, deep-linked to Xero/GHL. Informed by research on Float, Causal, Runway, Fathom, Spotlight, Syft, and Notion finance templates.
tags:
  - finance
  - notion
  - design
  - cashflow-forecast
  - workspace-architecture
parent: cy26-money-philosophy-and-plan
---

# ACT Finance Surface — Optimal Notion Workspace Design

> **The pitch in two sentences.** The best founder-finance tools (Float, Causal, Runway) give you live cash + scenarios + runway in one place. We can match 80% of that in Notion + Supabase using what we already have, plus 4 new builds, without paying $50–$250/month per tool. This doc maps the full architecture and the concrete next builds.

---

## Part 1 — What the top finance tools do well (and what we should steal)

### Float — cashflow forecasting (Xero plugin, ~$70/mo)
**Strengths to steal:**
- Live rolling 13-week cash forecast pulled from Xero invoices + bills
- Cash runway tracking with threshold alerts ("when do we hit $100K?")
- Scenario planning ("what if X grant doesn't come in?")
- Budget vs Actual comparison (forecast accuracy over time)

**What we should build:** A 13-week rolling cash forecast view in Notion, sourced from Xero invoices (open + scheduled) and known recurring bills.

### Causal — financial modelling (~$50–$150/user/mo)
**Strengths to steal:**
- Plain-English formulas (no spreadsheet hell)
- Scenario branching (base / optimistic / pessimistic)
- Visual graphs of model outputs

**What we should build:** A scenarios sheet — at minimum: "what if CivicGraph doesn't ship FY27" / "what if R&D refund delayed 3 months" / "what if PICC doesn't renew."

### Runway — collaborative FP&A (enterprise pricing)
**Strengths to steal:**
- Single source of truth that finance owns and others explore
- Audit trail — who changed what, when
- Multi-entity, multi-product modelling (relevant: ACT-ST → ACT Pty cutover, plus Harvest sub coming)

**What we should build:** A decision log on the Money Sync Page (already exists) so changes get traced. Multi-entity framing is already in place via `entity_code` tagging.

### Fathom — reporting + KPIs (~$60/mo)
**Strengths to steal:**
- Pre-built KPI library (ratios, growth, customer concentration)
- Multi-entity consolidation (Nic ST + ACT Pty + Harvest sub eventually)
- Visual dashboard (charts, not just tables)

**What we should build:** A KPI summary page — runway, customer concentration, AR aging, R&D-eligible % of spend, pile mix vs target.

### Spotlight — formula-driven budgeting
**Strengths to steal:**
- Budget vs actual at project level (tied to drivers — "1.5 contractors × $X/hr × Y hrs")
- Multi-period comparison

**What we should build:** Per-pile budget cards on the pile pages, showing planned vs actual.

### Syft — analytics dashboards (Xero acquisition, ~$30+/mo)
**Strengths to steal:**
- Benchmarking against industry
- Group/consolidated views

**What we should build (later):** Less urgent. Notion table views give us most of the analytics value once data is properly tagged (which it now is).

### Notion finance templates (community)
**Strengths to steal:**
- Single-page exec view
- Linked databases for transactions
- Visual hierarchy (callouts, headers, tables)

**What we should build:** Already in place — the Money Framework page, Opportunities database, pile pages. Refinement work, not net-new structure.

---

## Part 2 — Where we are vs. those tools (gap analysis)

| Capability | Float | Causal | Runway | Fathom | **ACT now** |
|---|:-:|:-:|:-:|:-:|:-:|
| Live $ position from Xero | ✓ | — | ✓ | ✓ | **✓** |
| Invoice + bill detail | ✓ | — | ✓ | ✓ | **✓** |
| Pile/project tagging | — | — | ✓ | ✓ | **✓** |
| Pipeline integration (CRM) | — | — | ✓ | — | **✓ (GHL)** |
| Grant pipeline / discovery | — | — | — | — | **✓ (GrantScope, unique to us)** |
| 13-week forecast | ✓ | ✓ | ✓ | ✓ | **❌** |
| Scenario modelling | basic | ✓✓✓ | ✓✓ | ✓ | **❌** |
| Cash runway calc | ✓ | ✓ | ✓ | ✓ | **partial** (math exists, not surfaced) |
| Customer concentration | — | — | ✓ | ✓ | **❌** (PICC = 95% of Voice — we've noted but not surfaced) |
| AR aging buckets | ✓ | — | ✓ | ✓ | **partial** (overdue list exists, not bucketed) |
| Burn rate tracking | ✓ | ✓ | ✓ | ✓ | **❌** |
| Budget vs Actual per project | partial | ✓ | ✓ | ✓ | **partial** (project_budgets table exists, not in Notion) |
| Editable from Notion → source | — | — | — | — | **✓ (unique)** |
| R&D-eligible spend tagging | — | — | — | — | **✓ (unique to us)** |
| Bidirectional Notion ↔ GHL | — | — | — | — | **✓ (unique)** |

**Read:** we have ALL the unique data (R&D, pile tagging, GrantScope, GHL bidirection) that no off-the-shelf tool gives us. We're missing the **forward-looking views** (forecast, scenarios, runway, AR aging) that all the dedicated tools have. **Build those four next.**

---

## Part 3 — The optimal Notion surface (target state)

### The ONE page everyone opens first

```
🏛️  ACT Money Framework                                          [exec view]
├──  💵  $1.33M bank · +$558K FY26 net · 56d to cutover · 💸 7.2 mo runway
├──  ⚡ Top opportunities (clickable to GHL)
├──  🔥 What's burning (compliance + stale + unreconciled)
├──  📊 Pile mix (actual vs target with arrows)
├──  📈 13-week cash forecast (NEW)               ← this is the gap
└──  🔎 Pipeline by pile (drill-in)
```

### The supporting pages (sub-pages of framework, all auto-refreshed)

```
├── 💰 ACT Opportunities database (408 rows, kanban-able, edits → GHL)
├── 💰 Money In Alignment (every $ in)
├── 💸 Money Out Alignment (every $ out + R&D-eligible)
├── 📈 Cash Forecast & Scenarios (NEW)            ← build this
├── 📊 KPIs & Concentration Risk (NEW)            ← build this
├── 🎯 Budget vs Actual per project (NEW)         ← build this
├── 🎙️ Voice / 🌊 Flow / 🌾 Ground / 🏛️ Grants strategic pages
├── 📜 CY26 Money Philosophy + Plan
├── 💵 Friday Money Digest (auto Fri 3pm)
└── 💬 Money Sync — Questions & Ideas (free-form working page)
```

That's it. Eight sub-pages, all driven from Supabase, all linked to source systems. No third-party tool subscription needed.

---

## Part 4 — The four builds we need

### Build 1: 13-week rolling cash forecast (the biggest gap)

**What it is:** A weekly view of expected cash in vs out for the next 13 weeks, with running balance.

**Inputs (all already in Supabase):**
- Open AUTHORISED invoices with due dates → expected receipts
- AUTHORISED bills with due dates → expected payments
- Recurring transactions (rent, salaries from cutover, software subs from `subscription_tracking`)
- One-time scheduled items (R&D refund expected Sept-Dec, $190K mid-estimate)
- Optional: probability-weighted pipeline (top GHL opps × close probability)

**Output: a Notion table per week:**

| Week | Confirmed in | Confirmed out | Net | Running balance | Risk events |
|---|---:|---:|---:|---:|---|
| Week 1 (May 12) | $33K (INV-0328) | -$15K (rent + AWS) | +$18K | $1.35M | — |
| Week 2 (May 19) | $0 | -$8K | -$8K | $1.34M | — |
| ... | | | | | |
| Week 8 (Jul 7) | $20K salary out | -$24K (Pty payroll #1) | -$4K | $1.28M | first Pty payroll |
| Week 13 (Aug 11) | (tbd) | -$24K | -$24K | $1.20M | R&D refund window opens |

**Build script:** `scripts/sync-cash-forecast-to-notion.mjs`. Cron Mon 8:50am.

**Effort:** 2-3 hours.

### Build 2: KPIs & concentration risk

**What it is:** A scorecard page showing the key health metrics.

**Metrics (all derivable from existing data):**
- **Runway** (months of cash at current burn): bank ÷ avg monthly burn
- **Customer concentration**: top 3 customers as % of FY26 income (PICC = ~25%, Centrecorp = ~30%, etc.)
- **Pile mix actual vs target** (already on framework page)
- **AR aging buckets**: 0-30 / 31-60 / 61-90 / 90+ days overdue
- **R&D-eligible % of total spend** (currently 32%)
- **Days sales outstanding (DSO)**: avg days from invoice to paid
- **Win rate**: GHL won / (won + lost) over rolling 90 days
- **Burn vs revenue ratio**: monthly burn / monthly revenue

**Build script:** `scripts/sync-kpis-to-notion.mjs`. Cron Mon 8:55am.

**Effort:** 2 hours.

### Build 3: Budget vs Actual per project

**What it is:** For each pile, planned spend vs actual, and planned revenue vs actual.

**Inputs:**
- `project_budgets` (already exists in Supabase, has FY26 budget rows per project)
- `xero_invoices` aggregated by `project_code`

**Output: per-project rows:**

| Project | Budget rev | Actual rev | % | Budget exp | Actual exp | % |
|---|---:|---:|---:|---:|---:|---:|
| ACT-GD (Goods) | $800K | $1.08M | **135%** ✓ | $300K | $200K | 67% |
| ACT-PI (PICC) | $400K | $478K | **120%** ✓ | $20K | $15K | 75% |
| ACT-HV (Harvest) | $200K | $245K | 122% | $50K | $36K | 73% |
| ... | | | | | | |

**Build script:** Already partially exists in `sync-finance-to-notion.mjs` — need to surface in dedicated page. ~1 hour.

### Build 4: Cashflow scenarios

**What it is:** Compare 3-4 scenarios side by side.

**Default scenarios:**
- **Base** — current trajectory continues
- **PICC doesn't renew** — Voice drops $478K, see runway impact
- **R&D refund delayed to Q4 FY27** — see Q1 FY27 cash dip
- **CivicGraph ships first paying customer Q3 FY27** — additional $50-200K Flow

**Inputs:** the 13-week forecast extended to 12 months, with scenario adjustments applied.

**Output: scenario comparison table:**

| Month | Base | No PICC | R&D delayed | CG first sale |
|---|---:|---:|---:|---:|
| Jul 2026 | $1.32M | $1.30M | $1.32M | $1.32M |
| Sep 2026 | $1.45M | $1.40M | $1.30M | $1.50M |
| Dec 2026 | $1.20M | $1.10M | $1.05M | $1.30M |
| Mar 2027 | $1.10M | $0.85M | $1.20M | $1.25M |

**Build script:** `scripts/scenario-modeller.mjs`. ~3 hours (most complex build).

---

## Part 5 — Why we're better off building this in Notion than buying

### Cost
- Float: $70/mo = $840/yr
- Fathom: $60/mo = $720/yr
- Causal: $50–150/user/mo = $1,200–3,600/yr
- **ACT in Notion + Supabase: $0/mo incremental** (Notion already paid, Supabase free tier covers our scale)

**Annual saving: $1.5K–$5K** depending on stack. More importantly:

### Tighter integration
- Float has no concept of "pile" or "R&D-eligible" tagging
- Causal has no GHL connection
- Fathom has no GrantScope research view
- Runway is enterprise-priced and has no Australian R&DTI awareness

### One source of truth for ACT-specific concepts
- "Pile" (Voice / Flow / Ground / Grants) — our framing, not theirs
- R&D-eligibility flag — Australian-specific (43.5% refund)
- IPP-JV awareness — we're tracking this
- CivicGraph + GrantScope — unique to us

### What we lose by not buying
- **Polish**: their UIs are slicker than Notion tables
- **Scenario UX**: Causal's scenario builder is genuinely superior
- **Benchmarking**: Fathom benchmarks against industry — we don't have that data

**Verdict:** the polish + benchmarking gap is real but minor. The integration and cost wins are substantial. Build, don't buy.

---

## Part 6 — Concrete sequencing

### This week (highest leverage)
1. **Build the 13-week cash forecast** (Build 1) — closes the biggest gap
2. **Push to Notion as new sub-page** "Cash Forecast"

### Next week
3. **Build KPIs & concentration page** (Build 2)
4. **Wire budget-vs-actual into pile pages** (Build 3 — extending existing)

### Within 2 weeks
5. **Build scenario modeller** (Build 4) — most complex but highest strategic value

### Ongoing (already running)
- Mon 6am-8:45am: full sync chain
- Fri 3pm: weekly digest
- Manual: `node scripts/xero-suggest-matches.mjs` when reconciling
- Manual: edits to ACT Opportunities DB → push to GHL

---

## Part 7 — What this gives Ben + Nic

**Open Notion → ACT Money Framework. In 30 seconds you can answer:**
1. How much cash do we have right now?
2. How long does that last at current burn (runway)?
3. What's coming in over the next 13 weeks?
4. What's the biggest opportunity to chase this week?
5. What should we worry about (compliance, stale opps, unreconciled)?
6. How are we tracking vs budget per project?
7. What if [X happens] — does it break us?

**Open the same page Friday afternoon. In 5 minutes you can:**
1. See the Friday Digest of what changed this week
2. Review captured questions from the Money Sync Page
3. Decide top 3 actions for next week

**Open the database. In 2 minutes you can:**
1. Filter by Pile to triage
2. Click any row to see source (Xero invoice or GHL deal)
3. Mark Won/Lost — change flows back to GHL automatically

That's the surface. The 4 builds above close the last 20% of capability gap vs paid tools.

---

## Part 8 — Risks + tradeoffs

### Risks
- **We're maintaining sync code we built** — if Xero or Notion change APIs, we fix it. Float would absorb that.
- **Notion table UX has limits** — for >100 rows, it gets clunky. We mitigate via filtered views.
- **Forecast quality depends on input quality** — if recurring bills aren't tagged or scheduled grants aren't entered, forecast is wrong.

### Tradeoffs
- **More flexibility, less polish.** Our finance views look like a working spec, not a designer dashboard.
- **More owner-knowledge, less plug-and-play.** Ben/Nic need to know the architecture (this doc).
- **More extensible, more brittle.** When it breaks, no support team — Ben fixes it.

If at any point we cross 5+ entities (ACT Pty + Harvest sub + Farm entity + IPP JV + EL World Tour entity), Fathom or similar may earn its keep. Until then, build wins.

---

## Cross-references

- [act-money-framework.md](act-money-framework.md) — canonical framework
- [cy26-money-philosophy-and-plan.md](cy26-money-philosophy-and-plan.md) — strategy + sequencing
- [fy26-voice-flow-gap-analysis.md](fy26-voice-flow-gap-analysis.md) — strategic gap reading
- Notion: ACT Money Framework `357ebcf981cf8101bc12dd5eab9ebec5`

## Sources

- [Float Cash Flow Forecasting](https://floatapp.com/) — cashflow plugin for Xero/QBO
- [Float Cash Flow 2026 Pricing & Features](https://www.softwareadvice.com/product/93313-Float-Cash-Flow/) — feature breakdown
- [Causal vs Runway Financial Comparison](https://www.g2.com/compare/lucanet-ag-causal-vs-runway-financial) — modelling tool comparison
- [Runway: choosing between Runway and Causal](https://runway.com/blog/choosing-between-runway-and-causal-read-this-before-you-decide) — when each fits
- [Fathom vs Spotlight Reporting](https://www.getapp.com/business-intelligence-analytics-software/a/fathom/compare/spotlight-reporting/) — Xero reporting tool compare
- [Best Xero Integrations for Reporting](https://www.fathomhq.com/blog/best-xero-integrations-for-reporting-and-business-efficiency) — Fathom's market view
- [Notion Cash Flow Management Templates](https://www.notion.com/templates/category/cash-flow-management) — community templates
- [99 Free Notion Templates 2026](https://www.notioneverything.com/blog/free-notion-templates) — broader template pool
