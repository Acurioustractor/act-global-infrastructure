---
title: Alignment Loop drift — 2026-08-20 to 2026-08-27
summary: 7-day drift summary (Aug 20 → Aug 27). Oonchiumpa INV-0344 ($41,250) paid — ACCREC falls to $286,520.84 (lowest in loop history). New invoice INV-0345 Tanya Turner ($6,953) raised Aug 22, untagged. BAS now 30 days past standard due date (was 23). D&O now 134 days past deadline (was 127). Sole-trader tax return 65 days away. Xero +11. All migration structure items unchanged.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-08-27
---

# Alignment Loop drift — 2026-08-20 to 2026-08-27

> Drift between the seventh pass (2026-08-20, last merged) and the eighth pass (2026-08-27, this run). 7-day window.

## TL;DR — what moved since 20 August

- **Oonchiumpa INV-0344 ($41,250) paid and a new invoice raised: Tanya Turner INV-0345 ($6,953, Aug 22), untagged.** Outstanding ACCREC drops to $286,520.84 — the lowest in the loop's history. The Tanya Turner invoice is a new counterparty not in `funders.json` and has no project_code.
- **BAS Q4 FY26 now 30 days past standard due date (was 23); D&O now 134 days past deadline (was 127); sole-trader tax return is 65 days away (31 Oct 2026).** The three critical compliance unknowns continue accumulating with no resolution signal visible in DB, plans, or drafts.
- **Everything structural frozen again:** config v1.8.0 (126 days stale), wiki 98 articles (eighth consecutive pass), no Pty Xero tenant, no NAB Pty, same 7 migration plans, same 1 draft.

---

## Q1 — Funder drift

| Metric | 2026-08-20 | 2026-08-27 | Direction |
|---|---|---|---|
| Total outstanding ACCREC ($) | $320,817.84 | **$286,520.84** | ↓ −$34,297 |
| Invoice count (ACCREC outstanding) | 10 | **10** | → |
| Invoices cleared | — | Oonchiumpa INV-0344 ($41,250 PAID) | ↓ −$41,250 |
| New invoices raised | — | Tanya Turner INV-0345 ($6,953, 2026-08-22) | ↑ +$6,953 |
| Rotary INV-0222 age (days) | 497 | **504** | ↑ +7d |
| Jenn Brazier INV-0228 age (days) | 415 | **422** | ↑ +7d |
| Post-cutover untagged invoices ($) | $107,250 (2 inv) | **$72,953 (2 inv)** | ↓ −$34,297 |
| `funders.json` entries | 25 | **25** | → |
| `funders.json` last updated | 2026-07-07 | **2026-07-07** | → |
| Counterparties missing from `funders.json` | 6 | **6** (Tanya Turner replaces Oonchiumpa) | → |
| BAS status | 23 days past standard due date | **30 days past standard due date** | ↑ escalated |
| GHL comms data | sparse (query error) | **sparse (same error)** | → |

**Material changes:** Oonchiumpa INV-0344 ($41,250) cleared — the only new positive movement. New invoice INV-0345 Tanya Turner ($6,953, Aug 22) is a fresh gap: no project_code, no funders.json stub, identity unclear. Outstanding ACCREC at $286,520.84 is the lowest in the loop's history. No new invoices raised to known funders. All other outstanding invoices are +7 days older.

---

## Q2 — Project truth-state drift

| Metric | 2026-08-20 | 2026-08-27 | Direction |
|---|---|---|---|
| Config codes | 74 | **74** | → |
| Config version | v1.8.0 (119d stale) | **v1.8.0 (126d stale)** | → stale |
| Wiki articles | 98 | **98** | → |
| DB project codes | 78 | **78** | → |
| DB-only codes (not in config) | 4 (ACT-DLB/PB/QD/RS) | **4** | → |
| ACT-PS wiki gap | 7th consecutive pass | **8th consecutive pass** | ↑ persistent |
| Xero total invoices | 2,351 | **2,362 (+11)** | ↑ |
| ACT-GD invoices | 399 | **400 (+1)** | ↑ |
| ACT-HV invoices | 126 | **127 (+1)** | ↑ |
| Config ghost codes (APO/AMT/EFI/GCC) | 4 | **4** | → |
| Active/ideation projects scoring <2/4 | 0 | **0** | → |
| Untagged post-cutover invoices ($) | $107,250 | **$72,953** | ↓ −$34,297 |

**Material changes:** Xero +11 invoices (ACT-GD +1, ACT-HV +1). The untagged post-cutover pile reduced from $107,250 to $72,953 as Oonchiumpa cleared, though the new Tanya Turner invoice ($6,953) adds a fresh untagged entry. Everything structural in Q2 (config, wiki, DB codes) is frozen for the eighth consecutive pass. The ACT-PS wiki gap has now been flagged for eight straight passes.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

| Metric | 2026-08-20 | 2026-08-27 | Direction |
|---|---|---|---|
| Days post-cutover | +51 | **+58** | ↑ +7d |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,351 | **2,362 (+11)** | ↑ |
| Bank accounts visible in DB | 1 (NAB Visa ACT #8815) | **1** | → |
| Bank data freshness | ends 2026-03-31 | **ends 2026-03-31** | → |
| Outstanding ACCREC ($) | $320,817.84 | **$286,520.84** | ↓ −$34,297 |
| ACCREC invoice count | 10 | **10** | → |
| DRAFT ACCREC count | 1 ($0) | **1 ($0)** | → |
| BAS Q4 FY26 | 23 days past standard due date | **30 days past standard due date** | ↑ 🚨 |
| D&O insurance | 127 days past deadline | **134 days past deadline** | ↑ +7d 🔴 |
| Sole-trader tax return due | 72 days away | **65 days away (31 Oct 2026)** | ↑ approaching |
| Pty Xero file status | UNCONFIRMED | **UNCONFIRMED** | → |
| NAB Pty account status | UNCONFIRMED | **UNCONFIRMED** | → |
| Shareholders Agreement | NOT CONFIRMED | **NOT CONFIRMED** | → |
| EOFY strategic fork (journal vs sale) | NOT RESOLVED | **NOT RESOLVED | → |
| Migration plans count | 7 | **7** | → |
| Migration drafts (novation-related) | 1 (`novation-letter-templates.md`) | **1** | → |

**Material changes in Q3:**

- 🟢 **Oonchiumpa INV-0344 ($41,250) paid** — outstanding ACCREC falls to $286,520.84, lowest in loop history.
- 🟡 **Tanya Turner INV-0345 ($6,953, Aug 22) — new sole-trader invoice, untagged.** A new post-cutover gap: sole-trader entity but raised after cutover. Whether this should be on the Pty is unresolved.
- 🔴 **BAS Q4 FY26 now 30 days past standard due date** (was 23 days at Aug 20). Sole-trader tax return due 31 October 2026 — 65 days away. The BAS must be resolved before lodging the tax return.
- 🔴 **D&O insurance now 134 days past deadline** — up from 127. No binding evidence in eight consecutive passes.
- → **No new migration artefacts** — same 7 migration plans, same 1 draft. The EOFY Decision Pack items (strategic fork, Nic super, Knight Photography) remain unresolved.

---

## What has NOT changed (the frozen list)

| Item | Frozen since | Days frozen |
|---|---|---|
| Xero tenant count (still 1 — Pty file not confirmed in DB) | 2026-04-24 | 125d |
| NAB Pty account not visible in `bank_statement_lines` | 2026-04-24 | 125d |
| D&O insurance — no binding evidence | 2026-04-24 | 125d |
| Shareholders Agreement | 2026-04-24 | 125d |
| EOFY strategic fork (journal vs sale) | 2026-04-24 | 125d |
| Funder novation batch letters | 2026-04-24 | 125d |
| config/project-codes.json v1.8.0 | 2026-04-24 | 126d |
| wiki/projects count (98 articles) | 2026-05-14 | 105d |
| ACT-PS wiki article | 2026-04-24 | 126d |

---

## Approaching deadlines

| Deadline | Item | Days remaining |
|---|---|---|
| 31 Oct 2026 | Sole-trader tax return (FY26) | **65 days** |
| Overdue (30d) | BAS Q4 FY26 | PAST DUE |
| Overdue (134d) | D&O insurance | PAST DUE |
