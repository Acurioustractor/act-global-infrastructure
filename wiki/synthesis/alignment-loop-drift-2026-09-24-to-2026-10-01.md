---
title: Alignment Loop drift — 2026-09-24 to 2026-10-01 (eleventh pass)
summary: 7-day drift from Sep 24 to Oct 1. Q1 funder: zero ACCREC movement, $285K flat. Q2 project: config jumps to 84 (+6, "dormant" introduced by PR #275), wiki grows to 101 (+2, PR #277). Q3 entity: 30 days to tax return, three prerequisites still unresolved, one-company alignment plan (PR #258) surfaced — structure decided, execution still stalled.
tags: [synthesis, alignment-loop, drift]
status: active
date: 2026-10-01
---

# Alignment Loop drift — 2026-09-24 to 2026-10-01

> Eleventh pass of the [[act-alignment-loop|ACT Alignment Loop]]. 7-day interval (Sep 24 → Oct 1 2026). Sources: [[funder-alignment-2026-10-01]], [[project-truth-state-2026-10-01]], [[entity-migration-truth-state-2026-10-01]].

---

## TL;DR — what moved since 24 Sep

- **Q1 (Funder):** Zero ACCREC movement. $285,067.84 flat, 10 invoices unchanged. Tax return now 30 days away — the three blocking items (Rotary write-off, EOFY fork, R&D claim) have shown zero progress across eleven passes. **This is the final window to act.**
- **Q2 (Projects):** Config grew to 84 (+6) via PR #275, which introduced the "dormant" status category. Wiki grew to 101 (+2) via PR #277 (Quandamooka, Station Precinct). No acceptance-criterion regression.
- **Q3 (Entity):** One structural finding surfaced: the `act-one-company-alignment-2026-09-07.md` plan (PR #258, written 7 Sep) was missed by prior keyword greps. It settles the entity structure as Option A (ACT Pty trades everything). The problem is not uncertainty about the structure — it is that execution has not started in 93 days.

---

## Q1 — Funder drift

**Material change: none. Trajectory: deteriorating by inaction.**

The receivables ledger has been static for two consecutive 7-day passes. The tax return clock, however, is not static.

| Metric | 2026-09-24 | 2026-10-01 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $285,067.84 | $285,067.84 | → flat |
| Invoice count (outstanding) | 10 | 10 | → |
| ACCREC DRAFT count | 0 | 0 | → |
| Null project_code invoices | 4 | 4 | → |
| Rotary INV-0222 age | 532d | 539d | ↑ +7d |
| ALIVE INV-0341 age (post-cutover, untagged) | 84d | 91d | ↑ +7d |
| Tandanya INV-0332 age (untagged) | 99d | 106d | ↑ >90d threshold crossed |
| Days to sole-trader tax return (31 Oct) | 37d | **30d** | ↓ critical |
| Days past BAS standard due (28 Jul) | 58d | 65d | ↑ |
| funders.json entry count | 25 | 25 | → |
| Invoiced counterparties without funders.json stub | 6 | 6 | → |
| Silent funder count (>90d no comms, GHL) | not re-queried | not re-queried | — |

**Notable:** Tandanya INV-0332 ($16,500) crossed the 90-day untagged threshold this pass (now 106d). ALIVE INV-0341 crossed 90 days (now 91d). Both are now >90d untagged with no project_code — the second acceptance criterion is now failing on a second invoice past 90 days.

---

## Q2 — Project truth-state drift

**Material change: config restructured (+6 projects, "dormant" introduced). Wiki +2 articles.**

| Metric | 2026-09-24 | 2026-10-01 | Direction |
|---|---|---|---|
| Total config projects | 78 | **84** | ↑ +6 (PR #275) |
| Active projects (config) | 38 | 32 | ↓ −6 (some reclassified to dormant) |
| Dormant projects (config) | 0 | **24** | ↑ NEW CATEGORY |
| Ideation projects (config) | 4 | 2 | ↓ −2 |
| Archived projects (config) | 33 | 26 | ↓ −7 |
| DB-only codes (not in config) | 2 (ACT-QD, ACT-RS) | 2 (ACT-QD, ACT-RS) | → |
| Ghost codes in config | 4 | 4 | → |
| Wiki project articles | 99 | **101** | ↑ +2 (PR #277) |
| Xero total invoices | 2,448 | **2,466** | ↑ +18 |
| ACT-HV invoice count | 131 | 133 | ↑ +2 |
| Null project_code invoices | 4 | 4 | → |
| Untagged ACCREC $ | $109,780 | $109,780 | → |
| Authoring gaps (active projects) | 0 | 0 | → |
| Score distribution change | stable | stable | → |
| Acceptance criteria met | ✅ | ✅ | → |
| Config `_meta.updated` staleness | 153d | **160d** | ↑ still stale |

**Config "dormant" restructure:** PR #275 introduced a new status value "dormant" (24 projects now carry it) that replaces the prior "sunsetting"/"transferred" categories and reclassified some "active" projects. Net +6 projects added to config in the same PR. The meta field still reads v1.8.0 / 2026-04-24.

---

## Q3 — Entity migration drift (most important)

**Material change: one structural finding surfaced. Everything else unmoved.**

The `act-one-company-alignment-2026-09-07.md` plan (PR #258) settles the entity structure — Option A (ACT Pty trades everything, Harvest is a tracking category). This was always in the plans directory but was missed by the migration-keyword grep (`novation|transition|migration|handover|assignment|shareholders|announcement|insurance|pty|funder-notice`) across four passes (Sep 3, Sep 10, Sep 10-corrections, Sep 24). **The structure is decided. The stall is execution.**

| Metric | 2026-09-24 | 2026-10-01 | Direction |
|---|---|---|---|
| Days post-cutover (Jun 30) | 86d | **93d** | ↑ |
| Days to sole-trader tax return | 37d | **30d** | ↓ critical |
| Days past BAS standard due | 58d | **65d** | ↑ |
| D&O days past ~May 24 deadline | 123d | **130d** | ↑ |
| Xero tenant count | 1 | 1 | → |
| Xero invoice count | 2,448 | 2,466 | ↑ +18 |
| Bank data staleness | 177d | **184d** | ↑ |
| ACCREC outstanding | $285,067.84 | $285,067.84 | → flat |
| ACCREC AUTHORISED invoice count | 10 | 10 | → |
| ACCREC DRAFT invoice count | 0 | 0 | → |
| Migration artefacts in drafts | 1 (novation-letter-templates) | 1 | → |
| Migration artefacts in plans | 5 (prior count) | **7 (6+1 newly surfaced)** | ↑ (prior pass missed `act-one-company-alignment` and `act-entity-alignment-2026-04`) |
| Entity structure decided | ❌ unclear from prior passes | ✅ **Option A confirmed** (PR #258) | ↑ |
| Shareholders Agreement | 🔴 not confirmed | 🔴 not confirmed | → |
| Pty Xero file open | ❓ unconfirmed | ❓ unconfirmed | → |
| NAB Pty account | ❓ unconfirmed | ❓ unconfirmed | → |

### Items that should have changed since cutover but have not (all 11 passes)

| Item | Deadline | Passes with no change |
|---|---|---|
| EOFY strategic fork (journal vs sale) | Before tax return (30d) | 11 |
| BAS Q4 FY26 lodged | Standard due 2026-07-28 | 11 |
| D&O insurance bound | ~2026-05-24 | 11 |
| Shareholders Agreement signed | Rule 4, week 1–2 of migration | 11 |
| Rotary INV-0222 resolved | Before tax return (30d) | 11 |
| Pty Xero file open + $1 test | After Standard Ledger fork decision | 11 |
| Funder novation letters sent | Post-cutover | 11 |

---

## What to do this week (by priority)

1. **Call Standard Ledger.** Three rulings needed: Rotary write-off, EOFY fork, R&D FY26 claim structure. Without these, the tax return cannot be filed. 30 days.
2. **Confirm BAS Q4 FY26 status.** Is it lodged? What is the concession deadline? If end-October, this is the same call as above.
3. **Call the broker.** D&O insurance: is it bound? One question, one call, 130 days overdue.
4. **Confirm Shareholders Agreement.** Sign or confirm signed.
5. **Tag INV-0341 ALIVE ($66,000) and INV-0332 Tandanya ($16,500)** — both now >90d untagged.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-10-01|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-10-01|Q2 project truth-state — this pass]]
- [[entity-migration-truth-state-2026-10-01|Q3 entity migration — this pass]]
- [[alignment-loop-drift-2026-09-10-to-2026-09-24|Previous drift — Sep 10 to Sep 24]]
- [[index|ACT Wikipedia]]
