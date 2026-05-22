# Voice rubric calibration — v0.2

> Run: 2026-05-22T22:22:16.881Z
> Pass rate: 9/10
> Rubric: `thoughts/shared/rubrics/act-voice-curtis.md`
> Grader: `scripts/grade-voice.mjs` (Haiku 4.5 for tier 2-3)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| GOOD: cockatoo | pass | pass | 100 | YES |
| GOOD: signal | pass | pass | 100 | YES |
| GOOD: court | pass | pass | 100 | YES |
| BAD: transformative outcomes | fail | fail | 41 | YES |
| BAD: intricate tapestry | fail | fail | 17 | YES |
| BAD: despite challenges | fail | error | 0 | **NO** |
| GOOD: board-report parity | pass | pass | 100 | YES |
| BAD: board-report puff | fail | fail | 5 | YES |
| GOOD: donor letter | pass | pass | 100 | YES |
| BAD: donor letter puff | fail | fail | 5 | YES |

## Detail

### GOOD: cockatoo (`good-1`) — OK

> Four years in. The cockatoo came back before the fence came down.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- Voice is correct. Terrific terseness.

### GOOD: signal (`good-2`) — OK

> We work with First Nations communities. The story is theirs. The signal goes back to the speaker.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=false stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- The signal (room) and speaker (body) are correctly named, but no institutional abstract noun (impact, outcome, capacity, permanence) is loaded against the concrete.
- Consider a contrast structure: place an institutional abstraction in tension with the concrete signal or speaker, like 'The signal cuts through impact' or loading 'outcome' against the speaker's return.
- The sentences currently read as declarations rather than contrasts. Add a weight-bearing sentence that places an abstract noun against the concrete room or body to complete the four moves.

### GOOD: court (`good-3`) — OK

> The court is a room that forgets. We work with people who remember.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is the voice. Two sentences, four moves done.

### BAD: transformative outcomes (`bad-1`) — OK

> In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.

**Verdict:** fail  ·  **Score:** 41  ·  **Expected:** fail

Hard failures (2):
      - **forbidden_vocab** `leverage` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra
      - **forbidden_vocab** `fostering` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- Name a concrete room from any project table
- Name a concrete body or body-action
- Load an institutional abstract noun against the concrete
- Stop the line before explanation — terse is the point

### BAD: intricate tapestry (`bad-2`) — OK

> Our dedicated team delves into the intricate tapestry of systemic injustice, highlighting the crucial role of grassroots advocacy in shaping a more equitable future.

**Verdict:** fail  ·  **Score:** 17  ·  **Expected:** fail

Hard failures (4):
      - **forbidden_vocab** `delves` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `crucial` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `tapestry` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig
      - **forbidden_vocab** `intricate` (line 1): Our dedicated team delves into the intricate tapestry of systemic injustice, hig

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- This is pure pitch-deck register. 'Dedicated team,' 'intricate tapestry,' 'systemic injustice,' 'crucial role,' 'shaping a more equitable future' — all abstraction, no concrete.
- No room from the justicehub table appears (cell, court, road, remand, watch-house). Nothing anchors to a place.
- No body or body-action named (hand, breath, voice, lift, eye, walk, sit, ear).
- The -ing tail 'in shaping a more equitable future' is explanation — it doesn't stop.
- For justicehub: name a room. Name a body. Load an abstract against that concrete. Stop. Example: 'The court forgets. We remember.' That's the voice.

### BAD: despite challenges (`bad-3`) — MISMATCH

> Despite facing numerous challenges, the project continues to thrive, demonstrating its pivotal role in the evolving landscape of regenerative economics.

**Verdict:** error  ·  **Score:** 0  ·  **Expected:** fail

Hard failures (3):
      - **forbidden_vocab** `pivotal` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **significance_claim** `its pivotal role` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **challenges_future** `continues to thrive` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati

Structural: skipped
Plainness: skipped

Advice: 
- t23 parse failed: json_parse_failed

### GOOD: board-report parity (`good-4`) — OK

> Q3 FY26. The basket left country eleven times. The hand at market was paid for ten of those. Parity moved one notch.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This passes. Rooms named (basket, country, market), body named (hand), abstract loaded (parity), line stops (no explanation). The brevity serves the board-report genre well. Each sentence is a data point that speaks for itself.

### BAD: board-report puff (`bad-4`) — OK

> This quarter our team continues to leverage the supplier network to drive transformative outcomes for First Nations enterprise. Goods plays a pivotal role in fostering a more equitable future, demonstrating our commitment to vibrant, community-led economic empowerment.

**Verdict:** fail  ·  **Score:** 5  ·  **Expected:** fail

Hard failures (5):
      - **forbidden_vocab** `pivotal` (line 1): This quarter our team continues to leverage the supplier network to drive transf
      - **forbidden_vocab** `vibrant` (line 1): This quarter our team continues to leverage the supplier network to drive transf
      - **forbidden_vocab** `leverage` (line 1): This quarter our team continues to leverage the supplier network to drive transf
      - **forbidden_vocab** `fostering` (line 1): This quarter our team continues to leverage the supplier network to drive transf
      - **significance_claim** `a pivotal role` (line 1): This quarter our team continues to leverage the supplier network to drive transf

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- Name a concrete room from the goods table: basket, market, hand, country, bush — and anchor it in sentence one.
- Name a concrete body or body-action: hand, eye, voice, walk, sit, ear — make it specific, not 'our team.'
- Load an institutional abstract noun (outcome, impact, capacity, permanence) against the concrete room or body — do not pile abstractions without anchor.
- Stop the line before explanation. Write terse. Two sentences can do the work of four.
- Strip the pitch-deck language: 'leveraging,' 'transformative,' 'pivotal role,' 'vibrant,' 'community-led economic empowerment' are all violations. Write so a fourteen-year-old in Doomadgee reads it plainly.

### GOOD: donor letter (`good-5`) — OK

> Three winters ago you paid for the fence. The cockatoo came back before it came down. The valley remembers your hand.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- Voice is correct. Two sentences do the work.
- The cockatoo as body-marker of place is perfect for bcv.
- The valley remembering is an abstract (permanence/memory) loaded against the concrete — this is the move.

### BAD: donor letter puff (`bad-5`) — OK

> Dear supporter, your generous contribution is empowering us to drive meaningful change in the vibrant landscape of regenerative ecology. Your investment leverages our ability to foster nuanced, community-led restoration that delivers transformative outcomes.

**Verdict:** fail  ·  **Score:** 5  ·  **Expected:** fail

Hard failures (5):
      - **forbidden_vocab** `nuanced` (line 1): Dear supporter, your generous contribution is empowering us to drive meaningful 
      - **forbidden_vocab** `vibrant` (line 1): Dear supporter, your generous contribution is empowering us to drive meaningful 
      - **forbidden_vocab** `leverages` (line 1): Dear supporter, your generous contribution is empowering us to drive meaningful 
      - **forbidden_vocab** `foster` (line 1): Dear supporter, your generous contribution is empowering us to drive meaningful 
      - **forbidden_vocab** `empowering` (line 1): Dear supporter, your generous contribution is empowering us to drive meaningful 

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- This reads like a pitch deck. No concrete rooms from the bcv table appear (valley, fence, tree, creek, paddock, cockatoo). No concrete bodies (hand, voice, eye, walk, etc.). The abstract nouns 'change,' 'outcomes,' 'restoration' float without being loaded against a concrete thing.
- Cut all institutional language: 'empowering,' 'leverages,' 'foster,' 'nuanced,' 'transformative.' These are pitch-deck fillers.
- Use the donor-letter genre to name a concrete place and body. Example: 'Your gift keeps the cockatoo coming back to the fence. That's the restoration.' One sentence can carry all four moves.
- Remember: two sentences can satisfy all four moves. Do not explain. Stop at the concrete.

## Tuning notes

- One or more mismatches. Inspect detail above. Tune rubric or grader before promoting.
