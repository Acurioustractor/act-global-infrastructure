---
title: "Episode 01 — The Keyhole"
status: Live · April 2026
date: 2026-04-14
entity_type: art-work
canonical_slug: episode-01-keyhole
cluster: aesthetics-of-asymmetry
parent_project: the-aesthetics-of-asymmetry
tier: episode
tags: [art, civicgraph, keyhole, institutional-critique, month-1]
---

# Episode 01 — The Keyhole

> *What the applicant sees. What the funder sees. The distance between them.*

**After** James C. Scott, *Seeing Like a State* (1998) — the observation that states simplify human complexity into administratively useful categories, making life legible to the centre and illegible to the periphery.

## Thesis

Information asymmetry isn't a side-effect of the grant system. It is the system. The funder sees the whole pool. The applicant sees a form.

## The work

A split-screen scrollytelling installation at `aesthetics.act.place/episode/keyhole`. The left half renders a grant application form, confined to a circular mask. The right half renders the full CivicGraph network — 6,000 public entities drawn by GPU force layout (Cosmos.gl). As the viewer scrolls, the keyhole on the left widens, the form recedes, and the galaxy of entities fills the screen. Clicking any node reveals the *human layer* — a storyteller's portrait and quote pulled from Empathy Ledger (with consent).

## Data source

- `GET /api/graph/keyhole` — proxies GrantScope's public `/api/data/graph?mode=power&limit=6000`
- `GET /api/human-layer/[entityId]` — stubbed against 6 Oonchiumpa storytellers until EL v2 syndication site key is issued

## Physical artifact

An A2 poster with a literal keyhole die-cut. 2-colour Riso: bone cream + urgent red. QR code opens the live episode at `aesthetics.act.place/episode/keyhole?from=print`. Edition: 100.

## Copy assets

- Long-form LinkedIn post: [LinkedIn post v3 draft](../../output/narrative-drafts/2026-04-14-civicgraph-art-project-linkedin-v3.md) — rewrite pending voice review
- Claim file: [Claim: information-asymmetry-is-the-system](../../narrative/civicgraph/claim-information-asymmetry-is-the-system.md)
- Wall text (for gallery / print):

> The funder sees the pool.
>
> The applicant sees the form.
>
> $107 billion a year moves between them, through 21 databases that were never introduced. This is what happens when we introduce them.

## References

- Hans Haacke, *Shapolsky et al. Manhattan Real Estate Holdings* (1971) — public records as institutional critique
- Forensic Architecture (2010–) — counter-forensics methodology
- James C. Scott, *Seeing Like a State* (1998) — legibility politics

## Backlinks

- [[aesthetics-of-asymmetry|The Aesthetics of Asymmetry]]
- [Claim: information asymmetry is the system](../../narrative/civicgraph/claim-information-asymmetry-is-the-system.md)
- [[civicgraph|CivicGraph]]
