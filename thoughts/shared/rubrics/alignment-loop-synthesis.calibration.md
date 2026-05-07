# Calibration: Alignment Loop synthesis rubric v0.1

> Slug: `alignment-loop-synthesis.calibration`
> Pairs with: `alignment-loop-synthesis.md`
> Status: **template — fixtures pending**
> Target: 6/6 across the fixture matrix before the parent rubric goes production-eligible.

## Fixture matrix

| ID | Synthesis slug | Cycle date | Expected verdict | Status | What it tests |
|----|----------------|-----------:|-----------------:|--------|---------------|
| good-1 | funder-alignment | 2026-04-24 | pass (with Tier 2 warnings) | **pending** | The 2026-04-24 synthesis on file. Predates this rubric so frontmatter `sources_queried` is missing; expected to land at `warn` not `pass`. Recalibration after retro-fitting frontmatter is the next move. |
| good-2 | project-truth-state | 2026-04-24 | pass (with Tier 2 warnings) | **pending** | Same vintage, same expectation. |
| good-3 | entity-migration-truth-state | 2026-04-24 | pass (with Tier 2 warnings) | **pending** | Same vintage, same expectation. |
| bad-1 | funder-alignment | 2026-05-XX | fail | **pending** | Drift claim "wiki stage 3 tranches behind reality" without invoice IDs on the reality side. Fails 1.1. |
| bad-2 | project-truth-state | 2026-05-XX | fail | **pending** | Asserts "$X total received across N projects" without per-project enumeration. Fails 1.2. |
| bad-3 | funder-alignment | 2026-05-XX | fail | **pending** | Reconciliation list reads "review with Ben, update funders.json, fix wiki articles". Fails 3.2 (no specific file/row/deadline). |

## What "pass" means for a fixture

- Tier 1 hard rules clean (every drift claim sourced both ways, every $ traces to a row, names spelled per canonical, "missing from X" claims are grep-verifiable, AI-vocab clean).
- Tier 2 structural moves all four `true` (frontmatter complete, sources block present, headline findings cite rows, drift table classifies each row).
- Tier 3 judgment moves all four `true` (no decision-log contradiction, reconciliation targets actionable, stages match canonical, no silent inversion).
- Final `verdict: pass`, `score: ≥ 90`.

The three good- fixtures from 2026-04-24 are expected to land at `warn` first time through (their frontmatter predates the rubric's `sources_queried` requirement). After a retro-fit pass, they should hit `pass`.

## What "fail" means for a fixture

The fixture must trip exactly the rule it was written to test, with the grader's evidence pointer landing on the offending line/quote.

## Procedure when adding a fixture

1. Save the draft to `fixtures/alignment-loop-synthesis/<id>.md` with frontmatter:
   ```yaml
   ---
   id: good-1
   synthesis_slug: funder-alignment
   cycle_date: 2026-04-24
   expected_verdict: pass
   expected_failures: []  # for bad fixtures: list of rule IDs that should trip
   ---
   ```
2. Run the grader (script not yet written; corollary of `scripts/grade-voice.mjs` to be added once fixtures land).
3. Compare actual output to expected. If mismatch:
   - Real fixture problem → revise fixture text.
   - Real rubric problem → revise the rubric, document the change in this file's "Calibration history" section, re-run all fixtures.
4. Mark the fixture row above as `passing` or `failing-as-expected`.

## Calibration history

(To be filled as fixtures land.)

## Sister rubrics

- `act-voice-curtis.md` — must run first, this rubric inherits its Tier 1.
- `funder-cadence.md` — same three-tier shape for funder-facing drafts.
- `rd-evidence-pack.md` — same shape for R&D evidence packs.

## Phase-2 integration target

Once calibration is green, plug this rubric into the Alignment Loop scripts (`scripts/synthesize-funder-alignment.mjs` etc per the Phase-1 plan). The script writes the synthesis draft, then grades it, then either commits (on pass) or drops a `wiki/output/lint-loop-YYYY-MM-DD.md` report for Ben to triage (on warn/fail).
