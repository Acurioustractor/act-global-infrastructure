---
title: Alignment Loop drift — 2026-09-10 to 2026-09-24
summary: 14-day drift summary, all three questions. Tenth pass. Joy House INV-0349 ($931) cleared — the only receivables movement. ACCREC now $285,067.84 on 10 invoices. Xero +54 invoices (burst week). BAS now 58d overdue. D&O 123d past deadline. Sole-trader tax return 37 days away — three unresolved prerequisites. All three compliance items converging on a single window.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-09-24
---

# Alignment Loop drift — 2026-09-10 to 2026-09-24

> Tenth pass of the [[act-alignment-loop|ACT Alignment Loop]]. 14-day interval. Covers Q1 (funder alignment), Q2 (project truth-state), Q3 (entity migration). Previous drift: [[alignment-loop-drift-2026-09-03-to-2026-09-10|2026-09-03 → 2026-09-10]].

---

## TL;DR — what moved since 10 Sep

- **Joy House INV-0349 ($931) cleared** — ACCREC is now $285,067.84 on 10 invoices (was 11). The only receivables movement in 14 days; everything else is unchanged in status and amount.
- **Tax return is now 37 days away.** BAS is 58 days overdue. D&O insurance is 123 days past its deadline. All three compliance problems are now converging on the same 37-day window before 31 October 2026 — and none of the three prerequisites (Rotary write-off, EOFY fork, R&D structuring) have shown visible progress across ten consecutive passes.
- **Xero +54 invoices in 14 days** — largest single-interval burst since the Aug 6 surge. ACT-GD +9, ACT-HV +4, plus expense-coding catch-ups on ACT-10 (10x10 Retreat) and ACT-BG. No new ACCREC outstanding added.

---

## Q1 — Funder alignment drift

### What changed

| Metric | 2026-09-10 | 2026-09-24 | Direction |
|---|---|---|---|
| ACCREC outstanding | $285,998.84 | **$285,067.84** | ↓ -$931 (Joy House) |
| Open ACCREC invoices | 11 | **10** | ↓ -1 |
| Rotary INV-0222 age | 518d | **532d** | ↑ +14d |
| Jenn Brazier INV-0228 age | 436d | **450d** | ↑ +14d |
| SIHF INV-0289 age | 296d | **310d** | ↑ +14d |
| Tandanya INV-0332 age | 85d | **99d** | ↑ +14d |
| ALIVE INV-0341 age | 70d | **84d** | ↑ +14d |
| BAS past standard due date | 44d | **58d** | ↑ +14d |
| Sole-trader tax return deadline | 51d away | **37d away** | ↑ closing |
| Invoices with null project_code | 5 | **4** | ↓ -1 (Joy House cleared) |
| `funders.json` entries | 25 | **25** | → |
| New funders in Xero not in funders.json | 6 | **6** | → |

**Material calls this pass:**

Joy House INV-0349 ($931) is cleared — either paid or voided. This is the only positive receivables movement. The large strategic items (Rotary $82,500, Jenn $3,887.84, SIHF $21,780) are unchanged. **With 37 days until the tax return, Rotary INV-0222 is the single most consequential item: $82,500 sitting AUTHORISED at 532 days will complicate both the BAS and the sole-trader tax return. Write-off or confirmed-live decision needed this week.**

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-09-10 | 2026-09-24 | Direction |
|---|---|---|---|
| Config version | v1.8.0 | **v1.8.0** | → (_meta.updated stale; actual content: 78 codes) |
| Total project codes (config) | 74 (mis-counted prior passes) | **78** | ↑ corrected — ACT-DLB/PB confirmed in config |
| Wiki articles (wiki/projects) | 99 | **99** | → unchanged |
| Xero total invoices | 2,394 | **2,448** | ↑ +54 (burst) |
| ACT-GD invoices | 401 | **410** | ↑ +9 |
| ACT-HV invoices | 127 | **131** | ↑ +4 |
| ACT-10 in top 20 | not in top 20 | **23** | ↑ catch-up coding |
| ACT-BG in top 20 | not in top 20 | **23** | ↑ catch-up coding |
| Null project_code invoices | 5 | **4** | ↓ -1 (Joy House cleared) |
| Total untagged post-cutover ACCREC | $110,711 | **$109,780** | ↓ -$931 |
| 4/4 score count (est.) | ~34 | **~34** | → unchanged |
| DB-only codes not in config | 4 (mis-counted) | **2** (ACT-QD, ACT-RS only) | ↑ corrected — ACT-DLB/PB confirmed in config |
| ACT-PS authoring gap | CLOSED (PR #243) | **CLOSED** | → |

**Material calls this pass:**

The +54 invoice burst is notable but not alarming — it's expense-coding catch-up (ACT-10 10x10 Retreat and ACT-BG Brodie Germaine, both ACCPAY, all paid). No new revenue invoices raised for project codes that lacked Xero presence. Wiki stable at 99 articles; no new project authoring gaps. The ACT-PS gap remains closed.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-09-10 | 2026-09-24 | Direction |
|---|---|---|---|
| Days post-cutover | 72 | **86** | ↑ |
| Days until sole-trader tax return | 51 | **37** | ↑ closing fast |
| ACCREC outstanding | $285,998.84 | **$285,067.84** | ↓ -$931 |
| Open ACCREC invoices | 11 | **10** | ↓ -1 (Joy House) |
| DRAFT ACCREC count | 0 | **0** | → |
| Xero tenant count | 1 | **1** | → |
| Xero total invoices | 2,394 | **2,448** | ↑ +54 |
| Bank data end date | 2026-03-31 | **2026-03-31** | → (stale 177d) |
| BAS Q4 FY26 overdue days | 44d | **58d** | ↑ +14d |
| D&O insurance overdue days | 109d | **123d** | ↑ +14d |
| EOFY strategic fork resolved | ❌ | **❌** | → |
| Rotary write-off confirmed | ❌ | **❌** | → |
| New migration artefacts | 0 | **0** | → |
| Items that changed status | 0 | **0** | → |
| 🔴 NOT CONFIRMED / NOT STARTED items | ~30 | **~30** | → |

**Material calls this pass — what moved, what didn't:**

Joy House cleared. Everything else is the clock ticking. **The three compliance problems (BAS, D&O, tax return prerequisites) are now converging on a 37-day window:**

- **Tax return (37 days)**: three prerequisites unresolved — Rotary write-off, EOFY fork, R&D structuring. All require a Standard Ledger conversation. If that session doesn't happen in the next 1–2 weeks, the tax return will be filed with open questions or filed late.
- **BAS (58d overdue)**: unknown concession deadline. If Standard Ledger's extension runs to end-October, BAS is now on the same clock as the tax return. The risk: both deadlines arrive simultaneously and create a rushed week.
- **D&O insurance (123d past deadline)**: the cheapest item to resolve. A single call to the broker. Continued non-confirmation means 4+ months of potential uninsured director liability is now entering its fifth month.

**Specific item transitions (vs baseline and last pass):**

| Item | Baseline (2026-04-24) | Sep 10 | Sep 24 | Net direction |
|---|---|---|---|---|
| Rotary INV-0222 | 🔴 380d | 🔴 518d | **🔴 532d** | ↓ worsening |
| D&O insurance | 🔴 NOT STARTED | 🔴 109d past due | **🔴 123d past due** | ↓ worsening |
| BAS Q4 FY26 | ⏳ not yet due | 🚨 44d overdue | **🚨 58d overdue** | ↓ worsening |
| EOFY strategic fork | n/a (pre-cutover) | 🔴 NOT RESOLVED | **🔴 NOT RESOLVED** | → (unchanged) |
| Joy House INV-0349 | — | ⚠️ 10d new | **✅ CLEARED** | ↑ resolved |
| ALIVE INV-0341 | — | ⚠️ 70d entity unclear | **⚠️ 84d entity unclear** | ↓ worsening |
| Novation letter template | 🔴 NOT STARTED | ✅ DRAFTED | **✅ DRAFTED** | → |
| ABN 36 697 347 676 | 🔴 OPEN | ✅ DONE | **✅ DONE** | → |
| GST registration | 🔴 OPEN | ✅ DONE | **✅ DONE** | → |

---

## Composite scoring vs baseline (2026-04-24)

| Dimension | Baseline | Sep 10 | Sep 24 | Trajectory |
|---|---|---|---|---|
| Total ACCREC outstanding | $507,350 | $285,998.84 | **$285,067.84** | ↓ -$931 (slow clearing) |
| Days to cutover / since cutover | 67d until | 72d past | **86d past** | — |
| Days to tax return | n/a | 51d | **37d** | ↑ closing fast |
| D&O insurance overdue | 0d | 109d | **123d** | ↑ worsening |
| BAS overdue | 0d | 44d | **58d** | ↑ worsening |
| Wiki project articles | 74 (project scope) | 99 | **99** | → stable |
| Xero invoices | 1,742 | 2,394 | **2,448** | ↑ +54 (burst) |
| Zero-movement receivables weeks | 0 | 1 | **0** (Joy House cleared) | — |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-09-03-to-2026-09-10|Previous drift — 2026-09-03 to 2026-09-10]]
- [[funder-alignment-2026-09-24|Q1 — Funder alignment 2026-09-24]]
- [[project-truth-state-2026-09-24|Q2 — Project truth-state 2026-09-24]]
- [[entity-migration-truth-state-2026-09-24|Q3 — Entity migration truth-state 2026-09-24]]
- [[index|ACT Wikipedia]]
