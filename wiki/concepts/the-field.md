---
title: The Field
status: Active
date: 2026-06-03
summary: ACT's living model of relational energy — the thing you read each morning to sense where energy is warm and where it's stuck, and to decide what to give and what to tend. The name and vision over the energy-orbit mechanics.
relates_to: energy-orbit.md (the mechanics) · relationship-first-crm.md (the philosophy) · act-business-architecture.md (the projects)
---

# The Field

> A field is what carries force between two bodies without them touching. That is relational energy — the pull between people across distance. **The Field** is ACT's living model of that energy: not a contact database, but a sense of where energy is warm and where it has gone slack, read each morning, so we can be deliberate about what we give and what we receive.

You don't *work* The Field. You **read** it, then you **tend** it.

## What it is (and is not)
- It **is** a living map of ACT's relationships, kept honest by what actually happens — every email, every meeting, every call — and grounded in who people really are in the institutional landscape.
- It is **not** a CRM, a pipeline, or a funnel. Belonging comes before money. People are artists and allies, not leads. The community lane is never laddered, scored, or dripped.

## The two lanes (never one funnel)
- **The orbit** — the supporter lane. Energy *toward* ACT, held in mutual pull: warmth rings, with the hand-picked `circle:gsd-alliance` core. Read by warmth and evidence.
- **The constellation** — the community lane. Sovereign contributors (storytellers, elders). Measured by what ACT **owes back**, never by their use to us. The transcript owes-ledger lives here.
- **The line** between them is never crossed into a funnel. (See [[energy-orbit]] for the mechanics.)

**The Kristy rule — one person, many relationships.** Some people genuinely hold both lanes: Kristy Bloomfield is a Traditional Owner and storyteller (community) *and* runs Oonchiumpa, partners directly on Goods, and leads youth-justice work (a working peer). The model holds this by separating the person from the relationships: `lane:community` is a **floor of protections** (no tiers, no drips, owes honoured — always), not a box; **earned crossover** (real work, not newsletter subscriptions) means multi-project tags are *correct*; `circle:gsd-alliance` on a community person is **pure recognition** — it must never drag comms automation with it; and `role:` tags carry the multiplicity (`role:traditional-owner` + `role:storyteller` + `role:partner` can all be true; `role:funder` on a person is usually the org/person confusion — the org receives funds, the person is not your funder).

## Reciprocity — the heart of it
Every relationship is alive when energy flows both ways. So the unit The Field tracks is not "frequency of contact" but **energy given / energy received**: did this touch *give* energy (we helped them) or *receive* it (they helped us)? Read each morning, the question is simple — *where is energy flowing, where is it stuck, what do I give today, what's being given to me?*

## Tending — reading what each relationship needs
You tend relationships the way you tend crops: not all the same, each by what it actually needs.
- **Water** — attention and contact. A relationship dries out without it; *cooling* is the field telling you something needs water.
- **Sun** — to be seen. Recognition, attribution, a platform, their work showcased. Being seen energises; for the constellation, honouring the owes *is* the sun.
- **Nutrients** — the specific thing this one needs to grow: an introduction, capital, advice, a door. Diagnosed per person, never one-size.
- **Support / staking** — holding someone up through a hard season; vouching, defending.

And the discipline: **don't over-water.** Some relationships need space, not more contact; over-tending smothers, and that is the extraction the model refuses. CivicGraph shows the *soil* a person is rooted in (their org, their community); timing is *seasonal* — you plant and harvest when it's right. So the next move per person stops being "ask X" and becomes a diagnosis: *does this need water, sun, or a specific nutrient?*

## Leaving the Field — where our own energy comes from
You cannot tend from an empty well. A field worked without rest goes to seed, and a tender who only ever gives runs dry. So the second motion of The Field is **leaving it** — stepping out to learn new methods, to be scientific, to be *fed* by people instead of feeding them, to rest. This is not neglect; it is how the tending stays possible. You come back with new energy, new methods, new seed to plant.

This reframes the travel: the World Tour is ACT **leaving the field to gather energy and insight**, then returning to plant it. The Field should hold this rhythm honestly — including an honest read of *our own* energy (are Nick and Ben replenished, or running dry?), because a depleted tender is the first thing the field feels.

Received energy, then, comes from two places: from *within* the field (a reciprocal touch) and from *leaving* it (learning, people, rest). Both count. Both feed the giving.

## The four feeds (what keeps it alive)
The Field is only as true as what flows into it. Four streams, enriched overnight by the local model (qwen), reviewed by Ben/Nic by day:

1. **The corpus** — all act.place email (benjamin/nicholas/hi/accounts). Not just *how warm* each person is (dyadic), but **who's in the room together** (the thread/CC graph) — the *edges* that make this a network and not a scatter. Stays local; content never leaves; the community line holds.
2. **The institutional graph** — CivicGraph/GrantScope. Resolve every person to their entities, boards, and directorships, then to *who else sits there*. This gives **position** (where someone sits in the landscape) and **paths** (the warm route to a cold target is through whoever's already on their board), with the funder-discernment overlay (halo-wash vs community-controlled).
3. **Live capture** — every meeting, call, and WhatsApp. A voice memo or one line, structured into *who · energy given · energy received · what they need · next move*. Frictionless or it won't happen. This is the reciprocity ledger, per touch — the truest warmth signal there is.
4. **Intent** — what Nick & Ben are actually trying. The bets, the experiments, the travel (the World Tour is a structured insight-gathering campaign, not a holiday). The Field holds ACT's strategy enacted through relationships, and what each conversation taught us.

## Enrichment — how The Field learns about people (understand, never corner)
Every enrichment passes one test: *does knowing this help us **tend** them — give the right water, sun, or nutrient, and honour them — or does it help us **corner** them?* If the second, we don't do it. The Field enriches to understand, not to target. Three families:

1. **Structural — public record.** CivicGraph (orgs/boards/interlocks — the soil, built) · LinkedIn (role, history) · ASIC/ORIC/ACNC directorships · media/news · academic (ORCID/OpenAlex). Tools available + keyed: **Exa** (`person_identity_map` already carries `exa_enriched`), **Firecrawl**, **Tavily**, **Perplexity**.
2. **Behavioural — the signal we already generate.** Beeper/WhatsApp warmth · Gmail/calendar history · the reciprocity ledger from live capture. Truer than any scrape — it's real interaction.
3. **Reflective — the richest, and the most aligned.** Us, writing about a person: what they're trying to do in the world, what they care about, what they might need, what we admire. The act of writing it *is* tending.

**The person page** (`thoughts/shared/people/<name>.md`, built by `scripts/build-person-pages.mjs`) holds four layers: **Soil** (CivicGraph, auto) · **Web & work** (Tavily/Exa, auto) · **Understanding** (qwen draft — overnight, local, free) · **Reflection** (the human texture, by hand). Community lane is **excluded** from web-profiling — storytellers are honoured via the owes-ledger, never researched for leverage. The B2B enrichers (Apollo/Clearbit) are powerful but their *spirit* is extractive — use data, refuse the lead-scoring frame.

## The daily face
Open The Field each morning. It shows where energy is flowing and where it's stuck, who is **warm but unasked** (the latent gold), who is **cooling**, what ACT **owes**, and the day's moves — per project (what's needed → who we have → the gaps → the next move) and per person.

Current surfaces: `thoughts/shared/orbit-viz.html` (the shape) · `thoughts/shared/project-scope-board.html` (the decisions). Built read-only by `scripts/build-orbit-viz.mjs` and `scripts/build-scope-board.mjs`.

## Family & friends — the inner ground
Dunbar's inner layers aren't a marketing audience; they're mostly **family and close friends** — the people the energy budget exists to protect. They carry `role:family` / `role:friend`, sit in the inner rings by right (no tier needed, no earning), and are **never** placed in a comms funnel. The Field holds them so the morning read can tell the truth: if the inner 5 is going quiet, that's the first thing to tend.

## Vocabulary
- **Read the Field** — the morning practice (sense before act).
- **Tend** — the deliberate act of giving or receiving energy.
- **The orbit / the constellation / the line** — supporter lane / community lane / the boundary.
- **Warm · cooling · latent · owed** — the states a relationship can be in.
- **Energy given / received** — the reciprocity ledger.

## How it stays better over time
The local model proposes overnight (enrichment, classifications, who-to-reach drafts); Ben/Nic correct by day; each correction becomes a labelled example that sharpens the next night's proposals (few-shot now, fine-tune later). Night shift drafts; day shift decides. No external write happens without a human. See the night-shift/day-shift split in `~/.claude/rules/workflow.md`.

## Guardrails (carried from the orbit)
Community lane never energy-scored (OCAP). All GHL/EL/Notion writes are gated, day-shift, human-in-loop. `consent-check` before anything outward-facing. Targets resolved live, never from stale mirrors or pasted IDs.
