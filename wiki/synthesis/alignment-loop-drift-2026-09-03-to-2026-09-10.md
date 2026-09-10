---
title: Alignment Loop drift — 2026-09-03 to 2026-09-10
summary: 7-day drift summary, all three questions. Ninth pass. No receivables cleared — ACCREC flat at $286K for the first completely static week since baseline. BAS 44d overdue. D&O 148d past deadline. Sole-trader tax return 51 days away. Zero items changed status.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-09-10
---

# Alignment Loop drift — 2026-09-03 to 2026-09-10

> Ninth pass of the [[act-alignment-loop|ACT Alignment Loop]]. 7-day interval. Covers Q1 (funder alignment), Q2 (project truth-state), Q3 (entity migration). Previous drift: [[alignment-loop-drift-2026-08-20-to-2026-09-03|2026-08-20 → 2026-09-03]].

---

## TL;DR — what moved since 03 Sep

- **Nothing cleared.** ACCREC is exactly $285,998.84 — the first zero-movement week since the April 2026 baseline. 11 invoices, all aged +7 days, no new invoices, no payments received.
- **Tax return now 51 days away.** Rotary write-off ($82,500, 518d), EOFY strategic fork, and R&D FY26 structuring remain unresolved — all three must be settled before the sole-trader tax return can be filed (31 Oct 2026).
- **Compliance clock running.** BAS now 44 days overdue; D&O insurance 148 days past its ~May 2026 deadline. No action visible in any data source across nine consecutive passes for either item.

---

## Q1 — Funder alignment drift

### What changed

| Metric | 2026-09-03 | 2026-09-10 | Direction |
|---|---|---|---|
| ACCREC outstanding | $285,998.84 | **$285,998.84** | → unchanged |
| Open ACCREC invoices | 11 | **11** | → |
| Rotary INV-0222 age | 511d | **518d** | ↑ +7d |
| Jenn Brazier INV-0228 age | 429d | **436d** | ↑ +7d |
| SIHF INV-0289 age | 289d | **296d** | ↑ +7d |
| BAS past standard due date | 37d | **44d** | ↑ +7d |
| Sole-trader tax return deadline | 58d away | **51d away** | ↑ closing |
| Invoices with null project_code | 5 | **5** | → |
| `funders.json` entries | 25 | **25** | → |
| New funders in Xero not in funders.json | 6 | **6** | → |

**Material calls this pass:**

This was the quietest week in the receivables book since the April 2026 baseline. No funder made a payment, no new invoice was raised. This is now the most urgent Q1 signal: **with 51 days until the sole-trader tax return, Rotary INV-0222 ($82,500) is the highest-value unresolved item and must be written off or confirmed receivable before filing.** If Rotary has no intention of paying (or can't pay), every further day the invoice sits AUTHORISED complicates the tax return.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-09-03 | 2026-09-10 | Direction |
|---|---|---|---|
| Config version | v1.8.0 | **v1.8.0** | → (139d stale) |
| Total project codes (config) | 74 | **74** | → |
| Wiki articles (wiki/projects) | 98 | **99** | ↑ +1 (technical/) |
| Xero total invoices | 2,391 | **2,394** | ↑ +3 |
| ACT-GD invoices | 401 | **401** | → |
| ACT-HV invoices | 127 | **127** | → |
| ACT-PS wiki gap (consecutive passes) | 8 | **9** | ↑ now 9 |
| Null project_code invoices | 5 | **5** | → |
| Total untagged post-cutover ACCREC | $110,711 | **$110,711** | → |
| 4/4 score count (est.) | ~33 | **~33** | → |
| DB-only codes not in config | 4 | **4** | → |

**Material calls this pass:**

A single new wiki article appeared in `wiki/technical/` (not `wiki/projects/`). ACT-PS remains the only outstanding project authoring gap for the ninth consecutive pass. At this cadence, it is clearly not going to self-resolve — it needs a deliberate 30-minute session. The +3 Xero invoices represent a very quiet week for invoice activity; no new codes or gaps surfaced.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-09-03 | 2026-09-10 | Direction |
|---|---|---|---|
| Days post-cutover | 65 | **72** | ↑ |
| Days until sole-trader tax return | 58 | **51** | ↑ closing fast |
| ACCREC outstanding | $285,998.84 | **$285,998.84** | → FLAT |
| DRAFT ACCREC count | 0 | **0** | → |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,391 | **2,394** | ↑ +3 |
| Bank data end date | 2026-03-31 | **2026-03-31** | → (stale 163d) |
| BAS Q4 FY26 overdue days | 37d | **44d** | ↑ +7d |
| D&O insurance overdue days | 141d | **148d** | ↑ +7d |
| EOFY strategic fork resolved | ❌ | **❌** | → |
| Rotary write-off confirmed | ❌ | **❌** | → |
| New migration artefacts | 0 | **0** | → |
| Items that changed status | — | **0** | → |
| 🔴 NOT CONFIRMED / NOT STARTED items | ~30 | **~30** | → |

**Material calls this pass — what moved, what didn't:**

Nothing moved. This is the first completely static pass in nine runs. No receivables cleared, no artefacts produced, no status items changed. The compliance clock is the only thing that moved:

- **BAS** (44d overdue): if Standard Ledger's concession window runs to late October, the BAS due date converges with the tax return itself. Confirm the concession deadline immediately.
- **D&O insurance** (148d past the ~May 2026 deadline): no binding evidence has ever appeared. At 5 months past due, the question is whether a policy is already in force (and simply not visible in this DB) or whether there genuinely is no cover. Either way, one confirmation call resolves this.
- **Tax return countdown** (51 days): three prerequisites unresolved — Rotary write-off, EOFY fork, R&D structuring. These are not complex decisions, but they require Standard Ledger input and a ~2-hour working session. If that session doesn't happen in the next ~2 weeks, the tax return will be rushed.

**Specific item transitions (vs baseline):**

| Item | Baseline (2026-04-24) | Sep 3 | Sep 10 | Net direction |
|---|---|---|---|---|
| Rotary INV-0222 | 🔴 380d | 🔴 511d | **🔴 518d** | ↓ worsening |
| D&O insurance | 🔴 NOT STARTED | 🔴 141d past due | **🔴 148d past due** | ↓ worsening |
| BAS Q4 FY26 | ⏳ not yet due | 🚨 37d overdue | **🚨 44d overdue** | ↓ worsening |
| EOFY strategic fork | n/a (pre-cutover) | 🔴 NOT RESOLVED | **🔴 NOT RESOLVED** | → (unchanged) |
| Novation letter template | 🔴 NOT STARTED | ✅ DRAFTED | **✅ DRAFTED** | → |
| ABN 36 697 347 676 | 🔴 OPEN | ✅ DONE | **✅ DONE** | → |
| GST registration | 🔴 OPEN | ✅ DONE | **✅ DONE** | → |

---

## Composite scoring vs baseline (2026-04-24)

| Dimension | Baseline | Sep 3 | Sep 10 | Trajectory |
|---|---|---|---|---|
| Total ACCREC outstanding | $507,350 | $285,998.84 | **$285,998.84** | → flat (was ↓ from baseline) |
| Days to cutover / since cutover | 67d until | 65d past | **72d past** | — |
| Days to tax return | n/a | 58d | **51d** | ↑ closing |
| D&O insurance overdue | 0d | 141d | **148d** | ↑ worsening |
| BAS overdue | 0d | 37d | **44d** | ↑ worsening |
| Wiki articles | 74 (project scope) | 98 | **99** | ↑ (technical) |
| Xero invoices | 1,742 | 2,391 | **2,394** | ↑ steady growth |
| Zero-movement receivables weeks | 0 | 0 | **1** | new signal |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-08-20-to-2026-09-03|Previous drift — 2026-08-20 to 2026-09-03]]
- [[funder-alignment-2026-09-10|Q1 — Funder alignment 2026-09-10]]
- [[project-truth-state-2026-09-10|Q2 — Project truth-state 2026-09-10]]
- [[entity-migration-truth-state-2026-09-10|Q3 — Entity migration truth-state 2026-09-10]]
- [[index|ACT Wikipedia]]
