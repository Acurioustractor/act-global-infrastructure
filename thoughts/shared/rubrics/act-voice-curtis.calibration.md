# Voice rubric calibration — v0.1

> Run: 2026-05-06T21:28:35.072Z
> Pass rate: 6/6
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
| BAD: despite challenges | fail | fail | 29 | YES |

## Detail

### GOOD: cockatoo (`good-1`) — OK

> Four years in. The cockatoo came back before the fence came down.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is the calibration anchor — it passes all four moves cleanly. Nothing to change.

### GOOD: signal (`good-2`) — OK

> We work with First Nations communities. The story is theirs. The signal goes back to the speaker.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=false stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- Rooms and bodies are here — 'signal' names the room, 'speaker' names a body. Good.
- 'The story is theirs' is clean and plain but it is not doing the abstract-loading move — there is no institutional abstract noun (ownership, permanence, capacity, impact) being pressed against the concrete signal or body.
- Try loading an abstract directly against the signal or speaker — e.g. 'The signal goes back to the speaker. That is the only ownership that counts.' or 'The signal goes back to the speaker. Permanence lives in the room, not the archive.' — something that names the institutional stakes and then stops.
- Line 1 ('We work with First Nations communities') is the weakest — it reads like a disclaimer opener. Consider cutting it and letting 'The story is theirs' open instead, then load the abstract into the third line.

### GOOD: court (`good-3`) — OK

> The court is a room that forgets. We work with people who remember.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is the voice. Nothing to fix. Both sentences do work. The contrast between institutional forgetting and human memory is loaded correctly against the room. If you wanted to push harder you could name a body-action (a hand, a breath, a walk out the door) but it is not required — the piece earns its stop.

### BAD: transformative outcomes (`bad-1`) — OK

> In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.

**Verdict:** fail  ·  **Score:** 41  ·  **Expected:** fail

Hard failures (2):
      - **forbidden_vocab** `leverage` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra
      - **forbidden_vocab** `fostering` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- This is the calibration failure example verbatim — it scores zero on all four moves.
- Name a room from the hub table (cell, signal, basket, fence, gym, circle, island, kitchen, canvas, etc.) in the first sentence.
- Name a body or body-action (hand, voice, breath, walk, ear) somewhere in the piece.
- Load one abstract word (outcome, change, impact) against something concrete — a room, a body, a single fact.
- Cut every -ing tail: 'fostering', 'leveraging', 'drive meaningful change' are all pitch-deck endings. Stop the line before the explanation arrives.
- Plain test: a fourteen-year-old in Doomadgee cannot use 'transformative outcomes' or 'community-led initiatives' — rewrite so they can read it aloud without stopping.

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
- No room is named. For justicehub, drop the reader into a cell, a court, a watch-house, a remand centre — somewhere with a door and a floor.
- 'Intricate tapestry', 'equitable future', 'grassroots advocacy' — these are pitch-deck words. A fourteen-year-old in Doomadgee will not feel any of this. Cut every one of them.
- No body appears anywhere — no hand, no voice, no person standing anywhere doing anything. Put a body in the room.
- The sentence keeps going with explanation ('-ing' tail: 'highlighting... shaping'). Stop the line before you explain. Let the image do the work.
- Try something like: 'The court forgets your name by Friday. We write it down.' Room — court. Body — implicit person named. Abstract (forgetting, erasure) loaded against the concrete act of writing. Line stops.

### BAD: despite challenges (`bad-3`) — OK

> Despite facing numerous challenges, the project continues to thrive, demonstrating its pivotal role in the evolving landscape of regenerative economics.

**Verdict:** fail  ·  **Score:** 29  ·  **Expected:** fail

Hard failures (3):
      - **forbidden_vocab** `pivotal` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **significance_claim** `its pivotal role` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati
      - **challenges_future** `continues to thrive` (line 1): Despite facing numerous challenges, the project continues to thrive, demonstrati

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- No room named. For goods, you need basket, market, hand, country, or bush to appear. Put the reader somewhere physical.
- 'Pivotal role in the evolving landscape of regenerative economics' is pure pitch-deck. A fourteen-year-old in Doomadgee will stop reading at 'regenerative economics'. Cut it entirely.
- 'Numerous challenges' and 'continues to thrive' are decorative hedges — they say nothing. Name one actual challenge and one actual thing that happened.
- No body anywhere. Whose hands? Whose country? Who carried the basket? One concrete body word would change everything.
- The -ing tail ('demonstrating its pivotal role') is the line not stopping. Curtis method requires you to stop before explanation. Try: 'The basket still moves. Country holds it.' Two sentences, done.

## Tuning notes

- All fixtures classified correctly. Promote rubric to v0.2 (production-eligible).
