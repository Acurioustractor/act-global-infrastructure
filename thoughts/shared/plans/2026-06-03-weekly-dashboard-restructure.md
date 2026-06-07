# Plan: Weekly dashboard restructure — action-first, decision-grade

> Slug: `2026-06-03-weekly-dashboard-restructure`
> Created: 2026-06-03
> Status: completed
> Owner: Ben (build: Claude)
> Parent: `2026-06-03-project-aligned-finance` (§4) · Issue #140 · supersedes the *presentation* of weekly slices 1–6 (the `ledger.ts` math is reused as-is)

## Objective

`/finance/weekly` shipped all six §4 sections as a faithful **report** — comprehensive, every dollar TDD'd and radar-excluded. But a grill (2026-06-03) showed it does not work as a **decision-grade dashboard**: it gives runway and a strategic GST breakdown equal weight, dumps 30 project rows, buries the only two live alerts inside tables, and surfaces two numbers that mislead at a glance (GHL `next-90` is 88% undated; `openBills` is 100%-overdue phantom AP). This plan restructures the *presentation* into an action-first, 4-tier dashboard — "what needs my attention this week" first, hard-data survival headline second, evidence as exceptions, periodic context collapsed — without touching the verified money math underneath.

## Grilled design decisions (the spec)

1. **Job = "what needs my attention this week?"** — lead with the decision, not the data.
2. **Attention panel = trustworthy subset + explicit all-clear.** Only alerts that fire reliably; when none do, say "Nothing needs attention this week"; never manufacture an insight.
3. **3-tier body:** glance (always) → evidence/exceptions (compact) → periodic (collapsed/linked-out).
4. **Income-coming = Xero AR (dated) + weighted pipeline (soft), separated.** Drop the GHL-opp `next-90` headline (88% of opps have no close date). Surface that 88% gap as a data-quality nudge.
5. **Glance headline = one synthesized ~13-week projected cash** number, HARD DATA ONLY (cash + collectible AR − real burn). Narrowly supersedes the no-composite call because every input is now dated/hard. TDD it.
6. **Change-aware via free time-windows now** (paid this week, newly-overdue, newly-stalled — reuse `weekly-money-digest.mjs` patterns) + absolute threshold breaches. Stored week-over-week Δ deferred.

## The 4-tier information architecture

**① Attention panel** (top; renders only real items, else all-clear):
- AP phantom alert (the big one): `$503K bills marked unpaid, 100% overdue, oldest Jan 2025 — likely unreconciled, reconcile before trusting AP`
- Overdue AR: `$103,750 receivables overdue — chase`
- Runway < 6mo · single-funder > 50% · project >10% over budget *(have)*
- Untagged income / 429 spend *(net-new query)*
- This-week changes: invoice newly overdue · big payment landed · opp newly stalled
- Data-quality nudge: `88% of open opps have no close date`

**② Glance** (always visible):
- **Headline: ~13-week projected cash** = `cash + collectible AR − burn×3` (hard only). Components beneath.
- cash now · runway · burn · month/week net
- Income: AR coming (dated) + weighted pipeline (soft, labelled uncommitted)

**③ Evidence** (visible, compact):
- Projects as **exceptions only** (over-budget / subsidised / flipped); ~25 healthy behind "show all"
- Opportunities: top-open + stalled (action queue); month trend chart lives here as context
- People (compact)

**④ Periodic** (collapsed-by-default / linked out): GST·BAS → its surface · pile-mix-vs-FY27 · receipt % · drawings.

## Task Ledger

- [x] **T1 (TDD-first):** `projectedCashFlow` + `invoiceAging` (one fn for AR & AP) in `ledger.ts` — failing tests first, pinned to hand-computed totals, then implemented. Green.
- [x] **T2:** `getInvoiceAging(now)` — open ACCREC + ACCPAY aging (dated buckets, paginated). + close-date coverage added to `getPipelineFacts`.
- [x] **T3:** `buildAttentionAlerts()` (pure, TDD'd: phantom-AP fires + all-clear when healthy) + `getTaggingGaps()` (untagged-income via uncapped SQL). "Newly-overdue this week" folded into `invoiceAging`. ("This week" deltas beyond newly-overdue → deferred per Q6.)
- [x] **T4:** API route — added `projection`, `aging`, `alerts` to `/api/finance/weekly`; dropped the GHL `next90` headline use.
- [x] **T5:** Page restructured into the 4 tiers — `AttentionPanel`, `ProjectedCashHeadline`, `IncomeAndCommitmentsSection`, `PileMixSection`; project table → exceptions + "show all" toggle; GST + pile-mix → `<details>` collapse.
- [x] **T6:** Verified — `tsx --test` 24/24, `tsc`+eslint clean, API numbers reconcile to raw SQL, browser render 0 console errors (headline $197,202, phantom-AP alert critical-first). Slice-7 digest auto-picks-up the new headline (it fetches the API).

### Deferred (noted, not silently dropped)
- Stored week-over-week Δ snapshots (Δrunway, Δconcentration) — Q6 "later".
- Generic-429-account spend half of the untagged alert (untagged-income half shipped; 429 tracked in the GE-recode workstream).

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-06-03 | Action-first ("what needs attention") over full report | Grill Q1 — no-fluff/decision-grade | yes (layout) |
| 2026-06-03 | Attention panel = trustworthy subset + all-clear, never manufacture insights | Grill Q2 — one false alarm kills trust | yes |
| 2026-06-03 | 3-tier body; periodic collapsed/linked | Grill Q3 — strategic/periodic ≠ weekly action | yes |
| 2026-06-03 | Income-coming = dated Xero AR + soft pipeline, drop GHL next-90 | Grill Q4 — `next-90` is 88% undated, misleading | yes |
| 2026-06-03 | Glance headline = synthesized 13-week cash, hard data only | Grill Q5 — founder survival number; inputs now all dated | narrowly supersedes the 2026-06-03 no-composite call |
| 2026-06-03 | Change-aware via free time-windows now; stored Δ later | Grill Q6 — "this week" needs change, cheaply | yes |
| 2026-06-03 | **Exclude open AP from the cash number; alert on it instead** | AP is $503K 100%-overdue phantom (oldest Jan 2025) — subtracting it = false −$300K headline | yes |
| 2026-06-03 | 13-week burn term = real trailing-3mo burn ($64K/mo), not payroll+subs run-rate | payroll+subs ($17K/mo) is a fraction of real burn; using it overstates the position | yes |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| AR open $164,250; overdue $103,750; due-13wk $60,500; none undated | ✅ | SQL on `xero_invoices` ACCREC AUTHORISED, aging buckets | 2026-06-03 |
| AP open $503,125; **100% overdue**; oldest bill 2025-01-28 | ✅ | SQL on `xero_invoices` ACCPAY AUTHORISED, aging buckets | 2026-06-03 |
| Only 38/325 open worked opps (12%) have an `expected_close` | ✅ | SQL on `opportunities_unified` worked filter | 2026-06-03 |
| `xero_invoices` has `due_date`, `amount_due`, `date`, `updated_at` | ✅ | `information_schema.columns` | 2026-06-03 |
| 13-week model `225,786+164,250−192,834 = $197,202` | ✅ | TDD `projectedCashFlow` + live API curl | 2026-06-03 |
| Untagged real income (RECEIVE, no project_code, FY26) = $0 (all 70 receipts tagged) | ✅ | SQL — confirms the alert's all-clear is real, not a swallowed error | 2026-06-03 |
| Attention panel fires 5 alerts, phantom-AP critical-first; headline + AR render; 0 console errors | ✅ | browser render of `/finance/weekly` | 2026-06-03 |

## Changelog

### 2026-06-03 — Built (T1–T6)

**Objective:** Ship the action-first restructure.
**Changed:** `ledger.ts` (+`projectedCashFlow`, `invoiceAging`, `buildAttentionAlerts`, `getInvoiceAging`, `getTaggingGaps`, close-date coverage); route (+projection/aging/alerts, −GHL next90 headline); page (4 tiers — attention panel, projected-cash headline, income & commitments, projects-as-exceptions, opportunities, collapsed periodic).
**Verified:** 24/24 tests; tsc+eslint clean; every emitted dollar reconciles to raw SQL; browser 0 console errors.
**Learned:** the open-bills figure was phantom (100% overdue, 16mo old) — the grill's biggest catch; reframed from stat to critical alert and kept out of the cash number.
**Next:** none — complete. Optional fast-follows in Deferred above.

## Changelog

### 2026-06-03 — Plan authored (post-grill)

**Objective:** Convert the report into an action-first dashboard per the 6 grilled decisions.
**Changed:** Plan + IA written; AR/AP aging + opp-date-coverage verified live.
**Verified:** AP is phantom (100% overdue, 16-month-old) — reframed openBills from stat to alert; AR is dated/real.
**Failed/Learned:** The original `openBills` and `next-90` stats would mislead at a glance — the grill caught both before they shaped a decision.
**Next:** T1 — TDD `projectedCashFlow` / `arAging` / `apAging`.

---

## Provenance

- **Data sources queried:** `xero_invoices` (ACCREC/ACCPAY aging), `opportunities_unified` (close-date coverage), `information_schema`. Shared Supabase `tednluwflfhxyucgwigh`.
- **Date range:** live as of 2026-06-03; FY26.
- **Unverified assumptions:** all AR overdue is collectible (no bad-debt haircut); 13 weeks ≈ 3 months for the burn term; the $503K AP is unreconciled rather than genuinely owed (strongly indicated by 100%-overdue + 16-month age, to be confirmed in the reconcile workstream).
- **Generated by:** hybrid (grill with Ben → Claude).
