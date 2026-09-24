---
title: Entity migration truth-state — 86 days post-cutover, tax return 37 days away, BAS 58 days overdue, D&O 123 days past deadline
summary: Tenth pass of the ACT Alignment Loop (Q3), 2026-09-24. 86 days post-cutover. Xero +54 invoices (2,448 total). ACCREC down $931 to $285,067.84 — Joy House INV-0349 cleared, 10 open invoices. BAS Q4 FY26 now 58 days past standard due date. D&O insurance now 123 days past ~2026-05-24 deadline. Sole-trader tax return (31 Oct 2026) 37 days away. Still 1 Xero tenant. Bank data still ends 2026-03-31 (177 days stale). No new migration artefacts.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-09-24
---

# Entity migration truth-state — 2026-09-24

> Tenth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **86 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-09-10|2026-09-10]].

## Headline findings

1. **Joy House INV-0349 ($931) cleared — ACCREC now $285,067.84 on 10 invoices.** The only receivables movement in the 14-day interval. The remaining 10 invoices are unchanged in status and amount. Three compliance deadlines are now converging within 37 days.

2. **Sole-trader tax return is now 37 days away (31 Oct 2026).** Down from 51 days at Sep 10. Three blocking items persist unresolved across all ten passes: Rotary INV-0222 write-off treatment ($82,500, 532 days), EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring. These are not complex decisions, but each requires a Standard Ledger conversation. **The window to have those conversations is now ≤37 days.**

3. **BAS Q4 FY26 now 58 days past the standard due date** (2026-07-28). Up from 44 days at Sep 10. Standard Ledger (registered tax agent) likely holds a concession date, but it has not been confirmed in any data source across ten passes. If the concession deadline is end-October, BAS and the sole-trader tax return are now on the same 37-day clock.

4. **D&O insurance now 123 days past the ~2026-05-24 deadline.** Up from 109 days at Sep 10. Over 4 months of potential uninsured director liability. No binding evidence across any of the ten passes. A single phone call to the broker resolves this.

5. **Xero: still 1 tenant, now 2,448 invoices (+54 from Sep 10).** The +54 burst is primarily expense-coding catch-ups (ACT-GD +9, ACT-HV +4, ACT-10/ACT-BG new in top 20). The Pty Xero file may exist but remains unsynced — cannot confirm from DB alone. Bank data still ends 2026-03-31 (177 days stale).

6. **No new migration artefacts.** Same 5 migration plan files in `thoughts/shared/plans/` as Sep 10 (checklist, runbook, two Minimax, Xero launch playbook). Same `novation-letter-templates.md` in drafts. No new governance, IP, insurance or comms artefacts produced since cutover.

7. **ALIVE INV-0341 ($66,000) entity treatment unresolved at 84 days.** Raised 2026-07-02 on the sole trader, post-cutover. Whether this should be sole-trader or Pty remains unresolved. Tax return filing requires a clear answer within 37 days.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+86 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-09-10 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | Required before sole-trader tax return filing | 🔴 NOT RESOLVED | ↑ now 37d from deadline |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31; no Pty account visible (177d stale) | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,448 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 58 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 44d at Sep 10, now 58d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (532d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) still untagged (84d); INV-0347 Tandanya (27d); INV-0332 Tandanya (99d) | ❓ UNCONFIRMED | Joy House cleared |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway | 🟡 PENDING ENTITY DECISION | → |
| **Sole-trader tax return deadline** | **31 October 2026 — 37 days away** | **🚨 CRITICAL** | ↑ was 51d at Sep 10 |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-09-24|Q1 funder synthesis — this pass]]. Total $285,067.84 (10 invoices, Joy House cleared).

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-09-10.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **123 days past deadline** | ↑ +14d (was 109d at Sep 10) |
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
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED — **now gating sole-trader tax return, 37d to filing** | ↑ escalated |
| Final sole trader BAS | 🚨 58 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-09-10 |
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

### 🚨 Red (active compliance problems — now converging on a single 37-day window)

1. **Sole-trader tax return (31 Oct 2026, 37 days away)** — the overarching deadline. Three prerequisites must resolve: Rotary write-off ($82,500, 532d), EOFY strategic fork (journal vs sale), R&D FY26 claim structure. None have shown visible progress across ten passes.
2. **BAS Q4 FY26 — 58 days past standard due date.** If Standard Ledger's concession deadline is end-October, BAS and tax return share a 37-day window. Confirm the concession date immediately.
3. **Rotary INV-0222 ($82,500, 532d)** — write-off window before sole-trader tax return is 37 days. Still AUTHORISED. Decision required this week.
4. **D&O insurance — 123 days past the ~2026-05-24 deadline.** Over 4 months. A single call to the broker confirms or resolves this; continued silence is worse than the answer.
5. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking R&D claim structuring and tax return.

### 🟠 Amber (this week)

6. **Confirm ALIVE INV-0341 entity treatment** — $66,000 raised post-cutover on sole trader (84d). Sole-trader or Pty? Must resolve before tax return (37 days).
7. **Tag INV-0332 Tandanya ($16,500, 99d) and INV-0341 ALIVE ($66,000, 84d)** — $82,500 untracked.
8. **Confirm Pty Xero file open and $1 test invoice run.**
9. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable)

10. Subscription billing transfers.
11. GitHub org transfer.
12. Email/website footer updates.
13. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS lodged)
- ASIC first annual review (2027)
- Workers Comp (first employee)
- AusIndustry R&D designation (due ~Apr 2028)

---

## Open questions (unchanged since Sep 3 — now urgent with 37-day tax return deadline)

1. **Sole trader BAS Q4 FY26** — lodged or concession date? What is the Standard Ledger concession deadline?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 123 days overdue.
4. **Rotary INV-0222** — write-off treatment confirmed before the sole-trader tax return? 37 days.
5. **ALIVE INV-0341** ($66,000, 2026-07-02) — sole-trader or Pty entity treatment?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-09-24 (1 tenant, 2,448 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-09-24 (data ends 2026-03-31, 177d stale) |
| DB | `xero_invoices` status/type summary | 2026-09-24 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-09-24 (10 rows, $285,067.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 9 matching files as Sep 10 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-09-10|Q3 entity migration — 2026-09-10 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-09-24|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-09-24|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
