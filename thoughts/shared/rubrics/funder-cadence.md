# Rubric: Funder cadence

> Slug: `funder-cadence`
> Version: 0.1 (DRAFT — calibration pending)
> Created: 2026-05-07
> Source of truth: `wiki/narrative/funders.json` (per-funder tone, themes, claims_to_lead_with, claims_to_avoid, ask_amount_aud, stage)
> Use: pass to Anthropic Managed Agents Outcomes, or to a local grader before sending any pitch / report / renewal / followup to a funder.
> Calibration: 0/0 (no fixtures yet — see `funder-cadence.calibration.md`)
> Status: **draft**, not production-eligible until calibration ≥ 6/6.
> Pass threshold: clean Tier 1 + ≥3 of 4 structural moves + zero `claims_to_avoid` hits + every dollar figure cited.

## What this rubric grades

Any draft funder-facing communication: pitches, briefs, proposals, renewal letters, mid-cycle reports, term-sheet correspondence, board-ready summaries, intro emails, follow-ups. Internal funder-mapping notes, decision-log entries, and Slack/Telegram summaries are out of scope.

The rubric layers on top of `act-voice-curtis` (which catches AI-tells, em-dashes, plainness drift). This rubric adds the funder-specific cadence checks: right opening, right claims, right tone, every dollar cited.

## Inputs

- `text` — the draft (markdown or plain text)
- `funder_slug` — key in `wiki/narrative/funders.json` (e.g. `minderoo`, `qbe-catalysing-impact`, `dusseldorp-forum`)
- `cycle` — optional: `intro` | `pitch` | `term-sheet` | `report` | `renewal` | `followup` | `closing`
- `cited_sources` — optional array of `{ amount, source }` where source is a Xero invoice ref, decision-log entry, board paper, signed contract, or named document. Used by Tier 2 dollar-figure check; can also be inferred from inline citations in the text.

## Output (grader must produce all)

```json
{
  "verdict": "pass" | "warn" | "fail",
  "score": 0-100,
  "funder_loaded": "minderoo",
  "funder_stage": "ask-pending",
  "hard_failures":   [{ "rule": "uncited_dollar_figure", "evidence": "$2.9M over 3 years", "line": 14 }],
  "warnings":        [{ "rule": "lead_claim_off_funder_thesis", "evidence": "...", "line": 22 }],
  "suggestions":     [{ "rule": "open_with_funder_language", "evidence": "...", "advice": "Minderoo published 'Cost of Late Intervention 2024'; lead with that frame, not generic JH ask." }],
  "structural_check": {
    "opens_in_funder_language": true,
    "lead_claim_is_authorised": true,
    "ask_matches_ledger": true,
    "every_dollar_cited": false
  },
  "judgment_check": {
    "tone_matches_funder_record": true,
    "no_stage_contradiction": true,
    "closing_gives_next_step": true,
    "no_claims_to_avoid": true
  }
}
```

`verdict = fail` if any Tier 1 hard rule trips OR any `claims_to_avoid` appears OR any dollar figure is uncited.
`verdict = warn` if Tier 1 + Tier 3 clean but `structural_check` has any `false`.
`verdict = pass` if Tier 1 clean + all four structural checks pass + all four judgment checks pass.

The act-voice-curtis rubric must also be run against the same text. A `fail` there is a `fail` here; this rubric does not duplicate those checks.

---

## Tier 1 — hard rules (binary, BLOCK on hit)

### 1.1 Funder name spelled correctly
The funder's `name` from `funders.json` must appear at least once. Misspellings (`Minderoo Foundation` vs `Mindaroo`, `Dusseldorp Forum` vs `Düsseldorp`) are hard fails. Acronyms (`QBE`) are acceptable when also expanded once.

### 1.2 No `claims_to_avoid` content
For each claim ID in the funder's `claims_to_avoid` array, fetch the claim from the appropriate `wiki/projects/<project>/<claim>.md` and check the draft does not deploy that argument structure. A direct verbatim copy of the claim's headline, OR a clear paraphrase (judgment check), is a hard fail.

Example: Minderoo's `claims_to_avoid: ["contained:claim-evidence-is-settled-question-is-political-will"]` — any draft that opens with "the evidence is in" or "this is a political-will problem" fails.

### 1.3 Every dollar figure has a source
Pattern: any `\$[\d,.]+(?:\s*(?:M|K|m|k|million|thousand|billion|bn))?` token in the text.

For each match, the grader must find a citation within ±200 characters OR in `cited_sources` OR in the document's `## Sources` / footnote section. Acceptable citation forms:
- Xero invoice/bill reference: `INV-0123`, `BILL-456`
- Decision-log entry: `wiki/decisions/2026-04-24-...`
- Board paper / contract: `wiki/funders/minderoo/2026-04-17-three-circles-proposal.md`
- Public source with link: `Minderoo, Cost of Late Intervention 2024 update`

Bare numbers like "$2.9M over 3 years" with no nearby source are hard fails. The exception: a number that IS a forward ask (the explicit ask amount in this draft) is allowed if it matches `funders.json.ask_amount_aud` for this funder.

### 1.4 No fabricated relationship claims
Patterns to flag for source check:
- `(we|ACT|JusticeHub|Empathy Ledger) (partnered|worked|collaborated) with`
- `(funded|supported|backed) by`
- `(committed|pledged|granted) (us|ACT|the project)`

For each match, require an inline citation (signed contract, signed letter, decision-log entry, public announcement). Match without citation is a hard fail.

### 1.5 Inherits all act-voice-curtis Tier 1
Em-dashes, AI vocabulary, negative parallelism, significance claims, knowledge disclaimers, vague attribution, copula avoidance, curly quotes, title-case headings, inline-header puff, challenges-and-future-prospects formula. Run that rubric first; failures there fail here.

---

## Tier 2 — structural rules (4 moves, LLM grader)

For the draft as a whole:

### 2.1 Opens in funder language
The first three weight-bearing sentences must reference the funder's published strategy, theme vocabulary, or named report by language the funder itself uses. Pulled from `funders.json[funder_slug].framing_notes` and `themes`.

Generic ACT openings ("ACT runs JusticeHub which...") fail this check.

Example pass for Minderoo: "Minderoo has helped Australia name the cost of late intervention" — uses Minderoo's own published frame.
Example fail for Minderoo: "JusticeHub is a community-led platform that..." — generic, doesn't load the funder's language.

### 2.2 Lead claim is authorised
The first major argument the draft makes must match a claim ID in the funder's `claims_to_lead_with` array (or explicitly justify deviation in a `framing_notes`-cited footnote).

Example pass for Minderoo: lead with `justicehub:claim-ten-anchor-communities-filter-is-relationship` (anchor-community hold, not a product pitch).
Example fail for Minderoo: lead with `justicehub:claim-three-circles-build-the-library` — that's a later move, not the opener.

### 2.3 Ask matches the ledger
If the draft contains an explicit ask amount, it must match `funders.json[funder_slug].ask_amount_aud` (within 5% rounding for prose) OR be explicitly framed as a Year-1 staged entry of the canonical ask (e.g. "$780K Year 1 of the $2.9M Three Circles ask").

Drafts at `cycle = report` or `renewal` may instead reference the *received* amount rather than the open ask — judgment check confirms.

### 2.4 Every dollar cited (structural reinforcement of 1.3)
Tier 1 already blocks any uncited dollar. This Tier 2 check ensures the *structure* of citations is consistent: footnotes vs inline vs Sources section. Pick one mode per draft.

---

## Tier 3 — judgment rules (LLM grader, full-pass)

The LLM is given the full text + the funder's full `funders.json` record + the relevant claim docs.

### 3.1 Tone matches funder record
Compare the draft's tone against `funders.json[funder_slug].tone`. Examples:
- Minderoo: `communities-first, evidence-rich, place-based, structurally honest, board-defensible` — fail any draft that sounds advocacy-confrontational.
- QBE: `investor-grade, cost-honest, no hand-waving` — fail any draft that uses charity-case framing.
- Dusseldorp Forum: per their record (read at grade time).

### 3.2 No stage contradiction
The draft must not contradict the relationship's current `stage`. Examples of contradictions:
- Stage = `active-partner` but draft writes as if first-introduction.
- Stage = `term-sheet-pending` but draft asks for cold meeting.
- Stage = `closed-not-funded` but draft writes as if active.

### 3.3 Closing gives a next step
The closing paragraph must name a concrete next action: a date, a meeting, a signature, a deliverable, a return-call window. Drafts that close on aspirational language without a next step fail.

### 3.4 No paraphrased claims_to_avoid
Tier 1.2 catches verbatim use; Tier 3.4 catches paraphrase. The judgment grader is given each `claims_to_avoid` claim's full text and must confirm the draft does not deploy that argument structure even in altered words.

---

## Calibration plan

Six fixtures minimum across three funders × two genres before this rubric goes production-eligible:

| ID | Funder | Cycle | Verdict | What it tests |
|----|--------|-------|---------|---------------|
| good-1 | Minderoo | pitch | pass | The 2026-04-21 jh-minderoo-canonical-2026 draft after one round of edits |
| good-2 | QBE | term-sheet | pass | A future Goods-on-Country investor brief once cost report is in |
| good-3 | Dusseldorp | renewal | pass | Active-partner renewal with received-amount citation |
| bad-1 | Minderoo | pitch | fail | Generic JH pitch (no Minderoo language) — fails 2.1 |
| bad-2 | Minderoo | pitch | fail | Includes `claim-evidence-is-settled-question-is-political-will` — fails 1.2 |
| bad-3 | QBE | pitch | fail | Charity-case framing in investor draft — fails 3.1 |

Calibration file at `funder-cadence.calibration.md` to be filled when fixtures are written.

---

## Why this rubric

ACT funder relationships are long-arc. A single off-tone pitch to a sceptical board can close a door for a year. The funders.json record IS the institutional memory of how each funder reads — what language lands, which claims they've already heard, where they are in the relationship arc. This rubric makes that memory load-bearing on every draft, instead of optional.

Calibration target: 6/6 across the fixture matrix. Until then, treat output as advisory.
