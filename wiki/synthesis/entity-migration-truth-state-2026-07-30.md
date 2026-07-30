---
title: Entity migration truth-state — 30 days post-cutover, BAS 2 days overdue, receivables drop $53,950
summary: Fifth pass of the ACT Alignment Loop (Q3), 2026-07-30. 30 days post-cutover. BAS Q4 FY26 was due 2026-07-28 — now 2 days past due and lodgement status unknown. Two receivables paid ($53,950: Homeland School + Sonas 2nd). Xero still 1 tenant (2,293 inv — zero change from 2026-07-23). D&O now 106 days past deadline.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-07-30
---

# Entity migration truth-state — 2026-07-30

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **30 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last pass: [[entity-migration-truth-state-2026-07-23|2026-07-23]].

## Headline findings

1. **BAS Q4 FY26 (sole-trader) standard due date 2026-07-28 has passed — lodgement status unknown.** There is no lodgement artefact visible in Supabase. Note: Standard Ledger is ACT's registered tax agent and may hold a lodgement concession beyond 28 July — the applicable deadline must be confirmed with them directly. Rotary INV-0222 remains AUTHORISED at $82,500 — if written off before lodgement, a VOIDED status would be expected in Xero/DB; it is not present.

2. **$53,950 cleared — Homeland School ($44K) and Sonas second invoice ($9.95K) both PAID.** Outstanding ACCREC drops from $471,717.84 to $417,767.84 (14 → 12 invoices). This is the first receivable movement in two weeks and the most concrete positive data point in this pass.

3. **Only 1 Xero tenant in DB — still the sole trader, now 2,293 invoices (zero change from 2026-07-23).** After +46 invoices last week, this week shows zero Xero activity. Whether the Pty Xero file has been opened but is not yet synced remains unconfirmable from DB alone.

4. **Bank statement data still ends 2026-03-31.** `bank_statement_lines` shows only NAB Visa ACT #8815. No Pty NAB account visible.

5. **EOFY strategic fork (journal-entry vs market-value sale) remains unresolved.** The 2026-06-19 Decision Pack concluded the journal-entry model likely fails under Subdiv 328-G. No Standard Ledger ruling is visible in any plan or draft. This is the highest-stakes unresolved governance question.

6. **D&O insurance is now ~106 days past the 2026-05-24 deadline.** If not bound, the company has operated without D&O for over 3 months post-registration.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+30 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-07-23 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | EOFY Decision Pack raises it; no ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | `bank_statement_lines` data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (2,293 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 passed — agent concession may apply; confirm with Standard Ledger** | **🚨 CONFIRM STATUS** | 🆕 escalated from "5 days" |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment (Rule 2) | 3 invoices $189.2K, null project_code | ❓ UNCONFIRMED | → |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY27 entity designation (AusIndustry) | Determine which Pty entity registers for FY27 (§12 decision). AusIndustry filing not due until ~Apr 2028 (10mo post-FY27-end). Internal milestone of 1 Jul for entity decision. | 🟡 PENDING ENTITY DECISION | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-07-30|Q1 funder synthesis — this pass]].

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; ABN available; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Section 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-07-23.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **now 106d past deadline** | ↓ +7d |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED — was due Week 1-2 (~2026-05-08) | → |
| Pty minute book | 🟡 UNVERIFIED | → |

### Section 9 — Subscriptions / tooling

All SaaS transfers NOT STARTED per available evidence. Sole trader still the active Xero entity.

### Section 10 — Communications

| Item | Status | Change |
|---|---|---|
| Announcement email to funders/partners | 🔴 NOT CONFIRMED | → |
| Email/website footer updates | 🔴 NOT CONFIRMED | → |

### Section 11 — Standard Ledger decisions

No new information on D11.2 (payroll), D11.3 (Dext emails), D11.5 (Knight Photography invoices). D11.4 (mapping export) remains ✅ DONE.

### Section 12 — EOFY Decision Pack (2026-06-19)

| Decision | Status | Change |
|---|---|---|
| Transfer path: journal-entry vs market-value sale fork | 🔴 NOT RESOLVED | → |
| Final sole trader BAS | **2 DAYS OVERDUE** | 🚨 CRITICAL |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-07-23 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~7 | ~10% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | ↓ −1 |
| 🚨 OVERDUE | ~1 | ~2% | 🆕 BAS escalated |
| **Total** | **~65** | | → |

---

## Cutover risk map — post-cutover

### 🚨 Red (active problems today)

1. **Final sole trader BAS overdue as of 2026-07-28.** Whether lodged or genuinely late is not visible in DB. Standard Ledger must confirm immediately. If late, ATO late-lodgement penalties apply.
2. **Rotary INV-0222 ($82,500, 476 days) — write-off outcome unknown.** This should have been resolved before BAS. INV-0222 is still AUTHORISED in DB. If not written off, the bad-debt deduction was not taken. If written off in Xero but not yet synced to DB, the DB lags reality.
3. **EOFY strategic fork unresolved.** No Standard Ledger ruling on journal-entry vs market-value sale. Until resolved, cross-entity journals should not be booked. R&D FY27 structure is unclear.
4. **AusIndustry R&D FY27 entity designation pending.** The internal milestone of 1 July was for deciding which Pty entity registers as the FY27 R&D registrant (§12 decision). The actual AusIndustry filing is not due until ~April 2028 (10 months after FY27 year-end). No ATO deadline is overdue — but the entity decision needs to be made before meaningful FY27 R&D records can be attributed.

### 🟠 Amber (this week)

5. **Confirm BAS lodgement with Standard Ledger** — if lodged, mark off; if not, act now.
6. **Confirm Pty Xero file open and $1 test invoice run** — `new-entity-xero-launch-playbook.md` exists; confirm execution.
7. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
8. **Confirm D&O insurance binding** — now 106 days past the 30-day-post-registration deadline.
9. **Tag the 3 post-cutover invoices** (INV-0334, INV-0341, INV-0342) — for BAS accuracy and project tracking.
10. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable within a month)

11. D11.5 Knight Photography Phase 1+2 invoices.
12. Subscription billing transfers.
13. GitHub org transfer.
14. Email/website footer updates.
15. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS — now triggered)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)

---

## Open questions

1. **Has the sole trader Q4 FY26 BAS been lodged with Standard Ledger?** It was due 2026-07-28.
2. **What happened to Rotary INV-0222?** Written off in Xero but not yet synced, or still outstanding?
3. **Has Standard Ledger confirmed the market-value-sale vs journal-entry fork?**
4. **Has the Pty Xero file been opened and the $1 test invoice run?**
5. **Has D&O insurance been bound?** 106 days past the 30-day-post-registration deadline.
6. **Has AusIndustry R&D re-registration for FY27 been initiated?**

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-07-30 (1 tenant, 2,293 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-07-30 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-07-30 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-07-30 (12 rows, $417,767.84) |
| DB | INV-0303, INV-0337 individual lookup | 2026-07-30 (both PAID) |
| Plans | `thoughts/shared/plans/` migration+eofy+cutover grep | 9+ matching files |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-07-23|Q3 entity migration — 2026-07-23 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-07-30|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-30|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
