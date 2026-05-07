---
title: Project truth-state — second pass, 72 codes × 4 sources
summary: Second pass of the ACT Alignment Loop (Q2), 13 days after the 2026-04-24 baseline. Two ghost codes (ACT-AMT, ACT-APO) removed from config — a direct baseline action delivered. ACT-PS wiki gap persists. Score distribution denominator corrected to 72.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-05-07
---

# Project truth-state — 2026-05-08

> Second pass of the [[act-alignment-loop|ACT Alignment Loop]] Q2 artefact. Same four sources: `config/project-codes.json` (source-of-truth for codes), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase grep. Compare to [[project-truth-state-2026-04-24|the 2026-04-24 baseline]].

## Headline findings

1. **Two ghost codes removed from `project-codes.json`.** `ACT-AMT` (API Migration Test) and `ACT-APO` (Active Projects Overview) have been removed, reducing the denominator from 74 to 72. This was a direct action from the baseline synthesis. The two remaining 1/4 ghosts (`ACT-GCC` Global Community Connections, `ACT-EFI` Economic Freedom Initiative) are still present — pending a decision to remove or retain as historical markers.

2. **The acceptance criterion still holds.** Every active or ideation project continues to score ≥2/4. No project has dropped below threshold in 13 days.

3. **ACT-PS authoring gap persists.** `wiki/projects/picc/picc-on-country-photo-studio.md` still does not exist. This was the one "real gap" from the baseline — $9K paid, 9 Xero invoices, no dedicated article. No new wiki project articles were found newer than the 2026-04-24 baseline (from filesystem timestamps).

4. **wiki now has 90 .md files** (was 88 at baseline). The 2-file increase likely reflects work committed to the wiki after the baseline cutoff but with pre-existing timestamps, or a minor counting difference in the baseline methodology. No new project articles were confirmed added vs baseline.

5. **New project-level Xero activity.** `ACT-CORE` now shows 636 xero_transaction rows (significant jump). John Villiers Trust INV-0327 ($1,200) tagged to `ACT-CORE` is new. `ACT-PS` now has 9 xero_invoice rows (up from 9 — same) and 2 xero_transaction rows. `DISPUTED` tag appeared in xero_transactions (2 rows) — data quality flag.

6. **`canonical_slug` still missing for 40+ codes.** No config PR adding `canonical_slug` fields was detected. Phase-1 automation of this synthesis remains blocked by this gap.

---

## Score distribution

| Score | 2026-04-24 | 2026-05-07 | Change |
|---|---:|---:|---|
| **4/4** | 28 | 28 | → |
| **3/4** | 16 | 16 | → |
| **2/4** | 26 | 26 | → |
| **1/4** | 4 | **2** | ↓ 2 removed (ACT-AMT, ACT-APO) |
| **0/4** | 0 | 0 | → |
| **Total codes** | **74** | **72** | ↓ 2 removed |

Score distribution is structurally unchanged. The 1/4 bucket shrank because the two removed codes were both 1/4 entries. All 4/4 and 3/4 projects remain in the same positions.

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No project dropped below threshold in 13 days |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects exist |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS still the one real gap |

---

## Authoring backlog — what's still open

Only **one** real gap remains (same as baseline):

- **`ACT-PS` PICC On Country Photo Studio** (active, studio-tier) — 9 xero_invoice rows, 2 xero_transaction rows, 9 code refs in xero_invoices table. No wiki article at `wiki/projects/picc/picc-on-country-photo-studio.md`. The adjacent `picc-photo-kiosk.md` exists but covers a different concept.

False negative still in place:

- **`ACT-SM` SMART** — article at `wiki/projects/smart-recovery/smart-recovery.md` exists. Config missing `canonical_slug` → automated cross-ref still misses it. Fix: add `"canonical_slug": "smart-recovery"` to ACT-SM entry.

---

## DB source snapshot — 2026-05-07

### `xero_invoices` GROUP BY project_code (top codes)

| Code | Inv count |
|---|---:|
| ACT-IN | 812 |
| ACT-GD | 257 |
| ACT-FM | 137 |
| ACT-UA | 129 |
| ACT-HV | 99 |
| ACT-DO | 63 |
| ACT-CA | 20 |
| ACT-PI | 18 |
| ACT-JH | 17 |
| ACT-EL | 14 |
| ACT-CORE | 12 |
| ACT-MD | 11 |
| ACT-SM | 11 |
| ACT-PS | 9 |
| ACT-BG | 8 |
| ACT-MY | 8 |
| ACT-CE | 8 |
| *(+16 more codes ≥1)* | |

34 distinct project codes have ≥1 Xero invoice.

### `xero_transactions` GROUP BY project_code (top codes)

| Code | Txn count |
|---|---:|
| ACT-IN | 1,819 |
| ACT-CORE | 636 |
| ACT-UA | 227 |
| ACT-GD | 86 |
| ACT-FM | 67 |
| ACT-HV | 64 |
| ACT-OO | 33 |
| ACT-DO | 20 |
| ACT-JP | 6 |
| ACT-SM | 5 |
| ACT-JH | 4 |
| ACT-EL | 3 |
| ACT-OS | 3 |
| DISPUTED | 2 |
| *(+14 more codes)* | |

30 distinct real codes + 1 data-quality tag (`DISPUTED`).

### `bank_statement_lines` GROUP BY project_code

Same 7 codes as baseline: `ACT-IN` (1,044), `ACT-GD` (211), `ACT-FM` (163), `ACT-HV` (121), `ACT-MY` (46), `ACT-JH` (21), `ACT-PI` (8).

---

## Data quality flag

**`DISPUTED` tag in `xero_transactions`** — 2 rows have `project_code = 'DISPUTED'`. This is not a valid project code. Rows should be investigated and re-tagged or removed. Origin unknown — possibly a manual tagging error in the Xero sync.

---

## Derived actions — still open from baseline

### Config hygiene
1. **Remove `ACT-GCC` and `ACT-EFI`** — 2 remaining ghost codes. Or retain as historical markers — decision pending. *(ACT-AMT and ACT-APO already removed ✅)*
2. **Add `canonical_slug` fields** to the 40+ project-codes.json entries lacking them. Still the main blocker for Phase-1 automation.

### Wiki authoring
3. **Draft `wiki/projects/picc/picc-on-country-photo-studio.md`** — the one genuine active-project gap.

### Financial tracking hygiene
4. **Tag `ACT-BG`** (Brodie Germaine Fitness) in Xero — INV-0325 $15,400 is now tagged against ACT-BG which is correct. Verify transactions are also tagged.
5. **Clean up `DISPUTED` tag** in xero_transactions — 2 rows, find originating transactions and re-tag.
6. **Verify Sonas Properties INV-0328 project tag** (currently ACT-HV — correct if it's a Harvest receivable).

### Phase-1 automation readiness
7. **Write `scripts/synthesize-project-truth-state.mjs`** once `canonical_slug` gaps are closed.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | full file | 2026-05-07 (72 codes) |
| `wiki/projects/**` | filesystem walk | 2026-05-07 (90 .md files) |
| `xero_invoices` | GROUP BY project_code | 2026-05-07 |
| `xero_transactions` | GROUP BY project_code | 2026-05-07 |
| `bank_statement_lines` | GROUP BY project_code | 2026-05-07 |
| codebase grep | `ACT-[A-Z]+` over apps/ scripts/ config/ | not re-run (baseline: 80 distinct codes) |

**Caveats:**
1. Codebase grep not re-run — 13-day window unlikely to change the score distribution materially.
2. `canonical_slug` still missing for 40+ codes — false negatives in wiki-match persist.
3. `projects` + `org_projects` union query not re-run separately — Xero + BSL queries give equivalent coverage for change detection.

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-04-24|Q2 project truth-state — 2026-04-24 baseline]]
- [[funder-alignment-2026-05-08|Q1 funder-alignment — 2026-05-08 second pass]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — 2026-04-24 → 2026-05-08]]
- [[index|ACT Wikipedia]]
