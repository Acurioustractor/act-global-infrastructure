---
title: Project truth-state — 74 codes × 4 sources, sixth pass (Xero sync resumed, +39 invoices)
summary: Sixth pass of the ACT Alignment Loop (Q2), 2026-08-13. Config still 74 codes (v1.8.0, 112 days stale). Wiki still 98 articles. ACT-PS wiki gap now six consecutive passes. Four DB-only codes persist. Xero sync resumed after 21-day gap — total now 2,332 invoices (+39), ACT-GD +10, ACT-EL +9. Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-08-13
---

# Project truth-state — 2026-08-13

> Sixth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-08-06|2026-08-06]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Xero sync resumed after a 21-day stall — total invoices now 2,332 (+39 from 2026-08-06).** The previous three passes (July 23, July 30 unmerged, Aug 6) all showed 2,293 invoices with no movement. The sync has now run: ACT-GD +10, ACT-EL +9, ACT-HV +3, ACT-FM +1. This is the only structural positive change this pass.

2. **`config/project-codes.json` still at v1.8.0 — now 112 days without a version bump** (2026-04-24 → 2026-08-13). The ecosystem is actively trading (new Oonchiumpa invoice, ALIVE activity, Empathy Ledger jump of +9 invoices) but the config hasn't moved.

3. **Wiki still at 98 articles — six consecutive passes with no new articles.** ACT-PS (PICC On Country Photo Studio) remains the only active studio project without a dedicated wiki article: 6 Xero invoices, 79+ codebase references, no article in `wiki/projects/picc/`. This is now the longest-running unresolved derived action in the alignment loop.

4. **Four DB-only project codes persist unresolved** — ACT-DLB, ACT-PB, ACT-QD, ACT-RS in `projects` table but not in `config/project-codes.json`. First surfaced 2026-07-16; now nine passes (counting unmerged) with no action.

5. **Post-cutover invoice tagging gap grows slightly.** The three untagged 2026-07-02 invoices (ALIVE ×2 + Mounty) are joined by the new INV-0344 Oonchiumpa ($41,250, 2026-08-12, null project_code). Total untagged post-April receipts now represent $230,450 ($189,200 from ALIVE/Mounty + $41,250 Oonchiumpa).

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects. The structural score is stable.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-08-06 |
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
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (sixth consecutive pass) |

---

## What changed since 2026-08-06

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 112 days.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change)

98 articles — identical to 2026-05-14 (now six passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — sync resumed, +39 invoices across codes

| Code | 2026-04-24 | 2026-08-06 | **2026-08-13** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 380 | **390** | **↑ +10** |
| ACT-EL | 13 | 34 | **43** | **↑ +9** |
| ACT-HV | 68 | 123 | **126** | **↑ +3** |
| ACT-FM | 62 | 64 | **65** | **↑ +1** |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,293 | **2,332** | **↑ +39** |

The Xero sync had been frozen since 2026-07-23 (21 days). It has now run. The biggest movers: ACT-GD (+10) and ACT-EL (+9) reflect active Goods on Country and Empathy Ledger invoice processing.

### Post-cutover tagging gap (growing)

| Invoice | Counterparty | Amount | Date | Project code |
|---|---|---:|---|---|
| INV-0334 | Mounty Aboriginal Youth | ~~$22,000~~ | 2026-07-02 | CLEARED |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null |
| INV-0342 | ALIVE National Centre | $101,200 | 2026-07-02 | null |
| INV-0344 | Oonchiumpa Consultancy | **$41,250** | **2026-08-12** | **null 🆕** |

**Total untagged: $208,450** (up from $189,200 at Aug 6, with Mounty clearing offsetting the Oonchiumpa addition: −$22K + $41,250 = +$19,250 net).

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79+ codebase references, no wiki article. **Sixth consecutive pass without resolution.** Estimated 30-minute task to close.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — six passes flagged it.
2. **Tag INV-0344 Oonchiumpa ($41,250) with project_code** — likely ACT-OO, confirm.
3. **Tag INV-0341, INV-0342** (ALIVE ×2, $167.2K) — untracked since 2026-07-16.
4. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB since at least 2026-07-16, not in config. Promote or archive.
5. **Version-bump `config/project-codes.json`** — 112 days without update while ecosystem evolves.
6. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all six passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-08-13 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-08-13 |
| `projects` | DISTINCT code (COALESCE act_project_code, code) | 2026-08-06 (unchanged) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-08-06|Q2 project truth-state — 2026-08-06 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
