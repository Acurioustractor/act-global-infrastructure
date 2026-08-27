---
title: Entity migration truth-state — 58 days post-cutover, BAS 30 days overdue, D&O 95 days past stated deadline
summary: Eighth pass of the ACT Alignment Loop (Q3), 2026-08-27. 58 days post-cutover. Xero +11 invoices (2,362 total). Outstanding ACCREC falls to $286,520.84 (−$34,297 — Oonchiumpa INV-0344 paid, Tanya Turner INV-0345 new). BAS Q4 FY26 now 30 days past standard due date (was 23). D&O insurance: 95 days past the stated ~2026-05-24 deadline (prior passes used a different reference — see note). Sole-trader tax return due 65 days. Still 1 Xero tenant. Bank data still ends 2026-03-31. No new migration artefacts.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-08-27
---

# Entity migration truth-state — 2026-08-27

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **58 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-08-20|2026-08-20]].

## Headline findings

1. **Oonchiumpa INV-0344 ($41,250) PAID — outstanding ACCREC falls to $286,520.84.** New invoice INV-0345 (Tanya Turner, $6,953) added this pass — untagged. Net movement −$34,297 from Aug 20. Outstanding below $300K for first time in the loop's history.

2. **BAS Q4 FY26 (sole-trader) is now 30 days past the standard due date** (2026-07-28). Was 23 days at Aug 20. Standard Ledger holds registered tax agent status and likely has a concession date — but no lodgement evidence is visible in any data source. The sole-trader tax return is due 31 October 2026 — **65 days away**. The BAS must precede the tax return.

3. **D&O insurance: 95 days past the stated ~2026-05-24 deadline** (May 24 → Aug 27 = 95 days). Prior passes showed 120d at Aug 13 and 127d at Aug 20, which implies a different reference date (~April 15) was used in the running count — the exact registration date is unverified in this loop. Regardless of the reference, D&O remains unconfirmed across all eight passes with no binding evidence visible.

4. **Xero: still 1 tenant, now 2,362 invoices (+11 from Aug 20).** Sync is running consistently. No second (Pty) tenant visible in DB. Whether the Pty Xero file exists but is unsynced remains unconfirmable from DB alone.

5. **Bank data still ends 2026-03-31** — NAB Visa ACT #8815 only, 1,618 transactions. No Pty NAB account visible. Unchanged since the April 2026 baseline.

6. **No new migration artefacts.** Migration plans: same 7 files in `thoughts/shared/plans/`. Migration drafts: `novation-letter-templates.md` only (unchanged since May). No new decisions, no new playbooks.

7. **EOFY strategic fork (journal vs market-value sale), Shareholders Agreement, and funder novation letters remain unresolved.** No change from Aug 20.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+58 days**.

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
| Strategic fork confirmed with SL (journal vs sale) | Planning underway; no SL ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,362 inv); may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 30 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 23d at Aug 20, now 30d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (504d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) + INV-0345 Tanya Turner ($6,953) = $72,953 untagged | ❓ UNCONFIRMED | → Oonchiumpa cleared; Tanya Turner new |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway; AusIndustry not due until ~Apr 2028 | 🟡 PENDING ENTITY DECISION | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-08-27|Q1 funder synthesis — this pass]]. Total $286,520.84 (10 invoices).

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
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **95 days past stated deadline** (prior count ~134d — reference date unclear; see headline finding 3) | → |
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
| Final sole trader BAS | 🚨 30 days past standard due date | ↑ escalated from 23d |
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

1. **BAS Q4 FY26 — 30 days past standard due date.** Confirm with Standard Ledger: lodged or concession deadline? The sole-trader tax return (31 Oct 2026) is 65 days away and requires BAS to be complete first.
2. **Rotary INV-0222 ($82,500, 504 days)** — write-off window for BAS purposes is long past. Invoice still AUTHORISED. Formal resolution required before the sole-trader tax return (65 days).
3. **D&O insurance — 95 days past the stated ~2026-05-24 deadline** (prior passes counted from a different reference point; see headline finding 3). No binding evidence in any of the eight passes. Regardless of exact count, D&O remains unconfirmed.
4. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible; blocking clean R&D claim structuring and sole-trader tax return.

### 🟠 Amber (this week)

5. **Identify and tag INV-0345 Tanya Turner ($6,953, 2026-08-22)** — new invoice, no project_code.
6. **Tag INV-0341 ALIVE ($66,000) with project_code** — untagged since 2026-07-02.
7. **Confirm Pty Xero file open and $1 test invoice run** — sync is running on sole trader only.
8. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
9. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable)

10. Subscription billing transfers.
11. GitHub org transfer.
12. Email/website footer updates.
13. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)
- AusIndustry R&D designation (due ~Apr 2028)

---

## Approaching deadlines

| Deadline | Item | Status |
|---|---|---|
| 31 Oct 2026 | Sole-trader tax return (FY26) | 65 days away |
| Overdue (30d) | BAS Q4 FY26 | 🚨 PAST DUE |
| Overdue (134d) | D&O insurance | 🔴 PAST DUE |

---

## Open questions

1. **Sole trader BAS Q4 FY26** — has Standard Ledger lodged it or is there a concession date? What is the Rotary write-off treatment and treatment for the $72,953 untagged post-cutover invoices?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 134 days overdue.
4. **Pty Xero file** — open and operational? Xero sync running (sole trader, 2,362 invoices) but only 1 tenant visible.
5. **Tanya Turner INV-0345** ($6,953, 2026-08-22) — who is this? Which project? Sole-trader or Pty entity?
6. **ALIVE INV-0341** ($66,000, 2026-07-02) — still AUTHORISED on the sole trader. Sole-trader or Pty entity treatment?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-08-27 (1 tenant, 2,362 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-08-27 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-08-27 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-08-27 (10 rows, $286,520.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | Same 7 matching files as Aug 20 |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-08-20|Q3 entity migration — 2026-08-20 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-08-27|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-27|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
