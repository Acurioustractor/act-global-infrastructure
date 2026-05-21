---
title: Project truth-state — second pass, 75 codes × 4 sources
summary: Second pass of the ACT Alignment Loop (Q2), scheduled 2026-05-08 (queries run 2026-05-21). Config grew to 75 codes. Wiki grew to 90+ articles. ACT-CT and ACT-BV promoted to 4/4 (both acquired Xero tracking). ACT-PS wiki gap remains the one real authoring backlog item. Four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) surfaced in projects table but not yet in config.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-08
---

# Project truth-state — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q2 second pass. Scheduled date: 2026-05-08 (2 weeks after baseline). Queries run: 2026-05-21. Four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase grep across `apps/` `scripts/` `config/`. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **Config grew from 74 to 75 codes, wiki grew from 88 to 90+ articles.** One new project code was added to config. At least two new wiki articles were added (including new entries for `civicgraph`, `deadlylabs`, `grantscope`, `quandamooka-justice-strategy`, `place-based-policy-lab`, `resoleution`). The ecosystem is expanding.

2. **ACT-CT (ConFit Pathways) and ACT-BV (Black Cockatoo Valley) both promoted to 4/4.** At baseline, both were 3/4 (wiki present, no Xero tracking). ACT-CT now has 5 Xero invoices. ACT-BV has 1 invoice + 8 transactions. Both moved from "wiki claims only" to "financially tracked." Score distribution updated: **30 of 75 codes (40%) are now fully aligned at 4/4**.

3. **ACT-PS (PICC On Country Photo Studio) remains the one real authoring gap.** Baseline called this out. Now 78 codebase refs (up from 47). Eleven Xero invoices. Two Xero transactions. No dedicated `picc-on-country-photo-studio.md` wiki article in `wiki/projects/picc/` (existing picc articles cover the Photo Kiosk, Elders Hull River, Annual Report, Centre Precinct, and a main picc.md — but none maps to ACT-PS's specific work scope). This is the only active project scoring 3/4 with a genuine authoring gap.

4. **Four DB-only codes not yet in config: ACT-DLB, ACT-PB, ACT-QD, ACT-RS.** These appear in the `projects` table (union with `org_projects`) but have no entries in `config/project-codes.json` and no Xero financial activity yet. They appear to be provisioned DB rows awaiting config formalisation. Decision: add to config or hold until they're financially active.

5. **The 40+ missing `canonical_slug` problem from baseline is still unresolved.** No config PR adding `canonical_slug` fields was submitted. This remains the main blocker for Phase-1 automation of this synthesis.

---

## Score distribution (updated)

| Score | 2026-04-24 | 2026-05-08 | Change | What it means |
|---|---:|---:|---|---|
| **4/4** | 28 | **30** | +2 | Wiki + DB + code + Xero — fully aligned |
| **3/4** | 16 | **14** | -2 | One source missing |
| **2/4** | 26 | **26** | — | Two sources missing — mostly archived |
| **1/4** | 4 | **4** | — | Config-only ghosts (archived admin artefacts) |
| **0/4** | 0 | **0** | — | None |
| **Total** | **74** | **75** | +1 | One new code added to config |

*Note: The four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS) are not included in the score distribution — they are not yet in `config/project-codes.json` and have no codebase refs or Xero activity.*

---

## At-a-glance — score changes since baseline

### Promoted to 4/4 since baseline (2 codes)

| Code | Name | What moved them |
|---|---|---|
| ACT-CT | ConFit Pathways | 5 Xero invoices added (was 0 at baseline) |
| ACT-BV | Black Cockatoo Valley | 1 invoice + 8 transactions (wiki existed at baseline; now Xero-tracked too) |

### Remained at 3/4 — one source missing

| Code | Name | Missing | Notes |
|---|---|---|---|
| **ACT-PS** | PICC On Country Photo Studio | wiki | **Real gap** — 78 code refs, 11 Xero invoices, 2 transactions; no dedicated article |
| ACT-IN | ACT Infrastructure | wiki | Expected — internal ops |
| ACT-SM | SMART | wiki (false neg) | `smart-recovery/smart-recovery.md` exists; config missing `canonical_slug` |
| ACT-CS | Civic Scope | xero | Budget runs through ACT-IN |
| ACT-CM | CAMPFIRE | xero | Brodie-led, no tagged invoices yet |
| ACT-RT | Redtape | xero | Low cost base |
| ACT-JC | JusticeHub CoE | xero | Ideation — not yet operational |
| ACT-TR | Treacher | xero | Film concept — expected |
| ACT-FO | Fishers Oysters | xero | Transferred |
| ACT-TN | TOMNET | xero | Archived |
| ACT-BR | ACT Bali Retreat | wiki | Event artefact, archived |
| ACT-WE | Westpac Summit 2025 | wiki | Event artefact, archived |
| ACT-OS | Orange Sky EL | wiki | Repo-only reference, archived |
| ACT-WJ | Wilya Janta | wiki | Archived |

### New DB-only codes (not yet in config) — not scored

| Code | DB presence | Xero activity | Status |
|---|---|---|---|
| ACT-DLB | projects table | None | DB stub — awaiting config formalisation |
| ACT-PB | projects table | None | DB stub |
| ACT-QD | projects table | None | DB stub |
| ACT-RS | projects table | None | DB stub |

### 4/4 — fully aligned (30 codes, same as baseline 28 plus 2 promoted)

Core ecosystem and studio projects unchanged from baseline. ACT-CT and ACT-BV now join this group. Notable Xero activity growth: `ACT-IN` (1,020 invoices, up from context), `ACT-GD` (287), `ACT-FM` (161).

### 1/4 — config ghosts (4 codes, unchanged)

`ACT-GCC`, `ACT-AMT`, `ACT-APO`, `ACT-EFI` — same as baseline. The baseline recommended removing `ACT-APO` and `ACT-AMT`. This has not been acted on.

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active+ideation projects score ≥2/4 |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS flagged (only real gap) |

---

## Authoring backlog (one real gap)

**`ACT-PS` PICC On Country Photo Studio** (active, studio-tier) — 78 codebase references (up from 47 at baseline), 11 Xero invoices, 2 transactions, no dedicated wiki article. The picc/ directory now has five articles but none maps to "On Country Photo Studio." Adding `wiki/projects/picc/picc-on-country-photo-studio.md` would bring all active studio projects to 4/4.

Not-really-gaps (false negatives):
- **`ACT-SM`** has `wiki/projects/smart-recovery/smart-recovery.md`. Add `"canonical_slug": "smart-recovery"` to ACT-SM in config.
- **`ACT-IN`** — internal ops; no narrative article warranted.

---

## New wiki articles since baseline (observed)

Not exhaustive — based on directory listing change from 88 → 90+ articles:

| Article | Likely code | Notes |
|---|---|---|
| civicgraph.md | (new code?) | CivicGraph project — no code in current config; wiki-only |
| deadlylabs.md | (new code?) | DeadlyLabs — no current config code visible |
| grantscope.md | (new code?) | GrantScope — new article |
| quandamooka-justice-strategy.md | (new code?) | Quandamooka justice work |
| place-based-policy-lab.md | (new code?) | Place-based policy lab |
| resoleution.md | ACT-RS? | Resoleution — possibly maps to ACT-RS DB code |
| act-public-voice.md | (new code?) | ACT Public Voice |

Several of these may map to the four DB-only codes (ACT-DLB, ACT-PB, ACT-QD, ACT-RS). A quick config PR linking them would immediately improve score coverage.

---

## Derived actions

### Config hygiene (small, high-ROI)
1. **Add `canonical_slug` fields** to all 40+ codes missing them. Unblocks Phase-1 synthesis automation.
2. **Remove `ACT-APO`, `ACT-AMT`** — self-described non-projects. Baseline recommendation, not yet actioned.
3. **Add `ACT-DLB`, `ACT-PB`, `ACT-QD`, `ACT-RS`** to config or confirm they are not real projects.
4. **Wire new wiki articles** (civicgraph, deadlylabs, etc.) to existing or new config codes.

### Wiki authoring (one real gap)
5. **Draft `wiki/projects/picc/picc-on-country-photo-studio.md`** — 78 code refs, 11 invoices, no article.

### Phase-1 automation
6. **`scripts/synthesize-project-truth-state.mjs`** — once canonical_slug gaps are closed, this synthesis can be scripted. The queries and scoring logic directly translate.

---

## Sources queried

| Source | Query / path | Rows | As-of |
|---|---|---|---|
| `config/project-codes.json` | v1.8.0 | 75 projects | 2026-05-21 |
| `wiki/projects/**` | filesystem walk | 90+ .md files | 2026-05-21 |
| `xero_invoices` | GROUP BY project_code | 35 distinct codes | 2026-05-21 |
| `xero_transactions` | GROUP BY project_code | 31 distinct codes | 2026-05-21 |
| `bank_statement_lines` | GROUP BY project_code | 8 distinct codes | 2026-05-21 |
| `projects` + `org_projects` | UNION on code | 79 codes (incl. 4 not in config) | 2026-05-21 |
| codebase grep | `ACT-[A-Z]+` over apps/ scripts/ config/ | 80+ distinct codes | 2026-05-21 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[entity-migration-truth-state-2026-05-08|Q3 entity migration — 2026-05-08 pass]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
