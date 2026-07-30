---
title: Project truth-state — 74 codes × 4 sources, fifth pass (zero Xero growth, static across all dimensions)
summary: Fifth pass of the ACT Alignment Loop (Q2), 2026-07-30. Config still at 74 codes (v1.8.0, 97 days without update). Wiki still at 98 articles. Xero invoice counts unchanged (2,293 total — zero growth from 2026-07-23). ACT-PS wiki gap enters fifth pass. 4 DB-only codes still unresolved.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-07-30
---

# Project truth-state — 2026-07-30

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last pass: [[project-truth-state-2026-07-23|2026-07-23]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **`config/project-codes.json` is now 97 days without a version bump.** Still v1.8.0, still 74 codes. The last pass was 91 days — no action was taken in the 7-day window. The ecosystem has continued evolving (MRFF partnership active, 3 untagged post-cutover invoices outstanding) but the config remains frozen.

2. **Xero invoice counts are completely unchanged from 2026-07-23.** Total 2,293 invoices — identical. ACT-IN at 547, ACT-GD at 380, ACT-HV at 123. This is a departure from last week's active period (+46 invoices). Zero new tagged invoices in 7 days.

3. **Wiki at 98 articles — unchanged since 2026-05-14.** This is now the third consecutive pass (2026-07-16, 2026-07-23, 2026-07-30) with no new wiki articles. The compounding loop is stalled at the authoring layer.

4. **ACT-PS wiki gap enters its fifth consecutive pass.** 79 codebase references (unchanged), 6 Xero invoices (unchanged). `wiki/projects/picc/picc-on-country-photo-studio.md` is the only outstanding active-project wiki gap. It has been flagged in every pass since 2026-07-09.

5. **DB `projects` table still shows 78 distinct codes — 4 more than config.** The four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) persist with no resolution. These have been flagged since 2026-07-16 (now 3 passes).

6. **Acceptance criterion still met.** No active or ideation project scores below 2/4. No 0/4 projects.

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

_The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) are unscored — they exist in DB but not config._

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

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed in 97 days. No version bump.

### DB — 4 DB-only codes persist

| Code | Status in DB | Config? | Action needed |
|------|------|------|---|
| ACT-DLB | present in `projects` | ❌ | Add to config or archive |
| ACT-PB | present in `projects` | ❌ | Add to config or archive |
| ACT-QD | present in `projects` | ❌ | Add to config or archive |
| ACT-RS | present in `projects` | ❌ | Add to config or archive |

These four codes have been flagged since 2026-07-16 (three passes). No action taken.

### Wiki (no change)

98 articles — identical to 2026-05-14 (three consecutive passes with no new articles). ACT-PS remains the only outstanding authoring gap.

### Xero — zero growth this week

| Code | 2026-04-24 baseline | 2026-07-16 | 2026-07-23 | **2026-07-30** | Change (7d) |
|------|---:|---:|---:|---:|---|
| ACT-IN | ~990* | 541 | 547 | **547** | → **0** |
| ACT-GD | 218 | 369 | 380 | **380** | → **0** |
| ACT-HV | 68 | 110 | 123 | **123** | → **0** |
| ACT-FM | 62 | 62 | 64 | **64** | → **0** |
| ACT-JH | 17 | 48 | 48 | **48** | → **0** |
| ACT-UA | 129 | 48 | 48 | **48** | → **0** |
| ACT-DO | 63 | 42 | 42 | **42** | → **0** |
| ACT-EL | 13 | 34 | 34 | **34** | → **0** |
| ACT-MY | — | 27 | 27 | **27** | → **0** |
| ACT-PI | 13 | 27 | 27 | **27** | → **0** |
| ACT-PS | — | 6 | 6 | **6** | → **0** |
| **Total (all codes)** | ~2,004 | 2,247 | 2,293 | **2,293** | → **0** |

After +46 invoices in the prior 7-day window, this week shows zero growth in tagged Xero invoices. This may reflect a quiet trading week, or it may indicate that new invoices being raised are not receiving project codes (the 3 untagged post-cutover invoices from 2026-07-02 are an example of this pattern).

### Post-cutover tagging gap (unchanged)

Three 2026-07-02 invoices (ALIVE ×2: $167.2K, Mounty: $22K) have no project_code. Total $189,200 untracked against project codes. These have been flagged for 4 consecutive passes.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6 Xero invoices, 79 codebase references, no wiki article. Fifth consecutive pass without resolution. `wiki/projects/picc/picc-photo-kiosk.md` covers a different concept. Adding `wiki/projects/picc/picc-on-country-photo-studio.md` is an estimated 30-minute task.

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

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — five passes flagged it.
2. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — in DB for three passes, not in config. Promote or archive.
3. **Tag INV-0341, INV-0342, INV-0334** (ALIVE ×2 + Mounty) with project codes — $189.2K untracked for 4 passes.
4. **Version-bump `config/project-codes.json`** — 97 days without update while ecosystem evolves.
5. **Remove `ACT-APO` and `ACT-AMT`** from config — self-described non-projects, flagged all five passes.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-07-30 |
| `wiki/projects/**` | find count | 98 .md files |
| `xero_invoices` | GROUP BY project_code, all statuses | 2026-07-30 |
| `projects` | DISTINCT code (COALESCE act_project_code, code) | 2026-07-30 (78 codes) |
| codebase grep | `ACT-PS` over apps/ scripts/ config/ | 2026-07-30 (79 refs) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-07-23|Q2 project truth-state — 2026-07-23 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
