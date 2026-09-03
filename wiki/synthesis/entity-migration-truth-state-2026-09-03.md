---
title: Entity migration truth-state — 65 days post-cutover, BAS 37 days overdue, D&O 141 days past deadline
summary: Eighth pass of the ACT Alignment Loop (Q3), 2026-09-03. 65 days post-cutover. Xero +40 invoices (2,391 total). Outstanding ACCREC falls to $285,998.84 (−$34,819 — Oonchiumpa INV-0344 paid; 2 new small invoices). BAS Q4 FY26 now 37 days past standard due date (was 23). D&O insurance now 141 days past deadline. Still 1 Xero tenant (sole trader only). Bank data still ends 2026-03-31. No new migration artefacts. Sole-trader tax return deadline (31 Oct 2026) is 58 days away.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-09-03
---

# Entity migration truth-state — 2026-09-03

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **65 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-08-20|2026-08-20]].

## Headline findings

1. **Oonchiumpa INV-0344 ($41,250) paid — outstanding ACCREC falls to $285,998.84.** Two new small invoices (Tandanya INV-0347 $5,500 and Joy House Productions INV-0349 $931) partially offset the clearance. Net movement: −$34,819 from Aug 20.

2. **BAS Q4 FY26 (sole-trader) is now 37 days past the standard due date** (2026-07-28). Up from 23 days at Aug 20 (+14 days per week elapsed). No lodgement evidence visible. The sole-trader **tax return itself is due 31 October 2026 — 58 days away.** Rotary write-off treatment must be decided before the return is filed.

3. **D&O insurance is now 141 days past the ~2026-05-24 deadline.** Up from 127 days at Aug 20. Nearly five months of potential uninsured director liability with no visible resolution across eight passes.

4. **Xero: still 1 tenant, now 2,391 invoices (+40 from Aug 20).** Sync running consistently. No second (Pty) tenant visible in DB. The Pty Xero file may exist but remain unsynced — cannot confirm from DB alone.

5. **Bank data still ends 2026-03-31** — NAB Visa ACT #8815 only, 1,618 transactions. Unchanged since the April 2026 baseline (over 22 consecutive weeks of stale bank data). No Pty NAB account visible.

6. **No new migration artefacts.** Same 5 migration plan files in `thoughts/shared/plans/` (checklist, runbook, two Minimax, new entity Xero launch playbook). Same `novation-letter-templates.md` in drafts (unchanged since May). No new governance, IP, insurance or comms artefacts produced since the cutover.

7. **Sole-trader tax return deadline approaching (31 Oct 2026 = 58 days).** This is the new gating constraint replacing the 30 June cutover deadline. Key outstanding items that must resolve before filing: Rotary INV-0222 write-off treatment, EOFY strategic fork (journal vs market-value sale), ALIVE/Oonchiumpa entity treatment, R&D FY26 claim structuring.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+65 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-08-20 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | Required before sole-trader tax return filing | 🔴 NOT RESOLVED | ↑ now gating |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,391 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 37 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 23d at Aug 20, now 37d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (511d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) still untagged; INV-0349 Joy House ($931) new, untagged | ❓ UNCONFIRMED | ↓ Oonchiumpa cleared; 2 new untagged |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway; not due ~Apr 2028 | 🟡 PENDING ENTITY DECISION | → |
| **Sole-trader tax return deadline** | **31 October 2026 — 58 days away** | **🚨 APPROACHING** | 🆕 now in scope |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-09-03|Q1 funder synthesis — this pass]]. Total $285,998.84 (11 invoices).

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-08-20.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **141 days past deadline** | ↑ was 127d at Aug 20, now 141d |
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
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED — **now gating sole-trader tax return** | ↑ escalated |
| Final sole trader BAS | 🚨 37 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-08-20 |
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

1. **Sole-trader tax return (31 Oct 2026, 58 days away)** — this is the new gating constraint. Three items must resolve before filing: Rotary write-off ($82,500), EOFY strategic fork (journal vs sale), R&D FY26 claim structure.
2. **BAS Q4 FY26 — 37 days past standard due date.** Confirm with Standard Ledger: lodged or concession deadline? No evidence of lodgement across eight passes.
3. **Rotary INV-0222 ($82,500, 511 days)** — write-off window before sole-trader tax return is 58 days. Invoice still AUTHORISED.
4. **D&O insurance — 141 days past the ~2026-05-24 deadline.** ~5 months of potential uninsured director liability. No binding evidence in any pass.
5. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking R&D claim structuring and sole-trader tax return.

### 🟠 Amber (this week)

6. **Tag INV-0341 ALIVE ($66,000) and INV-0347 Tandanya ($5,500)** — $71.5K untracked.
7. **Identify Joy House Productions** — INV-0349 $931, new counterparty, no project_code.
8. **Confirm Pty Xero file open and $1 test invoice run.**
9. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
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

## Open questions

1. **Sole trader BAS Q4 FY26** — lodged or concession date? What is the Standard Ledger concession deadline?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 141 days overdue.
4. **Rotary INV-0222** — write-off treatment confirmed before the sole-trader tax return?
5. **Joy House Productions** — who are they? What project does INV-0349 belong to?
6. **ALIVE INV-0341** ($66,000, 2026-07-02) — sole-trader or Pty entity treatment?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-09-03 (1 tenant, 2,391 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-09-03 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-09-03 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-09-03 (11 rows, $285,998.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 5 matching files as Aug 20 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-08-20|Q3 entity migration — 2026-08-20 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-09-03|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-09-03|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
