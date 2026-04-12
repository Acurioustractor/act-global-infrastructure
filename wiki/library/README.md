---
title: The Library
purpose: The destination of the STAY program — the book, the volumes, the journals, the studio that produces them all
created: 2026-04-09
status: active build, chapter 01 complete
---

# The Library

> *At the end of this program, we have a library. Not a report. A library.*

This folder is the destination. Not a metaphor. The actual physical and digital library that the STAY program leaves behind. This is where the chapters of the master book live, where the per-community volumes live, where the production studio that makes them live, and where the seven STAY Series method books live. One folder. One destination. Built so the writing can compound.

## What's in this folder

| Subfolder | What it holds |
|---|---|
| [`chapters/`](chapters/) | **The master book.** The narrative that brings everything together — the lineage, the methodology, the proof points, the practice, the ask. Written one chapter at a time, kept rewriteable, designed to outlast the campaign. Currently: 1 chapter written, 19 sketched. |
| [`series/`](series/) | **The seven STAY Series method books.** Penguin Modern Classics-style slim paperbacks: Three Circles · Living Map Loop · Three Ripples · I Have I Am I Can · Field Canvas · Listen Curiosity Action Art · Fire Crescendo. Each one is a method book that can be picked up, held, and read on its own. |
| [`locations/`](locations/) | **The ten community volumes.** One per anchor community. Mparntwe (Oonchiumpa), Bwgcolman (PICC), Kalkadoon (CAMPFIRE/Mount Isa), Mount Druitt (Mounty Yarns), Bourke (Maranguka), Halls Creek (Olabud Doogethu), the open VIC and SA places, and the rest. Each volume is built locally with the community holding the editorial pen. |
| [`studio/`](studio/) | **The production workspace.** Where photos, handwriting, video transcripts, and reflections come together. The single place that feeds chapters, series books, and community volumes. Connects to Empathy Ledger consent at the data layer. This is the layer the user — funders, communities, Elders, young people — actually touch when they bring the campaign to life. |

## How the four layers work together

```
                    THE LIBRARY
                         │
        ┌────────────────┼────────────────┬──────────────┐
        ▼                ▼                ▼              ▼
    chapters/        series/          locations/      studio/
    (master book)    (7 method        (10 community   (production
                      books)           volumes)        workspace)
        │                │                │              │
        └────────────────┴────────────────┴──────────────┘
                         │
                         ▼
              EMPATHY LEDGER (consent + voice)
                         │
                         ▼
              THE PEOPLE THE WORK SERVES
```

- **studio/** is the production layer. Photos, handwriting samples, voice recordings, video, reflections — they all enter here, with consent metadata via Empathy Ledger.
- **chapters/** is the master narrative. It pulls from all three other layers. The book grows one chapter at a time.
- **series/** is the methodology layer. Each STAY Series book is one of the seven methods, written as a Penguin Modern Classic slim volume that can stand alone.
- **locations/** is the per-community layer. Each of the ten anchor communities owns its own volume, built with the community holding editorial control.

## What this folder is NOT

- It is not the same as `wiki/projects/justicehub/` — that folder contains the source documents (the-full-idea, three-circles, staying, the-brave-ones). This folder contains the **outputs** that those source documents become.
- It is not a draft folder — it is the place where the writing lives **as the writing happens.** Every revision sits in place. Git history holds the changes.
- It is not the same as `wiki/output/narrative-drafts/` — that folder is for short-form ephemeral pitch briefs and posts. The library is for long-form writing that compounds.

## How to use this folder

### For writing a new chapter

1. Open [`chapters/README.md`](chapters/README.md) — see the chapter index
2. Pick a chapter that is currently `status: sketched` or `status: blank`
3. Open the chapter file (or create it if blank)
4. Read the master narrative arc in [`chapters/01-the-edge-is-where-the-healing-is.md`](chapters/01-the-edge-is-where-the-healing-is.md) so you know what's already been said
5. Read the relevant claims at `wiki/narrative/justicehub/` — the chapter is built on those claims
6. Write the chapter
7. Update its status in `chapters/README.md`

### For producing community volumes

1. Open [`locations/README.md`](locations/README.md) — see the per-community templates
2. Each community has a folder with the same internal structure (intro · the people · the work · the model · the voices · the photographs · the year · what we ask of you next)
3. Cultural protocol applies (see the Brave Ones cultural protocol document)

### For studio work (photos, handwriting, video, reflections)

1. Open [`studio/README.md`](studio/README.md)
2. The studio is the workflow connection between Empathy Ledger (where consent + voice live), the photography pipeline, the handwriting collection, and the video transcripts
3. Every asset that enters the studio has a consent record in Empathy Ledger before it can be used in any of the three writing layers

## Status

- **chapters/** — 1 of 20 chapters written (chapter 01: The Edge Is Where the Healing Is). Index sketched.
- **series/** — 0 of 7 method books written. Folder structure sketched.
- **locations/** — 0 of 10 community volumes started. Folder structure sketched. Cultural protocol doc pending.
- **studio/** — Production workflow sketched. Empathy Ledger integration designed.

## Connection to the rest of the system

| Layer | Where it lives |
|---|---|
| **Source documents** (the-full-idea, three-circles, staying, the-brave-ones) | `wiki/projects/justicehub/` |
| **Narrative claims** (the 14 atomic arguments the constellation has made) | `wiki/narrative/justicehub/` |
| **Funder pipeline** (Minderoo, JCF, Atlassian, etc.) | `wiki/narrative/funders.json` |
| **Pitch briefs** (the auto-generated funder briefs) | `wiki/output/narrative-drafts/2026-*-justicehub-pitch-*.md` |
| **Shipped pitches** (the actual prose pitches that have gone to funders) | `wiki/output/narrative-drafts/SHIPPED-*-minderoo-stay-pitch.md` |
| **The library** (the long-form writing that all of the above produces) | `wiki/library/` ← you are here |

The library is the **compounding layer.** Everything else is input. The library is what the inputs become — and what outlasts the campaign once it's built.
