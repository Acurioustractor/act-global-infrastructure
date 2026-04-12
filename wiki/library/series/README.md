---
title: The STAY Series
purpose: The seven Penguin Modern Classics-style slim method books that make up the spine of the library
created: 2026-04-09
status: structure sketched, books not yet built
---

# The STAY Series

> *Seven slim paperbacks. Aged cream spines. Hand-set serif type. The kind of shelf you stand in front of and decide to take one down.*

This is the seven-book series that sits at the centre of the STAY library. Each book takes one of the seven methods that run the program and turns it into a Penguin Modern Classics-style slim volume — short, beautifully made, methodologically tight, written so a magistrate or a Minister or an Aunty can hold it and read it cover-to-cover in an afternoon.

The series mark on every spine: **THE STAY SERIES · NO. 01** through **NO. 07**.

## The seven books

| No. | Title | Subtitle | Status | Source chapter |
|---|---|---|---|---|
| **01** | THE THREE CIRCLES | *Start at the edge. Work outward.* | sketched | [Chapter 04](../chapters/README.md) |
| **02** | THE LIVING MAP LOOP | *1,775 community models, and growing.* | sketched | [Chapter 05](../chapters/README.md) |
| **03** | THREE RIPPLES | *The infrastructure of the edge.* | sketched | [Chapter 06](../chapters/README.md) |
| **04** | I HAVE · I AM · I CAN | *Nine resources for resilience.* | sketched | [Chapter 07](../chapters/README.md) |
| **05** | THE FIELD CANVAS | *Look at the whole field. Above and below.* | sketched | [Chapter 08](../chapters/README.md) |
| **06** | LISTEN · CURIOSITY · ACTION · ART | *Four phases. One loop.* | sketched | [Chapter 09](../chapters/README.md) |
| **07** | FIRE CRESCENDO | *On building things slowly.* | sketched | [Chapter 10](../chapters/README.md) |

## How a series book gets built

Each book in the series is produced from the corresponding chapter in the master book. The process:

1. **Master chapter is written** in [`../chapters/`](../chapters/) — long-form, full lineage, full proof points
2. **Method book is extracted** from the master chapter — tighter, more visual, more pedagogical
3. **Cover is locked** (already designed — the seven covers exist as visual mockups)
4. **The method book is then a standalone artefact** that can be read without the master book

The series books are designed to be **forkable**. Other communities (in Birmingham, in Lima, in Murcia, in Christchurch) can pick up the template, swap their own context, and add their own volumes to the shelf. The method is the property of whoever wants to do the work.

## Folder structure (when populated)

```
series/
├── 01-three-circles/
│   ├── README.md
│   ├── manuscript.md       ← the prose
│   ├── cover-front.png
│   ├── cover-back.md       ← back blurb
│   ├── interior-spreads/   ← any diagrams or visual companions
│   └── pdf-export/
├── 02-living-map-loop/
├── 03-three-ripples/
├── 04-i-have-i-am-i-can/
├── 05-field-canvas/
├── 06-lcaa/
└── 07-fire-crescendo/
```

## Cultural protocol for the series

The seven method books are *methodology*, not testimony. They do not include named young people's voices or photographs without consent. They do reference the proof points (Maranguka, Oonchiumpa, Diagrama) by community/organisation name, with the agreement of the community.

When a method book references a young person by name, the consent has to come through Empathy Ledger first. No exceptions.

## Status

**0 of 7 books written.** The seven covers exist as visual mockups (see `JusticeHub/output/` and `tools/`). The master book chapters they will be derived from (Chapters 04-10) are sketched in [`../chapters/README.md`](../chapters/README.md). The build order: write the master chapter first, extract the method book second.

## Next move

After Chapter 11 (Staying Is the Move) and Chapter 19 (Three Tiers) are written, the next push is Chapters 04-10 — the seven methodology chapters that produce the seven series books. That work is best done as a focused two-week sprint where each method gets one chapter and one extraction round.
