---
title: Project truth-state — 77 codes × 4 sources, cutover-week pass
summary: Third pass of the ACT Alignment Loop (Q2), 2026-06-25. No change in code count from 77. ACT-BV merged into ACT-FM on 2026-06-08. ACT-QD and ACT-RS appear in the DB but not yet in config. Wiki remains at 98 articles. ACT-PS wiki gap persists. Score distribution stable. Xero activity concentrated in Harvest and Goods pre-cutover.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-06-25
---

# Project truth-state — 2026-06-25

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Five days before the sole trader cutover. Same four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase DB, and codebase grep. Previous pass: [[project-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **77 codes in config (v1.8.0), no change since 2026-05-14.** The config has been stable at 77 codes since the May cleanup (74 original + ACT-GS, ACT-PB, ACT-DLB). No new project codes added to config in the past 6 weeks.

2. **ACT-BV (Black Cockatoo Valley) merged into ACT-FM (The Farm) on 2026-06-08.** The config description for ACT-FM now reads "incl. Black Cockatoo Valley regenerative conservation (ACT-BV merged into ACT-FM 2026-06-08 — same Witta land)". ACT-BV is retained in the config as a legacy slug alias but is no longer a separate operational unit.

3. **ACT-QD and ACT-RS appear in `projects`/`org_projects` table but have no config entry.** These codes are present in the DB (from a union query of `projects.act_project_code`). They are not in `config/project-codes.json` v1.8.0. Config gap: 2 undocumented codes with DB presence. Action: confirm whether these are new projects or admin artefacts, then add to config or delete from DB.

4. **Wiki articles stable at 98.** The 2026-05-14 baseline recorded 98 `.md` files in `wiki/projects/**`. Today's count is 98 — no new articles added in 6 weeks.

5. **ACT-PS (PICC On Country Photo Studio) wiki gap persists.** Carried from both prior passes. Now has 11 Xero invoices, 2 transactions, codebase presence, and a DB row — no dedicated wiki article. This is the one real authoring backlog item across all three passes.

6. **Xero activity concentrated in cutover-prep items.** Pre-cutover invoicing shows Harvest (ACT-HV) and Goods (ACT-GD) are the most active lines, consistent with Sonas Harvest setup invoices and ongoing Goods trading. The Xero invoice count for ACT-IN is now 974 (was 990 in May baseline on the invoice side; transactions show 1,517 for ACT-IN).

---

## Score distribution (estimated, as of 2026-06-25)

| Score | Count | Share | Change from May-14 baseline |
|---|---:|---:|---|
| **4/4** | ~33 | 43% | → stable (ACT-BV merged into ACT-FM; no net change) |
| **3/4** | ~11 | 14% | → stable |
| **2/4** | ~29 | 38% | ↑ +2 (ACT-QD and ACT-RS in DB but not config) |
| **1/4** | ~4 | 5% | → unchanged |
| **0/4** | 0 | 0% | → unchanged |
| **Total** | **77** | | Config unchanged from v1.8.0 |

_Note: ACT-BV merge reduces the "77" by one effective operational entity but not by one config entry (retained as alias)._

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No active or ideation project has fewer than 2 sources |
| Any project at 0/4 flagged | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the sole gap, same as May 14 |

---

## Key movements since 2026-05-14

### ACT-BV → ACT-FM merger (2026-06-08)

Black Cockatoo Valley was added as its own code (`ACT-BV`) and gained a Xero invoice + transactions by the 2026-05-14 pass. As of 2026-06-08, it is formally merged into The Farm (`ACT-FM`) — the Witta land is one entity. `ACT-BV` remains in config with `legacy_codes` status and `slug_aliases` under ACT-FM. The pre-merge Xero invoice for ACT-BV will be tracked via ACT-FM going forward.

### ACT-QD and ACT-RS — undocumented codes in DB

Two codes appear in the `projects`/`org_projects` table that have no entry in `config/project-codes.json`:
- `ACT-QD` — unknown name; config v1.8.0 does not include this code
- `ACT-RS` — unknown name; config v1.8.0 does not include this code

These may be new project initiations, test records, or data-entry artefacts. Action: confirm with Ben/Nic before adding to config or removing from DB.

### ACT-PS wiki gap — carried for third consecutive pass

| Signal | Count |
|---|---:|
| Xero invoices | 11 |
| Xero transactions | 2 |
| Codebase references | 62+ |
| DB row (projects table) | ✅ |
| Wiki article | **None** |

Adding `wiki/projects/picc/picc-on-country-photo-studio.md` remains the single highest-value authoring action in Q2 scope.

### Codes still missing Xero tracking (active, expected)

| Code | Name | Tier | Reason |
|------|------|------|---|
| ACT-CS | Civic Scope | satellite | Budget runs through ACT-IN |
| ACT-CM | CAMPFIRE | satellite | Brodie-led, billing route external |
| ACT-RT | Redtape | studio | Low cost base |
| ACT-JC | JusticeHub Centre of Excellence | ideation | Not yet operational |
| ACT-TR | Treacher | ideation | Not yet operational |
| ACT-GS | GrantScope | active | Early stage |

---

## Xero DB presence — top codes by volume (2026-06-25)

| Code | Invoices | Transactions | BSL |
|---|---:|---:|---:|
| ACT-IN | 974 | 1,517 | 1,043 |
| ACT-GD | 347 | 211 | 211 |
| ACT-HV | 139 | 187 | 121 |
| ACT-FM | 139 | 108 | 163 |
| ACT-UA | 97 | 57 | — |
| ACT-DO | 86 | 23 | — |
| ACT-JH | 37 | 25 | 21 |
| ACT-PI | 37 | 38 | 8 |
| ACT-CORE | 34 | 658 | — |
| ACT-MY | 20 | 16 | 46 |

---

## Config hygiene — still pending

| Code | Name | Recommendation |
|------|------|---|
| ACT-APO | Active Projects Overview | Remove — self-described "Notion page, not a project" |
| ACT-AMT | API Migration Test | Remove — test artefact |
| ACT-EFI | Economic Freedom Initiative | Remove — archived, no traces |
| ACT-GCC | Global Community Connections | Remove — archived, 2 code refs only |
| ACT-QD | Unknown | Add to config or delete from DB |
| ACT-RS | Unknown | Add to config or delete from DB |

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (77 codes, v1.8.0) | 2026-06-25 |
| `wiki/projects/**` | file count | 98 .md files, 2026-06-25 |
| `xero_invoices` | GROUP BY project_code | 2026-06-25 |
| `xero_transactions` | GROUP BY project_code | 2026-06-25 |
| `bank_statement_lines` | GROUP BY project_code | 2026-06-25 (data current to 2026-03-31) |
| `projects` + `org_projects` | UNION on code | 2026-06-25 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — 2026-05-14 pass]]
- [[index|ACT Wikipedia]]
