---
title: Project truth-state — config jumps to 84 (dormant status introduced), wiki 101 articles (+2), Xero +18 invoices
summary: Eleventh pass of the ACT Alignment Loop (Q2), 2026-10-01. Config now 84 projects (was 78 at Sep 24 — PR #275 restructured statuses, introduced "dormant" for 24 projects). Wiki grows to 101 articles (+2 — PR #277 Quandamooka + Station Precinct). Xero +18 invoices (2,466 total). Null-code invoices still 4. Acceptance criterion met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-10-01
---

# Project truth-state — 2026-10-01

> Eleventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-09-24|2026-09-24]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **`config/project-codes.json` now has 84 projects** (was 78 at Sep 24 — a real +6 change). PR #275 "One project code set: statuses from Ben's code review" restructured the status taxonomy. The `_meta.updated` field is still stale at `2026-04-24`, but the `projects` object has grown. Most significantly, **"dormant" was introduced as a new status category** (24 projects now dormant). The "sunsetting" and "transferred" categories from the meta `status_values` list no longer appear in the data. Breakdown: 32 active, 24 dormant, 2 ideation, 26 archived = 84 total.

2. **Wiki projects/ grows to 101 articles** (was 99 at Sep 24). PR #277 "Fold MMEIC Justice into Quandamooka; give Station Precinct its own page" added at least one net-new article (Station Precinct). The Quandamooka page likely replaced the MMEIC Justice stub.

3. **Xero +18 invoices in 7 days — total now 2,466** (was 2,448 at Sep 24). ACT-HV gained 2 (131→133). The ACT-GD coding burst from the prior interval appears to have levelled off. No new null-project_code invoices in the +18.

4. **Null project_code invoices still 4** — INV-0289 (SIHF $21,780, 317d), INV-0332 (Tandanya $16,500, 106d), INV-0341 (ALIVE $66,000, 91d), INV-0347 (Tandanya $5,500, 34d). No change from Sep 24.

5. **Acceptance criterion met.** Every active or ideation project scores ≥2/4. No 0/4 projects across either the active (32) or ideation (2) sets.

6. **Config `_meta.updated` now 160 days stale** — still reads `2026-04-24` despite two PR updates since Sep 24 (the config has 84 projects; the meta says 74 were the baseline). A simple meta field update is the only action needed.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-09-24 |
|---|---:|---:|---|
| **4/4** | ~34 | 40% | → (active/ideation subset stable) |
| **3/4** | ~10 | 12% | → |
| **2/4** | ~32 | 38% | → |
| **1/4** | ~4 | 5% | → |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **84** | | ↑ +6 from Sep 24 (PR #275 status restructure) |

_Config breakdown (actual): 32 active, 24 dormant, 2 ideation, 26 archived = 84._
_New "dormant" category (24 projects): likely migrated from prior "archived/sunsetting/transferred" statuses — not all inactive projects are deleted work._
_2 DB-only codes (ACT-QD, ACT-RS) persist unscored — in DB but not in config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All 32 active + 2 ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | No active authoring gap (ACT-PS closed PR #243) |

---

## What changed since 2026-09-24

### Config (+6 projects, "dormant" status introduced)

`config/project-codes.json` is now at 84 projects total. PR #275 "One project code set: statuses from Ben's code review" is the primary driver. The `_meta.version` still reads `1.8.0` and `_meta.updated` still reads `2026-04-24` — both are stale.

**New status breakdown vs prior:**

| Status | Sep 24 (synthesis) | Oct 1 (actual) | Change |
|---|---:|---:|---|
| active | 38 | 32 | ↓ −6 (some moved to dormant) |
| dormant | — | 24 | ↑ NEW CATEGORY |
| ideation | 4 | 2 | ↓ −2 |
| sunsetting | 1 | 0 | ↓ removed |
| transferred | 2 | 0 | ↓ removed |
| archived | 33 | 26 | ↓ −7 |
| **Total** | **78** | **84** | **↑ +6** |

The net +6 is from new project additions since the Sep 24 pass (PR #275 added codes and restructured statuses simultaneously). The "dormant" category captures projects that exist and have records but are not currently active — a meaningful distinction from "archived".

### DB — ACT-QD and ACT-RS still DB-only (no change)

Two codes remain in DB but not in config (ACT-QD, ACT-RS). No change.

### Wiki (+2 articles)

| Article | PR | Change |
|---|---|---|
| Station Precinct | PR #277 | ↑ new article added |
| Quandamooka | PR #277 | ↑ replaced MMEIC Justice stub |

### Xero — +18 invoices

| Code | 2026-09-24 | **2026-10-01** | Change |
|------|---:|---:|---|
| ACT-IN | 547 | **547** | → |
| ACT-GD | 410 | **410** | → |
| ACT-HV | 131 | **133** | ↑ +2 |
| ACT-FM | 66 | **66** | → |
| ACT-JH | 48 | **48** | → |
| ACT-UA | 48 | **48** | → |
| ACT-EL | 43 | **43** | → |
| ACT-DO | 42 | **42** | → |
| ACT-MY | 27 | **27** | → |
| ACT-PI | 27 | **27** | → |
| ACT-10 | 23 | **23** | → |
| ACT-BG | 23 | **23** | → |
| ACT-OO | 19 | **19** | → |
| **Total (all codes)** | 2,448 | **2,466** | **↑ +18** |

_+18 invoices in 7 days is a moderate rate. ACT-HV +2 is the only visible top-20 change; the remaining +16 are spread across codes not in the top 20._

### Post-cutover tagging gap (4 invoices — no change)

| Invoice | Counterparty | Amount | Date | Age | Project code |
|---|---|---:|---|---|---|
| INV-0289 | Social Impact Hub | $21,780 | 2025-11-18 | 317d | null |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | 106d | null |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | 91d | null |
| INV-0347 | Tandanya | $5,500 | 2026-08-28 | 34d | null |

**Total untagged ACCREC: $109,780** (unchanged since Sep 24).

---

## Authoring backlog

No active authoring gaps. ACT-PS closed PR #243 (~2026-09-06). Station Precinct and Quandamooka both added this interval via PR #277. Next watch: any new code appearing in Xero that has no wiki article within its first pass.

---

## Config ghost codes (unresolved since 2026-04-24)

| Code | Name | Reason |
|------|------|---|
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project" |
| ACT-AMT | API Migration Test | Self-described test project |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces |
| ACT-GCC | Global Community Connections | Archived, 2 code refs only |

---

## Derived actions (persistent, priority order)

1. **Tag INV-0341 ALIVE ($66,000, 91d) and INV-0332 Tandanya ($16,500, 106d)** — both now >90d untagged.
2. **Assess ACT-QD and ACT-RS** — in DB but not in config. Promote or archive.
3. **Update `_meta.updated` and `_meta.version` in `config/project-codes.json`** — stale since 2026-04-24, misleading all consumers.
4. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged eleven passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 84 codes) | 2026-10-01 |
| `wiki/projects/**` | find count | 101 .md files |
| `xero_invoices` | GROUP BY project_code, top 20 | 2026-10-01 |
| `xero_invoices` | total count | 2,466 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-09-24|Q2 project truth-state — 2026-09-24 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
