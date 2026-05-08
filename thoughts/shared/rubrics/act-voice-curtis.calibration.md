# Voice rubric calibration — v0.2

> Run: 2026-05-06T23:48:54.726Z
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

Advice: 
- This is the calibration anchor for correct voice — nothing to change.

### GOOD: signal (`good-2`) — OK

> We work with First Nations communities. The story is theirs. The signal goes back to the speaker.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is close to correct voice — terse, plain, no pitch-deck inflation.
- 'Signal' names the room (empathy-ledger table), 'speaker' names the body, and 'theirs' loads ownership against the signal's return — that's the abstract loaded against the concrete.
- 'We work with First Nations communities' is the weakest line — it's a common opener that edges toward boilerplate. Consider cutting it and trusting the last two sentences to carry the whole piece.
- If you keep three sentences, make the first one do more concrete work — name a place, a hand, a tape, something that lands before 'the story is theirs'.

### GOOD: court (`good-3`) — OK

> The court is a room that forgets. We work with people who remember.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is the voice. Both sentences carry weight. Nothing to fix.

### BAD: transformative outcomes (`bad-1`) — OK

> In partnership with First Nations communities, ACT is committed to fostering transformative outcomes through innovative, community-led initiatives that leverage the power of storytelling to drive meaningful change.

**Verdict:** fail  ·  **Score:** 41  ·  **Expected:** fail

Hard failures (2):
      - **forbidden_vocab** `leverage` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra
      - **forbidden_vocab** `fostering` (line 1): In partnership with First Nations communities, ACT is committed to fostering tra

Structural: rooms=false body=false abstract=false stops=false
Plainness: doomadgee=false pitch_deck=true

Advice: 
- No room is named — 'partnership', 'communities', and 'initiatives' are abstractions, not places. For hub, pick any concrete room from the project table (cell, studio, basket, fence, gym, island, circle, etc.) and plant the sentence there.
- No body appears anywhere. Name a hand, a voice, a breath, a foot on the ground — something that exists in a body.
- Every noun is abstract and they pile up without being loaded against anything concrete. 'Transformative outcomes', 'meaningful change', 'innovative initiatives' — none of these land. Load one abstract against one concrete thing and stop.
- The line never stops — it keeps adding '-ing' tails ('fostering', 'leveraging', 'to drive'). Cut at the first true thing and leave it there.
- This is the calibration-anchor failure example (Example C) verbatim. Start over. One room. One body. One weight. Stop.

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
- No room named — for justicehub, drop the reader into a cell, a court, a watch-house, a road. One concrete word does it.
- 'Tapestry', 'equitable future', 'grassroots advocacy', 'systemic injustice' — every noun here is an abstraction piled on another abstraction. None of them are loaded against anything real.
- No body anywhere. No hand, no voice, no breath, no person walking out of a watch-house. The reader has nothing to stand on.
- The -ing tail ('shaping a more equitable future') is the classic pitch-deck move — cut it. Stop the line before the explanation.
- Rewrite test: try something like 'The court forgets a name fast. We write it down.' — room named, body implied, abstract (forgetting/memory) loaded against the concrete act, line stops.

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
- No room named — for goods, drop into basket, market, hand, country, or bush immediately.
- No body present — whose hand is carrying the basket? Whose country? Name a body or body-action.
- Every noun here is abstract: 'challenges', 'landscape', 'regenerative economics', 'pivotal role' — none is loaded against anything concrete, they just pile on each other.
- The sentence ends with an explanation tail ('demonstrating its pivotal role in...') — cut before it explains itself.
- 'Pivotal role in the evolving landscape of regenerative economics' is pitch-deck at full volume — a fourteen-year-old in Doomadgee would stop reading here.
- Try something like: 'The basket came back to country. That is the economy.' Two sentences, four moves done.

### GOOD: board-report parity (`good-4`) — OK

> Q3 FY26. The basket left country eleven times. The hand at market was paid for ten of those. Parity moved one notch.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is correct. All four moves are present and tight.
- 'Basket' and 'country' and 'hand' and 'market' all fire as goods rooms/bodies per the project table — no problem there.
- 'Parity moved one notch' is the abstract load: an institutional noun (parity) dragged against the concrete count (eleven trips, ten payments). That tension does the work without explanation.
- The line stops before any explanation — 'Parity moved one notch' refuses to add 'which demonstrates progress toward equity outcomes' or similar. Hold that discipline.
- Q3 FY26 as a datestamp is clean board-report framing — it grounds the piece in time without inflating it. No changes required.

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
- No room from the goods table appears anywhere — basket, market, hand, country, bush are all absent. Name the actual place where the work happens.
- No body is present. Whose hands? Whose country? A person or a body-action needs to be in here.
- Every noun is abstract: 'outcomes', 'empowerment', 'commitment', 'equitable future'. None of them is loaded against anything concrete — they just pile on top of each other.
- The lines never stop — '-ing' tails ('fostering', 'demonstrating', 'leveraging') keep the sentences open and explanatory. Cut before the explanation.
- This reads like a pitch deck from start to finish. 'Pivotal role', 'transformative outcomes', 'community-led economic empowerment' would all fail the Doomadgee test.
- Try something like: 'The basket moved through three hands before it left the market.' That is one sentence, four moves done.

### GOOD: donor letter (`good-5`) — OK

> Three winters ago you paid for the fence. The cockatoo came back before it came down. The valley remembers your hand.

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

Hard failures: none.

Structural: rooms=true body=true abstract=true stops=true
Plainness: doomadgee=true pitch_deck=false

Advice: 
- This is the voice. All four moves land cleanly across three sentences.
- 'Three winters ago' does the work of time without abstraction — keep that.
- 'The valley remembers your hand' loads the abstract (permanence, legacy, donor impact) against concrete body (hand) without explaining it — that is exactly the move.
- No changes required. This is a calibration-quality example for bcv donor-letter.

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
- No room named — for bcv, drop in valley, fence, creek, paddock, cockatoo, or tree. A single concrete place-word does the work.
- No body named — put a hand, a boot, a breath, a walk into the sentence. Who is standing where doing what?
- Every noun is abstract: contribution, change, landscape, investment, ability, restoration, outcomes. None of them are loaded against anything concrete. The abstraction has nothing to push against.
- The sentences do not stop — they trail with -ing tails ('empowering us to drive', 'leverages our ability to foster') which is the hallmark of pitch-deck register. Cut to the bone and stop.
- A fourteen-year-old in Doomadgee cannot picture anything in this letter. Rewrite until they can see the fence, hear the cockatoo, feel the dirt.
- Try something like: 'The cockatoo was back on the fence last spring. That took four years of work.' Two sentences, four moves, done.

## Tuning notes

- All fixtures classified correctly. Promote rubric to v0.2 (production-eligible).
