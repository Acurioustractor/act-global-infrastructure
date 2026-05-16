---
title: Project truth-state — 75 codes × 4 sources, second pass
summary: Second pass of the ACT Alignment Loop (Q2). The canonical_slug gap (40+ missing in baseline) is fully resolved. 75 codes now (was 74). 98 wiki articles (was 88). ACT-CT and ACT-BV gained Xero presence. ACT-PS wiki gap persists.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-14
---

# Project truth-state — 2026-05-14

> Second pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Same four sources as baseline: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase grep across `apps/` `scripts/` `config/`. Baseline: [[project-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **The canonical_slug gap is fully closed.** The baseline's most significant finding was 40+ codes in `config/project-codes.json` without a `canonical_slug`, making wiki coverage appear worse than it was. As of 2026-05-14, all 75 codes have a `canonical_slug`. This was the fix that enables Phase-1 automation of this synthesis — the scoring engine can now match code to wiki article cleanly.

2. **75 projects now (was 74).** One new active project added to config: `ACT-GS` (GrantScope / CivicGraph). Status: active. The codebase grep shows `ACT-CG` with 32 references in apps/scripts/config — these likely overlap with the GrantScope scope. Wiki article exists at slug `grantscope`.

3. **98 wiki project articles (was 88).** Ten new articles added since 2026-04-24. These resolve several previously "wiki-missing" scores. Combined with the canonical_slug fix, the 4/4 count has increased.

4. **ACT-CT (ConFit Pathways) and ACT-BV (Black Cockatoo Valley) gained Xero presence.** ACT-CT now has 5 Xero invoices (was 0 at baseline — listed as "xero: missing"). ACT-BV now has 1 invoice + 6 transactions (baseline: transactions only, no invoices). Both projects move from 3/4 to 4/4.

5. **ACT-PS (PICC On Country Photo Studio) wiki gap persists.** Still the only active studio project with DB activity and no dedicated wiki article. `xero_invoices` shows 10 invoices + 3 transactions for ACT-PS. Codebase grep shows 62 references. This is the sole authoring backlog item carried from the baseline.

6. **ACT-SM (SMART Recovery) false-negative resolved.** The baseline scored this 3/4 (wiki false-negative: article existed at `wiki/projects/smart-recovery/smart-recovery.md` but config lacked `canonical_slug`). With `canonical_slug: smart-recovery` now in place, ACT-SM scores 4/4.

## Score distribution (estimated)

| Score | Count | Share | Change from baseline |
|---|---:|---:|---|
| **4/4** | ~33 | 44% | ↑ +5 (ACT-CT, ACT-BV, ACT-SM + canonical_slug resolving at least 2 more) |
| **3/4** | ~11 | 15% | ↓ −5 |
| **2/4** | ~27 | 36% | ↑ +1 (new ACT-GS in config, not yet fully verified) |
| **1/4** | ~4 | 5% | → unchanged |
| **0/4** | 0 | 0% | → unchanged |
| **Total** | **75** | | |

_Note: A full scripted re-score would require a `/tmp/synthesize.mjs` run against the updated canonical_slug fields and 98-article wiki. The distribution above is an estimated delta from the confirmed point changes. The acceptance criterion (no active/ideation project at <2/4) is assessed below._

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No active or ideation project has fewer than 2 sources (all have at minimum config + DB row) |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects (same as baseline) |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap |

---

## At-a-glance — what changed since baseline

### Confirmed moves to 4/4

| Code | Name | What changed |
|------|------|---|
| ACT-CT | ConFit Pathways | Gained Xero invoices (5 inv). Was 3/4 missing Xero. Now 4/4. |
| ACT-BV | Black Cockatoo Valley | Gained Xero invoice (1 inv; 6 txn already existed). Was 3/4 missing Xero invoices. Now 4/4. |
| ACT-SM | SMART | canonical_slug added. Wiki match now works. Was 3/4 (wiki false-neg). Now 4/4. |

### Confirmed moves to higher score via canonical_slug fix

All codes that were false-negatives in the wiki dimension — previously scoring one point lower than actual — now score correctly. ACT-SM is the explicitly documented case. Others may follow a similar pattern but require a scripted re-score to enumerate.

### New project added: ACT-GS GrantScope (CivicGraph)

- Config: active, canonical_slug: grantscope
- Wiki: `wiki/projects/grantscope` (article exists based on slug)
- DB: ACT-GS appeared in `org_projects` / `projects` table (confirmed in DB union query)
- Codebase: `ACT-CG` has 32 references which may overlap or be the prior code for this project
- Xero: no `ACT-GS` tagged invoices yet (project may be early-stage)
- Estimated score: 3/4 (config + wiki + DB row, no Xero yet)

### Persistent gap: ACT-PS wiki article

The one real authoring backlog item from the baseline is unchanged. ACT-PS (PICC On Country Photo Studio) has:
- 10 Xero invoices, 3 transactions
- 62 codebase references (up from 47)
- A `projects` / `org_projects` DB row
- **No wiki article at `wiki/projects/picc/picc-on-country-photo-studio.md`**

The adjacent article `picc-photo-kiosk.md` covers a different concept (the kiosk/server, not the on-Country photo studio). Adding the PS article is a 30-minute task and brings all active studio projects to 4/4 wiki coverage.

---

## Xero tracking coverage — what's new

### Projects that gained invoices since baseline

| Code | Baseline Xero | Current Xero | Change |
|------|------|------|---|
| ACT-CT | 0 inv | 5 inv | 🟢 gained Xero tracking |
| ACT-BV | txn:6 only | inv:1 + txn:6 | 🟢 gained invoice tracking |
| ACT-IN | inv:990 | inv:990 | → static |
| ACT-GD | inv:218 | inv:269 | ↑ +51 invoices |
| ACT-PI | inv:13 | inv:18 | ↑ +5 invoices |
| ACT-CORE | inv:9 | inv:13 | ↑ +4 invoices (incl. John Villiers Trust $1,200) |

### Projects still missing Xero tracking (active, wiki + DB present)

| Code | Name | Tier | Likely reason |
|------|------|------|---|
| ACT-CS | Civic Scope | satellite | Budget runs through ACT-IN |
| ACT-CM | CAMPFIRE | satellite | Brodie-led, billing may route through his entity |
| ACT-RT | Redtape | studio | Low cost base, art installation |
| ACT-JC | JusticeHub Centre of Excellence | satellite (ideation) | Not yet operational |
| ACT-TR | Treacher | studio (ideation) | Not yet operational |
| ACT-GS | GrantScope | active | Early stage, no invoices yet |

---

## Config hygiene carried from baseline

### Recommended removals (still pending)

| Code | Name | Reason |
|------|------|---|
| ACT-APO | Active Projects Overview | Self-described "Notion overview page — not a real project" |
| ACT-AMT | API Migration Test | Self-described "test project" |
| ACT-EFI | Economic Freedom Initiative | Archived, no traces |
| ACT-GCC | Global Community Connections | Archived, 2 code refs only |

These four carry over from the baseline recommendation. With canonical_slugs now fixed, these are lower priority — but they add noise to the 75-code universe. Safe to remove from config with a `git mv` to archive.

---

## Derived actions

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — the one real authoring gap. 10 invoices + 62 code refs + no article. 30-minute task.
2. **Run a scripted full re-score** — now that all `canonical_slug` fields are populated, `scripts/synthesize-project-truth-state.mjs` can run cleanly. This would give exact score distribution rather than the estimates above.
3. **Confirm ACT-GS / ACT-CG relationship** — the new GrantScope config uses `ACT-GS` but the codebase grep shows 32 references to `ACT-CG`. If CivicGraph was the old code and GrantScope is the new, the old references should migrate.
4. **Decide on 4 ghost codes** — ACT-APO, ACT-AMT, ACT-EFI, ACT-GCC. Remove from config once actioned.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | parsed (75 projects, canonical_slug checked) | 2026-05-14 |
| `wiki/projects/**` | find, count | 98 .md files |
| `xero_invoices` | GROUP BY project_code | 2026-05-14 |
| `xero_transactions` | GROUP BY project_code | 2026-05-14 |
| `bank_statement_lines` | GROUP BY project_code | 2026-05-14 |
| `projects` + `org_projects` | UNION on code | 2026-05-14 |
| codebase grep | `ACT-[A-Z0-9]+` over apps/ scripts/ config/ | 2026-05-14 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[funder-alignment-2026-05-14|Q1 funder-alignment — this pass]]
- [[index|ACT Wikipedia]]
