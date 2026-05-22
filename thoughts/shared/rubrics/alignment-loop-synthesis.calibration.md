# Calibration: Alignment-loop-synthesis rubric v0.1

> Run: 2026-05-22T22:29:28.575Z
> Pass rate: 3/6
> Rubric: `thoughts/shared/rubrics/alignment-loop-synthesis.md`
> Grader: `scripts/grade-alignment-loop-synthesis.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Slug | Expected | Got | Score | Correct? |
|---------|------|----------|-----|-------|----------|
| bad-1-undercited-drift.md | funder-alignment | fail | fail | 58 | YES |
| bad-2-bare-aggregate.md | project-truth-state | fail | fail | 0 | YES |
| bad-3-vague-actions.md | funder-alignment | fail | fail | 76 | YES |
| good-1-funder-alignment.md | funder-alignment | pass | error | 0 | **NO** |
| good-2-project-truth-state.md | project-truth-state | pass | error | 0 | **NO** |
| good-3-entity-migration.md | entity-migration-truth-state | pass | fail | 76 | **NO** |

## Detail

### bad-1-undercited-drift.md — OK

**Verdict:** fail  ·  **Score:** 58  ·  **Expected:** fail

Hard failures (2):
  - **1.1:drift_claim_under_cited** `1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationship has progressed ma` (line 25): 1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationsh
  - **1.1:drift_claim_under_cited** `3. Three funders are missing from funders.json that should be added by next cycle.` (line 29): 3. Three funders are missing from funders.json that should be added by next cycl

Structural: fm=true sources_block=false findings=false drift_table=false
Judgment: no_dlog_contra=true actionable=true stages_match=true no_silent_inv=true

Advice:
  - 2.2: Add a named sources block after the H1 title (before ## Headline findings) explicitly listing the four queried datastores by name: xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/plans/**. The frontmatter sources_queried array does not satisfy the inline-block requirement.
  - 2.3: Each of the three headline findings must cite a specific row, count, or invoice ID. Finding 1 (Snow Foundation) needs a concrete row like 'Snow $132K AUTH'. Finding 2 (Centrecorp) needs a specific record or timestamp. Finding 3 must name the three missing funders by their key/ID rather than a generic count.
  - 2.4: The At-a-glance table must use explicit drift classifications from the canonical list (aligned/drift-alert/wiki-absent/db-absent/plan-absent/historical-only) or mapped emojis. The Snow Foundation row currently reads 'Wiki says warm but reality is much further along' — replace the description with a proper tag such as 'drift-alert' or '🟡'.

### bad-2-bare-aggregate.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

Hard failures (6):
  - **1.2:dollar_uncited_to_row** `$402K` (line 23): 1. ACT received $402K total from grant funders across 6 projects in FY26 to date
  - **1.2:dollar_uncited_to_row** `$114K` (line 25): 2. ACT-GD spend is $114K total across vendor and contractor categories.
  - **1.2:dollar_uncited_to_row** `$284K` (line 27): 3. ACT-IN spend reached $284K total, the largest single bucket.
  - **1.2:dollar_uncited_to_row** `$614K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers
  - **1.2:dollar_uncited_to_row** `$317K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers
  - **1.2:dollar_uncited_to_row** `$200K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers

Structural: fm=true sources_block=false findings=false drift_table=false
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - 2.2: Add a paragraph right after the title block naming the four datastores explicitly (xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/{drafts,plans}). Currently the sources_queried field only mentions xero and wiki/projects/** but doesn't name ghl or thoughts.
  - 2.3: All three findings use vague aggregate figures ($402K, $114K, $284K) with no row references, counts, or invoice IDs. Each finding must cite specific rows, e.g., 'Snow $132K AUTH, Centrecorp $84.7K DRAFT' or invoice IDs with counts.
  - 2.4: No reconciliation matrix table exists in this synthesis. Add a drift classification table where each row has an explicit status: aligned, drift-alert, wiki-absent, db-absent, plan-absent, or historical-only.
  - 3.2: The Open actions section is empty of actionable targets. Replace 'The next cycle will produce the per-project enumeration' with a specific target like 'run scripts/aggregate-projects.py output → wiki/projects/summary.md rows 1-6' or 'assign @person deadline 2026-06-01 to enumerate xero_invoices rows 1-47 into wiki/projects/*.json'.

### bad-3-vague-actions.md — OK

**Verdict:** fail  ·  **Score:** 76  ·  **Expected:** fail

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - 3.2 FAILED: Every 'Open actions' bullet is too vague to be actionable. 'Review with Ben' does not name a file, date, or agenda. 'Update funders.json' does not specify which rows or fields. 'Fix the wiki articles' does not name the articles or the fix needed. 'Sort out Minderoo' does not say what action or whom to involve. 'Get back to GHL leads soon' does not name the specific leads or set a deadline. 'Generally tidy up' is not a specific target. Rewrite each action to include either: (a) a specific file path and row/key, OR (b) a named person plus deadline, OR (c) a specific script invocation with arguments.

### good-1-funder-alignment.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

### good-2-project-truth-state.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

### good-3-entity-migration.md — MISMATCH

**Verdict:** fail  ·  **Score:** 76  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - 2.2 PASS: The four sources are explicitly named immediately after summary: 'thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md', 'Supabase (Xero invoices...)', 'thoughts/shared/drafts/**', and 'project_act_entity_structure.md (memory state)'.
  - 2.3 PASS: All five headline findings cite specific data — finding 1 cites invoice IDs and amounts (INV-0321, INV-0222, INV-0314, etc.) plus named counterparties; findings 2-5 cite specific DB references, counts (1,742 invoices), and artefact paths.
  - 2.4 PASS: The main reconciliation table (Section 4 - Outstanding receivables) uses explicit status labels (AUTHORISED, DRAFT) plus Action-needed columns per row. Other sections use color-coded statuses (✅🔴🟡⏳) that map to the acceptable classification set.
  - 3.2 FAIL: The 'Open questions' section (section 7) contains 7 questions that remain unresolved but are NOT converted into formal reconciliation targets. For example: Q1 'Are Director IDs already registered?' has no owner, path, or deadline assigned. Q6 'Lord Mayor's + Equity Trustees — active grant or planned-but-never-landed?' has no owner or action. Q7 'Subscription audit via scripts/reconciliation-report.mjs' names a script but does not specify invocation flags or expected output path. Convert each open question into a formal action row with owner + file-path-or-script-invocation + deadline.

## Tuning notes

- One or more mismatches. Inspect detail above. Either revise the fixture (real fixture problem) or the rubric (real rubric problem). Document any rubric change in Calibration history.
