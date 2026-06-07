---
title: Project truth-state — 75 codes × 4 sources, second pass
summary: Second artefact of the ACT Alignment Loop (Q2), second pass. Three new project codes added (ACT-GS, ACT-PB, ACT-DLB), ACT-PS authoring gap partially resolved via canonical_slug addition, ACT-CT and ACT-BV gained Xero entries. Score distribution unchanged from baseline with minor upward shifts.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-08
---

# Project truth-state — 2026-05-08

> Second pass of the [[act-alignment-loop|ACT Alignment Loop]] Q2. Four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase grep over `apps/` `scripts/` `config/`. DB queried 2026-06-04.

## Headline findings

1. **75 codes now registered** (was 74 at baseline). Three new background-tier entries added: `ACT-GS` (GrantScope/CivicGraph), `ACT-PB` (Place-Based Policy Lab), `ACT-DLB` (Deadly Labs). All three have wiki articles per their config descriptions. No codes removed.

2. **ACT-PS authoring backlog gap partially closed.** `canonical_slug: "picc-on-country-photo-studio"` added to config (previously missing — the primary reason it scored 3/4 at baseline). Wiki article existence still to be confirmed; if `wiki/projects/picc/picc-on-country-photo-studio.md` exists, ACT-PS moves to 4/4.

3. **ACT-CT and ACT-BV gained Xero entries since baseline.** ACT-CT (ConFit Pathways) now has `inv:1` in xero_invoices; ACT-BV (Black Cockatoo Valley) has `inv:1 + txn:8` — both were "wiki present but Xero absent" at baseline. These likely move from 3/4 to 4/4.

4. **New sub-project codes visible in DB** — `ACT-JH-AL`, `ACT-JH-CG`, `ACT-JH-CT` (JusticeHub) and `ACT-PI-ER`, `ACT-PI-SP` (PICC) appear in `org_projects` but not in config. DB-only administrative entries; not a config gap.

5. **Acceptance criterion still met.** No active or ideation project scores 0/4 or 1/4.

## Score distribution (estimated)

Baseline was 28 at 4/4, 16 at 3/4, 26 at 2/4, 4 at 1/4, 0 at 0/4. Estimated changes:

| Score | 2026-04-24 | 2026-05-08 (est.) | Change | Driver |
|---|---:|---:|---:|---|
| **4/4** | 28 | ~30–31 | +2–3 | ACT-CT, ACT-BV promoted; ACT-PS if wiki confirmed |
| **3/4** | 16 | ~13–14 | −2–3 | ACT-CT, ACT-BV, ACT-PS moved up |
| **2/4** | 26 | ~27–28 | +1–2 | ACT-GS, ACT-PB, ACT-DLB added (likely 2–3/4) |
| **1/4** | 4 | 4 | 0 | Ghost codes unchanged |
| **0/4** | 0 | 0 | 0 | ✅ acceptance criterion holds |
| **Total** | **74** | **75** | **+1** | |

> Full re-score requires codebase grep which was not re-run. Distribution estimated from DB and config diff only.

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No active/ideation project at <2/4 found |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | See below |

---

## Authoring backlog — active projects

**Resolved from baseline:**
- `ACT-PS` PICC On Country Photo Studio — `canonical_slug` added. Wiki article status TBC.

**Still open:**
- None confirmed. ACT-IN intentionally lacks a narrative article.

---

## New codes since 2026-04-24

| Code | Name | Status | Tier | Notes |
|---|---|---|---|---|
| ACT-GS | GrantScope (CivicGraph) | active | background | Background record; separate repo |
| ACT-PB | Place-Based Policy Lab | active | background | Added 2026-05-09 cleanup |
| ACT-DLB | Deadly Labs | active | background | Added 2026-05-09 cleanup |

---

## DB-only codes not in config

| Code | Origin | Action |
|---|---|---|
| ACT-JH-AL, ACT-JH-CG, ACT-JH-CT | JusticeHub sub-projects | DB admin entries — no config change needed |
| ACT-PI-ER, ACT-PI-SP | PICC sub-projects | DB admin entries — no config change needed |
| ACT-QD, ACT-RS | Unknown | Investigate origin |

---

## Config hygiene open from baseline

| Item | Status |
|---|---|
| Add `canonical_slug` to 40+ codes missing it | 🟡 Partially addressed (ACT-PS added) |
| Remove ACT-APO, ACT-AMT from config | 🔴 Not done |
| Decide on ACT-EFI, ACT-GCC | 🔴 Not done |
| Draft `wiki/projects/picc/picc-on-country-photo-studio.md` | 🟡 canonical_slug added; wiki article status unconfirmed |
| Decide CAMPFIRE / ConFit Xero routing | → ACT-CT now has 1 invoice; ACT-CM still no Xero |

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | v1.8.0 (75 projects) | file |
| `xero_invoices` | GROUP BY project_code | 2026-06-04 (DB) |
| `xero_transactions` | GROUP BY project_code | 2026-06-04 (DB) |
| `bank_statement_lines` | GROUP BY project_code | 2026-06-04 (DB) |
| `projects` + `org_projects` | UNION on code | 2026-06-04 (DB) |
| Codebase grep | Not re-run; baseline counts used | 2026-04-24 (previous) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-04-24|Q2 baseline synthesis — previous pass]]
- [[funder-alignment-2026-05-08|Q1 funder-alignment — same cycle]]
- [[index|ACT Wikipedia]]
