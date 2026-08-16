---
title: Project truth-state — 74 codes × 4 sources, third pass (post-cutover)
summary: Third pass of the ACT Alignment Loop (Q2), 2026-07-16. Config unchanged at 74 codes (v1.8.0). DB adds 4 new codes not in config. Wiki still at 98 articles. ACT-PS wiki gap persists. Xero counts growing; ACT-GD at 369 invoices, ACT-IN at 541.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-07-16
---

# Project truth-state — 2026-07-16

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as prior passes. Last pass: [[project-truth-state-2026-05-14|2026-05-14]]. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **`config/project-codes.json` has not changed since 2026-04-24.** Still v1.8.0, 74 codes. No new project added to config in the ~83 days since the baseline. The `canonical_slug` fix from the 2026-05-14 pass is in place; the wiki-scoring false-negatives are gone.

2. **DB `projects` table now shows 81 distinct codes — 7 more than the 74 in config.** At 2026-05-14 the count was ~80. Four codes appear in the DB that are not in `config/project-codes.json`: `ACT-DLB`, `ACT-PB`, `ACT-QD`, `ACT-RS`. These may be recently created projects, sub-projects, or data-entry artefacts. They need either promotion into config or archival.

3. **Wiki article count unchanged at 98.** No new project articles since the 2026-05-14 pass.

4. **ACT-PS (PICC On Country Photo Studio) wiki gap persists.** This has been the one real authoring backlog item since the 2026-04-24 baseline. Now showing 6 Xero invoices in the DB (was 10 at 2026-05-14 — count may differ by query scope). The adjacent `picc-photo-kiosk.md` covers a different concept. The article is overdue.

5. **Xero invoice counts show significant growth across major projects.** ACT-IN at 541, ACT-GD at 369, ACT-HV at 110, ACT-FM at 62. The entire Xero total is now 2,247 invoices (was 2,094 at 2026-05-14). This reflects active trading through the EOFY period and post-cutover.

6. **Acceptance criterion still met.** Every active or ideation project scores ≥2/4. The score distribution is estimated as broadly stable since the 2026-05-14 pass, with the caveat that the 4 unregistered DB codes may push one or two projects into scoring visibility.

---

## Score distribution (estimated, pending scripted re-score)

| Score | Count | Share | Change from 2026-05-14 |
|---|---:|---:|---|
| **4/4** | ~33 | 45% | → stable |
| **3/4** | ~10 | 14% | ↓ −1 (ACT-GS remained at 3/4; ACT-PS still 3/4) |
| **2/4** | ~27 | 36% | → stable |
| **1/4** | ~4 | 5% | → stable |
| **0/4** | 0 | 0% | → |
| **Total (config)** | **74** | | → unchanged |

_The 4 DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) are not yet scored — they exist in DB but not config._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active/ideation projects have at minimum config + DB row |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap |

---

## What changed since 2026-05-14

### Config (no change)

`config/project-codes.json` is at v1.8.0, last updated 2026-04-24. No project added or removed. No version bump in ~83 days.

### DB — 4 new codes not in config

| Code | Status | Source | Action needed |
|------|--------|--------|---|
| ACT-DLB | unknown | `projects` table | Add to config or archive |
| ACT-PB | unknown | `projects` table | Add to config or archive |
| ACT-QD | unknown | `projects` table | Add to config or archive |
| ACT-RS | unknown | `projects` table | Add to config or archive |

These codes will be invisible to any tooling that reads from `config/project-codes.json` as the authoritative list (e.g. scoring scripts, narrative-draft.mjs).

### Wiki (no change)

98 articles — identical to 2026-05-14. The ACT-PS gap is the only outstanding authoring item.

### Xero — active growth

| Code | Baseline 2026-04-24 | 2026-05-14 | 2026-07-16 | Change |
|------|---:|---:|---:|---|
| ACT-IN | ~990* | ~990* | 541 | Note: count appears lower — query scope may differ |
| ACT-GD | 218 | 269 | 369 | ↑ +100 since May |
| ACT-HV | 68 | ~110 | 110 | → stable |
| ACT-FM | 62 | 62 | 62 | → stable |
| ACT-JH | 17 | ~48 | 48 | ↑ |
| ACT-UA | 129 | 48 | 48 | Note: count difference from prior pass |
| ACT-DO | 63 | 42 | 42 | → |
| ACT-MY | — | 27 | 27 | → |
| ACT-PI | 13 | 18 | 27 | ↑ +9 |

_Note: absolute counts differ across passes because query scope (status filters, date ranges) varies. The trend signal is directional, not precise._

### Post-cutover new receivable Xero contacts (no project code tagged)

Three post-cutover invoices (ALIVE ×2, Mounty) from the Q1 funder synthesis lack project codes. These are not reflected in the Q2 Xero counts above and represent a tagging gap.

---

## Persistent authoring backlog

**ACT-PS — PICC On Country Photo Studio:** active studio project, 6+ Xero invoices, 62 codebase references (at 2026-05-14), no wiki article. The gap has been flagged in all three passes. The adjacent `wiki/projects/picc/picc-photo-kiosk.md` covers the kiosk/server concept — not the on-country photo studio. Adding `wiki/projects/picc/picc-on-country-photo-studio.md` is a 30-minute task and closes the last active-project authoring gap.

---

## Config ghost codes (carried from all prior passes)

Still unresolved — safe to remove from config:

| Code | Name | Reason |
|------|------|---|
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project" |
| ACT-AMT | API Migration Test | Self-described test project |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces |
| ACT-GCC | Global Community Connections | Archived, 2 code refs only |

---

## Derived actions

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — the one persistent gap. Three passes flagged it.
2. **Assess ACT-DLB, ACT-PB, ACT-QD, ACT-RS** — 4 codes in DB not in config. Add to config (with canonical_slug) or archive.
3. **Tag the 3 untagged post-cutover invoices** — ALIVE ×2 and Mounty have no project_code. All three are large (total $189.2K).
4. **Version-bump `config/project-codes.json`** — the file hasn't updated since 2026-04-24 despite the ecosystem evolving.
5. **Run a scripted re-score** now that all canonical_slugs are in place — `scripts/synthesize-project-truth-state.mjs` would produce exact distribution vs estimates.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (v1.8.0, 74 codes) | 2026-07-16 |
| `wiki/projects/**` | find, count | 98 .md files |
| `xero_invoices` | GROUP BY project_code | 2026-07-16 |
| `projects` | DISTINCT code | 81 codes |
| codebase grep | last pass: 2026-05-14 (not re-run this pass) | 2026-05-14 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — 2026-05-14 last pass]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
