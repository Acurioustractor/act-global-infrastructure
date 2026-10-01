---
title: Entity migration truth-state — 93 days post-cutover, tax return 30 days away, BAS 65 days overdue, D&O 130 days past deadline
summary: Eleventh pass of the ACT Alignment Loop (Q3), 2026-10-01. 93 days post-cutover. Xero +18 invoices (2,466 total). ACCREC flat at $285,067.84 — zero movement in 7 days, 10 open invoices. BAS Q4 FY26 now 65 days past standard due date. D&O insurance 130 days past ~2026-05-24 deadline. Sole-trader tax return (31 Oct 2026) 30 days away. Still 1 Xero tenant. Bank data still ends 2026-03-31 (184 days stale). One-company alignment plan (PR #258) exists but was missed by prior keyword greps.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-10-01
---

# Entity migration truth-state — 2026-10-01

> Eleventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **93 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last merged pass: [[entity-migration-truth-state-2026-09-24|2026-09-24]].

## Headline findings

1. **ACCREC flat — $285,067.84 on 10 invoices. Zero movement in 7 days.** No payments received, no new invoices. The ledger has been static for two consecutive passes. Every invoice aged +7 days. The three critical compliance deadlines are now inside 30 days.

2. **Sole-trader tax return is now 30 days away (31 Oct 2026).** Down from 37 days at Sep 24. The same three blocking items persist across eleven passes: Rotary INV-0222 write-off ($82,500, 539d), EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring. **30 days is the minimum time for a Standard Ledger conversation to produce a ruling, a return to be prepared, and the return to be filed. The window is now closed for anything but immediate action.**

3. **BAS Q4 FY26 now 65 days past the standard due date** (2026-07-28). Up from 58 days at Sep 24. Standard Ledger concession deadline still not confirmed in any data source across eleven passes. If the concession window is end-October, BAS and the sole-trader tax return are on the same final 30-day clock.

4. **D&O insurance now 130 days past the ~2026-05-24 deadline.** Up from 123 days. Over 4 months of uninsured director exposure. A single call to the broker resolves this — the open question is whether it is bound or not.

5. **One-company alignment plan (PR #258) confirmed in plans/ but missed by prior passes.** `thoughts/shared/plans/act-one-company-alignment-2026-09-07.md` settles the entity structure question: Option A (ACT Pty trades everything, Harvest is a tracking category until the landlord takes shares). Written 2026-09-07, predates the Sep 10 and Sep 24 passes. The plan confirms the structure is decided; the gap is execution, not strategy.

6. **Still 1 Xero tenant, now 2,466 invoices (+18).** No second Pty Xero file visible in the DB. The sole trader is still the only Xero entity synced. Bank data still ends 2026-03-31 (184 days stale).

7. **No new migration artefacts since Sep 24.** Same 7 migration-plan files in `thoughts/shared/plans/` (checklist, runbook, two Minimax, Xero launch playbook, one-company alignment plan, entity alignment). Same `novation-letter-templates.md` in drafts. No new governance, IP, insurance or comms artefacts.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+93 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-09-24 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Entity structure decision | ✅ Option A settled in `act-one-company-alignment-2026-09-07.md` (PR #258) — ACT Pty trades everything | ✅ DECIDED | ↑ NEW — missed by prior passes |
| Strategic fork confirmed with SL (journal vs sale) | Required before sole-trader tax return (30 days) | 🔴 NOT RESOLVED | ↑ now 30d from deadline |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | Bank data ends 2026-03-31 (184d stale); no Pty account visible | ❓ UNCONFIRMED | ↑ +7d stale |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero / BAS

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB (sole trader, 2,466 inv); may be open but unsynced | ❓ UNCONFIRMED | ↑ +18 invoices |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Standard due date 2026-07-28 — now 65 days past. Agent concession deadline unknown.** | **🚨 CONFIRM STATUS** | ↑ was 58d at Sep 24, now 65d |
| Rotary write-off for BAS | INV-0222 still AUTHORISED at $82,500 (539d) | ❓ OUTCOME UNKNOWN | → |
| Post-cutover invoice treatment | INV-0341 ALIVE ($66K) still untagged (91d); INV-0347 Tandanya (34d); INV-0332 Tandanya (106d) | ❓ UNCONFIRMED | → +7d each |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY26 sole-trader claim | Plans active: `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md` | 🟡 IN PROGRESS (planning) | → |
| R&D FY27 entity designation (AusIndustry) | Planning underway | 🟡 PENDING ENTITY DECISION | → |
| **Sole-trader tax return deadline** | **31 October 2026 — 30 days away** | **🚨 CRITICAL — final window** | ↑ was 37d at Sep 24 |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-10-01|Q1 funder synthesis — this pass]]. Total $285,067.84 (10 invoices, flat from Sep 24).

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Sections 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-09-24.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — **130 days past deadline** | ↑ +7d (was 123d at Sep 24) |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 evidence | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED | → |
| Entity structure (who trades what) | ✅ DECIDED — Option A, `act-one-company-alignment-2026-09-07.md` | ↑ newly surfaced |
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
| Transfer path: journal-entry vs market-value sale | 🔴 NOT RESOLVED — **now 30d from sole-trader tax return** | ↑ escalated |
| Final sole trader BAS | 🚨 65 days past standard due date | ↑ escalated |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-09-24 |
|---|---:|---:|---|
| ✅ DONE | ~9 | ~14% | ↑ +1 (entity structure decision surfaced from `act-one-company-alignment-2026-09-07.md`) |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~8 | ~12% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~29 | ~45% | ↓ −1 |
| ⏳ NOT YET DUE / BLOCKED | ~11 | ~17% | → |
| **Total** | **~65** | | |

_One item moved: entity structure decision reclassified from 🔴 to ✅ (was always decided — missed in prior passes because the plan didn't match the migration keyword grep)._

---

## Cutover risk map — post-cutover

### 🚨 Red (final 30-day window — everything below must move this week)

1. **Sole-trader tax return (31 Oct 2026, 30 days away)** — the primary deadline. Three prerequisites: Rotary write-off ($82,500, 539d), EOFY strategic fork (journal vs sale), R&D FY26 claim structure. None have shown visible progress across eleven passes. **Contact Standard Ledger this week.**
2. **BAS Q4 FY26 — 65 days past standard due date.** If Standard Ledger's concession deadline is end-October, this and the tax return share the same 30-day window. Confirm the concession date.
3. **Rotary INV-0222 ($82,500, 539d)** — write-off decision required before the tax return. Still AUTHORISED. **This week.**
4. **D&O insurance — 130 days past the ~2026-05-24 deadline.** A single call to the broker confirms or resolves this. Continued silence is not acceptable.
5. **EOFY strategic fork (journal vs market-value sale)** — no Standard Ledger ruling visible across eleven passes; blocking R&D claim structuring and tax return.

### 🟠 Amber (this week)

6. **Confirm ALIVE INV-0341 entity treatment** — $66,000, 91 days post-cutover on sole trader. Required for tax return.
7. **Confirm Shareholders Agreement signed.** Plan says it should have been Rule 4, week 1–2 (i.e., by early July). 93 days past cutover with no evidence.
8. **Confirm Pty Xero file open and $1 test invoice run** — the one-company plan assumes this is the next step after the Standard Ledger strategic fork decision.

### 🟡 Yellow (recoverable)

9. Subscription billing transfers.
10. GitHub org transfer.
11. Email/website footer updates.
12. Funder novation letters batch send.
13. Tag INV-0332 Tandanya ($16,500, 106d) and INV-0341 ALIVE ($66,000, 91d).

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS lodged)
- ASIC first annual review (2027)
- Workers Comp (first employee)
- AusIndustry R&D designation (due ~Apr 2028)

---

## Open questions (eleven consecutive passes — now critical)

1. **Sole trader BAS Q4 FY26** — lodged or concession date? What is the Standard Ledger concession deadline?
2. **EOFY strategic fork** — has Standard Ledger confirmed journal-entry vs market-value-sale?
3. **D&O insurance** — is it bound? 130 days overdue.
4. **Rotary INV-0222** — write-off treatment confirmed? 30 days to tax return.
5. **ALIVE INV-0341** ($66,000, 2026-07-02) — sole-trader or Pty entity treatment?
6. **Shareholders Agreement** — signed or not?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-10-01 (1 tenant, 2,466 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-10-01 (data ends 2026-03-31, 184d stale) |
| DB | `xero_invoices` status/type summary | 2026-10-01 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-10-01 (10 rows, $285,067.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep + full listing | 7 matching/relevant files (incl. `act-one-company-alignment-2026-09-07.md` — new surface) |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` (unchanged) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-09-24|Q3 entity migration — 2026-09-24 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-10-01|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-10-01|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
