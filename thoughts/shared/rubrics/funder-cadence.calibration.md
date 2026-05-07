# Calibration: Funder cadence rubric v0.1

> Slug: `funder-cadence.calibration`
> Pairs with: `funder-cadence.md`
> Status: **template — fixtures pending**
> Target: 6/6 across the fixture matrix before the parent rubric goes production-eligible.

## Fixture matrix

Six fixtures across three funders × two cycles. Three known-good (must `pass`), three known-bad (must `fail`). Each fixture is a full draft saved as a markdown file in `fixtures/funder-cadence/<id>.md`.

| ID | Funder | Cycle | Expected verdict | Status | What it tests |
|----|--------|-------|-----------------:|--------|---------------|
| good-1 | minderoo | pitch | pass | **pending** | jh-minderoo-canonical-2026 draft after one edit round. Should pass cleanly: opens in Minderoo language (Cost of Late Intervention frame), leads with `claim-ten-anchor-communities-filter-is-relationship`, ask matches $2.9M / $780K Year 1, every dollar cited. |
| good-2 | qbe-catalysing-impact | term-sheet | pass | **pending** | Future Goods-on-Country investor brief once cost report is signed. Should pass: investor-grade tone, unit-economics frame, ask amount cited from cost report doc. |
| good-3 | dusseldorp-forum | renewal | pass | **pending** | Active-partner mid-cycle report. Should pass: references received amount (not open ask), tone matches Dusseldorp record, closing gives a deliverable date. |
| bad-1 | minderoo | pitch | fail | **pending** | Generic JusticeHub product pitch. Fails 2.1 (opens with ACT language, not Minderoo). |
| bad-2 | minderoo | pitch | fail | **pending** | Includes `contained:claim-evidence-is-settled-question-is-political-will` as opening argument. Fails 1.2 (claims_to_avoid hit). |
| bad-3 | qbe-catalysing-impact | pitch | fail | **pending** | QBE pitch using charity-case framing ("help us help young people..."). Fails 3.1 (tone contradiction with QBE's documented investor-grade preference). |

## What "pass" means for a fixture

- Tier 1 hard rules clean (no AI-vocab, no em-dashes, no uncited $, no fabricated relationship claims)
- Tier 2 structural moves all four `true`
- Tier 3 judgment moves all four `true`
- Final `verdict: pass`, `score: ≥ 90`

## What "fail" means for a fixture

The fixture must trip exactly the rule it was written to test, with the grader's evidence pointer landing on the offending line/quote. A fixture that fails the wrong rule (e.g. `bad-1` failing 1.2 instead of 2.1) is not a calibration pass — the rubric needs adjustment.

## Procedure when adding a fixture

1. Save the draft to `fixtures/funder-cadence/<id>.md` with frontmatter:
   ```yaml
   ---
   id: good-1
   funder_slug: minderoo
   cycle: pitch
   expected_verdict: pass
   expected_failures: []  # for bad fixtures: list of rule IDs that should trip
   ---
   ```
2. Run the grader: `node scripts/grade-funder-cadence.mjs fixtures/funder-cadence/<id>.md` (script not yet written; corollary of `scripts/grade-voice.mjs`).
3. Compare actual output to expected. If mismatch:
   - Real fixture problem → revise fixture text.
   - Real rubric problem → revise the rubric, document the change in this file's "Calibration history" section, re-run all fixtures.
4. Mark the fixture row above as `passing` or `failing-as-expected`.

## Calibration history

(To be filled as fixtures land.)

## Sister rubrics

- `act-voice-curtis.md` — must run first, this rubric inherits its Tier 1.
- `rd-evidence-pack.md` — same three-tier structure for an unrelated genre.
