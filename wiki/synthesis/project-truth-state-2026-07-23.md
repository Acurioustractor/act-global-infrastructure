---
title: Project truth-state — 74 codes × 4 sources, fourth pass (post-cutover, Xero growing)
summary: Fourth pass of the ACT Alignment Loop (Q2), 2026-07-23. Config still at 74 codes. Wiki still at 98 articles. ACT-PS wiki gap enters its fourth pass with 79 codebase refs. Xero active — ACT-GD now 380 invoices, ACT-HV 123, ACT-IN 547. Total Xero invoices 2,293.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-07-23
---

# Project truth-state — 2026-07-23

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last pass: [[project-truth-state-2026-07-16|2026-07-16]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **`config/project-codes.json` has not changed since 2026-04-24 — now 91 days without a version bump.** Still 74 codes. The ecosystem has been actively evolving (new DB codes, post-cutover invoices, MRFF partnership active) but the config hasn't moved. This is the clearest hygiene risk.

2. **Wiki at 98 articles — unchanged since 2026-05-14.** Three passes with no new project wiki articles. ACT-PS is the one persistent gap; no other active projects are missing coverage.

3. **ACT-PS (PICC On Country Photo Studio) wiki gap persists through a fourth pass.** Now 79 codebase references, 6 Xero invoices, active studio-tier project — still no dedicated wiki article. The adjacent `picc-photo-kiosk.md` covers the kiosk/server concept; ACT-PS is the on-country photo studio and deserves its own article.

4. **Xero invoice counts show continued growth across major projects.** ACT-IN at 547 (was 541), ACT-GD at 380 (was 369), ACT-HV at 123 (was 110). Total: 2,293 (was 2,247 at 2026-07-16, +46 invoices in 7 days). Active trading period.

5. **DB `projects` table shows 78 distinct codes** — 4 more than the 74 in config. The four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) persist from the 2026-07-16 pass, unresolved. These are invisible to tooling reading config as source-of-truth.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects. The structural score is stable.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-07-16 |
|---|---:|---:|---|
| **4/4** | ~33 | 45% | → stable |
| **3/4** | ~10 | 14% | → stable (ACT-PS still here) |
| **2/4** | ~27 | 36% | → stable |
| **1/4** | ~4 | 5% | → stable |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) are unscored — they exist in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (fourth consecutive pass) |

---

## What changed since 2026-07-16

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 91 days. No version bump.

### DB — 4 DB-only codes persist

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

These four codes have been flagged since 2026-07-16 (first sighting). No action taken.

### Wiki (no change)

98 articles — identical to 2026-05-14 (two passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — continued growth

| Code | 2026-04-24 baseline | 2026-07-16 | 2026-07-23 | Change (7d) |
|------|---:|---:|---:|---|
| ACT-IN | ~990* | 541† | **547** | +6 |
| ACT-GD | 218 | 369 | **380** | +11 |
| ACT-HV | 68 | 110 | **123** | +13 |
| ACT-FM | 62 | 62 | **64** | +2 |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-DO | 63 | 42 | **42** | → |
| ACT-EL | 13 | 34 | **34** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,247 | **2,293** | +46 |

_† ACT-IN count lower than baseline because baseline used a broader query scope (includes all statuses); current count filters by project_code match across all invoice statuses._

The 7-day growth (+46 invoices) is concentrated in ACT-GD (+11), ACT-HV (+13), and ACT-FM (+2), reflecting active Goods, Harvest, and Farm operations.

### Post-cutover tagging gap

Three 2026-07-02 invoices (ALIVE ×2: $167.2K, Mounty: $22K) have no project_code. Total $189,200 untracked against project codes. These are the same three invoices flagged at 2026-07-16.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79 codebase references, no wiki article. Fourth consecutive pass without resolution. The adjacent `wiki/projects/picc/picc-photo-kiosk.md` covers a different concept. Adding `wiki/projects/picc/picc-on-country-photo-studio.md` is an estimated 30-minute task and closes the only active-project wiki gap.

---

## Config ghost codes (unresolved since 2026-04-24)

| Code | Name | Reason |
|------|------|---|
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project" |
| ACT-AMT | API Migration Test | Self-described test project |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces |
| ACT-GCC | Global Community Connections | Archived, 2 code refs only |

---

## Derived actions

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — four passes flagged it.
2. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB since at least 2026-07-16, not in config. Promote or archive.
3. **Tag INV-0341, INV-0342, INV-0334** (ALIVE ×2 + Mounty) with project codes — $189.2K untracked.
4. **Version-bump `config/project-codes.json`** — 91 days without update while ecosystem evolves.
5. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all four passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-07-23 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-07-23 |
| `projects` | DISTINCT code (COALESCE act_project_code, code) | 2026-07-23 (78 codes) |
| codebase grep | `ACT-[A-Z]+` over apps/ scripts/ config/ | 2026-07-23 (top 30 shown) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-07-16|Q2 project truth-state — 2026-07-16 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
