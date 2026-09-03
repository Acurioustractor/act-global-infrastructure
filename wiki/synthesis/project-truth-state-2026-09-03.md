---
title: Project truth-state — 74 codes × 4 sources, eighth pass (Xero +40, ACT-GD +2, ACT-PS gap eighth consecutive pass)
summary: Eighth pass of the ACT Alignment Loop (Q2), 2026-09-03. Config still 74 codes (v1.8.0, 132 days stale). Wiki still 98 articles (eighth consecutive pass unchanged). ACT-PS wiki gap now eight consecutive passes. Xero +40 invoices (2,391 total); ACT-GD +2, ACT-HV +1, ACT-OO now in top 30. Four DB-only codes persist unresolved. Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-09-03
---

# Project truth-state — 2026-09-03

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-08-20|2026-08-20]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Xero +40 invoices this week — total now 2,391** (was 2,351 at Aug 20). ACT-GD leads the movement: 399 → 401 (+2). ACT-HV: 126 → 127 (+1). ACT-OO appears in the top 30 at 19 invoices. Total invoice volume is growing consistently.

2. **`config/project-codes.json` still at v1.8.0 — now 132 days without a version bump** (last updated 2026-04-24). The ecosystem is actively trading (Joy House Productions, Tandanya, ALIVE invoicing) but the config has not moved. Four DB-only codes that are unrecognised by the config (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) remain unresolved.

3. **Wiki still at 98 articles — eighth consecutive passes unchanged.** ACT-PS (PICC On Country Photo Studio) remains the only active studio project without a dedicated wiki article: 6 Xero invoices, 79+ codebase references. This is now the longest-running unresolved derived action in the alignment loop — eight passes.

4. **Joy House Productions (INV-0349) is a new counterparty with no project_code** — first appeared 2026-08-31. Unknown project assignment. Needs identification before it accumulates further without tagging.

5. **Five invoices with null project_code persist** — INV-0289, INV-0332, INV-0341, INV-0347, INV-0349. The ALIVE ($66K) and Tandanya ($16,500 + $5,500) invoices have been untagged for 63 and 78 days respectively.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-08-20 |
|---|---:|---:|---|
| **4/4** | ~33 | 45% | → stable |
| **3/4** | ~10 | 14% | → stable (ACT-PS still here) |
| **2/4** | ~27 | 36% | → stable |
| **1/4** | ~4 | 5% | → stable |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) remain unscored — in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (eighth consecutive pass) |

---

## What changed since 2026-08-20

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 132 days. Four ghost codes (`ACT-APO`, `ACT-AMT`, `ACT-EFI`, `ACT-GCC`) still present.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change)

98 articles — unchanged since 2026-05-14 (now eight passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — +40 invoices across codes

| Code | 2026-04-24 | 2026-08-20 | **2026-09-03** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 399 | **401** | **↑ +2** |
| ACT-EL | 13 | 43 | **43** | → |
| ACT-HV | 68 | 126 | **127** | **↑ +1** |
| ACT-FM | 62 | 66 | **66** | → |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-DO | — | 42 | **42** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-OO | — | — | **19** | **↑ now in top 30** |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,351 | **2,391** | **↑ +40** |

ACT-OO (Oonchiumpa) enters the top-30 code list with 19 invoices — likely pulled in by post-cutover invoicing (INV-0344 was paid this pass). ACT-GD continues steady invoice growth (+2).

### Post-cutover tagging gap (persistent)

| Invoice | Counterparty | Amount | Date | Project code | Change |
|---|---|---:|---|---|---|
| INV-0289 | Social Impact Hub | $21,780 | 2025-11-18 | null | → unchanged |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | null | → unchanged |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null | → unchanged |
| INV-0344 | Oonchiumpa Consultancy | ~~$41,250~~ | 2026-08-12 | null | 🟢 PAID this pass |
| INV-0347 | Tandanya | $5,500 | 2026-08-28 | null | 🆕 NEW |
| INV-0349 | Joy House Productions | $931 | 2026-08-31 | null | 🆕 NEW counterparty |

**Total untagged post-cutover ACCREC: $110,711** (up from $107,250 at Aug 20 — Oonchiumpa cleared but two new untagged invoices added net +$3,461).

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79+ codebase references, no wiki article. **Eighth consecutive pass without resolution.** Estimated 30-minute task to close.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — eight passes flagged it. 30 minutes.
2. **Identify Joy House Productions** — new counterparty, INV-0349 $931, null project_code. Assign code.
3. **Tag INV-0341 ALIVE ($66,000) and INV-0347 Tandanya ($5,500)** — untracked 63d and 6d respectively.
4. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB, not in config. Promote or archive.
5. **Version-bump `config/project-codes.json`** — 132 days without update while ecosystem evolves.
6. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all eight passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-09-03 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-09-03 |
| `xero_invoices` | total count | 2,391 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-08-20|Q2 project truth-state — 2026-08-20 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
