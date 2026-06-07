# Calibration: Alignment-loop-synthesis rubric v0.1

> Run: 2026-05-22T22:56:32.676Z
> Pass rate: 4/6
> Rubric: `thoughts/shared/rubrics/alignment-loop-synthesis.md`
> Grader: `scripts/grade-alignment-loop-synthesis.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Slug | Expected | Got | Score | Correct? |
|---------|------|----------|-----|-------|----------|
| bad-1-undercited-drift.md | funder-alignment | fail | fail | 34 | YES |
| bad-2-bare-aggregate.md | project-truth-state | fail | fail | 0 | YES |
| bad-3-vague-actions.md | funder-alignment | fail | fail | 58 | YES |
| good-1-funder-alignment.md | funder-alignment | pass | fail | 76 | **NO** |
| good-2-project-truth-state.md | project-truth-state | pass | pass | 100 | YES |
| good-3-entity-migration.md | entity-migration-truth-state | pass | error | 0 | **NO** |

## Detail

### bad-1-undercited-drift.md — OK

**Verdict:** fail  ·  **Score:** 34  ·  **Expected:** fail

Hard failures (2):
  - **1.1:drift_claim_under_cited** `1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationship has progressed ma` (line 25): 1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationsh
  - **1.1:drift_claim_under_cited** `3. Three funders are missing from funders.json that should be added by next cycle.` (line 29): 3. Three funders are missing from funders.json that should be added by next cycl

Structural: fm=true sources_block=false findings=false drift_table=false
Judgment: no_dlog_contra=true actionable=false stages_match=false no_silent_inv=false

Advice:
  - 2.2: Add a sources block after the title (before Headline Findings) explicitly naming all four datastores: 'Sourced from xero_invoices, ghl_contacts, wiki/narrative/funders.json, and thoughts/shared/plans/**'
  - 2.3 Finding 1: Cite a specific row or invoice from Xero (e.g., '$132K AUTH 2026-03-15, invoice #XINV-4421') rather than saying 'materially progressed'; Finding 2: Reference the specific GHL contact ID or last sync timestamp; Finding 3: Name the three missing funders by their key in funders.json
  - 2.4: The 'Drift' table cells must contain explicit classification labels (aligned/drift-alert/wiki-absent/etc.) — not narrative descriptions. Add a classification column header and populate each cell accordingly
  - 3.2: 'Open actions' currently contains a non-action placeholder. Replace with at least one specific action: e.g., 'Run scripts/sync_funders.py --dry-run to identify missing keys in wiki/narrative/funders.json' or 'Assign @Name to update row [key] by 2026-05-22'
  - 3.3: Finding 1 asserts Snow Foundation 'reality is much further along' but does not cite the canonical funders.json row to verify or reconcile. Add explicit reconciliation language: e.g., 'funders.json row 3 says stage:warm; Xero shows $132K AUTH — reconciling as stage:committed per decision DEC-2025-014'
  - 3.4: Finding 1 silently reclassifies Snow Foundation from 'warm' (funders.json) to implied 'active/committed' without an explicit reconciliation statement. Add: 'Overriding funders.json classification per reconciled evidence from xero_invoices'

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
  - 2.2 [sources_block_present]: The body does not contain a dedicated paragraph or section naming the four datastores by name. Add a section like '## Sources' after the title that explicitly lists all four (xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/{drafts,plans}) and what each contributed to this synthesis.
  - 2.3 [every_finding_cites_row]: All three headline findings cite only aggregate totals with no row reference, count, or invoice ID. Rewrite finding #1 to cite a specific invoice ID or row count (e.g., 'grant funders across 6 projects per xero_invoices row IDs: INV-1234, INV-1235...'), finding #2 to cite the ACT-GD spending rows, and finding #3 to cite the ACT-IN rows.
  - 2.4 [drift_table_classifies_each_row]: There is no reconciliation matrix table present in the synthesis. Add a table with at least columns for funder/entity name, Xero amount, wiki amount, and drift classification (aligned, drift-alert, wiki-absent, db-absent, plan-absent, historical-only) with a classification assigned to every row.
  - 3.2 [reconciliation_targets_are_actionable]: The 'Open actions' section contains only vague directional language ('next cycle will produce per-project enumeration'). Replace with at least one actionable target that names a specific file path + section to update, or a specific person + deadline, or a specific script invocation (e.g., 'Run scripts/reconcile_projects.py and write results to wiki/projects/2026-05-reconciliation.md by 2026-06-01').

### bad-3-vague-actions.md — OK

**Verdict:** fail  ·  **Score:** 58  ·  **Expected:** fail

Hard failures: none.

Structural: fm=true sources_block=false findings=true drift_table=false
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - 2.2: sources_block_present: Add a paragraph or section immediately after the H1 title (before 'Headline findings') that names all four datastores by their canonical names: xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/plans/**. The frontmatter sources_queried does not count as the body-level block required.
  - 2.4: drift_table_classifies_each_row: Snow Foundation's drift cell says 'sources agree' which is not an explicit classification from the allowed set (aligned, drift-alert, wiki-absent, db-absent, plan-absent, historical-only). Change to 'aligned' to match the Status column.
  - 3.2: reconciliation_targets_are_actionable: All seven action items ('Review with Ben', 'Update funders.json', 'Fix the wiki articles', 'Sort out Minderoo', 'Get back to GHL leads soon', 'Generally tidy up', 'team will work through in coming weeks') are too vague. Each must name a specific file path + row/key/section, OR a specific person + deadline, OR a specific script invocation. Example: 'Update wiki/narrative/funders.json row minderoo.deadline to 2026-05-22' or 'Email Ben by 2026-05-18 to confirm Minderoo sign-off'.

### good-1-funder-alignment.md — MISMATCH

**Verdict:** fail  ·  **Score:** 76  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=true stages_match=false no_silent_inv=false

Advice:
  - 2.3/3.4 PAUL RAMSEY FOUNDATION: Synthesis says 'Wiki says stage: cold. Reality: 2 paid invoices... Suggested update: stage: warm-partner.' This is a silent inversion — no reconciliation language explaining *why* the canonical (funders.json) 'cold' should be overridden. Add a sentence: e.g., 'The two paid invoices and active William Frazer contact constitute new evidence not reflected in funders.json, which needs updating.' Place this in the 'Funders in wiki whose stage is wrong' section under the Paul Ramsay entry.
  - 3.4 INVERSION GAP: The June Canavan entry correctly calls out the divergence ('no Xero invoice, wiki overstates'), but Paul Ramsay's inversion from cold→warm is untethered. One sentence of reconciliation language is all that's needed to pass the no-silent-inversion check.

### good-2-project-truth-state.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=true stages_match=true no_silent_inv=true



### good-3-entity-migration.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

## Tuning notes

- One or more mismatches. Inspect detail above. Either revise the fixture (real fixture problem) or the rubric (real rubric problem). Document any rubric change in Calibration history.
