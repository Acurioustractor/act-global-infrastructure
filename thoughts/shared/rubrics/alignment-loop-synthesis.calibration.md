# Calibration: Alignment-loop-synthesis rubric v0.1

> Run: 2026-05-07T03:01:01.248Z
> Pass rate: 6/6
> Rubric: `thoughts/shared/rubrics/alignment-loop-synthesis.md`
> Grader: `scripts/grade-alignment-loop-synthesis.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Slug | Expected | Got | Score | Correct? |
|---------|------|----------|-----|-------|----------|
| bad-1-undercited-drift.md | funder-alignment | fail | fail | 34 | YES |
| bad-2-bare-aggregate.md | project-truth-state | fail | fail | 0 | YES |
| bad-3-vague-actions.md | funder-alignment | fail | fail | 76 | YES |
| good-1-funder-alignment.md | funder-alignment | pass | pass | 100 | YES |
| good-2-project-truth-state.md | project-truth-state | pass | pass | 100 | YES |
| good-3-entity-migration.md | entity-migration-truth-state | pass | pass | 100 | YES |

## Detail

### bad-1-undercited-drift.md — OK

**Verdict:** fail  ·  **Score:** 34  ·  **Expected:** fail

Hard failures (2):
  - **1.1:drift_claim_under_cited** `1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationship has progressed ma` (line 25): 1. The wiki stage 3 tranches behind reality on Snow Foundation. Their relationsh
  - **1.1:drift_claim_under_cited** `3. Three funders are missing from funders.json that should be added by next cycle.` (line 29): 3. Three funders are missing from funders.json that should be added by next cycl

Structural: fm=true sources_block=false findings=false drift_table=false
Judgment: no_dlog_contra=true actionable=false stages_match=false no_silent_inv=false

Advice:
  - 2.2 sources_block_present: Add a dedicated paragraph immediately after the title/summary that names all four datastores by their canonical identifiers (xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/plans/**) before the Headline Findings section.
  - 2.3 every_finding_cites_row: Every headline finding must cite a specific row reference, invoice ID, or count. Finding 1 needs a concrete invoice or GHL record (e.g. 'Snow $132K AUTH, GHL contact ID 4821'); Finding 2 needs a specific record count or last-seen date; Finding 3 must name the three funders explicitly.
  - 2.4 drift_table_classifies_each_row: The reconciliation table must use explicit drift classifications per row (aligned, drift-alert, wiki-absent, db-absent, plan-absent, historical-only, or mapped emoji equivalents). 'Wiki says warm but reality is much further along' is a prose description, not a classification.
  - 3.2 reconciliation_targets_are_actionable: 'No open actions to assign yet' is not acceptable. Each identified drift (Snow stage mismatch, Centrecorp wiki-absent, Rotary wiki-absent, three unnamed missing funders) must have a specific file path + key to update (e.g. 'update wiki/narrative/funders.json key snow_foundation.stage to active-partner') OR a named person with a deadline.
  - 3.3 stage_classifications_match_canonical: Snow Foundation is described as 'much further along' than the funders.json 'warm' classification without stating what the canonical source actually says or what the correct stage should be. Either match the canonical classification or explicitly call out the divergence with a proposed corrected value.
  - 3.4 no_silent_inversion: Snow Foundation's stage is silently upgraded from 'warm' (funders.json) to an implied advanced stage with no explicit reconciliation language. The synthesis must either accept the canonical value or use explicit divergence language such as 'funders.json records warm but Xero invoice #XXXX and GHL activity indicate stage should be reclassified to [X]'.

### bad-2-bare-aggregate.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

Hard failures (6):
  - **1.2:dollar_uncited_to_row** `$402K` (line 23): 1. ACT received $402K total from grant funders across 6 projects in FY26 to date
  - **1.2:dollar_uncited_to_row** `$114K` (line 25): 2. ACT-GD spend is $114K total across vendor and contractor categories.
  - **1.2:dollar_uncited_to_row** `$284K` (line 27): 3. ACT-IN spend reached $284K total, the largest single bucket.
  - **1.2:dollar_uncited_to_row** `$614K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers
  - **1.2:dollar_uncited_to_row** `$317K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers
  - **1.2:dollar_uncited_to_row** `$200K` (line 31): The ecosystem-wide R&D-eligible spend is approximately $614K total. Founder pers

Structural: fm=false sources_block=false findings=false drift_table=false
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - frontmatter_complete: sources_queried has only 2 entries (strings, not a proper array of canonical datastore names); also the frontmatter is missing the four required datastores by canonical name — add xero_invoices, ghl_contacts, wiki/narrative/funders.json, and thoughts/shared/{drafts,plans} as distinct entries.
  - sources_block_present: there is no paragraph immediately after the title/summary that names all four canonical datastores by name (xero_invoices, ghl_contacts, wiki/narrative/funders.json, thoughts/shared/{drafts,plans}); add that block before Headline findings.
  - every_finding_cites_row: all three headline findings cite only bare aggregates ($402K, $114K, $284K) with no invoice IDs, row references, or per-project counts; each finding must cite a specific row, invoice ID, or named project amount (e.g. 'ACT-GD INV-0042 $38K, ACT-IN INV-0107 $91K …').
  - drift_table_classifies_each_row: there is no reconciliation matrix table at all; add a table with one row per project/entity and an explicit drift classification column (aligned, drift-alert, wiki-absent, db-absent, plan-absent, or historical-only) for every row.
  - reconciliation_targets_are_actionable: the only action ('next cycle will produce per-project enumeration') names no file path, no row/key, no person, and no deadline; replace with specific targets such as 'update wiki/projects/act-gd/truth-state.json §spend_total by 2026-05-22 (owner: Curtis)' for each open item.

### bad-3-vague-actions.md — OK

**Verdict:** fail  ·  **Score:** 76  ·  **Expected:** fail

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=false stages_match=true no_silent_inv=true

Advice:
  - 3.2 reconciliation_targets_are_actionable: Every open action in the 'Open actions' section is vague and fails the specificity requirement. Replace each bullet with either a specific file path + row/key to update (e.g. 'wiki/narrative/funders.json → funders.minderoo.ask_amount: update to $X'), a named person + hard deadline (e.g. 'Ben to countersign thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md by 2026-05-20'), or a specific script invocation. 'Review with Ben', 'Update funders.json', 'Fix the wiki articles', 'Sort out Minderoo', 'Get back to GHL leads soon', and 'Generally tidy up the funder records' all fail this check.

### good-1-funder-alignment.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=true stages_match=true no_silent_inv=true



### good-2-project-truth-state.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=true stages_match=true no_silent_inv=true



### good-3-entity-migration.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: fm=true sources_block=true findings=true drift_table=true
Judgment: no_dlog_contra=true actionable=true stages_match=true no_silent_inv=true



## Tuning notes

- All fixtures classified correctly. Rubric is calibration-passing; promote to production-eligible.
