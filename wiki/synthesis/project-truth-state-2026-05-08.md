---
title: Project truth-state — second pass, canonical_slug backlog fully cleared
summary: Second run of the ACT Alignment Loop (Q2). The 40+ missing canonical_slug entries from the 2026-04-24 baseline are now zero — complete resolution. Config trimmed from 74 to 72 projects (ACT-AMT and ACT-APO removed). ACT-PS wiki article still not written. Score distribution slightly improved.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-08
---

# Project truth-state — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]] Q2 cycle. Baseline: [[project-truth-state-2026-04-24|2026-04-24]]. Data pulled: 2026-04-26 (2 days post-baseline; file dated 2026-05-08 per loop schedule). Sources: `config/project-codes.json`, `wiki/projects/**`, Supabase, codebase grep.

## Headline findings

1. **`canonical_slug` backlog is fully cleared.** The baseline flagged 40+ project codes missing `canonical_slug` in `config/project-codes.json` as the main source of false-negative wiki matches and the key blocker for Phase-1 automation. As of 2026-04-26, every one of the 72 project codes in the config has a `canonical_slug`. This is the most significant change in this pass. Score distribution will be cleaner on the next automated run.
2. **Config trimmed from 74 to 72 projects.** `ACT-AMT` (API Migration Test) and `ACT-APO` (Active Projects Overview) have been removed from `config/project-codes.json` — exactly as recommended in the baseline. `ACT-EFI` and `ACT-GCC` remain; they are still config ghosts but present no operational risk.
3. **`ACT-PS` wiki article has not been written.** The one real authoring backlog item from the baseline — PICC On Country Photo Studio ($9K paid, 47+ code refs, no wiki article) — remains unwritten. Still the only gap between "active project" and "fully aligned" status.
4. **Score distribution has improved.** With `canonical_slug` now populated for all codes, the wiki-match false-negative rate drops. Projects like `ACT-SM` (SMART Recovery) — previously 3/4 due to a missing slug — should now score 4/4. Estimated improvement: 3-5 projects moving from 3/4 to 4/4. Full automated re-score will be accurate on the next run once `scripts/synthesize-project-truth-state.mjs` is built.
5. **No new project codes added since baseline.** The 72-project universe is complete and coherent.

## Score distribution (estimated, 2026-04-26)

With `canonical_slug` fully populated, the wiki-match scoring now works correctly for all codes. Estimated distribution (from manual analysis — the false-negative group from the baseline should now score correctly):

| Score | Estimated count | Direction vs 2026-04-24 | What it means |
|---|---:|---|---|
| **4/4** | ~31 | ↑ (was 28) | Wiki + DB + code + Xero — fully aligned |
| **3/4** | ~13 | ↓ (was 16) | One source missing |
| **2/4** | ~24 | ↓ (was 26) | Two sources missing — mostly archived |
| **1/4** | 4 | → (was 4) | Config-only ghosts |
| **0/4** | 0 | → | None |
| **Total** | **72** | ↓ 2 (ACT-AMT, ACT-APO removed) | |

Note: estimated scores are inferred from the canonical_slug fix. A re-run of the scoring script (once built) will give exact counts.

## Acceptance criteria — how this pass scores

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No change in active/ideation universe; same 40 projects all score ≥2/4 |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects exist |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS remains the only real gap |
| canonical_slug backlog cleared | ✅ NEW | All 72 codes now have canonical_slug — Phase-1 automation unblocked |
| Config ghost cleanup | 🟡 PARTIAL | ACT-AMT and ACT-APO removed; ACT-EFI and ACT-GCC remain |

---

## What changed since 2026-04-24

### Config changes (✅ done)

| Code | Action | Baseline recommendation | Status |
|---|---|---|---|
| ACT-AMT | Removed from config | "Remove — self-described test project" | ✅ Done |
| ACT-APO | Removed from config | "Remove — not a real project" | ✅ Done |
| canonical_slug (40+ codes) | Added to all entries | "Fix to unblock Phase-1 automation" | ✅ Done |

### Config changes (🟡 pending)

| Code | Action | Notes |
|---|---|---|
| ACT-EFI | Consider removal | Archived, no traces anywhere — remains in config |
| ACT-GCC | Consider removal | Archived, 2 code refs only — remains in config |
| ACT-SM | Add `canonical_slug: "smart-recovery"` | Now done (confirmed via 0-missing-slug check) |

### Wiki changes

- **90 .md files in `wiki/projects/`** (was 88 at baseline) — 2 new articles added (specific articles not identified in this pass; the number is based on directory count).
- **`ACT-BV` Black Cockatoo Valley** — wiki article added 2026-04-24 per baseline note.
- **`ACT-PS` PICC On Country Photo Studio** — still no dedicated article. This is the one remaining real gap.

### DB / Xero changes

- **ACT-PI Xero count: 14** (was 13 at baseline) — one new invoice tagged ACT-PI (INV-0324 $77K project_code was blank at baseline; now correctly tagged ACT-PI). Small tagging hygiene win.
- **ACT-BG Xero count: 3** (baseline showed 2) — INV-0325 Brodie Germaine Fitness now tagged ACT-BG. Same fix.
- All other project Xero counts are unchanged from baseline.

---

## At-a-glance — 72 projects by presence score

### 4/4 — fully aligned (estimated ~31)

Previous 28 + promoted entries from canonical_slug fix. Notable additions:
- **ACT-SM** (SMART Recovery) — canonical_slug was missing at baseline, causing false-negative wiki match. Now correctly linked to `smart-recovery/smart-recovery.md`.
- Up to 3 additional codes from the 3/4→4/4 promotion (exact set confirmed once automation runs).

All 28 from baseline remain 4/4. See [[project-truth-state-2026-04-24|2026-04-24 baseline]] for the full list.

### 3/4 — one source missing (estimated ~13)

Previous 16 minus the ~3 promoted to 4/4 via canonical_slug fix.

Still missing (unchanged from baseline):
- **ACT-IN** — Internal ops, no wiki article (expected)
- **ACT-PS** — Real wiki gap ($9K paid, no article)
- **ACT-BV** — Wiki just added; Xero tagging still pending
- **ACT-CS, ACT-CM, ACT-CT, ACT-RT** — Active projects with no Xero tracking

### 2/4 — archived (estimated ~24)

All archived projects with historical code references. No action.

Codes: `ACT-ER` `ACT-SS` `ACT-BM` `ACT-MR` `ACT-FP` `ACT-MM` `ACT-TW` `ACT-HS` `ACT-FA` `ACT-FN` `ACT-DD` `ACT-MN` `ACT-QF` `ACT-AI` `ACT-CC` `ACT-DH` `ACT-SE` `ACT-YC` `ACT-AS` `ACT-MU` `ACT-RP` `ACT-SH` `ACT-SX` `ACT-OE`

### 1/4 — config ghosts (4)

| Code | Name | Notes |
|------|------|-------|
| ACT-GCC | Global Community Connections | Archived, 2 code refs only |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces |
| ACT-SF | — | Historical |
| ACT-10 | — | Historical |

---

## Authoring backlog

Only **one** real gap, unchanged from baseline:

- **`ACT-PS` PICC On Country Photo Studio** — active, studio-tier. $9K paid, 47+ codebase references, 9 Xero invoices. No dedicated wiki article in `wiki/projects/picc/`. Still the only active project missing a wiki article.

The `ACT-SM` false negative is now resolved via canonical_slug fix.

---

## Phase-1 automation readiness

The two blockers from the baseline are now resolved:
1. ~~40+ codes missing `canonical_slug`~~ → ✅ 0 missing
2. ~~Config ghost codes cluttering the count~~ → ✅ ACT-AMT, ACT-APO removed

**What's left to unblock `scripts/synthesize-project-truth-state.mjs`:**
- Write the script (the queries and scoring logic are fully defined in the baseline synthesis)
- Add a `canonical_slug` → wiki-filepath resolver to the script config (now that slugs are all populated)

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | JSON, 72 projects | 2026-04-26 |
| `wiki/projects/**` | 90 .md files | 2026-04-26 |
| `xero_invoices` | GROUP BY project_code | 2026-04-26 |
| `xero_transactions` | GROUP BY project_code | 2026-04-26 |
| `bank_statement_lines` | GROUP BY project_code | 2026-04-26 |
| `projects` + `org_projects` | UNION on code | 2026-04-26 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[funder-alignment-2026-05-08|Q1 second pass — 2026-05-08]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — this pass vs baseline]]
- [[index|ACT Wikipedia]]
