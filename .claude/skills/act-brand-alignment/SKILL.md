---
name: act-brand-alignment
description: ACT brand alignment for all ecosystem projects. Use for ANY work on ACT sites, projects, content, design, or strategy. Understands ACT identity, LCAA method, dual-entity structure, all projects, voice/tone, and visual language.
---

# ACT Brand Alignment

## When to Use
- Writing/editing ANY ACT content (web, marketing, grants, reports)
- Designing UI, visual assets, or brand materials
- Planning information architecture
- Creating content models or data structures
- Reviewing copy for voice/tone alignment

## Quick Reference

### Identity
A Curious Tractor is a regenerative innovation ecosystem partnering with marginalised—especially First Nations—communities to dismantle extractive systems. Like a tractor's power take-off, we transfer resources to community-led initiatives. We hand over the keys.

### Method (LCAA)
Listen → Curiosity → Action → Art

### Values
- Radical Humility (no saviors)
- Decentralised Power (communities lead)
- Creativity as Disruption (revolution through imagination)
- Truth-telling (name extractive systems)

### Promise
40% of profits flow to community ownership. We design for our own obsolescence.

## Project Scope Mapping

| Project | Focus | Load |
|---------|-------|------|
| Hub (act.place) | ACT as ecosystem, LCAA, partnerships | `brand-core.md` |
| ACT Farm / BCV | Land practice, conservation, residencies | `land-practice.md` |
| JusticeHub | Justice innovation, forkable models | `projects-ecosystem.md` |
| Empathy Ledger | Ethical storytelling, consent, sovereignty | `projects-ecosystem.md` |
| The Harvest | CSA, community gatherings | `land-practice.md` |
| Goods on Country | Circular economy, waste-to-product | `projects-ecosystem.md` |
| Art | Art as revolution, cultural production | `projects-ecosystem.md` |

## Voice Guardrails

**Writing voice (load `references/writing-voice.md` for ANY public-facing writing).** ACT voice uses Ian Curtis's method of compression: name the room, name the body, load the abstract noun, stop the line before the explanation. Forbidden AI tells (delve, crucial, pivotal, tapestry, underscore, em dashes, negative parallelisms, superficial -ing tails, "challenges and future prospects" formulas) are listed in that file and must be rejected on sight.

### Auto-grade before sending

**For any pitch, grant, web copy, board report, donor letter, journal spread, caption, or essay**, run the voice grader before declaring the draft ready:

```bash
node scripts/grade-voice.mjs --file <path> --project <slug> --genre <slug>
```

- `--project` slugs: `hub`, `justicehub`, `empathy-ledger`, `goods`, `bcv`, `harvest`, `farm`, `art`, `oonchiumpa`, `bg-fit`, `mounty-yarns`, `picc`
- `--genre` slugs: `pitch`, `grant`, `web`, `board-report`, `donor-letter`, `journal-spread`, `caption`, `essay`, `press`

Verdict semantics:
- **`pass`** → safe to send (all four Curtis moves landed, no AI tells, plainness clean)
- **`warn`** → operational sections may carry technical register (acceptable for working drafts; tighten the cover/exec-summary/email opener before submission)
- **`fail`** → at least one Tier 1 hard rule tripped (em-dash, forbidden vocab, negative parallelism, etc.) — do not send until fixed

The grader writes its full output to stdout and exits non-zero on `fail`. Capture grades to `thoughts/shared/reviews/<slug>.voice-grade.md` for any artefact going to a funder.

Rubric source of truth: `thoughts/shared/rubrics/act-voice-curtis.md` v1.0 (calibrated 6/6 on canonical fixtures). Any rule change must mirror back to `references/writing-voice.md`.

Cost: ~$0.02 per grade (Sonnet 4.6, ~3K tokens). Use `--tier1-only` for a free deterministic check.

### Funder-cadence grade (in addition to voice grade, for any funder-facing draft)

**For any pitch, term-sheet response, renewal, follow-up, or report addressed to a specific funder**, also run the funder-cadence grader. Layered on top of the voice grade: voice-curtis catches AI-tells, funder-cadence catches funder-specific cadence misses (wrong opener for the relationship stage, leading with a `claims_to_avoid` claim, dollars cited without an invoice or signed-letter row, primary-contact name out of date).

```bash
node scripts/grade-funder-cadence.mjs --file <path> --funder <slug> [--cycle <slug>]
```

- `--funder` slugs (resolved against `wiki/narrative/funders.json`): `minderoo`, `qbe-catalysing-impact`, `dusseldorp-forum`, `paul-ramsay-foundation`, `tim-fairfax`, `smith-family`, `amnesty-australia`, `niaa`, `jcf`, `atlassian-foundation`, `snow-foundation`, `patagonia`, `allbirds`, `who-gives-a-crap`, `centrecorp`, `rotary-eclub-outback`, `vincent-fairfax`, `social-impact-hub`, `state-qld-dfsdscs`, `streetsmart-australia`, `westpac-scholars-trust`
- `--cycle` slugs (optional): `intro`, `pitch`, `renewal`, `report`, `followup`, `term-sheet`. Skip if the cycle isn't yet defined in funders.json.
- `--tier1-only` for a free deterministic pass (skips the Sonnet 4.6 call but keeps every dollar-citation, forbidden-claim, and canonical-name check).

Verdict semantics mirror voice-curtis (`pass` / `warn` / `fail`); a Tier-3 judgment miss (claims-to-avoid leading, dollar uncited, stage misalignment, primary-contact stale) counts as `fail` not `warn` per the 2026-05-07 calibration. Capture grades to `thoughts/shared/reviews/<slug>.funder-cadence-grade.md` for any artefact going to a funder.

Run **both** the voice-curtis grader AND the funder-cadence grader before declaring a funder-facing draft ready to send. Voice grader is funder-agnostic (project + genre); funder-cadence is funder-specific (claims, stage, contact).

Rubric source of truth: `thoughts/shared/rubrics/funder-cadence.md` v0.1 (calibrated 6/6 on Minderoo Goods pitch, QBE term-sheet, Dusseldorp renewal + 3 negative fixtures).

### Alignment-loop self-grade (for synthesis docs only)

Auto-applied by the three `scripts/synthesize-*.mjs` Phase-1 cycle scripts (`project-truth-state`, `funder-alignment`, `entity-migration-truth-state`). Grades the synthesis against `thoughts/shared/rubrics/alignment-loop-synthesis.md` v0.1 via `scripts/lib/alignment-loop-grade.mjs`. On `pass` the synthesis commits clean; on `warn`/`fail` a triage report lands at `wiki/output/lint-loop-YYYY-MM-DD.md`. Pass `--no-grade` only when running in environments without `ANTHROPIC_API_KEY` (cron stubs, CI without secrets).

**DO:**
- Farm metaphor: seeds, harvest, cultivating, soil, seasons, fields
- Community ownership, co-stewardship, Indigenous sovereignty
- "Designing for obsolescence" / "handing over the keys"
- Name Jinibara Country when referencing the land
- 40% profit-sharing commitment
- Concrete rooms. Concrete bodies. Stopped lines.

**DON'T:**
- Overclaim ("world-leading," "revolutionary")
- Extractive, luxury, or commercial language
- Frame communities as beneficiaries (they are co-owners)
- Corporate jargon or glossy marketing speak
- Imply permanence (we design for obsolescence)
- AI register (puffery, rule of three, elegant variation, em dashes, significance claims)

## Visual Language
- Palette: Stone 50-900 + Emerald accents
- Typography: Geist Sans
- Motifs: Seeds, cockatoos, regenerative farming

## File References

| Need | Reference |
|------|-----------|
| Identity, LCAA, values, voice | `references/brand-core.md` |
| **Writing voice (Curtis method + AI tells to avoid)** | **`references/writing-voice.md`** |
| Land details, conservation | `references/land-practice.md` |
| All projects/seeds, revenue | `references/projects-ecosystem.md` |
| Page patterns, IA | `references/content-structure.md` |
