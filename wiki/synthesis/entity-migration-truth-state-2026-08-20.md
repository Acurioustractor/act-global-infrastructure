---
title: Entity migration truth-state — 51 days post-cutover, BAS 23 days overdue, D&O 127 days past deadline
summary: Seventh pass of the ACT Alignment Loop (Q3), 2026-08-20. 51 days post-cutover. Xero +19 invoices (2,351 total). Outstanding ACCREC falls to $320,817.84 (−$101,200 — ALIVE INV-0342 paid). BAS Q4 FY26 now 23 days past standard due date (was 16). D&O insurance now 127 days past deadline. Still 1 Xero tenant (sole trader only). Bank data still ends 2026-03-31. No new migration artefacts.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-08-20
---

# Entity migration truth-state — 2026-08-20

> Seventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **51 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-08-13|2026-08-13]].

## Headline findings

1. **ALIVE INV-0342 ($101,200) paid — outstanding ACCREC falls to $320,817.84.** The largest single movement in any pass since the $207K clearance in May. Ten AUTHORISED invoices remain. One DRAFT invoice at $0.

2. **BAS Q4 FY26 (sole-trader) is now 23 days past the standard due date** (2026-07-28). Was 16 days at Aug 13. Standard Ledger holds registered tax agent status and likely has a concession date — but no lodgement evidence is visible in any data source. Each passing week without confirmation increases the compliance risk.

3. **D&O insurance is now 127 days past the ~2026-05-24 deadline.** Up from 120 days at Aug 13. No binding evidence in any pass since the 2026-04-24 baseline. Four-plus months of potential uninsured director liability with no resolution signal.

4. **Xero: still 1 tenant, now 2,351 invoices (+19 from Aug 13).** Sync is running consistently. No second (Pty) tenant visible in DB. ACT-GD leads new invoice volume (+9). Whether the Pty Xero file exists but is unsynced remains unconfirmable from DB alone.

5. **Bank data still ends 2026-03-31** — NAB Visa ACT #8815 only, 1,618 transactions. No Pty NAB account visible. This has been unchanged since the April 2026 baseline.

6. **No new migration artefacts.** Migration plans: same 7 files in `thoughts/shared/plans/`. Migration drafts: `novation-letter-templates.md` only (unchanged since May). No new decisions, no new playbooks.

7. **Shareholders Agreement, EOFY strategic fork, and funder novation letters remain unresolved.** No change from Aug 13.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+51 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-08-13 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | Planning underway; no SL ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,351 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 23 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 16d at Aug 13, now 23d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (497d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) + INV-0344 Oonchiumpa ($41,250K) = $107.25K untagged | ❓ UNCONFIRMED | ↓ improved: INV-0342 cleared |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway; AusIndustry not due until ~Apr 2028 | 🟡 PENDING ENTITY DECISION | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-08-20|Q1 funder synthesis — this pass]]. Total $320,817.84 (10 invoices).

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-08-13.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **127 days past deadline** | ↑ was 120d at Aug 13, now 127d |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 evidence | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED | → |
| Pty minute book | 🟡 UNVERIFIED | → |

### Section 9 — Subscriptions / tooling

All SaaS transfers NOT STARTED per available evidence. Sole trader still the only visible Xero entity.

### Section 10 — Communications

| Item | Status | Change |
|---|---|---|
| Announcement email to funders/partners | 🔴 NOT CONFIRMED | → |
| Email/website footer updates | 🔴 NOT CONFIRMED | → |

### Section 11 — Standard Ledger decisions

| Decision | Status | Change |
|---|---|---|
| D11.4 (mapping export) | ✅ DONE | → |
| D11.2 (payroll), D11.3 (Dext emails), D11.5 (Knight Photography) | ❓ no new information | → |

### Section 12 — EOFY Decision Pack (2026-06-19)

| Decision | Status | Change |
|---|---|---|
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED | → |
| Final sole trader BAS | 🚨 23 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-08-13 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~8 | ~12% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | → |
| **Total** | **~65** | | → |

---

## Cutover risk map — post-cutover

### 🚨 Red (active compliance problems)

1. **BAS Q4 FY26 — 23 days past standard due date.** Confirm with Standard Ledger: lodged or concession deadline? Each week without confirmation increases exposure.
2. **Rotary INV-0222 ($82,500, 497 days)** — BAS write-off window nominally closed. Invoice still AUTHORISED; treatment before the sole-trader tax return (due 31 October 2026) is unresolved.
3. **D&O insurance — 127 days past the ~2026-05-24 deadline.** 4+ months of potential uninsured director liability. No binding evidence in any pass.
4. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking clean R&D claim structuring and sole-trader tax return.

### 🟠 Amber (this week)

5. **Tag INV-0341 ALIVE ($66,000) and INV-0344 Oonchiumpa ($41,250) with project_codes** — $107.25K untracked.
6. **Confirm Pty Xero file open and $1 test invoice run** — sync is running on sole trader only.
7. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
8. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable)

9. Subscription billing transfers.
10. GitHub org transfer.
11. Email/website footer updates.
12. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)
- AusIndustry R&D designation (due ~Apr 2028)

---

## Open questions

1. **Sole trader BAS Q4 FY26** — has Standard Ledger lodged it or is there a concession date? What is the Rotary write-off treatment and Rule 2 treatment for the $107.25K post-cutover/untagged invoices?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 127 days overdue.
4. **Pty Xero file** — open and operational? Xero sync running (sole trader, 2,351 invoices) but only 1 tenant visible.
5. **ALIVE INV-0341** ($66,000, 2026-07-02) — still AUTHORISED on the sole trader. Sole-trader or Pty entity treatment?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-08-20 (1 tenant, 2,351 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-08-20 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-08-20 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-08-20 (10 rows, $320,817.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 7 matching files as Aug 13 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-08-13|Q3 entity migration — 2026-08-13 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-08-20|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-20|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
