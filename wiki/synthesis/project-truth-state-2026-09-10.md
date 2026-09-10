---
title: Project truth-state — 74 codes × 4 sources, ninth pass (wiki +1, Xero +3, ACT-PS gap ninth consecutive)
summary: Ninth pass of the ACT Alignment Loop (Q2), 2026-09-10. Config still 74 codes (v1.8.0, 139 days stale). Wiki now 99 articles (+1 from 98). ACT-PS wiki gap ninth consecutive pass. Xero +3 invoices (2,394 total); no tagged-code changes. Five null project_code invoices persist. Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-09-10
---

# Project truth-state — 2026-09-10

> Ninth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-09-03|2026-09-03]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Wiki now 99 articles — up from 98 at Sep 3 (+1).** One new article added since the last pass. However, it is in `wiki/technical/` (not `wiki/projects/`), and ACT-PS remains the only outstanding project-level authoring gap. The +1 does not close any scoring gap.

2. **Xero +3 invoices — total now 2,394** (was 2,391 at Sep 3). Very low volume week. ACT-GD still at 401 (unchanged), ACT-HV at 127 (unchanged). The +3 likely span multiple codes but no single code shows visible movement.

3. **`config/project-codes.json` still at v1.8.0 — now 139 days without a version bump.** Unchanged from Sep 3. Four ghost codes (`ACT-APO`, `ACT-AMT`, `ACT-EFI`, `ACT-GCC`) still present. Four DB-only codes (`ACT-DLB`, `ACT-PB`, `ACT-QD`, `ACT-RS`) still unresolved in config.

4. **ACT-PS (PICC On Country Photo Studio) remains the only active studio project without a wiki article — ninth consecutive pass.** 6 Xero invoices, 79+ codebase references, no article. Estimated 30 minutes to close. It has been flagged in every pass since the April 2026 baseline.

5. **Five invoices with null project_code persist** — INV-0289 (SIHF $21,780, 296d), INV-0332 (Tandanya $16,500, 85d), INV-0341 (ALIVE $66,000, 70d), INV-0347 (Tandanya $5,500, 13d), INV-0349 (Joy House $931, 10d). ALIVE and first Tandanya invoice have now been untagged for 70 and 85 days.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-09-03 |
|---|---:|---:|---|
| **4/4** | ~33 | 45% | → stable |
| **3/4** | ~10 | 14% | → stable (ACT-PS still here) |
| **2/4** | ~27 | 36% | → stable |
| **1/4** | ~4 | 5% | → stable |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) remain unscored — in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (ninth consecutive pass) |

---

## What changed since 2026-09-03

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. 139 days without a version bump. Four ghost codes (`ACT-APO`, `ACT-AMT`, `ACT-EFI`, `ACT-GCC`) still present.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (+1 article, not in projects/)

One new article added since Sep 3 in `wiki/technical/` — does not change project scoring. Wiki/projects count stable. ACT-PS remains unresolved.

### Xero — +3 invoices (stable week)

| Code | 2026-04-24 | 2026-09-03 | **2026-09-10** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 401 | **401** | → |
| ACT-HV | 68 | 127 | **127** | → |
| ACT-FM | 62 | 66 | **66** | → |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-EL | 13 | 43 | **43** | → |
| ACT-DO | — | 42 | **42** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-OO | — | 19 | **19** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,391 | **2,394** | **↑ +3** |

### Post-cutover tagging gap (persistent, 5 invoices)

| Invoice | Counterparty | Amount | Date | Project code | Change |
|---|---|---:|---|---|---|
| INV-0289 | Social Impact Hub | $21,780 | 2025-11-18 | null | → unchanged (296d) |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | null | → unchanged (85d) |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null | → unchanged (70d) |
| INV-0347 | Tandanya | $5,500 | 2026-08-28 | null | → unchanged (13d) |
| INV-0349 | Joy House Productions | $931 | 2026-08-31 | null | → unchanged (10d) |

**Total untagged post-cutover ACCREC: $110,711** — unchanged from Sep 3.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79+ codebase references, no wiki article. **Ninth consecutive pass without resolution.** Estimated 30-minute task to close.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — nine passes flagged it. 30 minutes.
2. **Tag INV-0341 ALIVE ($66,000) and INV-0332 Tandanya ($16,500)** — untracked 70d and 85d.
3. **Identify Joy House Productions** — INV-0349 $931, null project_code, 10 days old.
4. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB, not in config. Promote or archive.
5. **Version-bump `config/project-codes.json`** — 139 days without update while ecosystem evolves.
6. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all nine passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-09-10 |
| `wiki/projects/**` | find count | 99 .md files (incl. technical/) |
| `xero_invoices` | GROUP BY project_code, top 20 | 2026-09-10 |
| `xero_invoices` | total count | 2,394 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-09-03|Q2 project truth-state — 2026-09-03 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
