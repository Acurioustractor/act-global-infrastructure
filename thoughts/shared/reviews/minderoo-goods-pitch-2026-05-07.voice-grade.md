# Voice grade — Minderoo Goods pitch (working draft)

> Date: 2026-05-07
> Subject: `thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md` (10,851 chars, 205 lines)
> Grader: `scripts/grade-voice.mjs --file ... --project goods --genre pitch`
> Rubric: `thoughts/shared/rubrics/act-voice-curtis.md` v1.0
> Model: claude-sonnet-4-6
> Verdict: **FAIL** · Score: 0/100

## Headline

The draft is voice-good for an internal operational working document. It is **not** voice-loaded for a funder-facing pitch yet. The author's own checklist at the end (lines 183–184) flags the same gaps the grader found: no Curtis-method moves landed in the three weight-bearing sites (cover line, executive summary opener, envelope email).

## Tier 1 — hard failures (9 real, after grader bug fixes)

| Rule | Evidence | Count | Status |
|------|----------|-------|--------|
| em_dash | `—` (literal) | 5 | replace with comma/period/colon |
| forbidden_vocab | `unlock` | 2 | rewrite "unlock matched investment" |
| forbidden_vocab | `unlocks` | 1 | rewrite "unlocks at each tranche" |
| forbidden_vocab | `leveraged` | 1 | rewrite "2025 cohort leveraged 2.7x" |

The two QBE-language tics (`unlock`, `leveraged`) are inherited from QBE Catalysing Impact's own language — fine in a citation, not fine in ACT voice. Rewrite or attribute (`QBE writes "leveraged 2.7x"`).

## Tier 2 — structural moves (Curtis method)

| Move | Present? | What's missing |
|------|----------|----------------|
| rooms_named | **false** | Goods rooms (basket, market, hand, country, bush) appear only as labels, never as the room a sentence enters |
| bodies_named | **false** | Hand/breath/voice/lift never appear; only role-abstractions (team, buyers, suppliers, lead, advisor) |
| abstract_loaded | **false** | Abstracts are everywhere (parity, infrastructure, participation, demand, supply, outcomes, catalytic) but none is loaded against a concrete |
| line_stops | **false** | Most weighted sentences carry an explanation tail or dependent clause |

## Tier 3 — plainness

| Test | Result |
|------|--------|
| doomadgee_test (does it read plainly to a 14-year-old in Doomadgee?) | **false** |
| pitch_deck_test (does it sound like a pitch deck?) | **true** (= bad) |

Sample non-plain sentences flagged:
- "the participation precondition fails across eight of nine domains"
  → plain: "Eight out of nine things that get a kid into work are broken here."
- "demand-side infrastructure"
  → operational reality, not Doomadgee-readable
- "Program-Related Investment", "catalytic grant", "operational layer", "agent layer in production"
  → finance/tech jargon, not Curtis register

## Grader's weight-bearing sentence picks

These are the three sentences carrying the most meaning if everything else were cut:

1. "Goods on Country is the demand-side infrastructure for First Nations employment parity."
2. "In FY25-26 Goods has invoiced $1.35 million through real trade, with $16.3 million in the open pipeline."
3. "When the demand-side infrastructure works, the participation precondition resolves through trade, not transfer."

None of them satisfy the Curtis method. All three are candidates for rewrite before this goes to Lucy.

## Concrete fixes (from grader advice)

- **Land at least one room.** Sample: *"The market is a basket-and-handshake, not a policy window."* That one line earns rooms_named.
- **Land at least one body.** Sample: *"Nic shakes the hand; the contract follows."* Body-action doing Curtis work.
- **Load the abstract against the concrete.** Sample: *"The basket is the parity outcome. The hand is the infrastructure."*
- **Stop the line.** Don't write "Goods routes the demand into the certified, financed, capable enterprises these programs already produce." Write "Goods routes the demand. The enterprises already exist."

## Three priority sites for Curtis-method rewrite (per grader)

1. **Cover line** (sets register for everything else)
2. **Executive summary opener** (the page Lucy reads first)
3. **Envelope email to Lucy** (~150 words; short enough that one or two sentences can carry all four moves; ideal template anchor for the rest)

If the envelope email lands the four moves, the rest of the document can borrow that register.

## Cost

~$0.02 in Anthropic tokens for this single grade run (Sonnet 4.6, ~3K tokens output).

## Recommendation

Don't rewrite the entire 10K-character draft. Apply Curtis method only at the three sites above. The body of the document can stay in operational register since Lucy's team will need the operational facts. The pitch-deck-vs-Curtis tension is real: Minderoo wants both numbers and the line that makes them feel the work. The cover, summary opener, and email are where Curtis lands.

## Next step

Operator decision: rewrite cover/summary/email now (use this grade as the brief), or hold until Nic's 10-min call resolves the structural questions on lines 124–140 (which would change the pitch substance anyway).
