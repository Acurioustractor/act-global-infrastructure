---
title: Living Ecosystem System - Knowledge and IA Readiness
created: 2026-04-12
updated: 2026-04-12
status: active
type: reference
tags:
  - project/living-ecosystem
  - knowledge
  - information-architecture
  - wiki
  - source-packet
  - governance
aliases:
  - Knowledge IA Readiness
  - Living Ecosystem Knowledge Readiness
cssclasses: []
---

# Living Ecosystem System - Knowledge and IA Readiness

> [!abstract] Assessment
> The wiki/Obsidian/source-bridge/source-packet system is close, but not yet fully in the state we would call "done." The canonical registry, source-packet schema, wiki structure, and hub-facing pages are all real. What is still missing is a small set of first-class page types and the final ownership decisions that make the system unambiguous to operate.

## Verified Current Capabilities

- The wiki already has a meaningful structure across projects, research, communities, art, outputs, and narrative pages.
- The knowledge system already produces machine-readable canon from `config/living-ecosystem-canon.json` and a generated registry in `wiki/output/living-ecosystem-canon-latest.{json,md}`.
- The source-packet contract already exists in `config/living-source-packet.schema.json` and `config/living-source-packet.example.json`.
- The packet shape is already good enough to model:
  - one canonical entity
  - one or more source refs
  - narrative copy
  - media assets
  - review gates
  - output targets
  - provenance
- The hub-facing surfaces already exist in `act-regenerative-studio`:
  - `/`
  - `/ecosystem`
  - `/projects`
  - `/wiki`
  - `/art`
  - `/method`
  - `/governance`
  - `/ask`
  - admin review surfaces like `knowledge-review`, `content`, `wiki-scanner`, and `enrichment-review`
- The hub already consumes generated project/pack data from the wiki/EL side rather than being a totally isolated brochure.

> [!note] Readiness read
> The system is operationally close enough to use, but not yet clean enough to hand over without caveats. The remaining gaps are mostly about explicit ownership, first-class page types, and review queue shape.

## Verified Missing Pieces

- The three open canon decisions in `config/living-ecosystem-canon.json` are still unresolved:
  - Empathy Ledger classification
  - spoke roster confirmation
  - public work copy ownership policy
- There is no clearly named first-class page type for a source packet in the wiki itself, even though the JSON schema exists.
- There is no clearly named first-class page type for a source bridge note that maps raw input to canonical notes.
- There is no obvious canonical review queue page that shows what is pending editorial, cultural, consent, and release approval.
- The hub has pages and routes, but not yet a fully explicit page-type map that says which pages are canonical, which are generated, and which are review surfaces.
- The system still needs a stronger page contract for public work objects that appear on both hub and spoke surfaces.

## Page Types To Build Next

### Canonical knowledge pages

- Canonical project page
- Canonical story page
- Canonical person page
- Canonical work page
- Canonical community page
- Canonical research page

### Bridge and packet pages

- Source bridge note
- Source packet
- Review queue item
- Decision log entry
- Provenance note

### Public IA pages

- Hub landing page
- Spoke landing page
- Works / portfolio index
- Public work detail page
- Method / governance explainer page
- Knowledge index / wiki index page

### Review and release pages

- Editorial approval page
- Cultural review page
- Consent review page
- Release checklist page
- Post-release verification page

## Human Decisions Still Required

1. Confirm whether Empathy Ledger is a primary public surface or an elevated spoke.
2. Confirm the live spoke roster for JusticeHub, Goods on Country, Black Cockatoo Valley, and The Harvest.
3. Confirm which site owns canonical public work copy when a work appears on more than one surface.
4. Confirm whether source packets are authored in wiki first, EL first, or jointly with wiki as the canonical record.
5. Confirm which page types are human-authored only versus generated from source packets.
6. Confirm who approves cultural review, consent review, and release on public story packets.
7. Confirm whether review queue pages should live in wiki, the hub, or both.

## Proposed Top-10 Page Backlog

1. Canonical hub / ownership page for the living ecosystem map.
2. Source packet template page.
3. Source bridge note template page.
4. Canonical public work page template.
5. Canonical project page template.
6. Review queue index page.
7. Editorial / cultural / consent approval page.
8. Release checklist and verification page.
9. Spoke landing page template.
10. Works / portfolio index page.

> [!tip] Practical priority
> If we build only three things next, build the source packet template, the source bridge template, and the canonical public work page. Those three unlock most of the rest.

