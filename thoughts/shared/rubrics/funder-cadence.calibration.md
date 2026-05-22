# Calibration: Funder cadence rubric v0.1

> Run: 2026-05-22T22:27:32.581Z
> Pass rate: 3/6
> Rubric: `thoughts/shared/rubrics/funder-cadence.md`
> Grader: `scripts/grade-funder-cadence.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Funder | Cycle | Expected | Got | Score | Correct? |
|---------|--------|-------|----------|-----|-------|----------|
| bad-1-minderoo-generic.md | minderoo | pitch | fail | error | 0 | **NO** |
| bad-2-minderoo-political-will.md | minderoo | pitch | fail | fail | 46 | YES |
| bad-3-qbe-charity-case.md | qbe-catalysing-impact | pitch | fail | error | 0 | **NO** |
| good-1-minderoo-pitch.md | minderoo | pitch | pass | pass | 100 | YES |
| good-2-qbe-term-sheet.md | qbe-catalysing-impact | term-sheet | pass | warn | 82 | **NO** |
| good-3-dusseldorp-renewal.md | dusseldorp-forum | renewal | pass | pass | 100 | YES |

## Detail

### bad-1-minderoo-generic.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** fail

Hard failures: none.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

### bad-2-minderoo-political-will.md — OK

**Verdict:** fail  ·  **Score:** 46  ·  **Expected:** fail

Hard failures (1):
  - **1.2:claims_to_avoid_verbatim** `contained:claim-evidence-is-settled-question-is-political-will` (line 5): The debate is settled. The question is political will.

Structural: opens=false lead_claim=false ask=true every_$=false
Judgment: tone=false stage=true closing=true no_avoid=false

Advice:
  - 2.1 FAILED: The first three sentences contain no reference to Minderoo’s published Communities-first strategy, place-based engagement language, or named themes (communities, early-intervention, indigenous-led, child-family-supports). Rewrite to open with the anchor-community hold or another authorised opener grounded in Minderoo’s own strategy vocabulary rather than generic evidence/political-will framing.
  - 2.2 FAILED: The first major argument is the exact claim_to_avoid — ‘The debate is settled. The question is political will.’ This must be replaced with an authorised opener (e.g., justicehub:claim-three-circles-start-at-the-edge, justicehub:claim-ten-anchor-communities-filter-is-relationship, etc.). No footnote justification was provided.
  - 2.4 FAILED: The $2.9M ask is cited inline as a fact without a source footnote or consistent citation mode. The parenthetical reference to three-circles.md in the Year 1 sentence is insufficient — every monetary figure needs a consistent citation (either inline footnote or Sources section entry, not mixed).
  - 3.1 FAILED: Tone is confrontational/advocacy (‘forcing the existing evidence into rooms where decision-makers can no longer pretend…’, ‘The work is now political’) rather than communities-first, evidence-rich, and board-defensible. Minderoo funds builders, not critics. Reframe around partnership language: Partner, Develop, Generate Evidence. Anchor the human trace (The Brave Ones) as the community story, not the political argument.
  - 3.4 FAILED: The draft deploys the exact claim_to_avoid as its opening: ‘The debate is settled. The question is political will.’ Even a single instance of this claim fails the check. Remove it entirely and lead with an authorised claim that respects Minderoo’s role as a partner-builder rather than a political-will challenger.

### bad-3-qbe-charity-case.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** fail

Hard failures (1):
  - **voice:forbidden_vocab** `vital` (line 11): A contribution from QBE Catalysing Impact would let us continue this vital work.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

### good-1-minderoo-pitch.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



### good-2-qbe-term-sheet.md — MISMATCH

**Verdict:** warn  ·  **Score:** 82  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=false
Judgment: tone=true stage=true closing=true no_avoid=true

Advice:
  - 2.4 every_dollar_cited: Parenthetical inline refs (wiki/projects/goods/cost-report-fy26.md) mix with footnote-style refs (BILL-2841, BILL-2879, BILL-2912). Pick one mode — convert wiki path refs to superscript footnotes or move all citations to a consistent inline (Author, Year) style. Example: 'Three control cohorts (BILL-2841; BILL-2879; BILL-2912)' works inline if you commit to inline; otherwise use footnote marker.

### good-3-dusseldorp-renewal.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



## Tuning notes

- One or more mismatches. Inspect detail above. Either revise the fixture (real fixture problem) or the rubric (real rubric problem). Document any rubric change in Calibration history.
