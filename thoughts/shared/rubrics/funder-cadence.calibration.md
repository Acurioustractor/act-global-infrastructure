# Calibration: Funder cadence rubric v0.1

> Run: 2026-05-07T02:36:21.046Z
> Pass rate: 6/6
> Rubric: `thoughts/shared/rubrics/funder-cadence.md`
> Grader: `scripts/grade-funder-cadence.mjs` (Sonnet 4.6 for tier 2-3)

## Results

| Fixture | Funder | Cycle | Expected | Got | Score | Correct? |
|---------|--------|-------|----------|-----|-------|----------|
| bad-1-minderoo-generic.md | minderoo | pitch | fail | fail | 58 | YES |
| bad-2-minderoo-political-will.md | minderoo | pitch | fail | fail | 46 | YES |
| bad-3-qbe-charity-case.md | qbe-catalysing-impact | pitch | fail | fail | 46 | YES |
| good-1-minderoo-pitch.md | minderoo | pitch | pass | pass | 100 | YES |
| good-2-qbe-term-sheet.md | qbe-catalysing-impact | term-sheet | pass | pass | 100 | YES |
| good-3-dusseldorp-renewal.md | dusseldorp-forum | renewal | pass | pass | 100 | YES |

## Detail

### bad-1-minderoo-generic.md — OK

**Verdict:** fail  ·  **Score:** 58  ·  **Expected:** fail

Hard failures: none.

Structural: opens=false lead_claim=false ask=true every_$=false
Judgment: tone=false stage=false closing=false no_avoid=true

Advice:
  - opens_in_funder_language: The opening three sentences contain zero Minderoo strategy vocabulary. Rewrite the opener to reference Minderoo's published Communities-first frame — use their own language: place-based engagement, local knowledge and lived experience, stronger child and family supports, vibrant connected communities. A phrase like 'JusticeHub is a community-led platform' is generic ACT product language, not funder-mirrored entry.
  - lead_claim_is_authorised: The draft's first major argument is a product-maturity and scale-readiness pitch ('the codebase is in production', 'ready to scale nationally'). None of the six authorised lead claims are product-maturity claims. The closest authorised opener for this funder and cycle is justicehub:claim-ten-anchor-communities-filter-is-relationship ('This is not a stack of grants — it is 7–8 long-term relationships') or justicehub:claim-three-circles-start-at-the-edge. Rebuild the lead around one of those and subordinate product-readiness to the community-relationships frame.
  - every_dollar_cited: The $2.9M ask carries a parenthetical source reference (three-circles.md) but no other numbers or claims in the draft are cited. The citation mode is inconsistently applied — the single inline citation sits alone in an otherwise uncited document. Either apply consistent inline citations throughout or use a Sources section; do not leave a single orphaned reference.
  - tone_matches_funder_record: The draft reads as a founder-pitch for a tech product ('the codebase is in production', 'mobile app', 'market is ready', 'regional product to a national platform'). Minderoo's required tone is communities-first, evidence-rich, place-based, and board-defensible. The word 'market' should not appear. JusticeHub must be framed as the evidence layer under community work, not as a scalable product. Reframe throughout: lead with anchor-community relationships and place-based evidence generation; relegate platform and app language to a supporting role.
  - no_stage_contradiction: The funder stage is ask-pending, meaning a relationship exists and a formal ask is being advanced. The draft's closing ('Happy to jump on a call to discuss further whenever suits') reads as a cold-outreach hedge — inappropriate for an ask-pending stage where the ask amount is already known and Lucy is the named contact. The close should advance the ask, not re-open the conversation to whether a call might happen.
  - closing_gives_next_step: The closing names no concrete next action — no date, no proposed meeting window, no signature milestone, no deliverable. For a pitch at ask-pending stage, the close must name a specific proposed action, e.g. 'I would like to send through the full Three Circles brief before [date] and propose a conversation with you and [relevant Minderoo lead] in the week of [date].' Fix the closing paragraph entirely.

### bad-2-minderoo-political-will.md — OK

**Verdict:** fail  ·  **Score:** 46  ·  **Expected:** fail

Hard failures (1):
  - **1.2:claims_to_avoid_verbatim** `contained:claim-evidence-is-settled-question-is-political-will` (line 5): The debate is settled. The question is political will.

Structural: opens=false lead_claim=false ask=true every_$=true
Judgment: tone=false stage=true closing=true no_avoid=false

Advice:
  - 2.1 opens_in_funder_language FAIL: The opening sentence ('The debate is settled. The question is political will.') contains no reference to Minderoo's published strategy, theme vocabulary (communities-first, place-based, child-family-supports, etc.) or named report. Rewrite the first three weight-bearing sentences to anchor in Minderoo's own language — e.g. their communities-first framing, place-based engagement, or stronger child and family supports — before introducing ACT's work.
  - 2.2 lead_claim_is_authorised FAIL: The first major argument ('The debate is settled. The question is political will.') is an exact match of the single prohibited claim (contained:claim-evidence-is-settled-question-is-political-will) and does not appear in claims_to_lead_with. Replace the opener with one of the seven authorised lead claims — the ten-anchor-communities-as-relationships claim or the start-at-the-edge claim are the strongest fit for Minderoo's communities-first framing.
  - 3.1 tone_matches_funder_record FAIL: The draft's tone is advocacy-confrontational throughout ('forcing the existing evidence into rooms where decision-makers can no longer pretend they have not seen it'; 'The work is now political'). Minderoo's canonical tone is communities-first, evidence-rich, structurally honest, and board-defensible — they fund builders, not critics. Strip the confrontational register and reframe JusticeHub as the evidence layer under community work, using Minderoo's own role language: Partner, Develop, Generate Evidence, Advocate.
  - 3.4 no_claims_to_avoid FAIL: The opening line ('The debate is settled. The question is political will.') is a verbatim instantiation of the single prohibited claim. This is not paraphrase — it is a direct match. Remove it entirely and replace with an authorised opener. Note that the second paragraph ('We are not building a new evidence base. We are forcing the existing evidence...') compounds the violation in paraphrase form and must also be removed.

### bad-3-qbe-charity-case.md — OK

**Verdict:** fail  ·  **Score:** 46  ·  **Expected:** fail

Hard failures (1):
  - **voice:forbidden_vocab** `vital` (line 11): A contribution from QBE Catalysing Impact would let us continue this vital work.

Structural: opens=false lead_claim=false ask=false every_$=false
Judgment: tone=false stage=false closing=false no_avoid=true

Advice:
  - 2.1 opens_in_funder_language: The opener ('Help us help young people who have been let down…') is pure charity-appeal language. Rewrite the first three sentences to reference QBE Catalysing Impact's published themes — enterprise, unit economics, scalable social investment — before any program description appears.
  - 2.2 lead_claim_is_authorised: The first major argument is an emotional welfare pitch. None of the three authorised lead claims (unit-economics-must-be-real, handover-is-the-test, not-charity-its-enterprise) appears anywhere in the draft. Open with one of those claims verbatim or in direct paraphrase.
  - 2.3 ask_matches_ledger: The draft explicitly states 'We have not yet finalised a specific cost figure.' Funder framing notes state QBE will not move without the actual cost report. The delivered cost number must appear before any request is made. Either insert the cost report figure or hold the draft until it is available.
  - 2.4 every_dollar_cited: No figures, citations, footnotes, or sources appear anywhere in the draft. An investor-grade pitch to QBE requires at least the unit-cost number, the decision band, and the handover binary, each cited to the cost report.
  - 3.1 tone_matches_funder_record: The draft is charity-case framing throughout ('gift', 'heartfelt thank you', 'deep gratitude', 'deserve a chance'). QBE requires investor-grade, cost-honest tone with no hand-waving. Strip all welfare-appeal language and replace with enterprise framing.
  - 3.2 no_stage_contradiction: Stage is term-sheet-pending, meaning QBE is already in late-stage diligence. The draft reads as a cold first-introduction pitch ('we would be honoured to share more… at your convenience'). Reframe to acknowledge the existing diligence relationship and reference the specific deliverable — the cost report — that moves QBE to term sheet.
  - 3.3 closing_gives_next_step: The closing names no concrete action — no date, no meeting slot, no deliverable deadline, no return-call window. Replace 'at your convenience' with a specific proposed date or a named deliverable (e.g. 'We will deliver the completed cost report by [date] and propose a 30-minute review call in the week of [date].').

### good-1-minderoo-pitch.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true

Advice:
  - All checks pass. One optional strengthening move: the bucket table uses ACT-internal role labels (Partner / place-based hold, Generate evidence, Develop and advocate) which map cleanly to Minderoo's own role language — consider adding a parenthetical in the table header explicitly noting these mirror Minderoo's published Partner / Develop / Generate Evidence / Advocate framing, so a board reader makes the connection without inference.

### good-2-qbe-term-sheet.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



### good-3-dusseldorp-renewal.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: opens=true lead_claim=true ask=true every_$=true
Judgment: tone=true stage=true closing=true no_avoid=true



## Tuning notes

- All fixtures classified correctly. Rubric is calibration-passing; promote to production-eligible.
