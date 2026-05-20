---
title: ACT finance systems — full-surface review + improvement punch list
status: draft for Ben
date: 2026-05-21
audience: Ben
purpose: Review all four finance surfaces (Notion · command-center · scripts · Telegram) and produce a prioritized punch list of improvements focused on accounting alignment and project-level incoming/outgoing visibility.
verified_against:
  - mcp__supabase__execute_sql (CY26 tagging coverage)
  - apps/command-center/src/app/finance/ (24 live routes)
  - apps/command-center/src/app/api/finance/ (30+ API routes)
  - apps/command-center/src/lib/nav-data.ts (sidebar grouping)
  - ecosystem.config.cjs (PM2 cron chain)
  - config/notion-database-ids.json (13 finance pages)
  - thoughts/shared/reviews/notion-finance-dashboard-2026-05-08.md (prior review)
  - thoughts/shared/handoffs/2026-05-17-finance-tagging-platform-handoff.md
---

# TL;DR

You have **a lot more system than you need to feel anxious about**, and the rails are clean (99%+ tagging coverage on both invoices and transactions for ACT accounts post 2026-05-18 cleanup). The actual gaps fall into three buckets:

1. **One missing concept: "funder commitment vs drawn"** — there's no explicit `project_funding_allocations` table. Today the link "Minderoo committed $900K → ACT-GD → we've drawn $X" lives only in human memory + Notion narrative. This is the biggest single accounting-alignment hole.
2. **Surface sprawl** — 24 finance routes, 30+ API endpoints, 11-script Monday cron chain (write-order matters), 13+ Notion pages. Most of this is fine, but the operate ↔ read surfaces don't cross-link, so you can be in `/finance/money-alignment` and not realize the Notion `moneyInAlignment` page exists, or vice-versa.
3. **Telegram surface drift** — the 4-surface model says "Telegram = push", canonical is one daily message. Reality: 4 daily pushes (7:00 daily-briefing · 7:30 telegram-daily-focus · 8:11 act-now · 8:13 Notion daily-pulse). Consolidation candidate.

The "see project incoming and outgoing easily" headline already exists at **`/finance/projects/[code]`** — it shows Received / Pending / Spent / Net Position cards + Income Streams grouped by type. The improvement is to make it more **future-facing** (funder drawdown, weekly burn, project-specific 13-week cash) and to add a true funder→project allocation source of truth behind it.

---

# Current state (verified)

## Tagging coverage — actually excellent

| Bucket | Tagged rows | Untagged rows | Tagged $ | Untagged $ | Coverage |
|---|---:|---:|---:|---:|---:|
| ACCREC invoices (incoming) | 124 | 1 | $2.8M | $0 | **99.2%** |
| ACCPAY invoices (outgoing bills) | 1,981 | 110 | $1.76M | $36.5K | **94.7%** |
| NAB Visa ACT #8815 transactions (CY26) | 740 | 7 | $467K | $487 | **99.1%** |
| NJ Marchesi T/as ACT Everyday (CY26) | 58 | 0 | $332K | $0 | **100%** |

The 2026-05-18 cleanup landed. The remaining gap is 110 ACCPAY bills + 7 NAB transactions — a 30-min sweep.

## Per-project route — richer than it feels

`/finance/projects/[code]/page.tsx` already renders:
- Audit alerts panel + notable findings (severity-colored)
- 4 summary cards: Received / Pending / Spent / Net Position (when invoices exist)
- Income Streams grouped by type (grant / philanthropy / commercial / fee_for_service / arts / loan / other)
- Monthly breakdown chart
- Expense categories
- Salary allocation (with R&D-eligible flag)
- R&D summary with top vendors
- Pipeline section (weighted)
- Knowledge hits from semantic search
- Link to per-project transaction ledger
- "Real cost commitment" deduped across bills + bank spend

## Routes — 24 live (sidebar grouping in `apps/command-center/src/lib/nav-data.ts:106-180`)

Grouped as:
- **Operate** (top of Finance section): Money Command, All Open Actions, Workbench, AI Suggestions, Xero Page Copilot, Dext Push Audit
- **Tag & reconcile**: Reconciliation, Receipts Triage, Rapid Tagger, All Transactions, Vendors
- **Money State** (divider): Spend Audit, CEO Cockpit, Money Alignment, **Projects P&L** ← the one you asked about
- **Pipeline & invoices**: Pipeline, Invoice Command
- **Reports**: Board Report, Accountant Pack, Revenue Sequencing

## Notion pages — 13 finance entries in `config/notion-database-ids.json`

Hub: `moneyFramework` (357ebcf9-…101)
In/out canonical: `moneyInAlignment` + `moneyOutAlignment`
Models: `cashForecast`, `cashScenarios`, `kpisPage`, `budgetActual`
Pile pages: voice / flow / ground / grants
Capture (bidirectional): `moneySyncPage`, `decisionsLog`, `actionItems`, `ledgerQA`
DB: `opportunitiesDb`, `moneyMetricsDb`, `foundationsDb`, `stakeholders`, `entityHub`
Push: `weeklyDigest`, `ecosystemDigest`, `dashboardWalkthrough`

## Monday morning cron chain — 11 sync-*-to-notion scripts, write-order matters

```
07:55 ecosystem-digest
08:00 weekly-reconciliation
08:11 act-now-sync (daily)
08:13 daily-pulse-sync (daily)
08:15 dashboard-hub-sync          ← full-page replace
08:20 opportunities-db-sync
08:25 pile-pages-sync
08:30 cash-forecast-sync + notion-weekly-digest
08:35 kpis-sync
08:40 budget-actual-sync
08:45 cash-scenarios-sync
08:50 money-metrics-snapshot
08:55 planning-rhythm-sync
09:00 entity-hub-sync
09:10 money-framework-sync         ← section-replace via marker (LAST so dashboard-hub doesn't wipe it)
```

This is brittle. The 2026-05-08 review flagged the dashboard-hub ↔ money-framework write conflict; current ordering avoids it but a single re-order would silently wipe panels.

## Telegram pushes (per `ecosystem.config.cjs`)

Daily:
- 07:00 `daily-briefing.mjs`
- 07:30 `telegram-daily-focus.mjs`
- (+ 08:11 act-now Notion refresh, 08:13 daily-pulse Notion refresh — not Telegram)

Reactive:
- `telegram-money-alerts.mjs` (event-triggered)

Weekly:
- Mon 08:00 `weekly-reconciliation.mjs` posts to Telegram

The 4-surface model promises "one daily push at 8am". Today there's 7:00 + 7:30. Worth deciding if those merge.

---

# Improvement punch list (prioritized)

## 🟢 Quick wins (1–2 hour each)

### QW1 — close the residual 117-row tagging gap
- 110 untagged ACCPAY bills ($36.5K)
- 7 untagged NAB Visa rows ($487)
- 1 stray NM Personal row tagged to a project (should be untagged)

Run `/finance/transactions` filtered to UNTAGGED + bulk-tag via vendor suggestions. ~30 min.

### QW2 — kill duplicate sidebar entries / fix labels
Current "Money State" section has 4 entries that overlap conceptually:
- Spend Audit · CEO Cockpit · Money Alignment · Projects P&L

Recommend collapsing to: **CEO Cockpit (the one-page view)** · **Projects P&L (the per-project drill)** · **Audit (the cleanup queue)**. Money Alignment becomes a section *within* CEO Cockpit because they're already showing the same allocation table.

### QW3 — cross-link operate ↔ read surfaces
Add a small "View in Notion" link on `/finance/money-alignment` → `moneyInAlignment` Notion URL, and inversely add a "Operate this in command-center" callout on the Notion page. One line of code each, eliminates the "where do I do X?" friction.

### QW4 — consolidate the two morning Telegram pushes
Either merge `daily-briefing.mjs` + `telegram-daily-focus.mjs` into one 7:30 push, or move daily-briefing to a Notion-only refresh and keep Telegram for focus only. The current double-push trains you to ignore one.

---

## 🟠 Structural improvements (half-day to 1 day each)

### S1 — add `project_funding_allocations` table (the biggest accounting-alignment win)

Today the link "funder X committed $Y to project Z, we've drawn $W" is implicit (reverse-engineered from invoice.contact_name + project_code). Add:

```sql
CREATE TABLE project_funding_allocations (
  id uuid primary key default gen_random_uuid(),
  project_code text not null,
  funder_org_name text not null,
  funder_contact_id text,              -- optional FK to ghl_contacts / xero contacts
  grant_or_contract_ref text,          -- "Minderoo Goods FY26", "PICC Year 2"
  committed_amount numeric not null,
  committed_currency text default 'AUD',
  period_start date,
  period_end date,
  status text,                         -- proposed / committed / drawing / closed
  drawdown_method text,                -- 'invoice', 'milestone', 'reimbursement'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE project_funding_drawdowns (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid references project_funding_allocations(id),
  xero_invoice_id text references xero_invoices(xero_id),
  drawn_amount numeric not null,
  drawn_at date not null,
  notes text
);
```

Then `/finance/projects/[code]` gains a new "Funding sources" panel: per funder, committed bar with drawn portion filled in. Answers "where are we in our Minderoo allocation?" in one glance. Also lets the cash forecast distinguish guaranteed-but-undrawn from pipeline-weighted.

Seeding effort: ~15 known commitments to enter manually (Minderoo, PICC, JusticeHub, etc.).

### S2 — materialize per-project quarterly position

Each `/finance/projects/[code]` page hit re-aggregates from `xero_transactions` + `xero_invoices` live. As Xero history grows this gets slow. Add:

```sql
CREATE MATERIALIZED VIEW mv_project_quarter_position AS
SELECT
  project_code,
  date_trunc('quarter', date)::date as quarter_start,
  sum(case when type = 'ACCREC' then total end) as revenue,
  sum(case when type = 'ACCPAY' then total end) as expense_bills,
  sum(case when type = 'SPEND' then total end) as expense_bank,
  count(*) as row_count
FROM (
  SELECT 'ACCREC' as type, total, date, project_code FROM xero_invoices WHERE type='ACCREC'
  UNION ALL SELECT 'ACCPAY', total, date, project_code FROM xero_invoices WHERE type='ACCPAY'
  UNION ALL SELECT type, total, date, project_code FROM xero_transactions 
    WHERE bank_account IN ('NAB Visa ACT #8815','NJ Marchesi T/as ACT Everyday')
) all_lines
WHERE project_code IS NOT NULL
GROUP BY 1, 2;
```

Refresh after `sync-xero-to-supabase.mjs` runs. All `/finance/projects` views + Notion budget-vs-actual sync read from it. Cuts page-load aggregation cost; also gives a single canonical source so Notion and command-center never disagree.

### S3 — consolidate the 13 `tag-*` scripts

Current scripts overlap:
- `tag-xero-transactions.mjs` + `tag-transactions-by-vendor.mjs` — both vendor-rule auto-tagging on `xero_transactions`
- `tag-mounty-bills.mjs` + `tag-goods-team.mjs` + `tag-picc-team.mjs` — three project-specific one-offs; pattern says "tag rows where contact_name in (X, Y, Z) to project P"

Recommend: one `scripts/tag-by-rule.mjs` with a config file (`config/tag-rules.json`) defining rule sets (vendor → project, team → project, R&D eligibility, etc.). All three taggers become entries in that config. Easier to audit, single guard against re-tagging manual sources.

Keep separate: `tag-statement-lines.mjs` (different table), `tag-rd-eligibility.mjs` (writes different column), `tag-el-stories-*` (Empathy Ledger, not finance).

### S4 — add per-project burn rate + runway impact to `/finance/projects/[code]`

The page shows historical "Avg Monthly Spend" but not:
- 3-month rolling burn (vs. 12-month — exposes acceleration)
- This project's % of total monthly burn
- Runway impact: "if we kept ACT-HV at current burn, it consumes X months of runway"

These are 3 SQL queries + 3 cards. Pairs naturally with S1 (funding sources) on the same panel.

### S5 — single Monday cron orchestrator

Replace the 11 separate PM2 cron entries (08:15 → 09:10) with one orchestrator `scripts/sync-money-stack.mjs` that calls them sequentially with explicit dependency declarations. Benefits:
- One log to read
- Failure of one step halts the next instead of cascading bad data
- Order changes happen in one file, not 11 cron strings
- Easier to add a "skip-if-no-xero-data-changed" optimization

The crons stay PM2-managed (one entry, Mon 08:15), but the chain becomes legible.

---

## 🟣 Bigger plays (multi-day, optional)

### B1 — money-flow visualization (Sankey) per project
Funder → Committed → Drawn → Categories → Vendors. One read at the top of `/finance/projects/[code]` and on the CEO Cockpit. Best ROI after S1 lands (you need the funder→project link first).

### B2 — kill `/finance/money-alignment` as a separate route
Fold its allocation table + gate status + coverage + freshness into `/finance/overview` (CEO Cockpit). Reduces "two pages showing similar data" confusion. The Notion `moneyInAlignment`/`moneyOutAlignment` pages remain the read surface.

### B3 — per-project 13-week cash forecast
Today `cash-forecast` is org-wide. A per-project version (using S1 allocations + scheduled invoices/bills) would let you answer "if I stop funding ACT-HV, what happens to ACT-OO's runway?" The cron `sync-cash-forecast-to-notion.mjs` becomes per-project.

### B4 — accountant pack export per project
`/finance/accountant` exists but is org-wide. A per-project export (P&L + transaction list + receipts + R&D-eligible flag) lets you hand a single project's books to a funder for acquittal without filtering work.

---

# What I'd actually do this week

In order:

1. **QW1** (30 min) — close the 117-row tagging gap, post the screenshot to the Money Sync page in Notion as evidence
2. **S1 phase 1** (2 hr) — create the two tables, manually seed 5-10 known funder allocations (Minderoo, PICC, JusticeHub, Standard Ledger, etc.), no UI yet
3. **S4** (3 hr) — add burn rate + runway impact cards to `/finance/projects/[code]` so the project page becomes forward-facing not just historical
4. **S1 phase 2** (2 hr) — add the "Funding sources" panel to `/finance/projects/[code]` reading from the new tables
5. **QW3** (30 min) — cross-link operate ↔ read surfaces
6. **QW4** (30 min) — decide on Telegram consolidation

Total: ~1 working day for transformative impact. Everything else can wait for a dedicated session and is documented above for resumption.

---

# Followup decisions for you

1. Do you want S1 (funder allocations table) — yes/no?
2. Telegram: keep both daily pushes, merge to one, or kill daily-briefing entirely?
3. `/finance/money-alignment` — keep as separate route, or fold into CEO Cockpit?
4. The 13 tag-* scripts — consolidate to one rule-config (S3) or leave alone since they're working?
5. Materialized view (S2) — wait until aggregation cost actually hurts, or do it now while you're in here?
