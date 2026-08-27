---
title: Project truth-state — 74 codes × 4 sources, eighth pass (Xero +11, ACT-GD +1, ACT-PS gap eighth consecutive pass)
summary: Eighth pass of the ACT Alignment Loop (Q2), 2026-08-27. Config still 74 codes (v1.8.0, 126 days stale). Wiki still 98 articles (eighth consecutive pass unchanged). ACT-PS wiki gap now eight consecutive passes. Xero +11 invoices (2,362 total), ACT-GD +1, ACT-HV +1. Four DB-only codes persist unresolved. Untagged post-cutover: $73,953 (INV-0341 $66K + INV-0345 $6,953). Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-08-27
---

# Project truth-state — 2026-08-27

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-08-20|2026-08-20]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Xero +11 invoices this week — total now 2,362** (was 2,351 at Aug 20). ACT-GD adds 1 (399 → 400). ACT-HV adds 1 (126 → 127). The new invoice INV-0345 (Tanya Turner, $6,953, raised 2026-08-22) has no project_code. Oonchiumpa INV-0344 cleared.

2. **`config/project-codes.json` still at v1.8.0 — now 126 days without a version bump** (2026-04-24 → 2026-08-27). The ecosystem continues trading actively while the config sits frozen.

3. **Wiki still at 98 articles — eight consecutive passes unchanged.** ACT-PS (PICC On Country Photo Studio) remains the only active project without a dedicated wiki article. Eight passes; no resolution signal. Estimated 30-minute task.

4. **Four DB-only project codes persist unresolved** — ACT-DLB, ACT-PB, ACT-QD, ACT-RS in `projects` table but not in `config/project-codes.json`. First surfaced 2026-07-16.

5. **Untagged post-cutover invoices: $73,953 (2 invoices).** INV-0344 Oonchiumpa ($41,250) was cleared (and presumably untagged when paid). INV-0341 ALIVE ($66,000) remains outstanding and untagged. New INV-0345 Tanya Turner ($6,953) is also untagged. Total untagged falls from $107,250 to $72,953 net, though the Tanya Turner invoice represents a new gap.

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

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 126 days.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change)

98 articles — unchanged since 2026-05-14 (now eight passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — +11 invoices across codes

| Code | 2026-04-24 | 2026-08-20 | **2026-08-27** | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990 | 547 | **547** | → |
| ACT-GD | 218 | 399 | **400** | **↑ +1** |
| ACT-HV | 68 | 126 | **127** | **↑ +1** |
| ACT-EL | 13 | 43 | **43** | → |
| ACT-FM | 62 | 66 | **66** | → |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-DO | — | 42 | **42** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,351 | **2,362** | **↑ +11** |

### Post-cutover tagging gap

| Invoice | Counterparty | Amount | Date | Project code | Change |
|---|---|---:|---|---|---|
| INV-0344 | Oonchiumpa Consultancy | ~~$41,250~~ | 2026-08-12 | null | 🟢 PAID this pass |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | null | → still untagged (56d) |
| INV-0345 | Tanya Turner | $6,953 | 2026-08-22 | null | 🆕 NEW, untagged |

**Total untagged post-cutover: $72,953** (INV-0341 $66K + INV-0345 $6,953). Down from $107,250 at Aug 20, though the new Tanya Turner invoice adds a fresh gap.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79+ codebase references, no wiki article in `wiki/projects/picc/`. **Eighth consecutive pass without resolution.** Estimated 30-minute task to close.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — eight passes flagged it.
2. **Identify Tanya Turner (INV-0345, $6,953)** — new counterparty, tag with project_code.
3. **Tag INV-0341 ALIVE ($66,000)** — untracked since 2026-07-02.
4. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB since at least 2026-07-16, not in config. Promote or archive.
5. **Version-bump `config/project-codes.json`** — 126 days without update while ecosystem evolves.
6. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all eight passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-08-27 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-08-27 |
| `xero_invoices` | total count | 2,362 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-08-20|Q2 project truth-state — 2026-08-20 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
