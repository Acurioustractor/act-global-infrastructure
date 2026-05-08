---
title: ACT Notion finance dashboard — review + best-case design
status: review draft
date: 2026-05-08
audience: Ben
purpose: Study the new Notion dashboard system after today's consolidation, identify what's working vs fragile, and propose a best-case structure where moneyFramework is the single linkage to everything we need.
---

# ACT Notion finance dashboard — review + best-case design

## TL;DR

The system has all the right pieces (live Xero data flowing in, 5 alignment checks passing, 26 fresh pages, R&D pack tracking, weekly digest, capture page). The gap is **one canonical front door with no duplication and a clear daily reading order**. Today moneyFramework has *two* scripts writing to it with incompatible strategies, *three* "How to use" sections competing for attention, and no single "today" pulse page. Three concrete changes — resolve the write conflict, kill the duplicate nav, add a daily pulse — turn what's there into a single linkage to everything.

## What exists today (architecture inventory)

### Pages, by role

| Role | Page | Blocks | Refresh | Auto/manual |
|---|---|---:|---|---|
| **Hub** | ACT Money Framework | 168 | Daily 8:30 (was) + Mon cron | 🤖 (two scripts conflict — see below) |
| **Daily data** | Money In Alignment | 24 | Mon cron | 🤖 |
| **Daily data** | Money Out Alignment | 15 | Mon cron | 🤖 |
| **Pile** | Voice / Flow / Ground / Grants | 17–21 | Mon cron | 🤖 |
| **Models** | Cash Forecast (13-week) | 16 | Mon cron | 🤖 |
| **Models** | Cash Scenarios (Base/Upside/Downside, 12mo) | 20 | Mon cron | 🤖 |
| **Models** | KPIs (runway, AR aging, win rate) | 19 | Mon cron | 🤖 |
| **Models** | Budget vs Actual | 7 | Mon cron | 🤖 |
| **Plan** | FY26-27 Money Philosophy + Plan | 206 | On-demand | 🤖 (renamed from CY26 today) |
| **Rhythm** | Planning Rhythm — multi-period | 84 | Mon cron | 🤖 |
| **Weekly artefact** | Friday Money Digest | 35 | Fri 3pm cron | 🤖 |
| **Capture** | Money Sync — Questions & Ideas | 13 | n/a | 💬 (human-writable) |
| **Reference** | Finance Surface Design | 185 | Static | 📚 |
| **Reference** | Dashboard Walkthrough | 189 | Static | 📚 |
| **Database** | Entity Hub | (db) | Mon cron | 🤖 |
| **Database** | Opportunities, Money Metrics, Decisions Log, Action Items, Foundations, Ledger Q&A, Stakeholders | (db × 7) | Mon cron | 🤖 |
| **Retired** | Finance Overview | (archived) | – | – |

### Sync architecture (write strategies)

**18 scripts** write to Notion under `scripts/sync-*-to-notion.mjs` plus the orchestrators. Two write strategies:

- **Full-page replace** — wipe all blocks, rebuild from scratch each run (most pile / model / alignment scripts). Simple, idempotent, but loses anything a human types between runs.
- **Section-replace via marker block** — only the H2 marker page-section is rebuilt, content above is preserved (sync-money-framework-to-notion.mjs only).

Both target moneyFramework. **Whichever runs last wins layout.**

## What's working

1. **Live Xero data is real.** Bank balance ($679,915), runway (30.4mo), receivables, payables, R&D-eligible spend ($109K offset). Not estimates — pulled from `xero_transactions` + `xero_invoices`.
2. **Alignment checks pass.** DRIFT 0 · IN-SYNC 5 · BLOCKED 0. The repo has automated tests against the dashboard state.
3. **95.3% receipt match rate.** Spending Intelligence v3 is genuinely working. R&D evidence pack scores WARN/62 against a calibrated rubric.
4. **Four calibrated rubrics in CI.** Voice (Curtis method, v0.2 10/10), R&D evidence (v1.0 6/6), funder-cadence (v0.1 6/6), alignment-loop (v0.1 6/6). The Mon cron grades drafts deterministically + via LLM and posts to Telegram.
5. **Planning Rhythm spans 5 horizons in one page** — week / month / half / year / 5-year. With live Xero data, FY27 milestones, FY28-31 strategic shape.
6. **FY26-27 Plan covers everything strategic** — cutover (30 Jun 2026), founder pay (Pty PAYG), trust distributions (Knight + Marchesi 50/50), BAS quarters, R&D deadline (30 Apr 2027), Africa trip R&D framing.
7. **Money Sync is a real capture page** — humans can write to it without being overwritten. The Friday Digest reads from it.
8. **Decision log + Action Items are databases** — proper structured data, queryable, with Notion's filtering/sorting.

## What's fragile or redundant

### 1. Two scripts compete for moneyFramework's body — fragile

`sync-money-dashboard-hub.mjs` does **full-page replace** and writes the rich nav (Right now / Navigate / Quick actions / How to use / Test the system).

`sync-money-framework-to-notion.mjs` does **section-replace** and writes the H2 marker + 6 panels of live data (Entity ledger, Pile income, Channel flow, Founder take, Compliance, 13-week forecast).

If dashboard-hub runs after framework: **the framework section is wiped** (full-page replace doesn't preserve marker sections). If framework runs after dashboard-hub: framework finds no marker, so it appends a new section at the bottom (because the wipe left it gone).

Today's page state has both because they ran in different orders this week. Tomorrow's cron could end with only one of them.

### 2. Three "How to use" sections compete

After today's `buildNav` addition there are now THREE places telling you how to read the dashboard:

- dashboard-hub's `📖 How to use this dashboard` (top of page, with text + "Test the system" sub-section)
- moneyFramework's new `🧭 How to use this dashboard` callout (added by me today inside the framework section)
- planningRhythm's "Use the daily check-in for THIS WEEK; use monthly review for THIS MONTH; etc." callout

**Two of these three need to go.** The dashboard-hub's version is the richer one (has actual nav cards beneath it).

### 3. No "Today" pulse page in Notion

`scripts/daily-money-briefing.mjs` produces the right data — bank, runway, yesterday's wins, new pipeline, top overdue, today's critical/high tasks. It posts to Telegram. **It does not write to a Notion page.**

Result: to see "where are we today?" you read Telegram. To see "where are we this week?" you open the Friday Digest. Mismatch.

The Money Sync page is a capture surface, not a status surface — it's for asking questions, not reading state.

### 4. CY26 vestigial references

Today's rename to FY26-27 left these still saying "cy26":

- `config/notion-database-ids.json` key `cy26StrategyPlan` (cascades through 5 scripts)
- `scripts/audit-notion-money-stack.mjs:55` — `'cy26StrategyPlan'` in MONEY_KEYS
- `scripts/restore-archived-notion-pages.mjs:46`
- `scripts/inspect-archived-notion-pages.mjs:45`
- `scripts/sync-money-framework-to-notion.mjs:507` — uses `cfg.cy26StrategyPlan` (correct, since that's the key)

Cosmetic. Renaming the config key cascades; cleanest fix is "leave the key, the page is FY26-27".

### 5. 17 missing operational pages bloat the audit

`audit-notion-money-stack.mjs` audits 55 keys including operational dashboards (commandCenter, sprintTracking, githubIssues, etc.). 17 of these have stale page IDs and show "MISSING" every audit. Out of money scope but every audit has noise.

### 6. No emoji-based "I'm a sync page, don't edit me" marker

Per `wiki/decisions/notion-page-policy.md`: "Future convention: outbound-only pages should carry the 🤖 emoji in their title. Sync scripts can set `icon: { emoji: '🤖' }` on every page they own. Not yet enforced (2026-05-07)."

Still unenforced. New users editing a synced page lose work to the next cron.

### 7. The hub's "Right now" header is static

dashboard-hub's "📊 Right now" is a heading, not a live banner. The actual numbers (bank, runway) live further down in the framework section. Could be combined with a one-line live state at the very top.

## Best-case scenario — what the ideal feels like

Open Notion. Click ACT Money Framework. **You see, in this order, in under five seconds:**

1. **One-line live state** — `Bank $679K · Runway 30mo · This week +$X due / -$Y bills · Today: 3 critical actions`
2. **Today's pulse** — yesterday's wins, new pipeline, top overdue, today's critical/high tasks (live, refreshed each morning)
3. **Nav cards** — daily data | weekly | yearly plan | capture | R&D | reference (clickable, 6 cards in a 3-column grid)
4. **The framework panels** — pile mix, channel flow, compliance flags, 13-week forecast (the live Xero panels, structured)
5. **Pipeline drill-in** — top opportunities by pile (Voice / Flow / Ground / Grants)
6. **Footer** — last refreshed timestamp + the script that built this

Click a nav card → land on the right page. Take notes / decisions in Money Sync. Read Friday Digest weekly. Open FY26-27 Plan when zooming out.

**The "everything we need" map**, organised by reading frequency:

| Frequency | Surface | What lives there |
|---|---|---|
| **Right now (10 sec)** | One-line state at top of moneyFramework | Bank, runway, today's actions count |
| **Today (60 sec)** | Daily Pulse on moneyFramework | Yesterday's wins, today's critical, top overdue |
| **This week (5 min)** | Money In/Out Alignment + Friday Digest | Cash expected, paid, gaps |
| **This month** | KPIs + Budget vs Actual + Cash Forecast | Runway trajectory, project budgets, 13-week |
| **This quarter** | BAS prep + Pile mix vs FY27 target | Quarterly tax, strategic mix |
| **This half** | Planning Rhythm "THIS HALF" + R&D pack score | Cutover, R&D evidence assembly |
| **This year** | FY26-27 Plan + Planning Rhythm "THIS YEAR" | Strategic horizon |
| **Five years** | Planning Rhythm "5-YEAR HORIZON" | Entity stack, exit positioning |
| **On demand** | Cash Scenarios | Base/Upside/Downside modeling |
| **Capture** | Money Sync | Questions, decisions, ideas (human-writable) |
| **Reference** | Surface Design + Dashboard Walkthrough + Money Framework markdown | "How is this built / how do I use Notion views" |
| **Decisions** | Decisions Log database | What was decided, when, by whom |
| **Actions** | Action Items database | What's owed, by whom, due when |
| **People** | Stakeholders + People Directory + Entity Hub | Who's involved, in which entity |

## Concrete proposal — three moves

### Move 1: Resolve the moneyFramework write conflict

**Pick one architecture and commit to it:**

**Option A** (recommended) — **Make dashboard-hub the orchestrator.** It calls the framework's panel-builders directly and produces ONE coherent page. Single script writes to moneyFramework. The framework's `--markdown` mode is preserved as a separate snapshot output.

**Option B** — **Move the framework panels to a sub-page.** dashboard-hub stays as the moneyFramework page (the front door). Framework writes to a new page `cfg.moneyFrameworkPanels` linked from the hub. Two scripts, two pages, no conflict.

**Option A is cleaner** but takes a 2-3 hour refactor. Option B is faster (~30 min) and keeps both authors but separates them.

### Move 2: Add a Daily Pulse to moneyFramework

`daily-money-briefing.mjs` already builds the data. Two ways to land it on the page:

- **A new sync** `sync-daily-pulse-to-notion.mjs` that writes a Daily Pulse SECTION at the top of moneyFramework (above the dashboard-hub content). Cron: 8am AEST after Xero sync.
- **Or fold the daily pulse into dashboard-hub's "📊 Right now" section** (currently static heading). Same script, just enriched.

Either way: when you open moneyFramework you see today's state immediately.

### Move 3: Kill the duplicate nav

Remove the `buildNav()` I added to `sync-money-framework-to-notion.mjs` today. dashboard-hub already provides nav with richer cards. **My addition is redundant once Move 1 lands.**

### Plus four small hygiene items

1. **Mark all outbound-only pages with 🤖 in the title or icon** — every sync script sets `icon: { emoji: '🤖' }` on the page it owns. Closes the policy doc's open enforcement gap.
2. **Trim audit-notion-money-stack.mjs** to MONEY-only by default (removing the 17 stale operational dashboard keys from the default scan). Keep `--all` flag for full audit when needed.
3. **Wire the existing `daily-money-briefing.mjs` Telegram message into `weeklyDigest`'s daily counterpart** — the Friday Digest is good; add a Daily Pulse on top.
4. **Document the "best-case reading order" in CLAUDE.md** — so future sessions know the canonical front door is moneyFramework and the order to read pages.

## Risks + tradeoffs

- **Refactoring the moneyFramework writers is a 2-3 hour change** with risk of cascading layout regressions. Easier to land on a Saturday than mid-week.
- **Daily Pulse adds another cron** — small cost, but more crons = more moving parts. Worth it because reading Telegram for state is friction.
- **Marking pages with 🤖 means editing 18 scripts.** Mechanical but tedious. Could be a `lib/notion-managed-page.mjs` helper that all scripts call.
- **Option B (split framework panels into sub-page) leaves people wondering "where do I look first?"** That's exactly the problem we're solving — Option A solves it more decisively.

## Recommended order if executing

1. **Move 3 first** (15 min) — remove duplicate buildNav. Cleanest single-step revert.
2. **Move 1 Option B** (45 min) — split framework panels to sub-page, dashboard-hub stays the front door. Lower risk than Option A. Can upgrade to A later.
3. **Move 2** (60 min) — Daily Pulse in dashboard-hub's "📊 Right now". Lands the missing "today" surface.
4. **🤖 marker enforcement** (90 min) — touch 18 sync scripts, commit. Optional.

Total: ~2 hours of focused work to reach the best-case state.

## What I'd build last (the real best-case)

A single Notion page called **ACT Money — TODAY** that opens to:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACT Money — Today (Fri 8 May 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💰 $679,915 in trading account · 🛬 30.4mo runway
  📅 0 due this week  ·  🟠 3 critical / high today
  🔬 R&D pack: WARN/62 — Standard Ledger sign-off pending

  ✅ Yesterday: $44K + $37K + $30K + $27.5K + $13K paid
  ✨ New: $50K John Monash · $50K Art G · $50K Haven
  🔴 Top overdue: $82.5K Rotary 378d (write off?)

  🎯 Today's gating action:
     Send Standard Ledger combined-ask email
     (Aleisha $4-4.5K saving + R&D $130-154K unblocked)

  → Daily detail   → Weekly digest   → Year plan
  → Capture        → R&D pack        → Reference
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Refreshes each morning. Telegram gets the same message. Notion is the durable surface; Telegram is the push.

That's the one linkage to everything.

## Open questions for you

1. **Move 1 Option A or B?** A is cleaner but heavier; B is faster but keeps two scripts.
2. **Daily Pulse — top of moneyFramework, or its own page (linked first in nav)?** A separate page would keep moneyFramework focused on framework analytics and let "Today" stand on its own.
3. **🤖 marker — worth the 90-min refactor across 18 scripts?** Or accept the policy-doc-only enforcement?
4. **Are the 17 missing operational pages** (commandCenter, sprintTracking, githubIssues, etc.) **ones you still want to build out**, or should they be retired from the config entirely?

Tell me on those four and I'll execute in priority order.
