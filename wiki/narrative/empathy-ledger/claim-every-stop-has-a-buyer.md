---
id: claim-every-stop-has-a-buyer
project: empathy-ledger
type: claim
frame: structural
secondary_frame: invitational
status: live
first_used: 2026-04-09
last_used: 2026-04-09
times_deployed: 1
channels: [synthesis, internal-strategy]
audiences: [funder, ally]
cycle: [world-tour-pre, world-tour-active, funder-pitch]
sources:
  - path: wiki/raw/2026-04-09-empathy-ledger-strategy-synthesis.md
    section: "Three honest takes"
    quote: "Treat the tour as a sales tour for the social enterprise stack, dressed as a field trip. That gives every stop a dual purpose: collect a story AND meet a buyer / partner / funder for one of the 7 ACT projects. Build a 'who's the buyer at this stop?' column into the itinerary."
related_claims: [empathy-ledger:claim-the-tour-is-a-working-tour, empathy-ledger:claim-1.75m-not-pre-revenue]
backlinks_to_concepts: [world-tour, act-global-infrastructure]
---

# Claim: Every stop has a buyer. Build the column.

**The argument:** A travelogue collects stories. A working tour collects stories AND meets the person who will pay for one of the seven ACT products at every stop. The discipline is to add a "buyer" column to every itinerary entry: which Goods on Country buyer, which JusticeHub government contact, which EL SaaS prospect, which Grantscope user, which JCF deliverable conversation lives at this place. If a stop has no buyer column filled in, the stop is a holiday. Either fill it or cut it.

## Variants used

| Variant | Where |
|---|---|
| "Treat the tour as a sales tour for the social enterprise stack, dressed as a field trip." | Strategy synthesis |
| "Build a 'who's the buyer at this stop?' column into the itinerary." | Strategy synthesis |
| "Every stop = collect a story AND meet a buyer / partner / funder for one of the 7 ACT projects." | Strategy synthesis |

## What we haven't said yet

- **Never built the column.** The current world tour scaffold has chapters, partners, story angles. It does not yet have a `buyer` field per stop.
- Never said as a **funder language disambiguation** — *"This is not a sponsored content trip. This is a sales tour with a public field journal."*
- Never used to **defend stop selection** — every stop on the tour should be defensible by the buyer column. If Lesotho doesn't have a buyer, that is the strongest argument against adding it.
- Never connected to **GHL / ACT Global Infra contact pipeline** — the buyer at each stop should be a real contact already in the CRM
- Never said: *"A field trip with no buyers is a holiday. We are not on holiday."*

## Implementation

This claim is also an instruction. Wire it as a `tour_stops.buyer_contact` field in the DB plus a column in the admin world-tour outreach page. Every stop that goes live publicly must have at least one named buyer / partner / funder against it.

## Adjacencies

- → `empathy-ledger:claim-the-tour-is-a-working-tour` — the parent frame
- → `empathy-ledger:claim-1.75m-not-pre-revenue` — the credibility this rests on
- → `empathy-ledger:claim-paid-org-tier-is-the-unlock` — one of the buyer types per stop
- → `goods-on-country:claim-not-charity-its-enterprise` — another buyer type per stop
