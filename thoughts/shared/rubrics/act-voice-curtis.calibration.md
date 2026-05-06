# Voice rubric calibration — v0.1

> Run: 2026-05-06T21:37:05.154Z
> Pass rate: 6/6
> Rubric: `thoughts/shared/rubrics/act-voice-curtis.md`
> Grader: `scripts/grade-voice.mjs` (Haiku 4.5 for tier 2-3)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| GOOD: cockatoo | pass | pass | 100 | YES |
| GOOD: signal | pass | pass | 100 | YES |
| GOOD: court | pass | pass | 100 | YES |
| BAD: transformative outcomes | fail | fail | 76 | YES |
| BAD: intricate tapestry | fail | fail | 52 | YES |
| BAD: despite challenges | fail | fail | 64 | YES |

## Detail

### GOOD: cockatoo (`good-1`) — OK

> Four years in. The cockatoo came back before the fence came down.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Plainness: skipped

Advice: 
- tier1 clean; tier 2-3 not run (use --full to grade structural moves)

### GOOD: signal (`good-2`) — OK

> We work with First Nations communities. The story is theirs. The signal goes back to the speaker.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Plainness: skipped

Advice: 
- tier1 clean; tier 2-3 not run (use --full to grade structural moves)

### GOOD: court (`good-3`) — OK

> The court is a room that forgets. We work with people who remember.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: skipped
Plainness: skipped

Advice: 
- tier1 clean; tier 2-3 not run (use --full to grade structural moves)

### BAD: transformative outcomes (`bad-1`) — OK

> In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.

**Verdict:** fail  ·  **Score:** 76  ·  **Expected:** fail

Hard failures (2):
      - **forbidden_vocab** `leverage` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra
      - **forbidden_vocab** `fostering` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra

Structural: skipped
Plainness: skipped


### BAD: intricate tapestry (`bad-2`) — OK

> Our dedicated team delves into the intricate tapestry of systemic injustice, highlighting the crucial role of grassroots advocacy in shaping a more equitable future.

**Verdict:** fail  ·  **Score:** 52  ·  **Expected:** fail

Hard failures (4):
      - **forbidden_vocab** `delves` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `crucial` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `tapestry` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `intricate` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig

Structural: skipped
Plainness: skipped


### BAD: despite challenges (`bad-3`) — OK

> Despite facing numerous challenges, the project continues to thrive, demonstrating its pivotal role in the evolving landscape of regenerative economics.

**Verdict:** fail  ·  **Score:** 64  ·  **Expected:** fail

Hard failures (3):
      - **forbidden_vocab** `pivotal` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **significance_claim** `its pivotal role` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **challenges_future** `continues to thrive` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati

Structural: skipped
Plainness: skipped


## Tuning notes

- All fixtures classified correctly. Promote rubric to v0.2 (production-eligible).
