---
title: Company Overview (/company) — data-quality audit + remediation plan
date: 2026-05-26
author: Ben + Claude
status: audit-complete, remediation-pending
source_api: apps/command-center/src/app/api/intelligence/route.ts
page: apps/command-center/src/app/company/page.tsx
---

# Company Overview — why every number is wrong, and how to fix it

**Verdict:** the dashboard is a prototype that drifted from the schema. Most widgets query
**columns or whole tables that no longer exist**, so they silently return empty → zeros and fallbacks.
Two more bugs (a sign-convention error and stale hardcoded constants) corrupt the finance numbers.

## Per-widget findings (all VERIFIED against the DB 2026-05-26)

| Widget shows | Source | Status | Root cause (verified) | Fix |
|---|---|---|---|---|
| **Net P&L $1.4M rev / $0 exp** | `xero_transactions` `total>0`/`total<0` | 🔴 broken | **Sign bug**: all 1,990 SPEND rows are *positive* (`neg_rows=0`), so `total<0` → $0 expenses; `total>0` scoops SPEND **and** transfers in as "revenue." Transfer filter checks `type='TRANSFER'` but the real types are `SPEND-TRANSFER`/`RECEIVE-TRANSFER` (so $1M of transfers leak in). Ignores ACCPAY bills entirely. | Compute by `type`: income=`RECEIVE`, expense=`SPEND`+`SPEND-OVERPAYMENT`; exclude `%-TRANSFER`; **add deduped ACCPAY bills** for true expenses. |
| **Cash on Hand $89K / 99mo runway** | `exec_sql SUM(total)` → fallback `89000` | 🔴 fake | `SUM(total)` mixes all types = meaningless; returns null → **hardcoded `89000` fallback**. Runway = 89000 ÷ $0 expenses = absurd. | Real balance from `xero_bank_accounts` (NAB Visa #8815 + ACT Everyday only — the two-account rule); runway = balance ÷ true monthly burn. |
| **R&D Refund $0 · deadline −26d (Apr 30)** | `xero_transactions total<0` in `[EL,IN,JH,GD]`; deadline `'2026-04-30'` hardcoded | 🔴 broken + wrong | Sign bug → $0. Project list stale (excludes ACT-HV/real R&D, includes dormant codes). **Deadline hardcoded AND wrong** — per `project_rd_tax_incentive`, 30 Apr 2026 does NOT apply to ACT; FY25-26 claim lodges Jul 2026–30 Apr 2027. This is the false "−26 days" alarm. | Fix sign+bills; correct R&D project mapping; remove the hardcoded deadline (use FY25-26 / 30 Apr 2027). |
| **Project Health 0/100** | `project_health.health_score` | 🔴 broken | Column **`health_score` does not exist** (real cols: `overall_score, momentum_score, engagement_score, financial_score, timeline_score, health_status`). Query errors → empty → avg 0. | Read `overall_score`; confirm the health-scoring job runs + populates; check `projects.tier` values match `['ecosystem','studio']`. |
| **Funding Pipeline 0 / $0 / $0** | `opportunities_unified` `.value/.status/.confidence/.project_code` | 🔴 broken | **None of those columns exist** (real: `value_low/value_mid/value_high, stage, probability, project_codes`). Query errors → empty. | Rewrite to real columns (`value_mid`/`value_high`, `stage`, `probability`); map stage vocabulary. |
| **Relationships — 0 need follow-up** | `contacts` table | 🔴 broken | **`contacts` table does not exist.** Engagement/last-contact never computed. | Point at the real contact store (GHL/CivicGraph orgs); compute/persist engagement + last-contact. |
| **Last 30d — 0 emails** | `communications` table | 🔴 broken | **`communications` table does not exist** → always 0. | Point at the real email-sync table, or stand up email sync. |
| **Last 30d — 815 meetings** | `calendar_events` count, no filter | 🟠 over-counted | Counts **every** row: declined/cancelled (`status`), all-day blocks (`is_all_day`), personal calendars (`calendar_name`), recurring instances, `transparency='transparent'`. | Filter `status!='cancelled'`, drop all-day/transparent, scope to work calendars, dedupe recurring. |
| **Receivables $164K / 63% overdue** | `xero_invoices` ACCREC `amount_due>0` | 🟡 plausible, unscoped | Real-ish, but spans all entities + old invoices; no write-off/void exclusion. | Validate `amount_due`; exclude voided/written-off; scope to ACT entity. |
| **Receipt & R&D coverage 98% / 15 missing $9K** | `receipt_matches` + ACCPAY in `[EL,IN,JH,GD]` | 🟠 misleading | Coverage computed on the stale R&D project list (excludes ACT-HV). | Use correct R&D scope across all eligible bills. |
| **Last 30d — 176 transactions** | `xero_transactions` count | 🟢 ok | Plausible. | Optionally scope to the two ACT accounts. |

## Root-cause themes

1. **Schema drift (biggest).** The API was written once and the tables moved underneath it. It reads `health_score`, `value`, and the tables `contacts`/`communications` — none exist. Each becomes a silent zero. *There are no tests or types binding the API to the DB.*
2. **Sign-convention bug.** Expenses use `total<0`; this data stores positive amounts + a `type` field. Breaks P&L and R&D. (Note: `api/business/overview` computes expenses correctly via `type==='SPEND'` — so two routes implement finance differently and disagree.)
3. **Bills ignored.** All expense/R&D/coverage logic ignores ACCPAY bills — the bulk of real spend (we just tagged $100K+ of Harvest bills).
4. **Hardcoded / stale constants.** R&D deadline, `89000` cash fallback, the `[ACT-EL,ACT-IN,ACT-JH,ACT-GD]` R&D list.
5. **No scoping.** Transfers counted as revenue; all-entity/all-account sums; no two-account rule; calendar unfiltered.
6. **Unpopulated enrichment (process gaps).** Project-health scoring, contact engagement, email sync — either not running or writing to tables the dashboard doesn't read.

## Remediation plan (phased)

**P0 — correctness (no schema work; ~half a day):**
- Replace the sign-based P&L + R&D with `type`-based logic **+ deduped ACCPAY bills**. Reuse the `realExpenseRows` dedup already in `api/finance/projects/[code]/route.ts`.
- Fix the column names: `project_health.overall_score`, `opportunities_unified.value_mid/stage/probability/project_codes`.
- Remove the hardcoded R&D deadline; drive it from the FY25-26 Path-C facts.
- Real cash balance from `xero_bank_accounts` (two-account rule); honest runway.
- Filter `calendar_events` (status/all-day/work-calendars).

**P1 — point at real tables:** map Relationships → the real contact store, Emails → the real email-sync table (or mark "not wired" instead of "0").

**P2 — enrichment jobs (the "agents/processes"):** confirm/schedule project-health scoring, contact engagement scoring, email sync, calendar classification. Each should write to the table the dashboard reads.

**P3 — make it elegant + keep it honest:**
- **One finance source of truth** — a shared `lib/finance.ts` (income/expense/cash/R&D) used by *every* finance surface (intelligence, business/overview, project pages), so they can't disagree. Build on the deduped logic + the two-account rule + the Jan-2026 Harvest cutoff conventions.
- **A data contract / smoke test** — a tiny test that fails CI if the API references a column/table that doesn't exist (would have caught every bug here).
- **"No silent zero" rule** — widgets distinguish *real 0* from *query failed / not wired* (show "—  needs wiring" not "0/100"), so a broken pipe is visible, not disguised as data.

## Suggested sequence
P0 is the high-value, low-risk start (makes the headline numbers true). It's a focused build best done in a fresh session with this doc as the brief. P2/P3 are the "elegant system" — worth a short plan once P0 lands.
