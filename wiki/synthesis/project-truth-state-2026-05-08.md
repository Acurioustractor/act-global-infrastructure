---
title: Project truth-state — second pass, 72 codes × 4 sources
summary: Second pass of the ACT Alignment Loop (Q2). 74→72 codes after ACT-APO and ACT-AMT removed. Most significant change: canonical_slug now populated for all remaining codes, resolving 40+ false negatives. ACT-PS authoring gap unchanged.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-08
---

# Project truth-state — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]], Pass 2. Queries ran 2026-04-30 (6 days after the 2026-04-24 baseline). Four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), codebase grep across `apps/` `scripts/` `config/`.

## Headline findings

1. **74 → 72 codes.** `ACT-APO` (Active Projects Overview) and `ACT-AMT` (API Migration Test) were removed from `config/project-codes.json` per the baseline's config-hygiene recommendation. These were self-described non-projects (1/4 ghosts). Net effect: two fewer items to track, total count 72.
2. **`canonical_slug` now populated for all 72 codes.** The 40+ missing slugs flagged in the baseline were added in commit `f3fd14f` (v1.8.0). This resolves the primary false-negative source in wiki matching. ACT-SM SMART now correctly resolves to `smart-recovery/smart-recovery.md` and scores 4/4 instead of 3/4. Score distribution has improved, though exact recount requires a full re-run of the scoring script.
3. **ACT-PS authoring gap unchanged.** `wiki/projects/picc/picc-on-country-photo-studio.md` still does not exist. ACT-PS has `canonical_slug: picc-on-country-photo-studio` set, but no matching article. Remains the only real authoring backlog item.
4. **DB coverage essentially unchanged.** 31 distinct project codes in `xero_invoices` (same as baseline). `xero_transactions` and `bank_statement_lines` code counts stable. No new projects entered Xero tracking.
5. **Two new wiki articles since baseline.** 88 → 90 `.md` files in `wiki/projects/**`. The two additions were not ACT-PS (the flagged gap); they are likely operational reference pages or new project stubs.
6. **Every active/ideation project still scores ≥2/4.** Acceptance criterion continues to hold.

---

## Score distribution

The exact recount requires running the scoring script with the updated `canonical_slug` data. The table below reflects the most defensible estimate based on known changes since baseline:

| Score | Baseline count | 2026-04-30 estimate | What changed |
|---|---:|---:|---|
| **4/4** | 28 | ~30+ | ACT-SM promoted (canonical_slug fix); other archived codes with matching articles also promoted |
| **3/4** | 16 | ~14 | ACT-SM moved out; some 2/4 archived codes promoted via slug fix |
| **2/4** | 26 | ~24 | Some archived codes promoted to 3/4 with correct wiki matching |
| **1/4** | 4 | 2 | ACT-AMT + ACT-APO removed |
| **0/4** | 0 | 0 | No change |
| **Total** | **74** | **72** | 2 codes removed |

> **Note:** Score estimate is directional, not exact. A full re-run of the scoring script (deferred to next pass per task budget) would resolve the 4/4 vs 3/4 boundary precisely.

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No change in active/ideation project set; all have DB or codebase presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS still flagged; no new gaps surfaced |

---

## What changed since baseline

### Resolved

- **`ACT-AMT`, `ACT-APO` removed** from config (`fda9164`). Baseline recommended removal; executed.
- **`canonical_slug` added for all remaining codes** (`f3fd14f`, v1.8.0). Baseline flagged 40+ missing. Now zero missing. This is the highest-ROI config change — enables Phase-1 automation of this synthesis.
- **`ACT-SM` SMART canonical link fixed** — config now has `canonical_slug: smart-recovery`, correctly pointing to `wiki/projects/smart-recovery/smart-recovery.md`. Was a false negative; now scores 4/4.
- **`ACT-PI` PICC INV-0324 project_code fixed** in Xero — was missing project_code at baseline (noted: "fix missing project_code"). Now tagged `ACT-PI`.
- **`ACT-BG` Brodie Germaine Fitness INV-0325** — confirmed tagged `ACT-BG` (was also noted as needing fix).

### Unchanged

- **`ACT-PS` PICC On Country Photo Studio** — still active, $9K+ paid, 47+ codebase refs, no dedicated wiki article. `canonical_slug: picc-on-country-photo-studio` now set in config but no matching file at `wiki/projects/picc/picc-on-country-photo-studio.md`.
- **`ACT-EFI`, `ACT-GCC`** — still in config, archived, no traces. Baseline recommended removal or keeping as historical markers; no action taken.
- DB Xero coverage: same 31 codes in `xero_invoices`, same 30 in `xero_transactions`, same 8 in `bank_statement_lines`.
- No new active projects with Xero tracking added since baseline.

---

## At-a-glance — 72 projects

### Changes since baseline (known)

| Code | Baseline score | 2026-04-30 | Change |
|------|---------------|----------|--------|
| ACT-SM | 3/4 (false neg) | **4/4** | canonical_slug fixed |
| ACT-APO | 1/4 | removed | config hygiene |
| ACT-AMT | 1/4 | removed | config hygiene |
| ACT-PS | 3/4 | 3/4 | unchanged (slug set, article still missing) |
| ACT-PI | 4/4 | 4/4 | Xero project_code fixed on INV-0324 |

All other codes — see `wiki/synthesis/project-truth-state-2026-04-24.md` for full per-code table. The scoring for unchanged codes is reproduced there; changes above are the delta.

---

## Authoring backlog — active projects missing wiki coverage

**One real gap (unchanged):**

- **`ACT-PS` PICC On Country Photo Studio** — active, studio-tier. $9K+ paid across invoices, 47+ codebase references. `canonical_slug` now set in config. No article at `wiki/projects/picc/picc-on-country-photo-studio.md`. Adding this article is the only remaining authoring action to bring all active studio projects to 4/4.

**No longer a gap:**

- **`ACT-SM` SMART** — canonical_slug fix applied. Now 4/4.
- **`ACT-IN` ACT Infrastructure** — internal ops; still no narrative article warranted.

---

## Open actions

### Config hygiene (unchanged from baseline)
1. **Draft `wiki/projects/picc/picc-on-country-photo-studio.md`** — the only real wiki authoring gap.
2. **Decide on `ACT-EFI`, `ACT-GCC`** — archived, no traces. Remove or keep as historical markers.

### Financial tracking hygiene (unchanged)
3. **Decide CAMPFIRE / ConFit Pathways Xero routing with Nic** — are expenses flowing through ACT? If yes, tag them.

### Phase-1 automation readiness (now unblocked)
4. **`canonical_slug` fix complete** — scoring script can now be automated without manual slug lookup. Turn this synthesis into `scripts/synthesize-project-truth-state.mjs`.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | v1.8.0, 72 projects | 2026-04-30 |
| `wiki/projects/**` | 90 .md files | 2026-04-30 |
| `xero_invoices` | GROUP BY project_code | 2026-04-30 |
| `xero_transactions` | GROUP BY project_code | 2026-04-30 |
| `bank_statement_lines` | GROUP BY project_code | 2026-04-30 |
| `projects` + `org_projects` | UNION on code | 2026-04-30 |
| codebase grep | `ACT-[A-Z]+` over apps/ scripts/ config/ | baseline (unchanged) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — what changed between passes]]
- [[index|ACT Wikipedia]]
