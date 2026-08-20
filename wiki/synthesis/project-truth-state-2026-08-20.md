---
title: Project truth-state — 74 codes × 4 sources, seventh pass (Xero +19, ACT-GD +9, ACT-PS gap seventh consecutive pass)
summary: Seventh pass of the ACT Alignment Loop (Q2), 2026-08-20. Config still 74 codes (v1.8.0, 119 days stale). Wiki still 98 articles (seventh consecutive pass unchanged). ACT-PS wiki gap now seven consecutive passes. Xero +19 invoices (2,351 total), ACT-GD +9, ACT-FM +1. Four DB-only codes persist unresolved. ALIVE INV-0342 ($101,200) cleared — untagged post-cutover falls to $107,250. Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-08-20
---

# Project truth-state — 2026-08-20

> Seventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-08-13|2026-08-13]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Xero +19 invoices this week — total now 2,351** (was 2,332 at Aug 13). ACT-GD leads the movement again: 390 → 399 (+9). ACT-FM adds 1 (65 → 66). ACT-EL, ACT-HV, ACT-IN, and others are stable. The sync is running consistently after the 21-day stall ended at Aug 13.

2. **`config/project-codes.json` still at v1.8.0 — now 119 days without a version bump** (2026-04-24 → 2026-08-20). The ecosystem is actively trading (Oonchiumpa, ALIVE, ACT-GD invoicing) but the config hasn't moved. ACT-DO (42 invoices) is now visible in the top 30 by invoice count — still not reflected in the config review.

3. **Wiki still at 98 articles — seven consecutive passes unchanged.** ACT-PS (PICC On Country Photo Studio) remains the only active studio project without a dedicated wiki article: 6 Xero invoices, 79+ codebase references, no article in `wiki/projects/picc/`. This is now the longest-running unresolved derived action in the alignment loop.

4. **Four DB-only project codes persist unresolved** — ACT-DLB, ACT-PB, ACT-QD, ACT-RS in `projects` table but not in `config/project-codes.json`. First surfaced 2026-07-16; now ten or more passes (counting unmerged) with no action.

5. **ALIVE INV-0342 ($101,200) cleared — untagged post-cutover falls to $107,250.** INV-0342 was paid since Aug 13. The remaining untagged post-cutover invoices are INV-0341 (ALIVE $66K) and INV-0344 (Oonchiumpa $41,250). Total untagged fell from $208,450 to $107,250 — a meaningful reduction, though both remaining invoices have been untagged for 49 and 8 days respectively.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-08-13 |
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
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (seventh consecutive pass) |

---

## What changed since 2026-08-13

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 119 days.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change)

98 articles — unchanged since 2026-05-14 (now seven passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — +19 invoices across codes

| Code | 2026-04-24 | 2026-08-13 | **2026-08-20** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 390 | **399** | **↑ +9** |
| ACT-EL | 13 | 43 | **43** | → |
| ACT-HV | 68 | 126 | **126** | → |
| ACT-FM | 62 | 65 | **66** | **↑ +1** |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-DO | — | — | **42** | (now in top 30) |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,332 | **2,351** | **↑ +19** |

ACT-GD (Goods on Country) continues to be the most active code in new invoice volume. ACT-DO (42 invoices) appears in the top-30 query this pass; it likely existed previously but wasn't highlighted.

### Post-cutover tagging gap (improving)

| Invoice | Counterparty | Amount | Date | Project code | Change |
|---|---|---:|---|---|---|
| INV-0342 | ALIVE National Centre | ~~$101,200~~ | 2026-07-02 | null | 🟢 PAID this pass |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null | → still untagged |
| INV-0344 | Oonchiumpa Consultancy | $41,250 | 2026-08-12 | null | → still untagged |

**Total untagged post-cutover: $107,250** (down from $208,450 at Aug 13 — INV-0342 cleared).

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79+ codebase references, no wiki article. **Seventh consecutive pass without resolution.** Estimated 30-minute task to close.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — seven passes flagged it.
2. **Tag INV-0344 Oonchiumpa ($41,250) with project_code** — likely ACT-OO, confirm.
3. **Tag INV-0341 ALIVE ($66,000)** — untracked since 2026-07-02.
4. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB since at least 2026-07-16, not in config. Promote or archive.
5. **Version-bump `config/project-codes.json`** — 119 days without update while ecosystem evolves.
6. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all seven passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-08-20 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-08-20 |
| `xero_invoices` | total count | 2,351 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-08-13|Q2 project truth-state — 2026-08-13 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
