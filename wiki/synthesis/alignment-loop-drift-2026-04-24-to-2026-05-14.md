---
title: Alignment Loop drift — 2026-04-24 to 2026-05-14
summary: 20-day drift summary across Q1 (funder alignment), Q2 (project truth-state), and Q3 (entity migration). Three questions, one verdict per question. Q3 is the most consequential signal.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-14
---

# Alignment Loop drift — 2026-04-24 to 2026-05-14

> Diff of the three [[act-alignment-loop|ACT Alignment Loop]] Phase 0 artefacts, 20 days after the 2026-04-24 baseline. Four artefacts compared:
> - Q1 baseline: [[funder-alignment-2026-04-24|funder-alignment-2026-04-24]] → [[funder-alignment-2026-05-14|funder-alignment-2026-05-14]]
> - Q2 baseline: [[project-truth-state-2026-04-24|project-truth-state-2026-04-24]] → [[project-truth-state-2026-05-14|project-truth-state-2026-05-14]]
> - Q3 baseline: [[entity-migration-truth-state-2026-04-24|entity-migration-truth-state-2026-04-24]] → [[entity-migration-truth-state-2026-05-14|entity-migration-truth-state-2026-05-14]]

---

## TL;DR — what moved since 24 Apr

- **Q3 entity migration: decision-making accelerated (5 major structural decisions from the 2026-05-05 Standard Ledger meeting), but no DB evidence any Week 1-3 execution items are done. ABN unissued, NAB unopened, Pty Xero absent. D&O insurance deadline is 10 days away (2026-05-24) with zero binding evidence.**
- **Q1 funders: the ledger is materially more complete (14 → 24 entries, Q1 recommendations acted on). $10K cleared from receivables (Just Reinvest + Homeland paid). Centrecorp is still DRAFT at 90 days — no decision despite being called urgent at baseline. Minderoo deadline was yesterday.**
- **Q2 projects: significant quality improvement — all 40+ missing canonical_slugs resolved, 10 new wiki articles, 75 codes (was 74), ACT-CT and ACT-BV moved to 4/4. ACT-PS wiki gap is the sole remaining authoring backlog item.**

---

## Q1 — Funder drift

### What changed

| Metric | 2026-04-24 | 2026-05-14 | Direction |
|---|---|---|---|
| `funders.json` version | v1 (updated 2026-04-09) | v2 (updated 2026-05-07) | ↑ |
| `funders.json` entry count | 14 | 24 | ↑ +10 |
| Total ACCREC outstanding | $507,350 | $497,240 | ↓ −$10,110 |
| AUTHORISED ACCREC outstanding | $422,650 | $412,540 | ↓ −$10,110 |
| DRAFT ACCREC outstanding | $84,700 (Centrecorp, 1 inv) | $84,700 (Centrecorp, 1 inv) | → |
| Snow INV-0321 status | AUTH, 37d, date 2026-03-18 | AUTH, date now 2026-05-22 | ⚠️ date changed |
| Centrecorp INV-0314 status | DRAFT 70d | DRAFT **90d** | ↓ +20d, no action |
| Rotary INV-0222 status | AUTH **380d** | AUTH **399d** | ↓ +20d, no action |
| Just Reinvest INV-0295 ($27,500) | AUTHORISED outstanding | PAID | ↑ cleared |
| Homeland School INV-0303 ($4,950) | AUTHORISED outstanding | PAID | ↑ cleared |
| PICC INV-0317 | $36,300 AUTH | $19,800 AUTH | ↑ partial payment −$16,500 |
| New invoice: Sonas Properties | — | INV-0328 $37,290 AUTH | 🆕 |
| New invoice: John Villiers Trust | — | INV-0327 $1,200 AUTH | 🆕 |
| Funders absent from wiki | 7 (Centrecorp, Rotary, VFFF, SIH, QLD, StreetSmart, Westpac) | 0 of those 7 absent | ↑ all added |
| Silent 90+ days count | 10+ | Not re-queried (GHL schema error) | — |
| Novation templates in drafts | 0 | 1 | ↑ |

### Material changes — Q1

**Actions executed:** The Q1 synthesis recommended adding 7 absent funders to `funders.json`, upgrading Snow's stage from "warm" to "active-partner", and upgrading Paul Ramsay from "cold" to "warm". All three recommendations were executed within the 20-day window. This is the clearest evidence of the alignment loop driving action.

**Stalled:** Centrecorp INV-0314 was called out at baseline as "the 10-minute Nic conversation" with clear options. Twenty days later it is still DRAFT. The Minderoo pitch (deadline 2026-05-15) names Centrecorp as live pipeline. If Lucy Stronach asked about it during due diligence, the answer was "still a draft."

**New data surfaces:** Sonas Properties ($37,290 Harvest) and John Villiers Trust ($1,200) both appeared as new ACCREC invoices. Sonas is architecturally significant — it's the first financial trace of the Harvest subsidiary structure decided on 2026-05-05.

**⚠️ Snow date anomaly:** INV-0321 shows date 2026-05-22 (future). Baseline recorded 2026-03-18. This warrants confirmation: was the invoice reissued? Has the migration conversation with Snow happened?

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-04-24 | 2026-05-14 | Direction |
|---|---|---|---|
| Project codes in config | 74 | 75 | ↑ +1 (ACT-GS GrantScope) |
| `canonical_slug` missing | 40+ | **0** | ↑ fully resolved |
| Wiki project articles | 88 | 98 | ↑ +10 |
| Score 4/4 count | 28 (38%) | ~33 (44%) | ↑ +5 estimated |
| Score 3/4 count | 16 (22%) | ~11 (15%) | ↓ −5 estimated |
| Score 2/4 count | 26 (35%) | ~27 (36%) | → +1 (ACT-GS new) |
| Score 1/4 count | 4 (5%) | ~4 (5%) | → |
| Score 0/4 count | 0 | 0 | → |
| Active/ideation projects <2/4 | 0 | 0 | → criterion met |
| ACT-CT Xero invoices | 0 | 5 | ↑ gained Xero tracking |
| ACT-BV Xero invoices | 0 | 1 (+6 txn) | ↑ gained Xero tracking |
| ACT-SM wiki match | False-negative (no slug) | ✅ found via canonical_slug | ↑ |
| Authoring backlog real gaps | 1 (ACT-PS) | 1 (ACT-PS) | → unchanged |
| Codes missing from config cleanup | ACT-APO, ACT-AMT, ACT-EFI, ACT-GCC | same 4 | → pending |

### Material changes — Q2

The baseline's most significant finding was structural rather than content-based: 40+ missing `canonical_slug` fields meant the scoring engine was producing false negatives. That is fully resolved. This single fix likely accounts for most of the estimated 4/4 improvement (+5), because many projects that previously appeared "wiki-missing" now correctly score their wiki dimension.

**No regressions.** The acceptance criterion (no active project <2/4) was met at baseline and is met again.

**ACT-PS is the persistent gap.** If the wiki article were written today (30-minute task), the authoring backlog would reach zero.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-04-24 | 2026-05-14 | Direction |
|---|---|---|---|
| Days until cutover | 67 | **47** | ↓ (time shrinking) |
| xero_tenant_id count | 1 | **1** | → NO CHANGE — Pty Xero still absent |
| Pty NAB account in bank_statement_lines | 0 | **0** | → NO CHANGE |
| Total ACCREC outstanding | $507,350 | $497,240 | ↓ −$10,110 |
| DRAFT ACCREC count | 2 | 3 | ↑ (new 0-value DRAFTs; Centrecorp still only live one) |
| DRAFT ACCREC live amount | $84,700 | $84,700 | → unchanged |
| AUTHORISED ACCREC | $422,650 | $412,540 | ↓ −$10,110 |
| Novation drafts in `/drafts/` | 0 | **1** | ↑ templates written |
| New entity Xero playbook | 0 | **1** | ↑ new plan |
| Section 11 decisions | 0 | **5 major decisions** | ↑ Standard Ledger 2026-05-05 |
| Total checklist items tracked | 53 | ~58 | ↑ +5 (D11 items added) |
| Status: DONE | 5 (9%) | 6 (~10%) | ↑ +1 (mapping export D11.4) |
| Status: IN PROGRESS / PARTIAL | 7 (13%) | 8 (~14%) | ↑ +1 (novation template) |
| Status: NOT STARTED / OPEN | 28 (53%) | 32 (~55%) | ↑ D11 items added as new NOT STARTED |
| Status: NOT YET DUE / BLOCKED | 13 (25%) | 12 (~21%) | ↓ some become LATE |
| D&O insurance binding | 🟡 DUE IN ~30 DAYS | 🔴 **DUE IN 10 DAYS — no binding** | ↓ ESCALATED |
| ABN application | 🔴 OPEN (target Week 1) | 🔴 **OPEN/LATE** | ↓ target MISSED |
| NAB account application | 🔴 OPEN (target "this week" 24 Apr) | 🔴 **OPEN/LATE** | ↓ target MISSED |
| Shareholders Agreement | 🔴 NOT STARTED (Rule 4 said Week 1-2) | 🔴 **OPEN/LATE** | ↓ target MISSED |
| Director IDs confirmed | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → unchanged |
| Centrecorp INV-0314 decision | 🔴 OPEN (70d) | 🔴 OPEN (**90d**) | ↓ stalled |
| Rotary INV-0222 decision | 🔴 OPEN (380d) | 🔴 OPEN (**399d**) | ↓ stalled |
| Harvest subsidiary structure | n/a | 🔴 DECISION MADE, NOT EXECUTED | 🆕 |
| Knight Photography Phase 1 ($100K) | n/a | 🔴 PLAN WRITTEN, NOT EXECUTED | 🆕 |
| Mapping export script | n/a | ✅ DONE (D11.4, 2026-05-05) | 🆕 |

### Material changes — Q3

**The decisions are real and important.** The 2026-05-05 Standard Ledger meeting produced well-documented decisions that change the shape of the migration:
- The Harvest is a subsidiary, not a project line — this changes the complexity of the cutover.
- Founder payroll at $10K/month — this triggers payroll setup the moment the Pty Xero opens.
- The mapping export script is written and ran. 2,879 lines, 246 REVIEW items remaining.

**The execution gap is widening, not closing.** Four "Week 1" actions from the 2026-04-24 baseline (NAB account, Director IDs, ABN application, insurance broker research) still show no DB evidence of completion 20 days later. These were due by 2026-05-01. The plan sequences everything else behind them. Until ABN issues, the Pty Xero can't open. Until Pty Xero opens, payroll can't start. Until NAB account is active, bank details can't go into novation letters. Until ABN + bank details are set, novation letters can't be sent. Until novation letters go out by end-May, the 30-June cutover is in jeopardy.

**D&O insurance is the single most time-critical item in the whole migration.** Registered 2026-04-24. Standard practice = bind within 30 days = 2026-05-24. That is 10 days from now. No ACCPAY from an insurance broker in Xero. No broker selection recorded anywhere. If D&O is not bound by 2026-05-24, the directors have been operating without cover since registration. This is not a cutover-planning risk — it is an immediate governance risk.

**🔴 Call-out: four items that should have flipped but haven't:**
1. ABN — should be issued by now (was "first week of May"). Still 🔴.
2. NAB business account — should be applied and onboarding by now. Still 🔴.
3. Shareholders Agreement — Rule 4 explicitly said Week 1-2 (signed by ~2026-05-08). Still 🔴 and NOW LATE.
4. D&O insurance — "within 30 days of registration" = 2026-05-24. Still 🔴 with 10 days.

**🟢 What did flip correctly:**
- Novation templates are now drafted (was 0 → 1 file).
- Pty Xero launch playbook written.
- Knight Photography plan written.
- Sole trader → Pty mapping export script written and ran.
- Standard Ledger meeting held 2026-05-05, 5 decisions documented.

---

## Cross-question verdict

The alignment loop's value is visibility into gaps before they become crises. Here is the cross-question read:

**Q1 (funders) → Q3 (migration):** The funder ledger now has 24 entries. Novation templates are drafted. But templates can't be sent without ABN and bank details — both of which depend on the ABN being issued. The chain is: ABN → Pty Xero → NAB bank details → complete novation letter → send by end May → clean 30-June cutover. The chain is broken at the first link.

**Q2 (projects) → Q3 (migration):** The project truth-state is healthy and improving. The canonical_slug fix is a genuine infrastructure win that will compound over time. No project-level migration risks surfaced in Q2 that aren't already captured in Q3.

**Overall trajectory:** Decisions accelerating, execution beginning to lag. The two-week window between now and end-May is the critical path for D&O, ABN, NAB, SHA, and novation letters. If all five clear by 2026-05-28, the 30-June cutover is achievable. If any of the first three don't clear by then, the cutover will need Rule 2 invoked (honest delay over silent mis-attribution).

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 funder alignment — 2026-05-14]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — 2026-05-14]]
- [[entity-migration-truth-state-2026-05-14|Q3 entity migration — 2026-05-14]]
- [[funder-alignment-2026-04-24|Q1 baseline — 2026-04-24]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
