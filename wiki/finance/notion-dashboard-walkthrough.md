---
title: Notion Dashboard Setup — Walkthrough for ACT Money
status: User-facing setup guide
date: 2026-05-06
audience: Ben + Nic
purpose: Step-by-step for setting up Dashboard views on each useful database, recommended views per database, optional extra databases worth creating, and how to link them.
tags:
  - notion
  - dashboard
  - walkthrough
parent: act-money-framework
---

# Notion Dashboard Setup — Walkthrough

> **The goal.** By the end of this you'll have: (1) a Money Metrics dashboard with charts that show bank/runway/pile income trending over weeks, (2) an Opportunities dashboard with charts showing pipeline by Pile/Source/Stage, and (3) a clear sense of which views work best for which data shape.

---

## Part 1 — What's a Notion Dashboard view?

Released March 2026 (Business plan). It's a database VIEW type that lets you mix:
- **Number widgets** — single big metric (e.g., "Bank Cash $679K")
- **Chart widgets** — line, bar, donut, stacked bar
- **Table widgets** — small filtered tables (e.g., Top 10 by Amount)
- **List widgets** — filtered lists

Limits: max 12 widgets per dashboard, 4 per row. Each widget has its own filter and view config.

You set them up ONCE in the Notion UI (~5 min per dashboard). The data underneath is auto-refreshed by the Mon morning cron.

---

## Part 2 — Set up Dashboard views (in order of priority)

### Dashboard 1: Money Metrics (the trend dashboard)

**Database:** [Money Metrics (snapshots over time)](https://www.notion.so/807d55fb86f34edf8e92c82696ebd750)

**Why this one first:** every weekly snapshot adds a row. After 4-8 weeks you'll see real trends (currently the 12 backfilled rows have today's values, so trends look flat).

**Setup:**
1. Open the database. Click ⋯ → Connections → + Add → JusticeHub (one-time)
2. Click `+` next to "Default view" → choose **Dashboard**
3. Add 8 widgets in this layout:

#### Row 1 — "Right Now" (4 number widgets)

| Widget | Type | Data | Conditional formatting |
|---|---|---|---|
| Bank Cash | Number | Property: `Bank Cash` · Calc: Latest | Red if <100,000; Orange if <300,000 |
| Runway | Number | `Runway Months` · Latest | Red if <6; Orange if <12 |
| FY26 Net | Number | `FY26 Net` · Latest | Red if negative |
| Days to Cutover | Number | `Days to Cutover` · Latest | Red if <30; Orange if <60 |

#### Row 2 — "Trends" (3 line charts + 1 number)

| Widget | Type | X-axis | Y-axis |
|---|---|---|---|
| Bank Cash trend | Line chart | `Snapshot Date` | `Bank Cash` |
| Runway trend | Line chart | `Snapshot Date` | `Runway Months` |
| FY26 Net trend | Line chart | `Snapshot Date` | `FY26 Net` |
| R&D Refund forecast | Number | `R&D Eligible Spend` × 0.435 (use formula) | Caption: "expected refund" |

#### Row 3 — "Pile breakdown" (2 stacked charts)

| Widget | Type | Setup |
|---|---|---|
| Pile income over time | Stacked bar | X: `Snapshot Date`, Stack: Voice/Flow/Ground/Grants Income |
| Latest pile mix | Donut | Latest snapshot's Voice/Flow/Ground/Grants Income |

**Filter the dashboard globally:** "Snapshot Date in last 12 weeks" — keeps it readable.

**Pin Dashboard view as default.**

---

### Dashboard 2: ACT Opportunities (the operational dashboard)

**Database:** [ACT Opportunities](https://www.notion.so/a28b97ba80b248c89d3d65486d865a07)

**Why:** 408 rows of pipeline + invoices + grants. Best for slicing by Pile, Source, Stage.

**Setup:**
1. Open database. Add JusticeHub connection if not done.
2. + → Dashboard
3. Add 12 widgets:

#### Row 1 — "Pipeline summary" (4 numbers)

| Widget | Type | Data |
|---|---|---|
| Total open pipeline | Number | `Amount` Sum where `Stage=Open` |
| Total won FY26 | Number | `Amount` Sum where `Stage=Won` |
| Overdue receivables | Number | `Amount` Sum where `Stage=Overdue` |
| Active deal count | Number | Count where `Stage=Open` |

#### Row 2 — "By pile" (3 charts + 1 number)

| Widget | Type | Setup |
|---|---|---|
| Open $ by Pile | Bar chart | X: `Pile`, Y: `Amount` Sum, filter: Stage=Open |
| Count by Source | Donut | Group: `Source` (GHL/Xero/Foundation) |
| Count by Stage | Donut | Group: `Stage` |
| Top pipeline | Number | `Amount` Sum where `Pile=Flow` and `Stage=Open` |

#### Row 3 — "Action lists" (4 tables/lists)

| Widget | Type | Setup |
|---|---|---|
| Top 10 by amount | Table | Filter: Stage=Open · Sort: Amount desc · Limit 10 · Show: Name, Pile, Amount, Source URL |
| Overdue chase list | Table | Filter: Stage=Overdue · Sort: Amount desc · Show: Name, Funder/Contact, Amount, Source URL |
| Researching grants | List | Filter: Source=Foundation, Stage=Researching · Sort: Deadline asc |
| Recently won | List | Filter: Stage=Won · Sort: Last Synced desc · Limit 8 |

**Global filter:** none (this dashboard shows all-time pipeline)

**Pin Dashboard view as default.**

---

## Part 3 — Per-database view recommendations (beyond Dashboard)

You don't have to use Dashboard view exclusively. Different views shine for different jobs.

### ACT Opportunities — recommended views

| View | Layout | Filter | Sort/Group | When to use |
|---|---|---|---|---|
| **Dashboard** | Dashboard | (none) | (charts inside) | Default — exec view |
| **By Pile (Kanban)** | Board | (none) | Group by Pile | Drag deals between piles, see balance |
| **Open Pipeline** | Board | Stage in Open/Outstanding/Discovered/Researching | Group by Stage | Live workload |
| **Chase List** | Table | Stage = Overdue | Sort Amount desc | Money won, not collected |
| **Foundation Triage** | Table | Source = Foundation, Stage = Discovered | Sort Deadline asc | Grant submissions by deadline |
| **GHL Deals** | Table | Source = GHL | Sort Pipeline | Mirror of GHL with click-through |
| **Xero Outstanding** | Table | Source = Xero | Sort Amount desc | Invoices needing payment |
| **Calendar** | Calendar | Show Deadline | (auto) | Visual deadline planning |

### Money Metrics — recommended views

| View | Layout | Filter | When to use |
|---|---|---|---|
| **Dashboard** | Dashboard | Last 12 weeks | Default — trend overview |
| **All snapshots** | Table | (none) | Audit trail of weekly captures |
| **YTD trend chart** | Chart (single) | (none) | Full-year view |

---

## Part 4 — Linking databases (relations)

Notion supports **relation** properties — like a foreign key in a normal database. This lets you click from one row to its related rows in another database.

### Useful relations to add

#### A. Opportunities ↔ Money Metrics (rolling FY snapshot)
Each Opportunities row could reference the latest Metrics snapshot. Less useful for daily work, more for retrospective analysis.

**Setup:** Open Opportunities → + Add property → Relation → choose Money Metrics
**Use:** filter/group by snapshot week to see "what was open this week"

#### B. Opportunities ↔ a new Decisions Log database (recommended)
Every Won/Lost decision could link back to a Decision row.

**Setup:**
1. Create new database "Decisions Log" with: Date, Decision, Context, Owner, Status, Linked Opp (relation back to Opportunities)
2. On Opportunities, add reverse relation: "Decisions" (auto-populated)

**Use:** click an Opp → see all decisions about it. Click a Decision → see the Opp.

#### C. Opportunities ↔ a new Action Items database (recommended)
Every Opp can spawn one or more action items.

**Setup:**
1. Create "Action Items" with: Status (To do/Doing/Done), Owner, Due, Description, Linked Opp
2. Opportunities gains a reverse "Actions" property

**Use:** open an Opp → see what actions are queued. Or open Action Items → see by Owner/Due.

#### D. Opportunities ↔ a Foundations database (advanced)
For Source=Foundation rows, link to a Foundations row holding profile data (Total Giving, DGR, Themes, Application Tips).

**Setup:**
1. Create "Foundations" database (or sync from Supabase `foundations` table — I can build this)
2. On Opportunities Foundation rows, link to Foundation row
3. Foundation rows show all related grants

**Use:** click any foundation grant → see funder profile inline.

---

## Part 5 — Recommended NEW databases to create

These would meaningfully extend the workspace. I can build any of these when you're ready.

### 1. Decisions Log (highest leverage — recommended)

**Why:** every business decision flows through Notion (or should). Right now decisions live in scattered notes and the Money Sync page. A dedicated DB makes them filterable + auditable.

**Schema:**
- Title (title)
- Date (date)
- Decision (rich text — what was decided)
- Context (rich text — why)
- Owner (select: Ben/Nic/both/Standard Ledger)
- Status (select: Proposed/Decided/Reversed/Superseded)
- Linked Opp (relation → Opportunities)
- Linked Page (rich text — URL)
- Tags (multi-select: cutover/payroll/r-and-d/tax/family/etc)

**Suggested views:**
- **Recent decisions** — Table sorted by Date desc, last 30
- **By owner** — Board grouped by Owner
- **By tag** — Board grouped by Tag
- **Awaiting decision** — Filter Status=Proposed, sort by Date asc
- **Standard Ledger queue** — Filter Owner=Standard Ledger

### 2. Action Items (high leverage)

**Why:** the framework page surfaces "what's burning" but doesn't track follow-through. An Action Items DB closes that loop.

**Schema:**
- Title (title)
- Status (select: To do/Doing/Done/Cancelled)
- Owner (select)
- Due (date)
- Description (rich text)
- Linked Opp (relation → Opportunities)
- Source (select: Friday Digest / Money Sync / Manual)
- Created (created_time auto)

**Suggested views:**
- **My week** — Filter Owner=me, Status≠Done, sort by Due
- **Overdue** — Filter Due<today, Status≠Done
- **By owner** — Board grouped by Owner
- **Calendar** — show Due date

### 3. Foundations (medium leverage)

**Why:** mirror of `foundations` Supabase table. Useful to drill into funders, see history.

**Schema:**
- Name (title)
- Type (select)
- Has DGR (checkbox)
- Total Giving / yr (number AUD)
- Themes (multi-select)
- Geographic Focus (multi-select)
- Website (URL)
- Application Tips (rich text)
- Linked Grants (relation → Opportunities where Source=Foundation)

**Suggested views:**
- **By giving size** — Table sorted by Total Giving desc
- **Indigenous-focused** — Filter Themes contains 'indigenous'
- **DGR only** — Filter Has DGR=true
- **Active relationships** — Filter "Linked Grants > 0"

### 4. Standard Ledger Q&A (low-medium leverage)

**Why:** Money Sync page has questions but they're free-form. A dedicated DB makes them assignable + closeable.

**Schema:**
- Question (title)
- Status (select: Open/Awaiting Reply/Answered/Closed)
- Asked Date / Answered Date
- Owner (always Standard Ledger or R&D Consultant or Lawyer)
- Topic (multi-select: payroll/cutover/r-and-d/trust/cgt/etc)
- Answer (rich text)
- Linked Decision (relation → Decisions Log)

**Use:** when emailing Standard Ledger, paste the open questions table directly.

### 5. Stakeholders / Family (low leverage but useful for trust planning)

**Why:** track who can receive what (trust beneficiaries, employees, contractors), with tax/super status.

**Schema:**
- Name (title)
- Relationship (select: Founder/Family/Partner/Employee/Contractor)
- Tax File Number (rich text — sensitive, restrict access)
- Super Fund (rich text)
- Trust Beneficiary (checkbox per Knight/Marchesi trust)
- Marginal Rate Estimate (number — for planning distributions)
- Notes (rich text)

**Use:** at year-end trust resolution, filter to Trust Beneficiary=true and reference for the resolution.

---

## Part 6 — Practice flow (test what's best)

Best way to learn what works: open each database and try 3 views.

### Practice 1 — Opportunities (15 min)

1. Open [Opportunities DB](https://www.notion.so/a28b97ba80b248c89d3d65486d865a07)
2. Try the existing Default view (table with all 408 rows)
3. + Add view → **Board** → group by Pile. Drag a row across columns.
4. + Add view → **Calendar** → show Deadline date. See what's due when.
5. + Add view → **Dashboard** → follow setup in Part 2.
6. Decide which feels best as your default — pin it.

### Practice 2 — Money Metrics (10 min)

1. Open [Money Metrics DB](https://www.notion.so/807d55fb86f34edf8e92c82696ebd750)
2. Try the Default view (table)
3. + Add view → **Dashboard** → follow setup in Part 2 (Money Metrics row config)
4. Watch how Number widgets show "Latest" by default

### Practice 3 — Tell Notion AI to do it for you (3 min)

Either DB → Cmd+J → describe the dashboard you want in plain English. Notion AI builds it. Faster than manual config.

---

## Part 7 — Decision points

After playing with the views, decide:

| Question | If yes... | If no... |
|---|---|---|
| Should Decisions Log exist? | I'll create it (~10 min) | Stay with Money Sync free-form |
| Should Action Items exist? | I'll create + wire to Opps | Stay with toggle lists |
| Should Foundations DB exist? | I'll sync 5K rows from Supabase | Use existing CivicGraph for funder research |
| Should Standard Ledger Q&A exist? | I'll create + wire to Money Sync | Stay with Money Sync section |
| Should Stakeholders exist? | I'll create empty schema | Skip until trust resolution time |

Tell me which to build.

---

## Part 8 — One philosophy point

The point of these databases isn't to be exhaustive. **Each database needs to earn its keep by surfacing decisions you'd otherwise miss.** If a Decisions Log gets used 2-3x/week, it earns it. If it gets used once a month, kill it and go back to free-form notes.

The opposite mistake: too many databases creates "where do I put this?" friction. Right now you have 2 (Opportunities + Money Metrics) plus pages. That's enough for the system to work. Add new DBs only when free-form notes feel clearly inadequate.

---

## Cross-references

- [act-money-framework.md](act-money-framework.md) — main framework
- [notion-finance-surface-design.md](notion-finance-surface-design.md) — why we built in Notion vs paid tools
- [cy26-money-philosophy-and-plan.md](cy26-money-philosophy-and-plan.md) — strategy + sequencing

## Sources

- [Notion Dashboard views](https://www.notion.com/help/dashboards) — official docs
- [Notion charts](https://www.notion.com/help/charts) — chart types reference
- [Notion relations](https://www.notion.com/help/relations-and-rollups) — database linking
