# Rubric: ACT voice (Curtis method)

> Slug: `act-voice-curtis`
> Version: 0.2
> Created: 2026-05-07
> Source of truth: `.claude/skills/act-brand-alignment/references/writing-voice.md`
> Use: pass to Anthropic Managed Agents Outcomes, or to local grader at `scripts/grade-voice.mjs`.
> Calibration: Tier 1 = 6/6 (perfect). Tier 2-3 = 3/6 — bad fixtures correctly fail, good fixtures incorrectly warn. See `act-voice-curtis.calibration.md`.
> Tier 1 status: **production-eligible** for any genre.
> Tier 2-3 status: **needs prompt tuning before promotion.** Haiku 4.5 is too strict on Curtis terseness — it doesn't recognise "cockatoo/fence", "court", "signal/speaker" as room/body matches even though they're explicit in the project table. Likely fixes (next session): (a) few-shot examples in the prompt; (b) bump model to Sonnet 4.6 for grading; (c) relax structural rule to require ANY 2 of 4 moves rather than all 4.

## What this rubric grades

Any public-facing ACT writing: pitches, grants, web copy, board reports, donor letters, journal spreads, captions, essays. Internal docs, code comments, dev notes, and informal Slack/Telegram messages are out of scope.

## Inputs

- `text` — the draft being graded (markdown or plain text)
- `project` — one of: `hub`, `justicehub`, `empathy-ledger`, `goods`, `bcv`, `harvest`, `farm`, `art`, `oonchiumpa`, `bg-fit`, `mounty-yarns`, `picc` (used for room/body match)
- `genre` — one of: `pitch`, `grant`, `web`, `board-report`, `donor-letter`, `journal-spread`, `caption`, `essay`, `press`

## Output (grader must produce all of these)

```json
{
  "verdict": "pass" | "warn" | "fail",
  "score": 0-100,
  "hard_failures": [{ "rule": "no_em_dash", "evidence": "...", "line": 14 }],
  "warnings":      [{ "rule": "rule_of_three", "evidence": "...", "line": 22 }],
  "suggestions":   [{ "rule": "name_the_room", "evidence": "...", "advice": "..." }],
  "structural_check": { "rooms_named": true, "bodies_named": true, "abstract_loaded": true, "line_stops": true }
}
```

`verdict = fail` if any hard rule trips. `verdict = warn` if no hard fails but structural_check has a `false`. `verdict = pass` only if no hard fails and all four structural moves are present in the three weight-bearing sentences.

---

## Tier 1 — hard rules (binary, regex/list-checkable, BLOCK on hit)

These are the AI tells. Every hit is a hard failure. The grader must report exact line + evidence.

### 1.1 Forbidden vocabulary
Match (case-insensitive, word boundary) any of:
```
crucial, pivotal, vital, significant, profound,
tapestry, landscape, interplay, intricate, nuanced,
testament, enduring, lasting, timeless, indelible,
vibrant, bustling, thriving, dynamic,
boasts, features, represents,
meticulous, seamless, effortless, groundbreaking, renowned,
nestled
```
**Verb stems that match all four inflections** (bare/-s/-ing/-ed): `leverage`, `foster`, `cultivate`, `empower`, `unlock`.
**Verb-form dictionary entries that match all inflections**: `delve`, `underscore`, `showcase`, `emphasise/emphasize`, `illustrate`.
**Phrases caught by separate rules** (not vocab): `stands as`, `serves as` (→ copula avoidance), `in the heart of`, `at the forefront of`, `world-class` (→ forbidden phrases).

Exception: `key` allowed as noun ("the key turns"), not as adjective ("a key role").
Exception: `highlight` allowed as noun, not as verb.
Exception: `rich` allowed when concrete ("the soil is rich"), not as abstract puff ("a rich tapestry of").

### 1.2 Em dashes
Pattern: `—` or `--` (markdown) or any unicode em dash. Replace with comma, period, or colon.

### 1.3 Negative parallelism
Patterns:
- `not just .{0,40} but`
- `it's not about .{0,40} it's about`
- `more than .{0,40} it's`

### 1.4 Significance claims
Patterns (case-insensitive):
- `(plays?|its|a) (pivotal|key|crucial|vital) role`
- `marks a (key|pivotal) moment`
- `sets the stage for`
- `paving the way`
- `at a critical juncture`

### 1.5 Knowledge disclaimers
Patterns:
- `while specific details are limited`
- `based on available information`
- `it is worth noting`
- `it should be noted`

### 1.6 Vague attribution
Patterns:
- `experts (argue|note|say|believe)`
- `observers (note|say)`
- `many have said`
- `it is widely (believed|recognised|recognized)`

### 1.7 Copula avoidance
Patterns:
- `serves as a (cornerstone|foundation|testament|reminder)`
- `stands as a (testament|symbol|reminder)`
- `represents a (shift|change|moment)`

### 1.8 Curly quotes
Pattern: any of `“ ” ‘ ’`. Replace with straight quotes unless document style explicitly requires otherwise.

### 1.9 Title case headings
For each markdown heading line (`^#+ `): if heading text has multiple words AND each word starts with a capital letter (excluding articles/prepositions), fail. Sentence case only.

### 1.10 Inline-header puff list
Pattern: `^\*\*[A-Z][a-zA-Z ]+:\*\*` followed by puff word. (e.g. `**Commitment:** We are committed to...`). Write prose.

### 1.11 Challenges-and-future-prospects formula
Patterns:
- `despite (these )?challenges`
- `continues to (evolve|grow|thrive)`
- `looking (forward|ahead) to the future`

---

## Tier 2 — structural rules (LLM grader, four moves)

For the **three sentences carrying most weight** (typically: opening line, project tagline if present, closing line — grader picks):

### 2.1 Name the room
Each weight-bearing sentence must reference a concrete location. Acceptable rooms by project:

| Project | Acceptable rooms |
|---------|------------------|
| justicehub | cell, court, road, remand, watch-house |
| empathy-ledger | signal, tape, studio, airwave, microphone, recording |
| goods | basket, market, hand, country, bush |
| bcv | valley, fence, tree, creek, paddock |
| harvest | table, plate, kitchen, pot |
| farm | paddock, soil, shed, dirt, boots |
| art | image, frame, wall, canvas |
| oonchiumpa | kitchen table, country, desert, Mparntwe |
| bg-fit | gym, weight room, road, mat |
| mounty-yarns | circle, tape, microphone, room |
| picc | island, sand, sea, boat |
| hub | any of the above |

Generic abstract spaces ("space", "platform", "ecosystem", "landscape") DO NOT count as rooms.

### 2.2 Name the body
Each weight-bearing sentence must reference a concrete body or body-action: hand, eyes, feet, breath, voice, ear, mouth, drive, weight, lift, walk, sit, wait, hold. Generic "people", "communities", "stakeholders" do not count.

### 2.3 Load the abstract noun
At least one weight-bearing sentence must take an institutional abstract noun (impact, outcome, cohort, beneficiary, capacity, permanence, control, scale, sustainability) and place it in the concrete room against the concrete body. The word should "break" against the concreteness.

### 2.4 Stop the line
No weight-bearing sentence may end with a `-ing` participial tail, "because" clause, or "which demonstrates / highlighting / reflecting" pattern. Sentence must stop before the explanation.

---

## Tier 3 — plainness test (LLM grader, two questions per sentence)

For each top 3 weight-bearing sentence:

**Q1.** Could a fourteen-year-old in Doomadgee say this without translation? (yes/no)
**Q2.** Does it sound like a pitch deck? (yes/no)

A sentence fails plainness if Q1=no OR Q2=yes. Three sentences must pass for `verdict=pass`.

---

## Tier 4 — name + place verification (LLM grader, project-dependent)

Cross-reference any named person or place against the canonical wiki:

- Source list: `wiki/decisions/act-core-facts.md` (canonical)
- Common errors to flag: "Ntumba" (correct: Oonchiumpa), "Christine" (correct: Kristy or Tanya — verify which), "Rachael" (correct: Rachel Atkinson), "Aboriginal Community Trust" (correct: A Curious Tractor), "ACT Foundation" / "ACT Ventures" (not legal names), bare "ALMA" externally (correct: spell out "Australian Living Map of Alternatives" on first use)

If a person or place name appears in the draft but does not appear in the canonical wiki, raise as a `name_unverified` warning, not a hard fail. Hard fail only on confirmed wrong-name patterns from the list above.

---

## Calibration set

Before this rubric goes into production, run it against:

1. **Three known-good ACT artefacts** (must score `pass`):
   - The closing essay in any LCAA-method document
   - One BCV story spread (verbal-consent verified)
   - The Curtis-style "Four years in. The cockatoo came back before the fence came down." worked example

2. **Three historical drafts known to have AI-register issues** (must score `fail` or `warn`):
   - Any pre-Curtis-method draft from before 2026-04
   - One AI-generated grant draft we previously rejected
   - The "intricate tapestry of systemic injustice" worked example in `writing-voice.md` (must hard-fail on `tapestry`, `intricate`, `delves`)

If the rubric does not catch the bad three or wrongly fails the good three, tune before deploying.

## Versioning

- **v0.1** (2026-05-07) — initial draft from `writing-voice.md`.
- **v0.2** (2026-05-07) — first calibration run 6/6. Added verb-stem inflection coverage (leverage→leveraging→leveraged etc.). Broadened significance-claim regex to catch `its pivotal role` not just `plays a pivotal role`. Removed `landscape` and `nuanced` from base list pending review (low-precision; flag in v0.3 with stricter context). Removed `boasts/features/stands as/serves as/in the heart of/at the forefront of/world-class` from base regex list since they're caught by `forbidden_phrases` and `copula_avoidance` rules respectively.
- v1.0 — promote when Tier 2-3 (Curtis structural moves + plainness) clear live calibration on API credit.

Source of truth remains `.claude/skills/act-brand-alignment/references/writing-voice.md`. Any rule change here must mirror upstream.
