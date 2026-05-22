# Voice rubric calibration — v0.2

> Run: 2026-05-22T22:49:20.331Z
> Pass rate: 10/10
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


### GOOD: signal (`good-2`) — OK

> We work with First Nations communities. The story is theirs. The signal goes back to the speaker.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This piece lands the four moves. 'The signal goes back to the speaker' is the anchor line — it names a room (signal), implies a body (speaker/voice), and contrasts the concrete against 'the story is theirs'. That contrast is the loading. The piece passes.
- Minor note: 'We work with First Nations communities' reads as institutional set-up rather than direct observation. If you want more voice, consider naming the observation directly: e.g., 'The story is theirs. The signal goes back to the speaker.' could stand alone as two sentences. But this version works — the voice is there.

### GOOD: court (`good-3`) — OK

> The court is a room that forgets. We work with people who remember.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This text is fully compliant with Curtis method for justicehub.
- The court (room) is named, people (body) are named, forget/remember (institutional abstraction) loaded against the concrete room, and both sentences stop after the meaning without explanation.
- This is the target voice for a justicehub caption.

### BAD: transformative outcomes (`bad-1`) — OK

> In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.

**Verdict:** fail  ·  **Score:** 41  ·  **Expected:** fail

Hard failures (2):
      - **forbidden_vocab** `leverage` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra
      - **forbidden_vocab** `fostering` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- This is pure pitch-deck language with no concrete anchor. There are no rooms from the hub project table, no bodies, no abstraction loaded against the concrete, and the line does not stop — it continues with an infinitive tail 'to drive meaningful change' which is explanation.
- The text must name a concrete room (from the project table or any hub word), name a concrete body or body-action, load an institutional abstract noun (impact, outcome, capacity, permanence) against that concrete, and stop the line without explanation.
- Example: 'The road remembers. ACT carries the outcome.' — Two sentences, four moves done. The road is a room (from the project table for bg-fit/hub), the body is implied in 'carries', 'outcome' is the institutional abstract loaded against the road, and the line stops with contrast not explanation.

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
- Name a justicehub room: cell, court, road, remand, or watch-house.
- Name a concrete body or body-action: hand, breath, voice, walk, sit, eye, ear.
- Load an institutional abstract (impact, outcome, capacity, permanence) against that concrete — do not explain the abstract, let it press against the room.
- Strip institutional language: avoid 'dedicated team,' 'intricate tapestry,' 'grassroots advocacy,' 'shaping a more equitable future.' These are pitch-deck abstractions with no room, no body, no load.

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
- No concrete room named. For goods project, name basket, market, hand, country, or bush — one word is enough.
- No body named. Name hand, breath, voice, lift, eye, walk, sit, or ear — a word, not a description.
- Abstracts pile up without being loaded against concrete. 'Regenerative economics' and 'evolving landscape' are decoration. Load impact, outcome, capacity, or permanence against the room or body instead.
- Sentence ends in explanation ('pivotal role'). Stop before the explanation — name the room and body, load the abstract, then stop.
- Rewrite in plain voice. A fourteen-year-old in Doomadgee should read this without translation. Avoid 'pivotal,' 'evolving,' 'thriving,' 'demonstrating.'

### GOOD: board-report parity (`good-4`) — OK

> Q3 FY26. The basket left country eleven times. The hand at market was paid for ten of those. Parity moved one notch.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- Voice is correct. Rooms named (basket, country, market), body named (hand), abstract parity loaded against concrete basket/hand numbers, line stops cleanly. Terse board-report register appropriate. No changes needed.

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
- This text is entirely abstract corporate language with no concrete grounding. It fails all four structural moves.
- Name a room from the goods table (basket, market, hand, country, bush) in sentence one.
- Name a body or body-action (hand, eye, voice, walk) to anchor the abstract.
- Load an institutional abstract noun (impact, outcome, capacity) against the concrete room or body.
- Stop the line before any explanation — do not add 'demonstrating' clauses.
- Plainness: Replace 'leverage,' 'transformative outcomes,' 'pivotal role,' 'fostering,' 'vibrant,' 'community-led economic empowerment' with plain language a fourteen-year-old reads without translation.

### GOOD: donor letter (`good-5`) — OK

> Three winters ago you paid for the fence. The cockatoo came back before it came down. The valley remembers your hand.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- Voice is correct — no changes needed.
- The three moves (room, body, abstract load) are all present and terse.

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
- Remove all institutional language: 'empowering,' 'meaningful change,' 'vibrant landscape,' 'leverages,' 'foster,' 'nuanced,' 'community-led,' 'transformative outcomes'
- Name a concrete bcv room: valley, fence, tree, creek, paddock, or cockatoo
- Name a concrete body or body-action: hand, eye, walk, sit, ear, breath, voice
- Load an abstract noun (impact, outcome, capacity, permanence) against the concrete thing you name
- Stop the line after the loaded contrast — do not explain
- Example fix: 'The fence came down before the cockatoo left. That's the impact.' ( terse, concrete, voice correct)

## Tuning notes

- All fixtures classified correctly. Promote rubric to v0.2 (production-eligible).
