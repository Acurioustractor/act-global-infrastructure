---
title: The Aesthetics of Asymmetry
status: Active campaign — Month 1
date: 2026-04-14
entity_type: art-campaign
canonical_slug: the-aesthetics-of-asymmetry
cluster: civicgraph
parent_project: civicgraph
tier: campaign
tags: [civicgraph, justicehub, empathy-ledger, art, campaign, data-art, institutional-critique]
---

# The Aesthetics of Asymmetry

> *An art project about what happens when public systems become visible. Six episodes, one living data organism. April–September 2026.*

## What it is

A six-episode public art campaign that turns ACT's three platforms ([[civicgraph|CivicGraph]], [[justicehub|JusticeHub]], [[empathy-ledger|Empathy Ledger]]) into a living data organism people can stand inside, argue with, and carry away as physical objects. Each episode sits in the lineage of institutional critique (Hans Haacke, Mark Lombardi, Forensic Architecture), digital-age visibility politics (Hito Steyerl, Hasan Elahi, Mimi Onuoha), and Indigenous data sovereignty (Maiam nayri Wingara, CARE principles).

It is also quietly the marketing layer for a real commercial arm: CivicGraph subscriptions, JusticeHub evidence queries, and Empathy Ledger syndication all sit one click below the art. The campaign's thesis is that the art is the marketing — and the marketing is honest because the platforms already do what they claim.

## The six episodes

| #   | Slug                               | Status                     | After               | One-line                                                        |                                                                          |
| --- | ---------------------------------- | -------------------------- | ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 01  | [[episode-01-keyhole               | The Keyhole]]              | LIVE · April 2026   | James C. Scott                                                  | What the applicant sees, what the funder sees, the distance between them |
| 02  | Resolution                         | Building · May 2026        | Hito Steyerl        | Clarity can be care. Clarity can be capture. The pixel decides. |                                                                          |
| 03  | The Missing Folder                 | Scheduled · June 2026      | Mimi Onuoha         | 873 postcodes where absence is the subject                      |                                                                          |
| 04  | The Promise and the Purchase Order | Scheduled · July 2026      | —                   | Hansard vs the money trail                                      |                                                                          |
| 05  | The Alibi                          | Scheduled · August 2026    | Hasan Elahi         | Total transparency as concealment                               |                                                                          |
| 06  | CARE                               | Scheduled · September 2026 | Maiam nayri Wingara | Consent is the only honest transparency                         |                                                                          |

## How it connects to the ecosystem

- **[[civicgraph|CivicGraph]]** — the systemic data layer. Public records joined by ABN: 587K entities, 1.5M relationships, $74B in contracts, 301K political donations, 30K grants. The art pulls live from GrantScope's public `/api/data/*` endpoints.
- **[[justicehub|JusticeHub]]** — the evidence layer. 1,775 community-led programs, 128 verified top-tier. The art links to JusticeHub's program search wherever a viewer wants to know "what works, where?"
- **[[empathy-ledger|Empathy Ledger]]** — the narrative sovereignty layer. 226 consent-governed storytellers. The campaign registers a new `syndication_site` in EL v2 and pulls consented content (quotes, portraits, transcripts) via the public `/api/syndication/justicehub/*` pattern. Registration steps live in `act-aesthetics-of-asymmetry/OPERATOR_NOTES.md`.

## Technical architecture

A separate Next.js 15 app at `aesthetics.act.place` (currently developed at `/Users/benknight/Code/act-aesthetics-of-asymmetry`). Consumes GrantScope public APIs and a new EL v2 site-scoped API. Uses:

- `@cosmos.gl/graph` — GPU force graph at 500K+ nodes
- `sigma` + `graphology` — curated sub-views
- `deck.gl` + `mapbox-gl` — funding deserts, flows by geography
- `p5` + `three` — organic motion, GLSL aesthetics
- `scrollama` + `gsap` — scrollytelling

See [[what-is-the-living-organism-the-visual-system-for-the-aesthetics-of-asymmetry|the Living Organism synthesis]] for the full spec.

## Brand system

Austere / confrontational. Bauhaus reference points: font-black uppercase display, monospace data, 4px heavy borders. Palette locked to near-black `#0A0A0A`, bone cream `#F5F5F0`, urgent red `#DC2626`, deep navy `#0A1628`. Typography: Archivo Black (display), Inter (body), JetBrains Mono (data).

This diverges deliberately from the [[visual-system|Red Centre]] paperback aesthetic that anchors ACT's other outputs. The campaign is asymmetric to the rest of the ecosystem in appearance — that is the point.

A fresh Pencil (`.pen`) design file will be created to house the emblem (filing-cabinet-with-glowing-empty-folder — Onuoha homage), poster templates, and social assets.

## Physical artifacts

Every episode ships with a printable artifact. Plotter-compatible SVG exports via p5-svg → AxiDraw. Riso colour separation for posters. QR codes on the back link to parameterised URLs (`/episode/keyhole?entity=<id>`) so a physical postcard opens a specific live view.

| Episode | Artifact |
|---|---|
| 01 Keyhole | A2 poster, keyhole die-cut, 2-colour Riso |
| 02 Resolution | AxiDraw 6-panel gradient print |
| 03 Missing Folder | Screen-printed manila-folder set |
| 04 Promise / Purchase Order | A1 broadsheet foldout |
| 05 Alibi | Personalised foldout poster |
| 06 CARE | QR postcard to EL storyteller audio |

## Narrative store

Campaign claims live in [wiki/narrative/civicgraph/](../../narrative/civicgraph/INDEX.md). Each LinkedIn post, pitch, or press piece deploys a specific claim and is logged via `narrative-log-deployment.mjs`. Frames in rotation: structural, confrontational, evidentiary, testimonial, invitational, constructive, art.

## Related

- [[civicgraph|CivicGraph]]
- [[justicehub|JusticeHub]]
- [[empathy-ledger|Empathy Ledger]]
- [[third-reality|The Third Reality]]
- [[civic-world-model|Civic World Model]]
- [[funding-transparency|Funding Transparency]]
- [[what-is-the-living-organism-the-visual-system-for-the-aesthetics-of-asymmetry|The Living Organism — visual system synthesis]]
- [[how-does-empathy-ledger-v2-integrate-with-civicgraph-and-justicehub-to-add-the-h|The Human Layer — EL integration synthesis]]
- [[how-does-act-grow-without-fanfare-through-word-of-mouth-incredible-experiences-a|Growing Without Fanfare — campaign philosophy]]

## Backlinks

- [[wiki/index|Tractorpedia Index]]
- [[civicgraph|CivicGraph]]
- [CivicGraph Narrative Index](../../narrative/civicgraph/INDEX.md)
