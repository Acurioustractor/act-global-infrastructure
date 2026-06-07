---
project: ACT-CORE
date: 2026-05-09
author: Claude (session w/ Ben)
type: notion-ai-prompt-sheet
status: ready-to-paste
purpose: Paste-ready Notion AI prompts to rebuild ACT Money Framework as a relational dashboard backed by databases instead of script-pushed text blocks. Replaces the v3 sync-act-now-to-notion approach (which Ben flagged as "a fuck load of information to digest").
---

# Notion AI dashboard build — exact prompts

## Why this exists

The script-pushed approach (sync-act-now-to-notion.mjs) hit its ceiling. Even with KPI strips + native tables, every section is a static dump that gets regenerated each cron tick. You can't sort, filter, or drill in. Numbers are ungrounded — they land as text without provenance.

Notion's actual strength is **databases + relations + Dashboard views**. The fix: instead of writing tables INTO the page, the page should EMBED LINKED VIEWS of databases that update themselves. We'll use Notion AI to do most of the build because typing it manually is the slow path.

## Target shape — what one screen should feel like

When you open ACT Money Framework, you should see, top-to-bottom, on **one scroll**:

```
┌───────────────────────────────────────────────────────────────────┐
│  🏛️ ACT Money — Dashboard                     last sync · 8:11am  │
├───────────────────────────────────────────────────────────────────┤
│  [KPI 1: Cash]  [KPI 2: Runway]  [KPI 3: Net]  [KPI 4: Days to    │
│   $679,915      30.9 mo          $727,582      cutover (52)]      │
├───────────────────────────────────────────────────────────────────┤
│  💰 Receivables outstanding              [Linked view of Opps]   │
│   ▸ Top 10 invoices · sortable · click-through to Xero            │
├───────────────────────────────────────────────────────────────────┤
│  📋 BAS by quarter                       [BAS Quarterly DB]      │
│   ▸ Q2/Q3/Q4 with status traffic light                            │
├───────────────────────────────────────────────────────────────────┤
│  🛎️ Decisions awaiting                  [Linked view, Status=    │
│   ▸ Proposed > 7d, sorted by age          Proposed]              │
├───────────────────────────────────────────────────────────────────┤
│  🔥 Critical actions                     [Linked view, Priority= │
│   ▸ Critical/High not Done                Critical/High]         │
├───────────────────────────────────────────────────────────────────┤
│  🪣 Pipeline by pile                     [Board view of Opps     │
│   ▸ Voice/Flow/Ground/Grants columns      grouped by Pile]       │
└───────────────────────────────────────────────────────────────────┘
```

Everything below the line is **a linked view of a real DB**, not a text dump. Filter, sort, click-through all work natively. Numbers stay live because the DBs stay live.

## Database inventory

| What | Status | Lives where |
|---|---|---|
| Money Metrics (weekly snapshots) | ✅ exists | `moneyMetricsDb` 807d55fb… |
| Opportunities (~408 rows) | ✅ exists | `opportunitiesDb` a28b97ba… |
| Decisions Log | ✅ exists | `decisionsLog` f8b0bfb6… |
| Action Items | ✅ exists | `actionItems` 6e92d3e0… |
| Foundations (top 100 funders) | ✅ exists | `foundationsDb` 1fcb4f9e… |
| Standard Ledger Q&A | ✅ exists | `ledgerQA` 10862028… |
| Stakeholders | ✅ exists | `stakeholders` 06a4610e… |
| Entity Hub (orgs across systems) | ✅ exists | `entityHub` 59ea01f5… |
| **BAS Quarterly** | ❌ missing | — needs new DB |
| **Plans (tracking review status)** | ❌ missing | — could be new DB or stay as filesystem |
| **Drafts** | ❌ missing | — could be new DB or stay as filesystem |

**Relations to add** (so cross-DB roll-ups work):
- Decision → Opportunities (which deals does this decision affect?)
- Action Item → Decision (which decision spawned this action?) AND Action Item → Opportunity
- Opportunity → Foundation (already exists for grant opps — verify)
- BAS Quarterly → linked Xero invoice references (just text refs — no need for full relation)
- Action Item → Stakeholder (who owns this action?)

## Notion AI prompts (paste in order)

**How to invoke**: open the ACT Money Framework page, click the **Ask AI** button at the top of the page (or hit `space` then "AI"), paste the prompt below, and hit enter. Verify the result before moving to the next prompt.

---

### Prompt 1 — Build the BAS Quarterly database

**Where to paste**: Money Framework page · Ask AI

```
Create a new database called "BAS Quarterly" as a child of this page.

Properties:
- Quarter (title, e.g. "Q2 FY26 (Oct-Dec 25)")
- FY (text, e.g. "FY26")
- Period (date range)
- Lodgement due date (date)
- Status (select: "In progress", "Lodged", "Overdue", "Reconciled")
- Total invoices (number)
- AR outstanding (number, AUD format)
- AP outstanding (number, AUD format)
- AP missing receipts count (number)
- AP missing receipts amount (number, AUD format)
- Notes (rich text)
- Linked invoices (relation to Opportunities database, since AR/AP invoices already live there)

Then add 3 rows seeded with these values:
- Q2 FY26 (Oct-Dec 25) · period 2025-10-01 to 2025-12-31 · due 2026-02-28 · Status: Lodged · 384 invoices · AR $38,850 · AP $84,201 · 9 missing receipts · $15,972 missing
- Q3 FY26 (Jan-Mar 26) · period 2026-01-01 to 2026-03-31 · due 2026-04-28 · Status: Lodged · 350 invoices · AR $107,150 · AP $210,641 · 0 missing receipts
- Q4 FY26 (Apr-Jun 26) · period 2026-04-01 to 2026-06-30 · due 2026-07-28 · Status: In progress · 19 invoices so far · AR $302,890 · AP $4,233 · 0 missing receipts

Default view: table sorted by Period descending (newest first).
```

**Verify after**: open the new BAS Quarterly DB, confirm 3 rows present, Status select shows correct colors (Lodged=green, In progress=yellow, Overdue=red).

---

### Prompt 2 — Set up cross-DB relations

**Where to paste**: Money Framework page · Ask AI (on a new line below the existing content)

```
Add these relations between existing databases — bidirectional unless I say otherwise:

1. Decisions Log → Opportunities (relation property "Affects opportunities")
2. Action Items → Decisions Log (relation property "Originating decision")
3. Action Items → Opportunities (relation property "Linked opportunity")
4. Action Items → Stakeholders (relation property "Owner")

Don't change existing data. Just add the relation properties so future rows can be linked.

After adding the relations, in each of those databases, add a new view called "🔗 With links" that shows the new relation columns alongside the existing primary columns.
```

**Verify after**: Decisions Log shows new "Affects opportunities" property as Empty for all existing rows (we'll backfill links manually for the most important ones — that's a separate exercise).

---

### Prompt 3 — Build the ACT Now executive dashboard at the top of this page

**Where to paste**: Money Framework page · Ask AI

```
At the very top of this page, above the existing "📊 Right now" section, create a section called "🎯 ACT Now" with these elements in order:

(A) A 4-column KPI callout strip:
- 💰 Cash in trading accounts — pull the latest "Bank Cash" number from the Money Metrics database
- 🛬 Runway months — latest "Runway Months" from Money Metrics. Color red if < 6, orange if < 12, green otherwise
- 📈 FY26 net surplus — latest "FY26 Net" from Money Metrics
- ⏱️ Days to ACT Pty cutover — calculated from today to 2026-06-30. Color red if < 30, orange if < 60

(B) A linked view of the Opportunities database titled "💰 Receivables outstanding". Filter:
- Source contains "Xero" AND Stage is one of "Sent" or "Won" or "Authorised"
- Amount Due > 0
View as table. Columns: Name, Amount, Amount Due, Due Date, Days overdue (if you can compute it from Due Date), Source link.
Sort by Amount Due descending. Limit visible rows to 10.

(C) A linked view of the new BAS Quarterly database titled "📋 BAS by quarter". 
View as table sorted by Period descending. Show all columns.

(D) A linked view of the Decisions Log database titled "🛎️ Decisions awaiting".
Filter: Status equals "Proposed". Sort by Created (oldest first). Limit 5 rows.

(E) A linked view of the Action Items database titled "🔥 Critical actions". 
Filter: Priority is one of "Critical" or "High" AND Status does not equal "Done".
Sort by Due ascending. Limit 5 rows.

(F) A linked view of the Opportunities database titled "🪣 Pipeline by pile".
Filter: Stage is not one of "Lost" or "Closed Won" (active pipeline only).
View as Board grouped by Pile. Card preview shows Name + Amount + Stage.

Important constraints:
- Every section B-F must be a LINKED view of an existing database, not a static table.
- Don't generate text summaries between sections — the views ARE the content.
- Use the existing emojis and section titles exactly as I've written them.
- Place this whole "🎯 ACT Now" section ABOVE the current "📊 Right now" KPI strip, so when I open the page it's the first thing I see after the page title.
```

**Verify after**: scroll to the top of Money Framework. The "🎯 ACT Now" section sits above "📊 Right now". Each linked view is interactive — sortable, filterable, click-through to source row in Xero/GHL.

---

### Prompt 4 — Wire up the Money Metrics Dashboard view (charts)

**Where to paste**: Money Metrics DB page · Ask AI

```
Add a new view to this database called "Dashboard" using the Dashboard view type.

Add these widgets (12 max, 4 per row):

Row 1 (KPI numbers):
- Number widget: latest "Bank Cash" with conditional <100,000 = red, <250,000 = orange
- Number widget: latest "Runway Months" with conditional <6 = red, <12 = orange
- Number widget: latest "FY26 Net" 
- Number widget: latest "R&D Eligible Spend" with caption "× 0.435 = forecast refund"

Row 2 (trends):
- Line chart: "Bank Cash" by "Snapshot Date"
- Line chart: "Runway Months" by "Snapshot Date"
- Stacked bar: Voice + Flow + Ground + Grants Income by Snapshot Date
- Bar chart: R&D Eligible Spend by Snapshot Date

Row 3 (activity):
- Number widget: count of records (snapshots so far)
- Number widget: latest "AR Outstanding"
- Number widget: latest "AP Outstanding" 
- Number widget: latest "Receivables Aging > 30d" count

Pin Dashboard view as the default view of this database.
```

**Verify after**: open Money Metrics DB. Default view is Dashboard. Numbers show realistic figures. Line charts will be flat for the first ~4 weeks (per existing backfill note in the dashboard walkthrough); they'll fill in as Mon 9:15am cron appends snapshots.

---

### Prompt 5 — Wire up the Opportunities Dashboard view

**Where to paste**: Opportunities DB page · Ask AI

```
Add a new view to this database called "Dashboard" using the Dashboard view type.

Filter the dashboard to: Stage is not one of "Lost" or "Closed Won" (active pipeline only).

Widgets (8 total, 4 per row):

Row 1:
- Bar chart: count grouped by Pile (Voice / Flow / Ground / Grants / Other)
- Bar chart: sum of Amount grouped by Pile
- Donut chart: count grouped by Source (GHL / Xero / Foundation grant)
- Number widget: count of all open opportunities

Row 2:
- Table: Top 10 by Amount where Stage = "Sent" or "Authorised" or "Signal"
- Table: Top 10 stale (no stage change > 60 days) — sortable by Last Modified ascending
- Number widget: sum of Amount where Pile = "Flow" (Goods commercial pipeline)
- Number widget: sum of Amount where Pile = "Grants" (philanthropic + government pipeline)

Pin Dashboard view as the default view of this database.

Also: in this database, identify all rows where Pile is empty or "Other" but the Source is "GHL" or the Name contains "Goods" or "CivicGraph" — flag those for me in a list at the top of the dashboard so I can re-tag them. (Voice currently shows $0 across 5 opps — I want to find which Voice-tagged opps have empty Amount and untag them or fill in values.)
```

**Verify after**: open Opportunities DB Dashboard. Pile bar chart shows real counts. The flagged-for-retag list at top shows the Voice opps with $0 amounts.

---

### Prompt 6 — Decisions ↔ Actions cross-roll-up

**Where to paste**: Decisions Log DB page · Ask AI (after Prompt 2 has added the relations)

```
On the Decisions Log database, add a rollup property called "Open actions count" that:
- Rolls up the "Originating decision" relation from Action Items
- Counts where Action Items Status does not equal "Done"

Add another rollup called "Total action $$ at stake" that:
- Rolls up the "Linked opportunity" relation from Action Items → through to Opportunities → sum of Amount

Add a view to this database called "Decisions awaiting" with filter:
- Status = "Proposed"
- Sort: Created ascending (oldest first)
Show columns: Decision, Created, Open actions count, Total action $$ at stake.
```

**Verify after**: Decisions Log "Decisions awaiting" view shows each Proposed decision with the count of open actions waiting on it + the total dollar amount of opps those actions touch. Now you can prioritize which decision to make first.

---

### Prompt 7 — One-page summary at the top of the dashboard hub

**Where to paste**: Money Framework page · Ask AI (after Prompts 1–3 are done)

```
At the very top of this page, above the existing "🎯 ACT Now" section, add a single callout block titled "📡 Today's narrative" with this content:

"As of [today's date], ACT has [Cash] in the bank with [Runway] months runway. The biggest active receivable is [Top receivable name] at [Top receivable amount]. The next BAS lodgement is [next BAS quarter from BAS Quarterly DB] due [date]. The most-pressing decision awaiting Ben/Nic is [oldest Proposed decision]. Pipeline next 90d weighted: [sum of Amount where Stage = Sent/Won/Signal AND Expected close within 90d]."

Pull every figure from the live databases. Don't hardcode anything. Refresh the callout daily by re-running this AI prompt or by adding it to a Notion automation.
```

**Verify after**: callout reads as a coherent paragraph with live numbers. If the figures look wrong, flag the source DB.

---

## Migration plan — what happens to the script

After Prompts 1–5 land cleanly:

1. **Disable** `act-now-sync` in `ecosystem.config.cjs` (comment out or remove the entry, then `pm2 reload + pm2 save`).
2. **Decommission** `scripts/sync-act-now-to-notion.mjs` (move to `scripts/_archive/2026-05-act-now-script-pushed/`).
3. **Restore** the daily refresh of the underlying DBs (Money Metrics weekly cron, Opportunities Mon cron, etc. — these already exist and work fine).
4. **Keep** the BAS Quarterly DB in sync — write a new lightweight script `scripts/sync-bas-quarterly-to-notion.mjs` that updates the 3 rows each Mon morning with fresh `xero_invoices` aggregates (no need for daily — BAS state changes weekly at most).

The cron stops pushing dense text. The dashboards stay live. Notion AI handles refresh of the narrative summary if you want it.

## Open questions — confirm before pasting Prompt 1

1. **Is Notion AI active on the workspace?** (Business plan or Plus with AI add-on. The Dashboard view widget feature requires Business plan.)
2. **OK to add 4 new relation properties to Decisions Log + Action Items?** They're additive — no existing data lost — but they add columns visible to anyone using those DBs.
3. **OK to create the new BAS Quarterly DB as a child of Money Framework?** Or do you want it elsewhere (e.g. as a top-level DB under the workspace root)?

If yes/yes/yes, paste Prompt 1 first and report back what Notion AI produced.

## After all 7 prompts run

The Money Framework page becomes:

1. 📡 Today's narrative (Prompt 7 — one paragraph, live figures)
2. 🎯 ACT Now (Prompt 3 — KPIs + 5 linked views)
3. 📊 Right now (existing — keep as redundant cross-check or remove)
4. 🧭 Navigate (existing — links to all child pages)
5. ... rest of existing content

The script-pushed "🎯 ACT Now — executive read" child page (the one Ben said was "super ugly") gets archived. ACT Now lives ON the dashboard hub, not below it.
