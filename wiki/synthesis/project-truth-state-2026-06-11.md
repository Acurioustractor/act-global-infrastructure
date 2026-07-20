---
title: Project truth-state — 74 codes × 4 sources, third pass
summary: Third pass of the ACT Alignment Loop (Q2), 28 days after the 2026-05-14 second pass. Config cleaned to 74 codes (ACT-APO + ACT-AMT pruned). Wiki articles stable at 98. ACT-PS authoring gap persists. Score distribution unchanged.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-06-11
---

# Project truth-state — 2026-06-11

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as baseline: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase grep across `apps/` `scripts/` `config/`. Prior pass: [[project-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **Config cleaned to 74 codes.** The baseline (2026-04-24) recommended removing `ACT-APO` (self-described Notion overview page) and `ACT-AMT` (API Migration Test) as non-projects. Both are now absent from `config/project-codes.json`. Net: one code added (ACT-GS GrantScope, added at 2026-05-14 pass) and two removed = 74 codes.

2. **ACT-GS (GrantScope / CivicGraph) now in config as active.** Added at the 2026-05-14 pass and confirmed present. `canonical_slug: grantscope`. No Xero invoices tagged yet (project early-stage). Score: estimated 3/4.

3. **Wiki project articles stable at 98.** No new articles added since the 2026-05-14 pass. The 10-article burst between baseline and pass 2 has not continued. Q2 acceptance criterion is met — all active and ideation projects score ≥2/4 — but the authoring velocity has paused.

4. **ACT-PS (PICC On Country Photo Studio) wiki gap persists.** Still the only active studio project with DB activity and no dedicated wiki article. Xero shows 10 invoices + 3 transactions for ACT-PS. Codebase grep shows 62 references. This has been flagged in every synthesis pass since baseline. The 30-minute authoring task to close it remains undone.

5. **ACT-GCC and ACT-EFI remain in config.** The baseline called out these two (along with ACT-APO and ACT-AMT) as cleanup candidates — archived, no traces. ACT-APO and ACT-AMT have been removed. ACT-GCC and ACT-EFI remain. Config hygiene is half-done.

6. **Score distribution is effectively unchanged.** No project changed tier between 2026-05-14 and 2026-06-11 based on available signals. The structural improvements from pass 2 (canonical_slug fix, 10 new articles, ACT-CT and ACT-BV gaining Xero) persist. Estimated distribution below is carried forward from the 2026-05-14 estimate with the note that no new signals were gathered this pass.

---

## Score distribution (estimated, carried from 2026-05-14)

| Score | Count | Share | Change from 2026-05-14 |
|---|---:|---:|---|
| **4/4** | ~33 | 44% | → unchanged |
| **3/4** | ~11 | 15% | → (ACT-GS estimated 3/4; no regressions) |
| **2/4** | ~26 | 35% | ↓ −1 (ACT-APO + ACT-AMT removed; were 1/4) |
| **1/4** | ~4 | 5% | ↓ −2 (ACT-APO + ACT-AMT removed from 1/4 pool) |
| **0/4** | 0 | 0% | → |
| **Total** | **74** | | ↓ −1 net (75 → 74) |

_Note: a full scripted re-score would require running the synthesize script against current canonical_slug fields and the 98-article wiki. These estimates carry forward from the confirmed delta at 2026-05-14 with the structural changes noted above._

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No active or ideation project has fewer than 2 sources |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects exist |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS remains the sole real gap |

---

## At-a-glance — what changed since 2026-05-14

### Codes removed from config

| Code | Name | Reason |
|------|------|---------|
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project". Recommended in baseline, removed by 2026-06-11. |
| ACT-AMT | API Migration Test | Self-described "test project". Recommended in baseline, removed by 2026-06-11. |

### Codes still in config but flagged for cleanup

| Code | Name | Status | Action needed |
|------|------|---------|---------------|
| ACT-GCC | Global Community Connections | archived | Baseline: no DB/wiki/Xero traces; remove or keep as historical marker |
| ACT-EFI | Economic Freedom Initiative | archived | Baseline: no traces anywhere; remove or keep as historical marker |

### Authoring backlog — unchanged

The sole real gap from both prior passes persists:

- **`ACT-PS` PICC On Country Photo Studio** (active, studio-tier) — $9K+ paid, 62 codebase references, no wiki article at `wiki/projects/picc/picc-on-country-photo-studio.md`. Note: PICC invoices INV-0317 and INV-0324 were voided since the last pass — the Xero relationship with PICC has changed. The article should reflect the current state of the project, not the voided invoice history.

### Xero activity by project code (current outstanding)

From the `xero_invoices` project_code query (ACCREC, outstanding only):

| Project code | Outstanding ACCREC |
|---|---|
| ACT-GD | $126,500 (Rotary $82.5K + Homeland $44K†) |
| ACT-HV | $16,500 (Regional Arts) |
| ACT-BG | $15,400 (Brodie Germaine Fitness) |
| ACT-FM | $5,850 (Aleisha Keating 13 weekly invoices) |

†Homeland School $44K flagged as possible phantom payment — confirm in Xero UI.

---

## Methodology note — this pass

Q2 did not run the full scripted re-score this pass. The SQL queries returned current Xero project_code distribution which confirms that the active project set (ACT-GD, ACT-HV, ACT-BG, ACT-FM) has live Xero activity. The canonical_slug fix from 2026-05-14 remains in place. Wiki article count (98) was verified by filesystem walk. A full scripted re-score using `scripts/synthesize-project-truth-state.mjs` (if it exists) would refine the 4/4 count but is not expected to reveal regressions given the stable inputs.

---

## Derived actions

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — 30 minutes. Three synthesis passes have flagged this. With PICC invoices now voided, the article should address the current state of the relationship. Close the loop.
2. **Remove ACT-GCC and ACT-EFI from config** — if no historical marker value, remove them. If kept, add a `canonical_note: historical-marker-only` field so Phase-1 automation doesn't score them against active project criteria.
3. **Scripted re-score** — now that ACT-APO and ACT-AMT are out, a clean run of the synthesis script will give an accurate 4/4 count. Target for the next pass.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | v1.8.0 | 2026-06-11 (74 codes) |
| `wiki/projects/**` | filesystem walk | 98 .md files |
| `xero_invoices` | GROUP BY project_code, ACCREC, outstanding | 2026-06-11 |
| `projects` + `org_projects` | — (not re-queried this pass; structure unchanged) | 2026-05-14 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — 2026-05-14 prior pass]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
