---
title: Project truth-state — Xero +54 invoices in 14 days, config stale 153 days, null-code invoices at 4
summary: Tenth pass of the ACT Alignment Loop (Q2), 2026-09-24. Config still 74 codes (v1.8.0, 153 days stale). Wiki still 99 articles in projects/. Xero +54 invoices (2,448 total) — active burst in 14 days, ACT-GD +9, ACT-HV +4. Joy House INV-0349 cleared (null-code invoices now 4). ACT-PS authoring gap remains closed (PR #243). Acceptance criterion met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-09-24
---

# Project truth-state — 2026-09-24

> Tenth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-09-10|2026-09-10]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Xero +54 invoices in 14 days — total now 2,448** (was 2,394 at Sep 10). This is the largest single-interval invoice burst since the ACT-GD grant coding surge at Aug 6. ACT-GD gained 9 invoices (401→410), ACT-HV gained 4 (127→131). ACT-10 (10x10 Retreat) and ACT-BG (Brodie Germaine) both appear in the top 20 with 23 invoices each — these are predominantly ACCPAY (expense) coding catch-ups, not new revenue.

2. **`config/project-codes.json` still at v1.8.0 — now 153 days without a version bump.** Four ghost codes (`ACT-APO`, `ACT-AMT`, `ACT-EFI`, `ACT-GCC`) still present. Four DB-only codes (`ACT-DLB`, `ACT-PB`, `ACT-QD`, `ACT-RS`) still unresolved in config.

3. **Wiki projects/ still at 99 articles — no new project articles since Sep 10.** ACT-PS (`wiki/projects/picc/picc-on-country-photo-studio.md`, PR #243) remains the last addition. No new project wiki gaps.

4. **Null project_code invoices now 4** (was 5 — Joy House INV-0349 cleared). Remaining: INV-0289 (SIHF $21,780, 310d), INV-0332 (Tandanya $16,500, 99d), INV-0341 (ALIVE $66,000, 84d), INV-0347 (Tandanya $5,500, 27d). ALIVE has been untagged for 84 days.

5. **Acceptance criterion met.** Every active or ideation project scores ≥2/4. No 0/4 projects.

6. **Score distribution stable.** Estimated ~34 projects at 4/4 (unchanged from Sep 10 including ACT-PS). No new articles, no new gaps.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-09-10 |
|---|---:|---:|---|
| **4/4** | ~34 | 46% | → unchanged |
| **3/4** | ~9 | 12% | → unchanged |
| **2/4** | ~27 | 36% | → unchanged |
| **1/4** | ~4 | 5% | → unchanged |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) remain unscored — in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS gap closed (PR #243, ~2026-09-06). No remaining authoring gap for active projects. |

---

## What changed since 2026-09-10

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. Now 153 days without a version bump. Four ghost codes (`ACT-APO`, `ACT-AMT`, `ACT-EFI`, `ACT-GCC`) still present.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change since Sep 10)

Wiki/projects still 99 articles. No new project articles added in the 14-day interval. ACT-PS remains the most recent addition (PR #243, ~2026-09-06).

### Xero — +54 invoices (active burst)

| Code | 2026-04-24 | 2026-09-10 | **2026-09-24** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 401 | **410** | ↑ +9 |
| ACT-HV | 68 | 127 | **131** | ↑ +4 |
| ACT-FM | 62 | 66 | **66** | → |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-EL | 13 | 43 | **43** | → |
| ACT-DO | — | 42 | **42** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-10 | — | <20 | **23** | ↑ catch-up coding |
| ACT-BG | — | <20 | **23** | ↑ catch-up coding |
| ACT-OO | — | 19 | **19** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,394 | **2,448** | **↑ +54** |

_ACT-10 is the 10x10 Retreat (archived project, leadership retreat). ACT-BG is Brodie Germaine Fitness Aboriginal Corporation. Both spikes are expense-coding catch-ups in ACCPAY, not new revenue invoices._

### Post-cutover tagging gap (4 invoices, down from 5)

| Invoice | Counterparty | Amount | Date | Project code | Change |
|---|---|---:|---|---|---|
| INV-0289 | Social Impact Hub | $21,780 | 2025-11-18 | null | → unchanged (310d) |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | null | → unchanged (99d) |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null | → unchanged (84d) |
| INV-0347 | Tandanya | $5,500 | 2026-08-28 | null | → unchanged (27d) |
| ~~INV-0349~~ | ~~Joy House Productions~~ | ~~$931~~ | — | — | ✅ cleared |

**Total untagged post-cutover ACCREC: $109,780** (was $110,711 — -$931 for Joy House).

---

## Authoring backlog

No active authoring gaps. ACT-PS closed PR #243 (~2026-09-06). Next candidate if a new active project emerges: ensure wiki article is created within the first pass it appears in Xero.

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

1. **Tag INV-0341 ALIVE ($66,000) and INV-0332 Tandanya ($16,500)** — untagged 84d and 99d respectively.
2. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB, not in config. Promote or archive.
3. **Version-bump `config/project-codes.json`** — 153 days without update while ecosystem evolves.
4. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all ten passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-09-24 |
| `wiki/projects/**` | find count | 99 .md files (incl. technical/) |
| `xero_invoices` | GROUP BY project_code, top 20 | 2026-09-24 |
| `xero_invoices` | total count | 2,448 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-09-10|Q2 project truth-state — 2026-09-10 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
