---
title: Project truth-state — 74 codes × 4 sources, who's real
summary: Second artefact of the ACT Alignment Loop (Q2). For each project code in config/project-codes.json, scores presence across wiki, DB activity, codebase references, and Xero tracking. Surfaces authoring backlogs and retirement candidates.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-04-24
---

# Project truth-state — 2026-04-24

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]]. Four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`, `project_storytellers`), and codebase grep across `apps/` `scripts/` `config/`.

## Headline findings

1. **Every active or ideation project scores ≥2/4.** Acceptance criterion met. No retirement candidates surfaced — every 1/4 entry is already archived and most are administrative artefacts (`ACT-APO` Overview, `ACT-AMT` Migration Test) rather than real projects.
2. **28 of 74 projects (38%) are fully aligned at 4/4** — including every ecosystem-tier project and most active studio/satellite entries. The core engine is coherent.
3. **The authoring backlog is small and specific.** Three active projects have DB activity but no dedicated wiki article: `ACT-IN` (internal ops — arguably fine), `ACT-PS` PICC On Country Photo Studio (real gap — $9K paid, 47 code refs, no article), and `ACT-SM` SMART (covered by `wiki/projects/smart-recovery/smart-recovery.md` but config lacks `canonical_slug`, so automated cross-ref misses it).
4. **Methodology caveat — 40+ codes in `project-codes.json` have no `canonical_slug`.** This is the real finding. The wiki has articles the scoring can't find because the config doesn't say which article covers which code. Fixing this is what enables Phase-1 automation of this synthesis.
5. **Nine projects have a wiki article but zero Xero tracking** — most are ideation or transferred (`ACT-TR` Treacher, `ACT-BV` BCV, `ACT-FO` Fishers) but four are active and pitchable (`ACT-CS` Civic Scope, `ACT-CM` CAMPFIRE, `ACT-CT` ConFit Pathways, `ACT-RT` Redtape). Their absence from Xero tracking means their budget/spend isn't traceable — flag for ACT-IN vs project budget hygiene.

## Score distribution

| Score | Count | Share | What it means |
|---|---:|---:|---|
| **4/4** | 28 | 38% | Wiki + DB + code + Xero — fully aligned |
| **3/4** | 16 | 22% | One source missing — usually Xero tracking or wiki |
| **2/4** | 26 | 35% | Two sources missing — almost all archived |
| **1/4** | 4 | 5% | Config-only ghosts (archived admin artefacts) |
| **0/4** | 0 | 0% | None |
| **Total** | **74** | | |

## Acceptance criteria — how this pass scores

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | 40/40 active+ideation projects score ≥2/4 |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects exist |
| DB activity but no wiki surfaces as authoring backlog | ✅ | See "Authoring backlog — active projects" below |

---

## At-a-glance — 74 projects by presence score

Legend: `Wiki` = wiki article found via `canonical_slug` match · `DB` = has row in `projects`/`org_projects`/`xero_*`/`bank_statement_lines`/`project_storytellers` · `CodeRefs` = count of `ACT-XX` mentions across `apps/`+`scripts/`+`config/` · `Xero` = inv:N / txn:N / bsl:N counts

### 4/4 — fully aligned (28)

| Code | Name | Status | Tier | CodeRefs | Xero |
|------|------|--------|------|---------:|------|
| ACT-JH | JusticeHub | active | ecosystem | 162 | inv:17 txn:4 bsl:21 |
| ACT-GD | Goods | active | ecosystem | 152 | inv:218 txn:85 bsl:202 |
| ACT-HV | The Harvest Witta | active | ecosystem | 120 | inv:68 txn:63 bsl:120 |
| ACT-EL | Empathy Ledger | active | ecosystem | 111 | inv:13 txn:3 bsl:1 |
| ACT-PI | PICC | active | studio | 93 | inv:13 txn:1 bsl:8 |
| ACT-FM | The Farm | active | ecosystem | 79 | inv:129 txn:66 bsl:163 |
| ACT-OO | Oonchiumpa | active | satellite | 44 | inv:2 txn:33 |
| ACT-MY | Mounty Yarns | active | studio | 43 | txn:1 bsl:46 |
| ACT-CORE | ACT Regenerative Studio | active | ecosystem | 40 | inv:9 txn:545 |
| ACT-DG | Diagrama | active | - | 38 | inv:2 |
| ACT-BG | BG Fit | active | satellite | 34 | inv:2 |
| ACT-CF | The Confessional | active | studio | 34 | inv:1 |
| ACT-UA | Uncle Allan Palm Island Art | active | studio | 30 | inv:129 txn:227 |
| ACT-GP | Gold Phone | active | studio | 27 | inv:2 txn:1 |
| ACT-JP | June's Patch | active | satellite | 27 | txn:6 |
| ACT-CA | Caring for those who care | active | studio | 26 | inv:20 txn:1 |
| ACT-CN | Contained | active | studio | 26 | inv:2 txn:1 |
| ACT-DO | Designing for Obsolescence | sunsetting | satellite | 26 | inv:63 txn:18 |
| ACT-MC | Cars and Microcontrollers | active | studio | 23 | txn:2 |
| ACT-RA | Regional Arts Fellowship | active | studio | 23 | txn:1 |
| ACT-FG | Feel Good Project | active | satellite | 22 | inv:2 txn:1 |
| ACT-MD | ACT Monthly Dinners | active | satellite | 22 | inv:8 txn:2 |
| ACT-DL | DadLab | active | satellite | 21 | inv:1 |
| ACT-BB | Barkly Backbone | ideation | satellite | 20 | inv:6 txn:1 |
| ACT-GL | Global Laundry Alliance | transferred | satellite | 19 | inv:2 txn:1 |
| ACT-CB | Marriage Celebrant | active | satellite | 18 | inv:2 txn:1 |
| ACT-CP | Community Capital | active | satellite | 14 | inv:6 txn:1 |
| ACT-CE | Custodian Economy | active | satellite | 11 | inv:7 txn:2 |

### 3/4 — one source missing (16)

| Code | Name | Status | Missing | Notes |
|------|------|--------|---------|-------|
| ACT-IN | ACT Infrastructure | active | wiki | Expected — internal ops, no narrative article |
| ACT-PS | PICC On Country Photo Studio | active | wiki | **Real gap** — $9K paid, 47 code refs, no dedicated article |
| ACT-SM | SMART | active | wiki (false neg) | Has `smart-recovery/smart-recovery.md`; config missing `canonical_slug` |
| ACT-BV | Black Cockatoo Valley | active | xero | Wiki article just shipped 2026-04-24; budget not yet tagged in Xero |
| ACT-CS | Civic Scope | active | xero | Budget runs through `ACT-IN`; no dedicated Xero tracking category |
| ACT-CM | CAMPFIRE | active | xero | Brodie-led, operational but no invoices tagged yet |
| ACT-CT | ConFit Pathways | active | xero | Joe Kwon; no invoices tagged |
| ACT-RT | Redtape | active | xero | Art installation; low cost base |
| ACT-JC | JusticeHub Centre of Excellence | ideation | xero | Not yet operational — expected |
| ACT-TR | Treacher | ideation | xero | Film concept — expected |
| ACT-FO | Fishers Oysters | transferred | xero | Transferred; historical |
| ACT-TN | TOMNET | archived | xero | Archived |
| ACT-BR | ACT Bali Retreat | archived | wiki | Event artefact, archived |
| ACT-WE | Westpac Summit 2025 | archived | wiki | Event artefact, archived |
| ACT-OS | Orange Sky EL | archived | wiki | Repo-only reference, archived |
| ACT-WJ | Wilya Janta | archived | wiki | Archived |

### 2/4 — archived with DB + code trace, no wiki, no live Xero (26)

All archived projects with historical code references + a `projects` table row. No action — this is the expected state for archived work.

Codes: `ACT-ER` `ACT-SS` `ACT-BM` `ACT-MR` `ACT-FP` `ACT-MM` `ACT-TW` `ACT-HS` `ACT-FA` `ACT-FN` `ACT-DD` `ACT-MN` `ACT-QF` `ACT-AI` `ACT-CC` `ACT-DH` `ACT-SE` `ACT-YC` `ACT-AS` `ACT-MU` `ACT-RP` `ACT-SH` `ACT-SX` `ACT-OE` `ACT-SF` `ACT-10`

### 1/4 — config ghosts (4)

| Code | Name | Notes |
|------|------|-------|
| ACT-GCC | Global Community Connections | Archived, 2 code refs only, no DB/wiki/xero |
| ACT-AMT | API Migration Test | Self-described "test project" — safe to remove from config |
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project" — remove from config |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces anywhere — remove from config |

---

## Authoring backlog — active projects missing wiki coverage

Only **one** real gap surfaces:

- **`ACT-PS` PICC On Country Photo Studio** (active, studio-tier) — $9K paid + 47 codebase references, no wiki article in `wiki/projects/picc/`. There's `picc/picc-photo-kiosk.md` for the adjacent Photo Kiosk / Server project (different concept). Adding `wiki/projects/picc/picc-on-country-photo-studio.md` would close this gap and bring all active studio projects to 4/4 wiki coverage.

Not-really-gaps (false negatives from missing `canonical_slug`):

- **`ACT-SM` SMART** — `wiki/projects/smart-recovery/smart-recovery.md` exists. Add `"canonical_slug": "smart-recovery"` to ACT-SM in `config/project-codes.json`.

Expected absences:

- **`ACT-IN` ACT Infrastructure** — internal operations; no narrative article warranted.

---

## Wiki articles but no Xero tracking — 9 projects

Active projects where the wiki has a claim but no money is tagged against the code:

| Code | Name | Tier | Likely reason |
|------|------|------|---------------|
| ACT-BV | Black Cockatoo Valley | satellite | Wiki just written today; Xero tagging pending |
| ACT-CS | Civic Scope | satellite | Runs through ACT-IN budget |
| ACT-CM | CAMPFIRE | satellite | Brodie-led, billing may route through his entity |
| ACT-CT | ConFit Pathways | satellite | Joe Kwon-led; billing may route externally |
| ACT-RT | Redtape | studio | Low-cost art installation |
| ACT-FO | Fishers Oysters | satellite | Transferred externally |
| ACT-TN | TOMNET | archived | Archived |
| ACT-TR | Treacher | studio (ideation) | Not yet operational |
| ACT-JC | JusticeHub Centre of Excellence | satellite (ideation) | Not yet operational |

**Open question:** for `CAMPFIRE` and `ConFit Pathways`, are Brodie's and Joe's project expenses flowing through ACT's books at all? If yes, they should be tagged against the project code. If no, the wiki should be explicit about the arrangement. Worth a 5-min check with Nic.

---

## Methodology — what was queried, what's a caveat

### Sources pulled
| Source | Shape | Rows |
|---|---|---:|
| `config/project-codes.json` | JSON | 74 projects |
| `wiki/projects/**` | filesystem walk, 2-level subdirs | 88 `.md` files |
| `xero_invoices.project_code` | GROUP BY | 31 codes |
| `xero_transactions.project_code` | GROUP BY | 30 codes |
| `bank_statement_lines.project_code` | GROUP BY | 8 codes |
| `projects.act_project_code` + `org_projects.code` | union | 75 codes |
| `project_storytellers` JOIN `projects` | GROUP BY | 8 codes |
| `grep -roh 'ACT-[A-Z]+' apps/ scripts/ config/` | count | 80 distinct codes |

### Caveats
1. **`canonical_slug` missing for 40+ codes** — this is the main source of false negatives in the wiki-match. The fix is a small config PR adding `canonical_slug` fields based on the wiki filename; the synthesis would then match cleanly.
2. **Codebase grep threshold `codeRefs ≥ 3`** — below this, the only references are in `project-codes.json` itself (2-3 per entry). Tuned to filter out "config-only" ghosts from real operational usage.
3. **No GHL-tag match per-code** — decided against because `ghl_contacts.tags` uses free-form slug tags (`goods`, `justicehub`, `harvest`) not codes. Matching these back to codes requires the `ghl_tags` array in each project's config, and only 5-6 projects have non-empty GHL-active tags to match. Deferred to Phase-1 automation.
4. **EL v2 `media_assets` / `storytellers` checked on shared-ACT instance** — these tables exist but most EL v2 activity happens on the separate EL v2 project (`yvnuayzslukamizrlhwb`). Cross-instance DB checks are deferred until a canonical project-code→EL-v2 map is built.
5. **Ecosystem project list not filtered** — `projects` table has 75 `act_project_code` entries. One (`ACT-IN`) is not tied to a real project but to internal ops; this is not a data quality issue, just noise.

---

## Derived actions

### Config hygiene (tiny, high-ROI)
1. **Add `canonical_slug` fields** to `project-codes.json` for the 40+ codes missing them. Unblocks Phase-1 automation of this synthesis.
2. **Remove `ACT-APO`, `ACT-AMT`** from `project-codes.json` — self-described non-projects.
3. **Decide on `ACT-EFI`, `ACT-GCC`** — archived + no traces; remove or keep as historical markers?

### Wiki authoring (one real gap)
4. **Draft `wiki/projects/picc/picc-on-country-photo-studio.md`** — active project with $9K paid, no article.

### Financial tracking hygiene
5. **Decide CAMPFIRE / ConFit Pathways Xero routing** with Nic — are their expenses flowing through ACT? If yes, tag them. If no, document the arrangement in wiki.

### Phase-1 automation readiness
6. **Turn this synthesis into `scripts/synthesize-project-truth-state.mjs`** once the config hygiene is done — the queries and scoring logic in this doc directly translate.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | v1.7.0 | 2026-04-13 (file) |
| `wiki/projects/**` | 88 .md files | 2026-04-24 |
| `xero_invoices` | GROUP BY project_code | 2026-04-24 |
| `xero_transactions` | GROUP BY project_code | 2026-04-24 |
| `bank_statement_lines` | GROUP BY project_code | 2026-04-24 |
| `projects` + `org_projects` | UNION on code | 2026-04-24 |
| `project_storytellers` | JOIN projects | 2026-04-24 |
| codebase grep | `ACT-[A-Z]+` over apps/ scripts/ config/ | 2026-04-24 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment synthesis — previous pass]]
- [[index|ACT Wikipedia]]
