---
title: Alignment Loop drift — 2026-07-23 to 2026-08-06
summary: 14-day drift summary (July 23 → Aug 6). Q1 receivables unchanged at $417,767.84 since July 30 — the $53,950 cleared between July 23 and July 30 is the only movement. BAS now 9 days past standard due date (lodgement unknown). Q2 entirely frozen — five consecutive passes with zero config/wiki/Xero change. Q3 D&O now 113 days past deadline; two new R&D plans appeared; EOFY strategic fork still unresolved. Unmerged July 30 branch exists and should be handled.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-08-06
---

# Alignment Loop drift — 2026-07-23 to 2026-08-06

> Drift between the fourth pass (2026-07-23, last merged) and the fifth pass (2026-08-06, this run). **Note:** a 2026-07-30 pass exists on an unmerged branch (`alignment-loop-2026-07-30`) that captured the July 23 → July 30 movement. The effective 14-day window (July 23 → Aug 6) is presented here as the authoritative inter-merge diff.

## TL;DR — what moved since 23 July

- **$53,950 cleared between July 23 and July 30** (Homeland School $44K + Sonas $9.95K). Zero movement in the 7 days since (July 30 → Aug 6). The book is frozen.
- **BAS Q4 FY26 standard due date (July 28) has passed — 9 days ago.** Lodgement status unknown from DB. This is the most urgent compliance obligation and requires a direct check with Standard Ledger.
- **Q2 project truth-state is entirely static** — fifth consecutive pass with no change to config (74 codes), wiki (98 articles), Xero counts, or the four DB-only codes (ACT-DLB/PB/QD/RS). The ACT-PS wiki gap is now the longest-running unresolved derived action in the loop.

---

## Q1 — Funder drift

| Metric | 2026-07-23 | 2026-08-06 | Direction |
|---|---|---|---|
| Total outstanding ACCREC ($) | $471,717.84 | **$417,767.84** | ↓ −$53,950 |
| Invoice count (ACCREC outstanding) | 14 | **12** | ↓ −2 |
| Invoices cleared | — | Homeland School ($44K), Sonas INV-0337 ($9.95K) | ↓ |
| Rotary INV-0222 age (days) | 469 | **483** | ↑ +14d |
| Rotary write-off outcome | Unknown (BAS in 5 days) | **Unknown (BAS 9 days overdue)** | → unresolved |
| Post-cutover untagged invoices ($, 3 inv) | $189,200 | **$189,200** | → unchanged |
| `funders.json` entries | 25 | **25** | → |
| `funders.json` last updated | 2026-07-07 | **2026-07-07** | → |
| Counterparties missing from `funders.json` | 5 | **5** | → |
| BAS status | Due in 5 days | **9 days past standard due date** | ↑ escalated |
| New funders in Xero not in `funders.json` | 5 (flagged) | **5 (unchanged)** | → |

**Material change:** The $53,950 clearing (July 23→30) is the only positive movement. From July 30 to Aug 6, zero movement. Centrecorp (VOIDED May 22, $84.7K) and PICC (VOIDED, $96.8K) still have no visible Pty replacement invoice — $181.5K of real relationships without new paper.

---

## Q2 — Project truth-state drift

| Metric | 2026-07-23 | 2026-08-06 | Direction |
|---|---|---|---|
| Config codes | 74 | **74** | → |
| Config version | v1.8.0 (2026-04-24, 91d stale) | **v1.8.0 (105d stale)** | → stale |
| Wiki articles | 98 | **98** | → |
| DB project codes | 78 | **78** | → |
| DB-only codes (not in config) | 4 (ACT-DLB/PB/QD/RS) | **4** | → |
| ACT-PS wiki gap | 4th consecutive pass | **5th consecutive pass** | ↑ persistent |
| Xero total invoices (all codes) | 2,293 | **2,293** | → (sync stale) |
| Config ghost codes (APO/AMT/EFI/GCC) | 4 | **4** | → |
| Active/ideation projects scoring <2/4 | 0 | **0** | → |
| Post-cutover untagged invoices | 3 ($189.2K) | **3 ($189.2K)** | → |

**Material change:** None. Q2 is entirely static. The Xero invoice count is frozen (2,293 for both passes), suggesting the Xero sync job has not run since at least 2026-07-23. This is a data-freshness concern — active trading is occurring (receivables cleared between July 23 and July 30) but the per-project invoice counts haven't moved.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

| Metric | 2026-07-23 | 2026-08-06 | Direction |
|---|---|---|---|
| Days post-cutover | +23 | **+37** | ↑ +14d |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,293 | **2,293** | → (stagnant) |
| Bank accounts visible in DB | 1 (NAB Visa ACT #8815) | **1** | → |
| Bank data freshness | ends 2026-03-31 | **ends 2026-03-31** | → (stale) |
| Outstanding ACCREC ($) | $471,717.84 | **$417,767.84** | ↓ −$53,950 |
| ACCREC invoice count | 14 | **12** | ↓ −2 |
| DRAFT ACCREC count | 0 | **1 ($0)** | → effectively unchanged |
| BAS Q4 FY26 | Due in 5 days | **9 days past standard due date** | ↑ escalated 🚨 |
| Rotary write-off BAS outcome | Unknown | **Unknown** | → |
| D&O insurance | 99 days past deadline | **113 days past deadline** | ↑ +14d 🔴 |
| Pty Xero file status | UNCONFIRMED | **UNCONFIRMED** | → |
| NAB Pty account status | UNCONFIRMED | **UNCONFIRMED** | → |
| Shareholders Agreement | NOT CONFIRMED | **NOT CONFIRMED** | → |
| EOFY strategic fork (journal vs sale) | NOT RESOLVED | **NOT RESOLVED** | → |
| Migration plans count | 9 (incl. `new-entity-xero-launch-playbook.md`) | **~11 (+ `rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md`)** | ↑ 2 new R&D plans |
| Migration drafts (novation-related) | 1 (`novation-letter-templates.md`) | **1** | → |

**Material changes in Q3:**
- 🔴 **BAS Q4 FY26 now 9 days past standard due date.** At July 23 it was 5 days away. A Standard Ledger concession may apply (they are the registered tax agent), but this must be confirmed. If there is no concession and the BAS has not been lodged, this is an ATO compliance failure in progress.
- 🔴 **D&O insurance is 113 days past the ~2026-05-24 deadline.** No evidence of binding in any pass. Risk: 3+ months of uninsured director liability.
- 🟡 **Two new R&D plans** (`rd-fy26-window-and-fy27-setup.md`, `rd-tax-incentive-fy2526-path-c.md`) signal active FY26/FY27 R&D strategy work — but the EOFY structural fork that determines the R&D claim basis remains unresolved.
- 🟡 **$53,950 cleared** (July 23→30) — first receivable movement since the June 30 cutover.
- ⚠️ **July 30 branch unmerged.** `alignment-loop-2026-07-30` exists at origin with synthesis artefacts that were not merged. This run (Aug 6) supersedes them.

---

## What has NOT changed (the frozen list)

These items have shown no DB or plan-level change across the full 14-day window. Each warrants a direct check with Standard Ledger / Ben:

| Item | Frozen since |
|---|---|
| Xero tenant count (still 1 — Pty file not visible in DB) | 2026-04-24 (baseline) |
| NAB Pty account not visible in `bank_statement_lines` | 2026-04-24 (baseline) |
| Shareholders Agreement — no draft visible | 2026-04-24 (baseline) |
| D&O insurance — no binding evidence | 2026-05-24 (deadline passed, now 113d overdue) |
| EOFY strategic fork unresolved | 2026-06-19 (Decision Pack written) |
| ACT-PS wiki article — not written | 2026-04-24 (baseline) |
| 5 counterparties missing from `funders.json` stubs | 2026-07-16 (first flagged) |
| 4 DB-only project codes (ACT-DLB/PB/QD/RS) not in config | 2026-07-16 (first flagged) |

---

## What to do now

**Immediate (before this session closes):**
1. Ben to call Standard Ledger — confirm BAS Q4 FY26 lodgement status and concession date if applicable.
2. Confirm D&O insurance binding or evidence it is in process.
3. Check whether `alignment-loop-2026-07-30` PR should be closed in favour of this one.

**This week:**
4. Tag INV-0341, INV-0342, INV-0334 with project codes.
5. Confirm Pty Xero file open and $1 test invoice executed.
6. Write `wiki/projects/picc/picc-on-country-photo-studio.md` — five passes flagged it.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-06|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-08-06|Q2 project truth-state — this pass]]
- [[entity-migration-truth-state-2026-08-06|Q3 entity migration — this pass]]
- [[alignment-loop-drift-2026-07-16-to-2026-07-23|Previous drift: 2026-07-16 to 2026-07-23]]
- [[index|ACT Wikipedia]]
