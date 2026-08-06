---
title: Project truth-state — 74 codes × 4 sources, fifth pass (stagnant — five consecutive passes with no change)
summary: Fifth pass of the ACT Alignment Loop (Q2), 2026-08-06. Config still 74 codes. Wiki still 98 articles. ACT-PS wiki gap now five consecutive passes without resolution. Four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) persist unfiled. Xero counts unchanged (sync appears stale). Acceptance criterion still met.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-08-06
---

# Project truth-state — 2026-08-06

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last merged pass: [[project-truth-state-2026-07-23|2026-07-23]]. Note: a 2026-07-30 pass exists on an unmerged branch. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **`config/project-codes.json` has not changed since 2026-04-24 — now 105 days without a version bump.** Still 74 codes. The ecosystem has been actively evolving (new DB codes, post-cutover invoices, MRFF partnership, GHL cleanup plan) but the config hasn't moved. The 2026-07-12 GHL cleanup alignment plan is the most recent operational artefact — none touch the project config.

2. **Wiki at 98 articles — unchanged since 2026-05-14.** Four consecutive passes (May 14, Jul 23, Jul 30, Aug 6) with no new project wiki articles. ACT-PS is the one persistent gap.

3. **ACT-PS (PICC On Country Photo Studio) wiki gap persists through a fifth pass.** 79 codebase references, 6 Xero invoices, active studio-tier project — still no dedicated wiki article in `wiki/projects/picc/`. The adjacent `picc-photo-kiosk.md` covers a different concept. This is now the longest-running derived action in the alignment loop.

4. **Xero invoice counts appear stagnant — sync may be stale.** The same counts as 2026-07-23 were returned: ACT-IN 547, ACT-GD 380, ACT-HV 123, ACT-FM 64. The total ACCREC query shows 12 invoices ($417,767.84), reflecting the Homeland School + Sonas clearances that happened between July 23 and July 30, but the per-project-code counts haven't changed. The Xero sync job may not have run since July 23.

5. **DB `projects` table still shows 78 distinct codes** — 4 more than the 74 in config. The four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) first surfaced at 2026-07-16 and remain unresolved. These are invisible to tooling that reads `config/project-codes.json` as source-of-truth.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. No 0/4 projects. The structural score is stable.

---

## Score distribution (estimated)

| Score | Count | Share | Change from 2026-07-23 |
|---|---:|---:|---|
| **4/4** | ~33 | 45% | → stable |
| **3/4** | ~10 | 14% | → stable (ACT-PS still here) |
| **2/4** | ~27 | 36% | → stable |
| **1/4** | ~4 | 5% | → stable |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) remain unscored — they exist in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (fifth consecutive pass) |

---

## What changed since 2026-07-23

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 105 days.

### DB — 4 DB-only codes persist (no change)

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

### Wiki (no change)

98 articles — identical to 2026-05-14 (three passes with no new articles: Jul 23, Jul 30, Aug 6). ACT-PS remains the only outstanding authoring gap.

### Xero — counts unchanged (sync likely stale)

| Code | 2026-04-24 | 2026-07-23 | 2026-08-06 | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990* | 547 | **547** | → |
| ACT-GD | 218 | 380 | **380** | → |
| ACT-HV | 68 | 123 | **123** | → |
| ACT-FM | 62 | 64 | **64** | → |
| ACT-JH | 17 | 48 | **48** | → |
| ACT-UA | 129 | 48 | **48** | → |
| ACT-EL | 13 | 34 | **34** | → |
| ACT-MY | — | 27 | **27** | → |
| ACT-PI | 13 | 27 | **27** | → |
| ACT-PS | — | 6 | **6** | → |
| **Total (all codes)** | ~2,004 | 2,293 | **2,293** | → |

_No change in any Xero invoice count. The Xero ingestion job may not have run since 2026-07-23._

### Post-cutover tagging gap (persistent)

Three 2026-07-02 invoices (ALIVE ×2: $167.2K, Mounty: $22K) have no project_code. Total $189,200 untracked against project codes. Same three invoices flagged since 2026-07-16.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79 codebase references, no wiki article. **Fifth consecutive pass without resolution.** Adding `wiki/projects/picc/picc-on-country-photo-studio.md` is an estimated 30-minute task.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — five passes flagged it.
2. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB since at least 2026-07-16, not in config. Promote or archive.
3. **Tag INV-0341, INV-0342, INV-0334** (ALIVE ×2 + Mounty) — $189.2K untracked.
4. **Version-bump `config/project-codes.json`** — 105 days without update while ecosystem evolves.
5. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all five passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-08-06 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-08-06 |
| `projects` | DISTINCT code (COALESCE act_project_code, code) | 2026-08-06 (78 codes) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-07-23|Q2 project truth-state — 2026-07-23 last merged pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
