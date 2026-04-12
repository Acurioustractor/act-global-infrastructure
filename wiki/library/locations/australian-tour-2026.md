---
title: The Australian Tour — 2026 (pre-international leg)
purpose: The ten anchor communities visited as the Australian tour BEFORE the international tour begins on 28 June 2026
created: 2026-04-09
status: scaffold (anchor communities listed, dates TBC)
sequence_position: precedes wiki/library/locations/international-tour-2026-jun-aug.md
---

# The Australian Tour — 2026

> *Ten anchor communities. The methodology starts at home. Country before world.*

This is the Australian tour that runs **before** the international tour leaves for Africa and Europe on 28 June 2026. It is the foundation of the entire program: every story, every relationship, every method that the international tour later carries to YOPE Amsterdam, to Diagrama Murcia, and to the JCF beneficiaries in Tanzania and Lesotho is rooted here first.

## Why the Australian tour comes first

The methodology refuses to skip Listen. Listening to the ten Australian anchor communities is Year 1 of the STAY program — and it is also the methodological condition for the international tour to make any sense. You cannot take a Travel Diary cohort to Amsterdam if the young people from Mounty Yarns and Oonchiumpa have not first met each other on Country, with Aunties and Elders present, on their own terms.

The Australian tour produces:

- The first relationships with each of the ten anchor communities
- The first Empathy Ledger consent records for each community
- The first young-person Travel Diary books
- The first cohort that travels onward to Amsterdam in late July
- The first set of stories that are logged into the master book and the per-community volumes

## The ten anchor communities

| State | Community | Country | Anchor relationships | Status |
|---|---|---|---|---|
| **NT** | [Oonchiumpa](../../projects/oonchiumpa.md) — Mparntwe / Alice Springs | Arrernte | Aunty Bev · Tanya Turner · Kristy Bloomfield | ✅ Existing partnership |
| **QLD (north)** | [PICC](../../projects/picc/picc.md) — Bwgcolman / Palm Island | Manbarra · Bwgcolman | Richard Cassidy · Bwgcolman families | ✅ Existing partnership |
| **QLD (Mt Isa)** | [CAMPFIRE](../../projects/campfire.md) — Kalkadoon Country / Mount Isa | Kalkadoon | Brodie Germaine | ✅ Existing partnership |
| **QLD (SE)** | EPIC Pathways / MMEIZC / Toowoomba — three-way pick | various | TBC | Open |
| **NSW** | [Maranguka](../../projects/justicehub/the-full-idea.md) — Bourke Tribal Council | Ngemba · Wangkumara · Murrawarri · Wayilwan · Barkindji | TBC (Bourke Tribal Council) | To approach (KPMG-evaluated, see [`claim-maranguka-the-evidence`](../../narrative/justicehub/claim-maranguka-the-evidence.md)) |
| **NSW** | [Mounty Yarns](../../projects/mounty-yarns.md) — Darug / Mount Druitt | Darug | Shayle · Leah | ✅ Existing relationship |
| **WA** | Olabud Doogethu — Halls Creek | Jaru · Kija · Walmajarri · Gooniyandi | TBC | To approach |
| **TAS** | Prevention Not Detention — Loic Fery's coalition | palawa | Loic Fery | Pipeline contact |
| **VIC** | OPEN | TBC | TBC | Open — needs sourcing |
| **SA** | OPEN | TBC | TBC | Open — needs sourcing |

**This is not ten grants.** It is ten long-term relationships the centre learns from, the international tour celebrates, and the artefact in Year 3 is built around. Cultural protocol is non-negotiable — see [`yope-amsterdam-july-2026.md`](yope-amsterdam-july-2026.md) for the consent rules that apply equally to every community on this list.

## What happens at each Australian stop

The visit shape is the same across all ten communities, with local variation guided by the Aunties and Elders:

| Day | Activity | Output |
|---|---|---|
| **Day 1** | Arrival. No filming. No notebook out. Sit with the kettle. Listen. | Nothing visible. Trust is the deliverable. |
| **Day 2** | Walk on Country with whoever is available. Hear what is going on right now. | Field notes (private). |
| **Day 3** | Storyteller conversations begin — one or two at a time, slow. Empathy Ledger consent first, recorder second. | Voice transcripts (consent-tagged). |
| **Day 4** | Photographs (where consent permits). The Brave Ones visual register where applicable. | Photo files (consent-tagged). |
| **Day 5** | Travel Diary book introduced. Each young person who is travelling onward to the international leg takes one home. | Books distributed. Reflections begin. |
| **Day 6** | Closing yarn with Aunties and Elders. What the community wants the international cohort to carry. | Community message — written into the front of each Travel Diary. |
| **Day 7** | Departure. The relationship continues; the visit ends. | The next visit is already scheduled. |

This is **not a 7-day visit per community**. The full Year 1 STAY program runs the team through each community multiple times. The Australian tour leg above is the **first round** — the one that precedes the international tour and assembles the cohort that will travel onward.

## Connection to the international tour

The young people from **Oonchiumpa** and **Mounty Yarns** are the first international cohort. They travel to YOPE Amsterdam in late July with their Travel Diary books, and the books carry messages from the Aunties and Elders of their home communities to the YOPE young people in Amsterdam.

The other eight Australian communities feed the **second** and **third** international cohorts in 2027 and 2028 — they are part of the methodology even when they are not on the first plane.

## What the Empathy Ledger world tour data layer needs

Per [`/Users/benknight/Code/empathy-ledger-v2/src/lib/world-tour/locations.ts`](../../../empathy-ledger-v2-locations-reference), the EL world tour data already has:

- ✅ Witta, QLD (the origin)
- ✅ Alice Springs, NT (Mparntwe — covers Oonchiumpa)
- ✅ Darwin, NT
- ✅ Sydney, NSW

What's **missing from the EL world tour data and needs to be added** for the Australian tour to be fully aligned:

| Stop to add | Country/Country (Indigenous) | Notes |
|---|---|---|
| **Mount Druitt, NSW** | Darug | Mounty Yarns — Shayle, Leah |
| **Palm Island, QLD** | Manbarra · Bwgcolman | PICC — Richard Cassidy |
| **Mount Isa, QLD** | Kalkadoon | CAMPFIRE — Brodie Germaine |
| **Bourke, NSW** | Ngemba · Wangkumara · Murrawarri | Maranguka — Bourke Tribal Council |
| **Halls Creek, WA** | Jaru · Kija · Walmajarri · Gooniyandi | Olabud Doogethu |
| **Tasmania (location TBC)** | palawa | Prevention Not Detention coalition |
| **Brisbane / SEQ (location TBC)** | TBC | EPIC / MMEIZC / Toowoomba — three-way pick |
| **Victoria (location TBC)** | TBC | OPEN |
| **South Australia (location TBC)** | TBC | OPEN |

These are the alignment-needed additions. Each one becomes a `TourStop` in `locations.ts` with its own slug, lat/lng, partner organisations, named storytellers, and gallery. The Australian tour produces the data that fills them.

## Status

| Layer | Status |
|---|---|
| Anchor communities identified | ✅ 8 of 10 (VIC + SA still open) |
| Cultural protocol | ✅ documented in YOPE planning doc, applies equally here |
| Dates | ❌ TBC — depends on Minderoo funding decision |
| EL world tour alignment | ⏳ 4 of 10 stops already in `locations.ts`, 6 to add |
| Travel Diary books for the cohort | ❌ to be hand-stitched (4-6 week lead time) |
| First international cohort assembled | ❌ depends on Aunty Bev / Tanya / Kristy at Oonchiumpa + Shayle / Leah at Mounty Yarns confirming the young people |

## Next moves

1. **Aunty Bev / Tanya / Kristy phone call** about the YOPE July cohort and which young people from Oonchiumpa will travel
2. **Shayle / Leah phone call** about the same for Mounty Yarns
3. **Add the 6 missing stops to EL v2 `locations.ts`** as alignment work — see EL alignment doc
4. **Confirm dates for the Australian tour leg** once the Minderoo funding decision lands (Foundation tier funds 5 communities, Crescendo tier funds all 10)
5. **Source VIC and SA candidates** — the two open places. Prevention Not Detention contacts in TAS may know the VIC pipeline; the SA candidate is currently a blank slate.
