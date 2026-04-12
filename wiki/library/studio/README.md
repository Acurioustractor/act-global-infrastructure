---
title: The Studio
purpose: The production workspace where photos, handwriting, video, and reflections come together — connected to Empathy Ledger consent at the data layer
created: 2026-04-09
status: structure sketched, workflow not yet wired
---

# The Studio

> *The single place where the photos, the handwriting, the voices, and the reflections live before they become chapters, method books, or community volumes. This is the layer the community, the Elders, the photographer, the videographer, and the young people actually touch.*

The studio is the production workspace for the entire library. It is the part of the system the user — funders, communities, Elders, young people, the photographer, the videographer, the editor — comes to first when they bring something into the project. Everything that ends up in a chapter, a series book, a community volume, or the national edition passes through here.

The studio is not a metaphor and it is not a marketing layer. It is the real workflow where:

- **Photos** are uploaded with consent metadata
- **Handwriting** samples are scanned and stored
- **Voice recordings** are linked to their Empathy Ledger transcript
- **Video** is captured, transcribed, and indexed
- **Reflections** are typed, scanned, or dictated and held with the same consent rules as everything else

The studio's job is to hold all of this in **one place**, with **consent traceable from the moment the asset enters the system**, so that any of the four library layers (chapters, series books, community volumes, the national edition) can pull from it without re-doing the consent work.

## The four asset types the studio holds

### 1. Photos

Studio-quality portraits, documentary photographs, scene photographs from on Country, the Travel Diary photographs from European visits, and the Brave Ones counter-mugshot register.

| Pipeline | What happens |
|---|---|
| Capture | Photographer takes the photo. Subject signs the consent form (digital or physical). |
| Consent | Consent record is created in Empathy Ledger with the storyteller_id, the consent_scope (public / with-care / internal-only), and the cultural protocol notes. |
| Upload | Photo enters `photos/` folder, named with the EL story_id so it cross-references. |
| Routing | When a chapter or volume needs the photo, it pulls by story_id and the consent layer either permits or refuses. |

### 2. Handwriting

The hand-stitched young-person journals are a defining visual register of the library. Handwriting is part of the artefact — not just a transcription input. The studio stores scans of handwritten pages, journal entries, letters from Aunties and uncles, and any handwritten contribution to the library that has been collected with consent.

### 3. Video

Walks on Country, interviews, ceremonies (where culturally appropriate and with explicit consent), Travel Diary footage, the CONTAINED tour stops, the launch events. Each video has a transcript via Empathy Ledger and a consent record at the source.

### 4. Reflections

Written pieces — typed, dictated, or scanned — from anyone in the program. Young people, Aunties, Elders, workers, visitors. Each reflection has a consent record and an attribution.

## How the studio connects to Empathy Ledger

Every asset in the studio has an Empathy Ledger story_id. The consent_scope on the EL story is the source of truth for whether the asset can be used in:

| Output layer | Required consent_scope |
|---|---|
| `chapters/` (master book — public) | `public` only |
| `series/` (method books — public, sold publicly) | `public` only |
| `locations/` (community volumes — community-owned) | `public` OR `with-care` (community has the right to override) |
| `studio/` (internal review only) | `public` OR `with-care` OR `internal-only` |

**Default deny.** If an asset has no consent record, the studio refuses to surface it to any output layer until the record exists.

## Folder structure (when populated)

```
studio/
├── README.md
├── photos/
│   ├── _index.md                       ← auto-generated list of all photos with EL story_id
│   ├── oonchiumpa/                     ← photos by community
│   ├── picc/
│   ├── campfire/
│   ├── ... (10 community folders)
│   ├── diagrama/                       ← Spain visit photos
│   ├── travel-diary-outbound/          ← AU → Europe
│   ├── travel-diary-inbound/           ← Europe → AU
│   └── brave-ones/                     ← the photographic register, organised by sitting
├── handwriting/
│   ├── _index.md
│   ├── journal-pages/                  ← scans from young-person journals
│   ├── letters/                        ← from Aunties, uncles, mentors
│   └── margin-notes/                   ← handwritten margin notes for the library
├── video/
│   ├── _index.md
│   ├── interviews/
│   ├── on-country/
│   ├── travel-diary/
│   └── launches/
└── reflections/
    ├── _index.md
    ├── young-people/
    ├── aunties-and-elders/
    ├── workers/
    └── visitors/
```

## The workflow — how an asset enters and where it ends up

```
1. Capture                  Photographer / videographer / writer captures the asset
                            (in community, on Country, in the studio, on the road)
        │
        ▼
2. Consent at source        Empathy Ledger consent form is signed.
                            consent_scope set: public / with-care / internal-only
        │
        ▼
3. Upload to studio/        Asset enters the right subfolder, named with EL story_id
                            _index.md regenerates automatically
        │
        ▼
4. Tagging                  Tags applied: community, frame, cycle, claims it serves
        │
        ▼
5. Available to layers      The four output layers (chapters, series, locations, the
                            national edition) can now pull this asset by story_id —
                            consent layer either permits or refuses based on scope
        │
        ▼
6. Logged on use            Every time an asset is used in an output, the use is logged
                            against the EL story_id so the storyteller can see where
                            their voice / face / handwriting / words ended up
```

## Cultural protocol

The studio inherits the cultural protocol from the rest of the library:

1. **No asset enters the studio without a consent record at the source.** The consent record is the entry permission, not an afterthought.
2. **Subjects under 18 require guardian and cultural authority sign-off** before any asset they appear in is used in any output layer.
3. **Right of withdrawal at any point.** The studio honours revocations within 7 days of request — the asset is removed from all four output layers and from any digital instance.
4. **Indigenous cultural authority overrides everything else.** If an Aunty or an Elder says an asset cannot be used, it cannot be used. There is no "but the consent form said yes" override.
5. **Transparent income split** for any commercial use, paid to the subject and their nominated community organisation.
6. **No AI-generated photorealistic images.** Photos in the studio are real photos taken by real photographers. The Brave Ones register depends on this absolutely.

## Why the studio is the most important infrastructure piece

The chapters, the series books, and the community volumes can be written. The hard part is *the production layer that keeps consent traceable across thousands of assets, multiple communities, multiple languages, and three years of work.*

Without the studio, every output layer has to do its own consent work, every photographer has to figure out their own metadata system, every editor has to track every asset by hand, and every revocation has to be manually propagated. The library cannot be built at scale without it.

With the studio, the four output layers become assembly tasks instead of production tasks. Editors, photographers, and community members can all contribute without needing to invent the workflow each time.

## Status

**Structure sketched. Workflow designed. Not yet wired.** The studio currently exists as this README and the folder skeleton. The next move is to:

1. Define the asset metadata schema (frontmatter fields, naming convention, consent linkage)
2. Wire the Empathy Ledger v2 API connection so consent records can be queried directly
3. Build a simple `studio-ingest.mjs` script that takes a new asset and registers it
4. Build the `_index.md` auto-generator for each subfolder

## Connection to the rest of the library

| Asset type | Used by |
|---|---|
| Photos | All four output layers |
| Handwriting | Mostly the community volumes (`locations/`) and young-person journals |
| Video | Mostly the studio's own internal review + the digital edition of the library |
| Reflections | All four output layers |

The studio is the **single source of truth** for any asset that has a person's face, voice, hand, or words in it. Nothing in the library uses an asset that did not come through here.

## Next move

Once the master book Chapter 16 (The Brave Ones) is written, the photographic protocol gets locked into the studio's `photos/brave-ones/` subfolder structure. That happens *after* the first real portrait sittings, not before.

Until then, the studio holds the framework and the consent rules. The first asset to enter once the workflow is wired will be a photograph — and the photograph will be of a young person who has signed an Empathy Ledger consent form, in a community where the Aunties have agreed it is the right time.
