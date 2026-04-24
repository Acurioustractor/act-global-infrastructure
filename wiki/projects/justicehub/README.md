---
title: JusticeHub Cluster
purpose: Index for the JusticeHub project constellation — platform, programs, pitches, art companion
updated: 2026-04-09
---

# JusticeHub — the cluster

> Five files, one project. The platform that catalogs what works, the program that builds the library, the pitch that funds it, the methodology that holds it together, and the photographic art companion that makes it human.

This folder is the **single home** for everything in the JusticeHub project family. The narrative claim store at [`wiki/narrative/justicehub/`](../../narrative/justicehub/INDEX.md) draws its source material from these five files.

## What's in motion as of 2026-04-09 (afternoon)

The cluster is no longer just five static documents. As of this afternoon:

- **The library is structurally built** at [`wiki/library/`](../../library/) — 20-chapter master book scaffold (1 written, 9 drafted, 10 sketched), all 7 STAY Series method books drafted with cover PNGs embedded and diagrams explained, locations + studio + series subfolders ready
- **YOPE Amsterdam confirmed** as the first Travel Diary partner (Ludmila Andrade, Veerle) — locked dates Tue 16 Jul – Mon 22 Jul 2026 — see [`wiki/library/locations/yope-amsterdam-july-2026.md`](../../library/locations/yope-amsterdam-july-2026.md)
- **Lesotho Gap 1 RESOLVED** — Georgia Falzon at ConX + Raphael Rowe Foundation is the named contact, dates locked Tue 20 Jun – Sun 25 Jun 2026 — see [`wiki/decisions/2026-04-09-lesotho-data-needs.md`](../../decisions/2026-04-09-lesotho-data-needs.md)
- **International tour schedule complete** — 20 Jun to ~6 Aug 2026, 7 stops, 48 days (Lesotho, Tanzania, Kenya, Uganda, Sweden transit, Holland-YOPE, Spain Murcia + expansion) — see [`wiki/library/locations/international-tour-2026.md`](../../library/locations/international-tour-2026.md)
- **Australian tour scaffold** — 10 anchor communities mapped, EL v2 alignment table built — see [`wiki/library/locations/australian-tour-2026.md`](../../library/locations/australian-tour-2026.md)
- **EL v2 codebase updated** — `/Users/benknight/Code/empathy-ledger-v2/src/lib/world-tour/locations.ts` now contains Lesotho + Tanzania + YOPE + Spain expansion partners. TypeScript compiled clean. See [`wiki/library/studio/el-v2-alignment-status.md`](../../library/studio/el-v2-alignment-status.md)
- **Studio principles** for thematics / transcription / analysis documented — see [`wiki/library/studio/empathy-ledger-thematics-principles.md`](../../library/studio/empathy-ledger-thematics-principles.md)
- **14 narrative claims** in [`wiki/narrative/justicehub/`](../../narrative/justicehub/INDEX.md) (added Block→JusticeHub architecture mapping + Maranguka KPMG evidence today)
- **Minderoo pitch package** — operational version with budget breakdown, contact protocol, MOU outline, covering email — see [`minderoo-pitch-package.md`](minderoo-pitch-package.md)

This is a campaign that has moved from "comprehensive walkthrough document" to "live program in pre-launch" inside one day.

## System Position

This folder is the durable cluster memory for JusticeHub.

- the wiki holds the canonical framing of the platform, methodology, pitch, and art companion
- [[empathy-ledger|Empathy Ledger]] holds the live story, media, and editorial proof layer
- the websites compose the public surface from those two layers

That means this folder should explain what JusticeHub is and how the constellation fits together. It should not try to become the media bucket or the public CMS. The field contract for that split is in [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]] and [[living-website-operating-system|Living Website Operating System]].

## What's in this folder

| File | What it is | Status |
|---|---|---|
| [[justicehub\|justicehub.md]] | The platform layer — JusticeHub.com.au, ALMA, the evidence base, $94.6B funding tracked, the seven projects underneath | Live |
| [[three-circles\|three-circles.md]] | **Canonical Minderoo pitch** — $2.9M / 3 years / 10 anchor communities / Lucy Stronach. The Three Circles methodology. | Lucy-warm, refreshed 2026-04-08 |
| [[the-full-idea\|the-full-idea.md]] | **STAY — comprehensive walkthrough** — the whole architecture in one document. 7 method books, ~50 journals, 10 community volumes, 1 national edition. Three tiers (Foundation $1.8M / **Crescendo $3.43M** / Bonfire $6M). | Working draft, walk-through review |
| [[staying\|staying.md]] | The methodology layer — *"every other youth justice program leaves. Staying is the move."* The practice of an embedded storytelling team that does not leave. | Reframed 2026-04-08 as methodology layer of three-circles |
| [[the-brave-ones\|the-brave-ones.md]] | The photographic art companion — counter-mugshot, B&W portraits in the dignity register. The visual architecture of JusticeHub. The human face of the data layer. | Ideation, sketched 2026-04-07 |

## Where to start (depending on what you need)

| If you are... | Open this first |
|---|---|
| Drafting the Minderoo pitch | [[three-circles]] (canonical) + [[the-full-idea]] (long form) |
| Walking a new collaborator through the whole project | [[the-full-idea]] |
| Looking up a specific methodology (Three Circles, Living Map Loop, Three Ripples, I Have I Am I Can, Field Canvas, LCAA, Fire Crescendo) | [[the-full-idea]] §4 |
| Understanding "what is JusticeHub the platform" | [[justicehub]] |
| Designing the art companion | [[the-brave-ones]] |
| Aligning to Minderoo's current public strategy | [[how-should-act-pitch-minderoo-in-line-with-its-current-strategy-and-what-money-f|Minderoo strategy and money framing]] |
| Stress-testing where the Karpathy loop actually fits | [[how-should-act-apply-the-karpathy-loop-to-justicehub-the-minderoo-pitch-and-the-|Karpathy loop alignment synthesis]] |
| Reminding yourself why "staying" matters | [[staying]] |

## The narrative claim store

Every public argument we have made about this constellation lives at [`wiki/narrative/justicehub/`](../../narrative/justicehub/INDEX.md). 12 claim files, sorted by frame, with deployment counts and gap analysis.

**Generate the Minderoo pitch brief:**
```bash
node scripts/narrative-draft.mjs justicehub --funder minderoo --channel pitch --length long
```

**See the live dashboard:**
Open `wiki/dashboards/narrative-dashboard.md` (requires Dataview plugin)

## The currently shipped pitch

`wiki/output/narrative-drafts/SHIPPED-2026-04-09-minderoo-stay-pitch.md` — long-form, addressed to Lucy Stronach, $3.43M Crescendo tier, deadline 2026-05-15. Drafted against the brief, ready for your edit.

## The cost reconciliation that needs to happen before shipping

The cost-of-detention figure drifts across the constellation: $1.1M / $1.3M / $1.33M / $1.55M, all attributed to ROGS. **Reconcile to one number with one date stamp** before the Minderoo pitch goes out. Lead recommendation per `wiki/narrative/justicehub/claim-tier-pricing-against-detention-cost.md`: use the **3-year figure ($3.9M)** because it is more stable than the per-year figure across all four sources.

## How this folder relates to the rest of Tractorpedia

- **Sister projects in their own clusters** — [[contained]] (the campaign), [[empathy-ledger]] (the storytelling platform), [[goods-on-country]] (the enterprise)
- **Communities referenced** — [[oonchiumpa]], [[picc]], [[mounty-yarns]], [[campfire]], plus Maranguka and Olabud Doogethu (no individual project files yet)
- **Concepts** — [[lcaa-method]], [[third-reality]], [[civicgraph]], [[alma]]
- **Synthesis** — [[the-edge-is-where-the-healing-is-justicehub-as-the-world-model-for-community-led|The Edge Is Where the Healing Is]] · [[how-should-act-apply-the-karpathy-loop-to-justicehub-the-minderoo-pitch-and-the-|Karpathy loop alignment]] · [[how-should-act-pitch-minderoo-in-line-with-its-current-strategy-and-what-money-f|Minderoo strategy and money framing]]

## Edit hygiene

When you edit any file in this folder:
1. Edits propagate automatically to the narrative store via `node scripts/narrative-watch.mjs --source justicehub-constellation-projects`
2. Wikilinks are filename-based (Obsidian default) so you can reference any file in the vault as `[[the-full-idea]]` regardless of where it lives
3. Don't rename a file without updating the narrative claim files' `sources:` paths
4. The pitch arithmetic ($1.33M / $3.9M / Crescendo $3.43M) should match across all five files in this folder — if you change a number, change it everywhere

## Backlinks

- [[justicehub|JusticeHub]]
- [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]]
- [[living-website-operating-system|Living Website Operating System]]
- [[art/innovation/studio-innovation-flow|Studio Innovation Flow]]
