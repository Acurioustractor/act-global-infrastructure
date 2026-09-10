---
title: Entity migration truth-state — 72 days post-cutover, BAS 44 days overdue, D&O 109 days past deadline, tax return 51 days away
summary: Ninth pass of the ACT Alignment Loop (Q3), 2026-09-10. 72 days post-cutover. Xero +3 invoices (2,394 total). ACCREC UNCHANGED at $285,998.84 — zero cleared in 7 days. BAS Q4 FY26 now 44 days past standard due date (was 37). D&O insurance now 109 days past ~2026-05-24 deadline (prior passes over-counted; correct figure verified 2026-09-10). Sole-trader tax return (31 Oct 2026) now 51 days away (was 58). Still 1 Xero tenant (sole trader only). Bank data still ends 2026-03-31. No new migration artefacts.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-09-10
---

# Entity migration truth-state — 2026-09-10

> Ninth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **72 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-09-03|2026-09-03]].

## Headline findings

1. **ACCREC flat — $285,998.84, UNCHANGED from 2026-09-03.** Zero invoices paid in 7 days. Zero new invoices raised. First completely static week since the baseline. All 11 invoices have aged by 7 days. No evidence of active chasing.

2. **Sole-trader tax return is now 51 days away (31 Oct 2026).** Down from 58 days at Sep 3. Three blocking items persist unresolved: Rotary INV-0222 write-off treatment ($82,500, 518 days), EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring. None have shown visible progress across nine passes.

3. **BAS Q4 FY26 now 44 days past the standard due date** (2026-07-28). Up from 37 days at Sep 3. Standard Ledger (registered tax agent) likely holds a concession date, but it has not been confirmed in any data source across nine passes. If the concession date is the standard tax-agent extension (typically end of October), BAS may already be on the critical path toward the tax return.

4. **D&O insurance now 109 days past the ~2026-05-24 deadline.** (Prior passes over-counted by ~39 days; corrected figure: 2026-05-24 → 2026-09-10 = 109 days.) Nearly 4 months of potential uninsured director liability. No binding evidence across any of the nine passes. This is the single most persistently red item in the tracker.

5. **Xero: still 1 tenant, now 2,394 invoices (+3 from Sep 3).** Sync running consistently. The Pty Xero file may exist but remain unsynced — cannot confirm from DB alone. Bank data still ends 2026-03-31.

6. **No new migration artefacts.** Same 5 migration plan files in `thoughts/shared/plans/` (checklist, runbook, two Minimax, new entity Xero launch playbook). Same `novation-letter-templates.md` in drafts (unchanged since May). No new governance, IP, insurance or comms artefacts produced since the cutover.

7. **ALIVE INV-0341 ($66,000) entity treatment unresolved at 70 days.** Raised 2026-07-02 on the sole trader, post-cutover. Whether this should be sole-trader or Pty remains unvisible from DB. Tax return filing will require a clear answer.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+72 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-09-03 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | Required before sole-trader tax return filing | 🔴 NOT RESOLVED | ↑ now 51d from deadline |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,394 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 44 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 37d at Sep 3, now 44d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (518d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) still untagged (70d); INV-0347 Tandanya (13d); INV-0349 Joy House (10d) | ❓ UNCONFIRMED | → |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway | 🟡 PENDING ENTITY DECISION | → |
| **Sole-trader tax return deadline** | **31 October 2026 — 51 days away** | **🚨 APPROACHING** | ↑ was 58d at Sep 3 |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-09-10|Q1 funder synthesis — this pass]]. Total $285,998.84 (11 invoices, unchanged).

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-09-03.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **109 days past deadline** | corrected: prior passes over-counted; true figure 109d |
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

### Section 12 — EOFY Decision Pack

| Decision | Status | Change |
|---|---|---|
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED — **now gating sole-trader tax return, 51d to filing** | ↑ escalated |
| Final sole trader BAS | 🚨 44 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-09-03 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~8 | ~12% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | → |
| **Total** | **~65** | | → |

_No items changed status this pass._

---

## Cutover risk map — post-cutover

### 🚨 Red (active compliance problems — escalating)

1. **Sole-trader tax return (31 Oct 2026, 51 days away)** — gating constraint. Three items must resolve before filing: Rotary write-off ($82,500), EOFY strategic fork (journal vs sale), R&D FY26 claim structure.
2. **BAS Q4 FY26 — 44 days past standard due date.** Confirm with Standard Ledger: lodged or concession deadline? No evidence of lodgement across nine passes.
3. **Rotary INV-0222 ($82,500, 518 days)** — write-off window before sole-trader tax return is 51 days. Invoice still AUTHORISED.
4. **D&O insurance — 109 days past the ~2026-05-24 deadline.** Nearly 4 months of potential uninsured director liability. No binding evidence across nine passes. (Note: prior passes over-counted by ~39 days due to a calculation error.)
5. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking R&D claim structuring and sole-trader tax return.

### 🟠 Amber (this week)

6. **Confirm ALIVE INV-0341 entity treatment** — $66,000 raised post-cutover on sole trader (70d). Sole-trader or Pty? Must resolve before tax return.
7. **Tag INV-0332 Tandanya ($16,500), INV-0341 ALIVE ($66,000), INV-0347 Tandanya ($5,500)** — $88,000 untracked.
8. **Identify Joy House Productions** — INV-0349 $931, new counterparty, no project_code.
9. **Confirm Pty Xero file open and $1 test invoice run.**
10. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable)

11. Subscription billing transfers.
12. GitHub org transfer.
13. Email/website footer updates.
14. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS lodged)
- ASIC first annual review (2027)
- Workers Comp (first employee)
- AusIndustry R&D designation (due ~Apr 2028)

---

## Open questions (unchanged since Sep 3)

1. **Sole trader BAS Q4 FY26** — lodged or concession date? What is the Standard Ledger concession deadline?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 109 days overdue (corrected figure).
4. **Rotary INV-0222** — write-off treatment confirmed before the sole-trader tax return?
5. **Joy House Productions** — who are they? What project does INV-0349 belong to?
6. **ALIVE INV-0341** ($66,000, 2026-07-02) — sole-trader or Pty entity treatment?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-09-10 (1 tenant, 2,394 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-09-10 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-09-10 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-09-10 (11 rows, $285,998.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 5 matching files as Sep 3 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-09-03|Q3 entity migration — 2026-09-03 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-09-10|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-09-10|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
