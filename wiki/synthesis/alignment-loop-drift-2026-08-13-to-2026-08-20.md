---
title: Alignment Loop drift — 2026-08-13 to 2026-08-20
summary: 7-day drift summary (Aug 13 → Aug 20). ALIVE INV-0342 ($101,200) paid — outstanding ACCREC falls to $320,817.84, lowest since baseline. BAS now 23 days past standard due date (was 16). D&O now 127 days past deadline (was 120). Xero +19 invoices (ACT-GD +9). Q2 config and wiki frozen seventh pass. All migration structure items unchanged.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-08-20
---

# Alignment Loop drift — 2026-08-13 to 2026-08-20

> Drift between the sixth pass (2026-08-13, last merged) and the seventh pass (2026-08-20, this run). 7-day window.

## TL;DR — what moved since 13 August

- **ALIVE INV-0342 ($101,200) paid** — outstanding ACCREC drops from $422,017.84 to $320,817.84, the lowest level since the April 2026 baseline. Partner invoice INV-0341 ($66,000) remains outstanding and untagged.
- **BAS and D&O continue accumulating unresolved: BAS now 23 days past standard due date (was 16); D&O now 127 days past the ~2026-05-24 deadline (was 120).** Neither has shown any resolution signal in the DB, plans, or drafts. The sole-trader tax return is due 31 October 2026 — now 72 days away.
- **Everything else frozen:** config v1.8.0 (119 days stale), wiki 98 articles (seventh pass unchanged), no Pty Xero tenant, no NAB Pty, same migration artefacts.

---

## Q1 — Funder drift

| Metric | 2026-08-13 | 2026-08-20 | Direction |
|---|---|---|---|
| Total outstanding ACCREC ($) | $422,017.84 | **$320,817.84** | ↓ −$101,200 |
| Invoice count (ACCREC outstanding) | 11 | **10** | ↓ −1 |
| Invoices cleared | — | ALIVE INV-0342 ($101,200 PAID) | ↓ −$101,200 |
| New invoices raised | — | None | → |
| Rotary INV-0222 age (days) | 490 | **497** | ↑ +7d |
| Jenn Brazier INV-0228 age (days) | 408 | **415** | ↑ +7d |
| Post-cutover untagged invoices ($) | $208,450 (3 inv) | **$107,250 (2 inv)** | ↓ −$101,200 |
| `funders.json` entries | 25 | **25** | → |
| `funders.json` last updated | 2026-07-07 | **2026-07-07** | → |
| Counterparties missing from `funders.json` | 5–6 | **6** | → |
| BAS status | 16 days past standard due date | **23 days past standard due date** | ↑ escalated |

**Material change:** ALIVE INV-0342 ($101,200) paid — the largest single invoice clearance since the April baseline $207K drop. Outstanding ACCREC at $320,817.84 is the lowest in the loop's history. INV-0341 ($66,000, same counterparty) remains outstanding. No new invoices raised. Rotary, Jenn Brazier, and the remaining six invoices are all +7 days older.

---

## Q2 — Project truth-state drift

| Metric | 2026-08-13 | 2026-08-20 | Direction |
|---|---|---|---|
| Config codes | 74 | **74** | → |
| Config version | v1.8.0 (112d stale) | **v1.8.0 (119d stale)** | → stale |
| Wiki articles | 98 | **98** | → |
| DB project codes | 78 | **78** | → |
| DB-only codes (not in config) | 4 (ACT-DLB/PB/QD/RS) | **4** | → |
| ACT-PS wiki gap | 6th consecutive pass | **7th consecutive pass** | ↑ persistent |
| Xero total invoices | 2,332 | **2,351 (+19)** | ↑ |
| ACT-GD invoices | 390 | **399 (+9)** | ↑ |
| ACT-EL invoices | 43 | **43** | → |
| ACT-FM invoices | 65 | **66 (+1)** | ↑ |
| Config ghost codes (APO/AMT/EFI/GCC) | 4 | **4** | → |
| Active/ideation projects scoring <2/4 | 0 | **0** | → |
| Untagged post-cutover invoices ($) | $208,450 | **$107,250** | ↓ −$101,200 |

**Material change:** Xero +19 invoices (consistent sync after the 21-day stall ended at Aug 13). ACT-GD leads (+9). The untagged post-cutover pile halved as ALIVE INV-0342 was paid. Everything structural in Q2 (config, wiki, DB codes) is frozen for the seventh consecutive pass.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

| Metric | 2026-08-13 | 2026-08-20 | Direction |
|---|---|---|---|
| Days post-cutover | +44 | **+51** | ↑ +7d |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,332 | **2,351 (+19)** | ↑ |
| Bank accounts visible in DB | 1 (NAB Visa ACT #8815) | **1** | → |
| Bank data freshness | ends 2026-03-31 | **ends 2026-03-31** | → |
| Outstanding ACCREC ($) | $422,017.84 | **$320,817.84** | ↓ −$101,200 |
| ACCREC invoice count | 11 | **10** | ↓ −1 |
| DRAFT ACCREC count | 1 ($0) | **1 ($0)** | → |
| BAS Q4 FY26 | 16 days past standard due date | **23 days past standard due date** | ↑ 🚨 |
| D&O insurance | 120 days past deadline | **127 days past deadline** | ↑ +7d 🔴 |
| Sole-trader tax return due | 72 days away | **72 days away (31 Oct 2026)** | ↑ approaching |
| Pty Xero file status | UNCONFIRMED | **UNCONFIRMED** | → |
| NAB Pty account status | UNCONFIRMED | **UNCONFIRMED** | → |
| Shareholders Agreement | NOT CONFIRMED | **NOT CONFIRMED** | → |
| EOFY strategic fork (journal vs sale) | NOT RESOLVED | **NOT RESOLVED** | → |
| Migration plans count | ~7 | **~7** | → |
| Migration drafts (novation-related) | 1 (`novation-letter-templates.md`) | **1** | → |

**Material changes in Q3:**

- 🟢 **ALIVE INV-0342 ($101,200) paid** — outstanding ACCREC falls to $320,817.84. Largest positive movement since the April baseline. Does not resolve the entity question (was this billed on sole trader or Pty? Invoice was on the sole trader Xero file at INV-0342).
- 🔴 **BAS Q4 FY26 now 23 days past standard due date** (was 16 days at Aug 13). The sole-trader tax return is due 31 October 2026 — 72 days away. The Rotary write-off ($82,500) and Rule 2 treatment for the $107.25K untagged invoices all need to be resolved before that lodgement.
- 🔴 **D&O insurance now 127 days past deadline** — up from 120. Four-plus months of unconfirmed coverage. No binding evidence in any pass.
- → **No new migration artefacts** — same 7 migration plans, same 1 draft. The EOFY Decision Pack items (strategic fork, Nic super) remain unresolved.

---

## What has NOT changed (the frozen list)

These items have shown no DB or plan-level change since the April baseline:

| Item | Frozen since | Days frozen |
|---|---|---|
| Xero tenant count (still 1 — Pty file not confirmed in DB) | 2026-04-24 | 118d |
| NAB Pty account not visible in `bank_statement_lines` | 2026-04-24 | 118d |
| D&O insurance — no binding evidence | 2026-04-24 | 118d |
| Shareholders Agreement | 2026-04-24 | 118d |
| EOFY strategic fork (journal vs sale) | 2026-04-24 | 118d |
| Funder novation batch letters | 2026-04-24 | 118d |
| config/project-codes.json v1.8.0 | 2026-04-24 | 119d |
| wiki/projects count (98 articles) | 2026-05-14 | 98d |
| ACT-PS wiki article | 2026-04-24 | 119d |

---

## Approaching deadlines

| Deadline | Item | Days remaining |
|---|---|---|
| 31 Oct 2026 | Sole-trader tax return (FY26) | 72 days |
| Overdue (23d) | BAS Q4 FY26 | PAST DUE |
| Overdue (127d) | D&O insurance | PAST DUE |
