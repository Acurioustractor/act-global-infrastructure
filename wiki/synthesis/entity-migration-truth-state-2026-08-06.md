---
title: Entity migration truth-state — 37 days post-cutover, BAS 9 days overdue, D&O 113 days past deadline
summary: Fifth pass of the ACT Alignment Loop (Q3), 2026-08-06. 37 days post-cutover. BAS Q4 FY26 standard due date (2026-07-28) is now 9 days past — lodgement status unknown. ACCREC outstanding $417,767.84 (unchanged from 2026-07-30). Xero still 1 tenant (2,293 invoices, no change since 2026-07-23). D&O insurance 113 days past the 2026-05-24 deadline. EOFY strategic fork still unresolved.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-08-06
---

# Entity migration truth-state — 2026-08-06

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **37 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-07-23|2026-07-23]]. Note: a 2026-07-30 pass exists on an unmerged branch (`alignment-loop-2026-07-30`).

## Headline findings

1. **BAS Q4 FY26 (sole-trader) standard due date was 2026-07-28 — now 9 days past.** No lodgement artefact is visible in Supabase. Standard Ledger is ACT's registered tax agent and may hold a concession date beyond the standard 28 July deadline; the applicable deadline must be confirmed with them directly. If lodged under a concession, the concession date and lodgement outcome are the two unknowns. If not yet lodged, this is the most urgent compliance obligation in the portfolio.

2. **Outstanding ACCREC: $417,767.84 — unchanged from 2026-07-30.** 12 invoices, no movement since July 30. The $53,950 cleared between July 23 and July 30 (Homeland School $44K + Sonas second invoice $9.95K) was the last movement. Post-cutover sole-trader invoices ($189.2K: ALIVE ×2 + Mounty) remain unresolved.

3. **Only 1 Xero tenant in DB — the sole trader, now 2,293 invoices (zero change since 2026-07-23).** After the +46 jump between July 16 and July 23, there has been zero Xero invoice activity in the DB for two weeks. Whether a Pty Xero file exists but is unsynced is unconfirmable from the DB; it would not be visible here.

4. **Bank statement data still ends 2026-03-31.** `bank_statement_lines` shows only NAB Visa ACT #8815 with 1,618 transactions. No Pty NAB account is visible.

5. **D&O insurance is now 113 days past the 2026-05-24 deadline.** Registered 2026-04-24; D&O was due within 30 days of registration. If not yet bound, the company has operated without directors and officers coverage for over 3 months.

6. **EOFY strategic fork (journal-entry vs market-value sale) remains unresolved.** The 2026-06-19 Decision Pack concluded the journal-entry model likely fails under Subdiv 328-G. No Standard Ledger ruling is visible in any plan or draft. Two new R&D plans have appeared since the July 23 pass (`rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md`), indicating active work on the FY26/FY27 R&D strategy — but the fundamental transfer-path question remains open.

7. **Unmerged July 30 branch.** The `alignment-loop-2026-07-30` branch contains synthesis artefacts that were not merged before this session. That branch carries the same fundamental data as this pass. It should be merged or superseded.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+37 days**.

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
| Strategic fork confirmed with SL (journal vs sale) | EOFY Decision Pack raises it; 2 new R&D plans but no ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | `bank_statement_lines` data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (2,293 inv, stagnant 14 days); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 9 days past. Agent concession date unknown.** | **🚨 CONFIRM STATUS** | 🆕 now 9 days past vs "5 days away" at Jul 23 |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment (Rule 2 — 3 invoices $189.2K) | All null project_code | ❓ UNCONFIRMED | → |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | New plans: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | 🆕 new R&D plans since Jul 23 |
| R&D FY27 entity designation (AusIndustry) | Planning underway; AusIndustry not due until ~Apr 2028 | 🟡 PENDING ENTITY DECISION | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-08-06|Q1 funder synthesis — this pass]].

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Section 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-07-23.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **113 days past deadline** | 🆕 was 99d at Jul 23, now 113d |
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
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED | → (new R&D plans indicate active work on FY26 R&D, tangential to transfer-path) |
| Final sole trader BAS | 🚨 9 days past standard due date | 🆕 escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-07-23 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~8 | ~12% | ↑ +1 (R&D plans now in-progress) |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | ↓ −1 (BAS escalated to 🚨) |
| **Total** | **~65** | | → |

---

## Cutover risk map — post-cutover

### 🚨 Red (active compliance problems)

1. **BAS Q4 FY26 — now 9 days past standard due date.** Confirm with Standard Ledger whether a concession applies and what the concession deadline is. If not yet lodged, this is immediately urgent.
2. **Rotary INV-0222 ($82,500, 483 days) — write-off or chase.** The BAS window may have passed. If written off, it should appear VOIDED in Xero — currently it does not.
3. **D&O insurance — 113 days past the ~2026-05-24 deadline.** If not bound, the company has operated 3+ months without D&O coverage. Confirm with Standard Ledger / insurance broker.
4. **EOFY strategic fork (journal-entry vs market-value sale) unresolved.** No cross-entity journals should be booked until this is confirmed. Affects R&D claim structure for both FY26 and FY27.

### 🟠 Amber (this week)

5. **Confirm Pty Xero file open** and $1 test invoice run — zero Xero activity in DB for 14 days; the Pty file may be open but unsynced.
6. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
7. **Tag the 3 post-cutover invoices** (INV-0334, INV-0341, INV-0342) — $189.2K untracked.
8. **Confirm Shareholders Agreement signed.**
9. **R&D FY27 entity designation** — planning underway (new plans seen); ensure the AusIndustry filing schedule is tracked.

### 🟡 Yellow (recoverable within a month)

10. Subscription billing transfers.
11. GitHub org transfer.
12. Email/website footer updates.
13. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)

---

## Open questions

1. **Sole trader BAS Q4 FY26** — has Standard Ledger lodged it or is there a concession date? What is the Rotary write-off treatment and Rule 2 treatment for the $189.2K post-cutover invoices?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale? The new R&D plans suggest active FY26/FY27 planning; this fork is the prerequisite.
3. **D&O insurance** — is it bound? 113 days overdue.
4. **Pty Xero file** — open and operational? The launch playbook exists; has it been executed?
5. **July 30 branch** — `alignment-loop-2026-07-30` is unmerged. Was there a reason it wasn't merged, or was it superseded by this run?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-08-06 (1 tenant, 2,293 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-08-06 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-08-06 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-08-06 (12 rows, $417,767.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | 8 matching files incl. `new-entity-xero-launch-playbook.md`, `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-07-23|Q3 entity migration — 2026-07-23 last merged pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-08-06|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-06|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
