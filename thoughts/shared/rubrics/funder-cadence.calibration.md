# Calibration: Funder cadence rubric v0.1

> Run: 2026-05-22T22:53:28.130Z
> Pass rate: 4/6
> Rubric: `thoughts/shared/rubrics/funder-cadence.md`
> Grader: `scripts/grade-funder-cadence.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Funder | Cycle | Expected | Got | Score | Correct? |
|---------|--------|-------|----------|-----|-------|----------|
| bad-1-minderoo-generic.md | minderoo | pitch | fail | fail | 58 | YES |
| bad-2-minderoo-political-will.md | minderoo | pitch | fail | error | 0 | **NO** |
| bad-3-qbe-charity-case.md | qbe-catalysing-impact | pitch | fail | fail | 46 | YES |
| good-1-minderoo-pitch.md | minderoo | pitch | pass | pass | 100 | YES |
| good-2-qbe-term-sheet.md | qbe-catalysing-impact | term-sheet | pass | pass | 100 | YES |
| good-3-dusseldorp-renewal.md | dusseldorp-forum | renewal | pass | error | 0 | **NO** |

## Detail

### bad-1-minderoo-generic.md — OK

**Verdict:** fail  ·  **Score:** 58  ·  **Expected:** fail

Hard failures: none.

Structural: opens=false lead_claim=false ask=true every_$=false
Judgment: tone=false stage=false closing=false no_avoid=true

Advice:
  - 2.1 opens_in_funder_language: First three sentences are product-descriptions in generic ACT language. Minderoo strategy is communities-first, place-based engagement, indigenous-led, child-family-supports — none of these theme words appear. Rewrite to anchor in Minderoo's published strategy language (Communities-first, place-based, child and family supports) before mentioning JusticeHub.
  - 2.2 lead_claim_is_authorised: No major argument in the draft matches any authorised opener (claim-ten, claim-three-circles-start-at-the-edge, etc.). The draft leads with product-maturity framing, not an authorised community/relationship/edge claim. Insert an authorised lead claim or justify deviation with a footnote citing framing_notes.
  - 2.4 every_dollar_cited: No citations present — no footnotes, no inline source tags, no Sources section. The $2.9M is cited with a file path but not in an ACT-standard citation mode. Align citation style consistently across all financial claims.
  - 3.1 tone_matches_funder_record: Tone is product-centric and growth-oriented (mature product, solid technology, market ready, national platform, thousands). Minderoo wants communities-first, evidence-rich, place-based, structurally honest, board-defensible. Replace 'product-ready' language with community-work language and evidence-of-impact language.
  - 3.2 no_stage_contradiction: Stage=ask-pending but draft reads as a cold first-introduction: 'Hi Lucy,' 'Built by ACT in 2024 and 2025' 'we want Minderoo to be part of the next chapter.' Rewrite to assume an existing relationship and frame as a continuation of an ongoing ask, not an introduction.
  - 3.3 closing_gives_next_step: Closing says 'Looking forward to your reply. Happy to jump on a call to discuss further whenever suits.' No concrete date, meeting type, deliverable, or next-action named. Specify a named next step (e.g., 'Are you available week of March 10 for a 30-minute call?' or 'Shall I send the Year-1 milestone deck for your review by March 15?').

### bad-2-minderoo-political-will.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** fail

Hard failures (1):
  - **1.2:claims_to_avoid_verbatim** `contained:claim-evidence-is-settled-question-is-political-will` (line 5): The debate is settled. The question is political will.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

### bad-3-qbe-charity-case.md — OK

**Verdict:** fail  ·  **Score:** 46  ·  **Expected:** fail

Hard failures (1):
  - **voice:forbidden_vocab** `vital` (line 11): A contribution from QBE Catalysing Impact would let us continue this vital work.

Structural: opens=false lead_claim=false ask=false every_$=false
Judgment: tone=false stage=false closing=false no_avoid=true

Advice:
  - 2.1 FAIL: Opening three sentences are generic emotional appeals ('Help us help young people', 'generous backing', 'change lives'). QBE's themes are enterprise/unit-economics/scalable/social-investment — none are referenced. Rewrite with QBE's published strategy language or named cost-report framing.
  - 2.2 FAIL: No authorised claim appears. Opening argument is 'young people let down by systems' — not any of goods-on-country:claim-unit-economics-must-be-real, goods-on-country:claim-handover-is-the-test, or goods-on-country:claim-not-charity-its-enterprise. No footnote justification citing framing_notes either.
  - 2.3 FAIL: Text explicitly states 'We have not yet finalised a specific cost figure' and proposes working it out together. QBE framing_notes forbid showing up without the actual cost report — this is the gating document. For cycle=pitch with stage=term-sheet-pending, you must attach or reference the delivered cost number.
  - 2.4 FAIL: No dollar figures are cited anywhere in the document. Tier 1 structural reinforcement requires a consistent citation mode for cost data. The cost report doc that QBE requires is completely absent.
  - 3.1 FAIL: Tone is pure charity-case framing ('generous backing', 'mean the world', 'deserve a chance'). QBE wants investor-grade, cost-honest language. 'A heartfelt thank you' section heading and 'With deep gratitude' signoff are inappropriate for this funder's record.
  - 3.2 FAIL: Stage=term-sheet-pending means QBE expects a cost report before advancing. Draft opens as if this is a first introduction, with no acknowledgment of prior relationship. Closing asks for 'a chat at your convenience' — this contradicts the advanced stage where concrete next steps (signature, review meeting) are expected.
  - 3.3 FAIL: Closing paragraph says 'We would be honoured to share more at your convenience. Looking forward to hearing from QBE.' This is passive, vague, and names no date/meeting/deliverable/signature. For term-sheet-pending, the next step must be concrete: e.g., 'We will send the finalised cost report by [date] for review before the [date] signing call.'
  - 3.4 PASS: No paraphrase of claims_to_avoid detected.

### good-1-minderoo-pitch.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



### good-2-qbe-term-sheet.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



### good-3-dusseldorp-renewal.md — MISMATCH

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Judgment: skipped

Advice:
  - t23 parse failed: json_parse_failed

## Tuning notes

- One or more mismatches. Inspect detail above. Either revise the fixture (real fixture problem) or the rubric (real rubric problem). Document any rubric change in Calibration history.
