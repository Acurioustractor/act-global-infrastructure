---
title: Alignment Loop drift — 2026-08-06 to 2026-08-13
summary: 7-day drift summary (Aug 6 → Aug 13). Xero sync resumed after 21-day stall (+39 invoices, ACT-GD +10, ACT-EL +9). Two receivables cleared (Mounty $22K + Julalikari $15K); new Oonchiumpa INV-0344 $41,250 raised 2026-08-12 with no project_code. BAS now 16 days past standard due date. D&O 120 days past deadline. Q2 config and wiki frozen (sixth pass). EOFY fork and Shareholders Agreement still unresolved.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-08-13
---

# Alignment Loop drift — 2026-08-06 to 2026-08-13

> Drift between the fifth pass (2026-08-06, last merged) and the sixth pass (2026-08-13, this run). 7-day window.

## TL;DR — what moved since 6 August

- **Xero sync resumed after a 21-day stall** — total invoices up from 2,293 to 2,332 (+39), confirming active Xero processing. ACT-GD +10, ACT-EL +9 are the biggest movers. All on the sole trader tenant — no second (Pty) tenant has appeared.
- **Receivables net +$4,250** — Mounty ($22K) + Julalikari ($15K) cleared, but new Oonchiumpa Consultancy INV-0344 ($41,250, raised 2026-08-12) arrived without a project_code. Net book is slightly larger, not smaller.
- **BAS and D&O continue to accumulate days: BAS now 16 days past standard due date (was 9); D&O now 120 days past deadline (was 113).** Neither has shown any resolution signal in the DB or plans. These are the two most persistent unresolved compliance obligations in the loop.

---

## Q1 — Funder drift

| Metric | 2026-08-06 | 2026-08-13 | Direction |
|---|---|---|---|
| Total outstanding ACCREC ($) | $417,767.84 | **$422,017.84** | ↑ +$4,250 |
| Invoice count (ACCREC outstanding) | 12 | **11** | ↓ −1 |
| Invoices cleared | — | Mounty ($22K) + Julalikari ($15K) | ↓ −$37K |
| New invoices raised | — | Oonchiumpa INV-0344 ($41,250, 2026-08-12) | ↑ +$41,250 |
| Rotary INV-0222 age (days) | 483 | **490** | ↑ +7d |
| Rotary write-off outcome | Unknown (BAS 9d overdue) | **Unknown (BAS 16d overdue)** | → unresolved |
| Post-cutover untagged invoices ($) | $189,200 (3 inv) | **$208,450 (3 inv)** | ↑ +$19,250 (Oonchiumpa) |
| `funders.json` entries | 25 | **25** | → |
| `funders.json` last updated | 2026-07-07 | **2026-07-07** | → |
| Counterparties missing from `funders.json` | 5 | **5–6** (Oonchiumpa may be 6th) | ↑ |
| BAS status | 9 days past standard due date | **16 days past standard due date** | ↑ escalated |

**Material change:** Two small invoices cleared (Mounty + Julalikari = −$37K) but the new Oonchiumpa invoice ($41,250) more than offsets them, leaving the book $4,250 larger than Aug 6. The Oonchiumpa invoice (dated 2026-08-12) has no project_code — a new tagging gap on top of the existing three untagged invoices.

---

## Q2 — Project truth-state drift

| Metric | 2026-08-06 | 2026-08-13 | Direction |
|---|---|---|---|
| Config codes | 74 | **74** | → |
| Config version | v1.8.0 (105d stale) | **v1.8.0 (112d stale)** | → stale |
| Wiki articles | 98 | **98** | → |
| DB project codes | 78 | **78** | → |
| DB-only codes (not in config) | 4 (ACT-DLB/PB/QD/RS) | **4** | → |
| ACT-PS wiki gap | 5th consecutive pass | **6th consecutive pass** | ↑ persistent |
| Xero total invoices (all codes) | 2,293 (sync stale 21d) | **2,332 (+39, sync resumed)** | ↑ |
| ACT-GD invoices | 380 | **390 (+10)** | ↑ |
| ACT-EL invoices | 34 | **43 (+9)** | ↑ |
| ACT-HV invoices | 123 | **126 (+3)** | ↑ |
| Config ghost codes (APO/AMT/EFI/GCC) | 4 | **4** | → |
| Active/ideation projects scoring <2/4 | 0 | **0** | → |
| Untagged post-cutover invoices ($) | $189,200 | **$208,450** | ↑ +$19,250 |

**Material change:** Xero sync resumed after a 21-day freeze — +39 invoices across codes, with ACT-GD and ACT-EL absorbing the most. Everything else in Q2 is frozen for a sixth consecutive pass.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

| Metric | 2026-08-06 | 2026-08-13 | Direction |
|---|---|---|---|
| Days post-cutover | +37 | **+44** | ↑ +7d |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,293 (stagnant 21d) | **2,332 (+39, sync resumed)** | ↑ |
| Bank accounts visible in DB | 1 (NAB Visa ACT #8815) | **1** | → |
| Bank data freshness | ends 2026-03-31 | **ends 2026-03-31** | → |
| Outstanding ACCREC ($) | $417,767.84 | **$422,017.84** | ↑ +$4,250 |
| ACCREC invoice count | 12 | **11** | ↓ −1 |
| DRAFT ACCREC count | 1 ($0) | **1 ($0)** | → |
| BAS Q4 FY26 | 9 days past standard due date | **16 days past standard due date** | ↑ 🚨 |
| D&O insurance | 113 days past deadline | **120 days past deadline** | ↑ +7d 🔴 |
| Pty Xero file status | UNCONFIRMED | **UNCONFIRMED** | → |
| NAB Pty account status | UNCONFIRMED | **UNCONFIRMED** | → |
| Shareholders Agreement | NOT CONFIRMED | **NOT CONFIRMED** | → |
| EOFY strategic fork (journal vs sale) | NOT RESOLVED | **NOT RESOLVED** | → |
| Migration plans count | ~11 | **~11** | → |
| Migration drafts (novation-related) | 1 (`novation-letter-templates.md`) | **1** | → |

**Material changes in Q3:**

- 🟡 **Xero sync resumed (+39 invoices)** — a positive signal that the system is processing invoices. Still only 1 tenant; the Pty Xero file (if open) is not visible in DB.
- 🔴 **BAS Q4 FY26 now 16 days past standard due date** (was 9 days at Aug 6). Confirm with Standard Ledger whether a concession applies. No lodgement signal visible in any data source.
- 🔴 **D&O insurance now 120 days past deadline** — up from 113. Four months of potential uninsured director liability. No binding evidence in any pass since the 2026-04-24 baseline.
- 🆕 **Oonchiumpa INV-0344 ($41,250, 2026-08-12)** — new post-cutover invoice with no project_code, adding to the untagged pile. Raised on the sole trader entity (only 1 Xero tenant visible). Is this a sole-trader or Pty invoice?

---

## What has NOT changed (the frozen list)

These items have shown no DB or plan-level change across the full 7-day window. Each is an escalating issue:

| Item | Frozen since | Days frozen |
|---|---|---|
| Xero tenant count (still 1 — Pty file not visible in DB) | 2026-04-24 (baseline) | 111d |
| NAB Pty account not visible in `bank_statement_lines` | 2026-04-24 (baseline) | 111d |
| Shareholders Agreement — no draft visible | 2026-04-24 (baseline) | 111d |
| D&O insurance — no binding evidence | 2026-05-24 (deadline) | 120d overdue |
| EOFY strategic fork unresolved | 2026-06-19 (Decision Pack written) | 55d |
| ACT-PS wiki article — not written | 2026-04-24 (baseline) | 111d (6 passes) |
| Missing `funders.json` stubs | 2026-07-16 (first flagged) | 28d |
| 4 DB-only project codes (ACT-DLB/PB/QD/RS) | 2026-07-16 (first flagged) | 28d |
| ALIVE invoices ($167.2K) untagged | 2026-07-16 (first flagged) | 28d |

---

## What to do now

**Immediate:**
1. **Ben → Standard Ledger:** confirm BAS Q4 FY26 lodgement status and any concession deadline. This is now 16 days overdue on the standard schedule.
2. **Confirm D&O insurance binding** or that it is actively in process — 120 days is 4 months of potential uninsured director liability.
3. **Tag INV-0344 Oonchiumpa ($41,250)** — confirm project_code (ACT-OO?) and whether it's on the sole trader or Pty entity.

**This week:**
4. Tag INV-0341 + INV-0342 (ALIVE $167.2K) with project_code — unresolved since July 16.
5. Confirm Pty Xero file open and $1 test invoice run (the `new-entity-xero-launch-playbook.md` runbook exists).
6. Write `wiki/projects/picc/picc-on-country-photo-studio.md` — six passes flagged it.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-13|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-13|Q2 project truth-state — this pass]]
- [[entity-migration-truth-state-2026-08-13|Q3 entity migration — this pass]]
- [[alignment-loop-drift-2026-07-23-to-2026-08-06|Previous drift: 2026-07-23 to 2026-08-06]]
- [[index|ACT Wikipedia]]
