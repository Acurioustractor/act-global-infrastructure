# Data → messaging pipeline

How a signal in CivicGraph, JusticeHub, or Empathy Ledger becomes a claim file becomes a campaign artefact. This is the conversion layer that stops ACT's public copy from drifting into generic advocacy language.

## The stack → the copy (five stages)

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ 1. SIGNAL   │ → │ 2. CLAIM    │ → │ 3. FRAME    │ → │ 4. ARTEFACT │ → │ 5. OUTCOME  │
│ raw data    │   │ sourceable  │   │ narrative   │   │ public copy │   │ response    │
│ (the stack) │   │ (wiki)      │   │ (angle)     │   │ (platform)  │   │ (tracked)   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

### Stage 1 — Signal

A raw data point from one of the three platforms:
- **CivicGraph:** a contract, a Hansard mention, a board overlap, a political donation, an ABN match, a funding flow. Examples: "Queensland Murri Watch contract $1,449,408 FY24-25". "$225,580,000 Queensland youth detention budget FY24-25". "22 organisations, unnamed".
- **JusticeHub:** a program's evidence rating, a funding desert, a program concentration. Examples: "70% Queensland youth justice funding to 3 orgs". "873 LGAs classified as funding deserts".
- **Empathy Ledger:** a consented storyteller quote, a photograph, a testimonial. Examples: Uncle Adrian Coolwell's ABC quote (via public record). Bernice Hookey's peace-of-mind comment (via public Linked post).

Signals live in database tables and API responses. They don't become messaging until Stage 2.

### Stage 2 — Claim

A signal becomes a claim when it's written up in a claim file with:
- The specific sentence that can appear in public copy
- The source, named and dated
- The verification status (verified / inferred / unverified)
- The campaigns that can use it
- The counter-narratives it might trigger

Claim files live in `wiki/narrative/<project>/claim-<slug>.md`. Format:

```markdown
---
claim: "Queensland cut $1,449,408 from Murri Watch"
project: civicgraph
verified: yes
source: ABC News 2026-04-14; Queensland Budget Papers FY24-25
date_captured: 2026-04-14
date_first_used: 2026-04-14 (Murri Watch Post 1)
campaigns: [aesthetics-of-asymmetry, minderoo-pitch]
counter_risk: "government will argue re-investment via 22 new orgs"
counter_response: "force the minister to name the 22"
---

# Queensland cut $1,449,408 from Murri Watch

## Sentence for copy
Queensland cut $1,449,408 from the 34-year-old Aboriginal-led Murri Watch program on 14 April 2026, with a contract end date of 30 June 2026.

## Expanded with context
[2–3 paragraphs]

## Source chain
- ABC News article, 14 April 2026, [URL]
- Queensland state budget papers FY24-25, [line item]
- Murri Watch public statement, [date]

## Where used
- LinkedIn Post 1, 2026-04-14
- Poster Artefact 001
- 16-page document Artefact 001

## What could disprove it
If the government publishes a superseding contract with different figures, this claim retires.
```

Claim files are the stable currency. Everything public cites them.

### Stage 3 — Frame

A claim is not yet a message. The frame turns a factual claim into a narrative angle. Frames we use:

| Frame | Pattern | Example |
|---|---|---|
| **Force-a-trap** | Claim with gap → fork A → fork B → flat request | Murri Watch Post 1 |
| **Ratio shock** | X vs Y, computed ratio, single sentence | "155:1" |
| **Silence as evidence** | What hasn't been said, dated | Murri Watch Post 2 |
| **Named human, dated moment** | One person, one specific day | Uncle Adrian Coolwell, 14 April 2026 |
| **Concentration exposé** | X% to N orgs | "70% to 3" |
| **Desert map** | What's missing, geographic | Funding deserts episode |

Frames belong in `_shared/voice.md`. When a new one proves itself in a shipped artefact, promote it there.

### Stage 4 — Artefact

Claim + frame = artefact. The artefact is the public thing: LinkedIn post, poster, 16-page document, pitch page, one-pager, tour caption, storyteller gallery.

Each artefact cites the claim files it draws from. Each artefact survives the AI-signs filter before ship. Each artefact goes through AutoReason if it's a primary campaign piece.

### Stage 5 — Outcome

The response the artefact produces, tracked in `<campaign>/outreach.md`:
- Who engaged (named humans → update `_shared/contacts.md`)
- What orgs responded or stayed silent (→ update `_shared/orgs.md`)
- What journalists picked it up
- What the target said, or didn't

Outcomes feed back into new claim files. A minister's silence becomes a claim. A funder's warm reply becomes a contact update. The system compounds.

---

## The weekly discipline

In the weekly review, every campaign answers:

1. **New signals this week** — what did the stack surface?
2. **New claims this week** — what got promoted to claim files?
3. **New frames this week** — did any new rhetorical pattern prove itself?
4. **Artefacts shipped** — and which claims did they cite?
5. **Outcomes** — what response, from whom, tracked where?

This is the pipeline test. If any stage is empty, something is broken:
- No new signals → the stack isn't being queried
- No new claims → signals not being promoted to citable form
- No new artefacts → campaigns are stalling
- No outcomes → artefacts shipped without targeting

---

## Cross-campaign claim reuse

One claim can power multiple campaigns. The Murri Watch cancellation claim is the most load-bearing as of 2026-04-15:

- **Aesthetics of Asymmetry:** Artefact 001 subject, Posts 1 and 2
- **Minderoo pitch:** opening proof case (the stack surfacing ministerial silence in under a week)
- **Judges on Country:** bench-facing evidence that funding substitutions can't be verified without a system like the Centre
- **CONTAINED:** if the Queensland leg runs, the claim becomes the first station's anchor

A single claim file powering four campaigns is the efficiency the system is designed for. The weekly review specifically asks: *"what claim surfaced this week that could be used across more than one campaign?"* That question is not rhetorical.

---

## What this pipeline prevents

- **Generic advocacy language.** "Communities deserve better" is not a claim. "Queensland cut $1,449,408 from a 34-year-old Aboriginal-led watch-house program on 14 April 2026" is.
- **Fabricated specificity.** Every dollar, date, and name has to be in a claim file before it appears in a public artefact.
- **Campaign drift.** When the voice slips (AI-signs creeping in, forks dramatised, names forgotten), the claim file shows the original language and resets.
- **Stakeholder exposure.** Storyteller quotes, named community members, private conversations — none of these become claims without an explicit consent path, and the claim file records it.

---

*Maintained by Ben. Reviewed when a new frame proves itself or a new claim goes public.*
