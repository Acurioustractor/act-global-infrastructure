---
title: ACT Brand Alignment Map — read before designing anything
summary: Authoritative map of every ACT-ecosystem brand surface, what it inherits from the parent, what it intentionally deviates on, and when to use which. Read this first when starting new design work so you don't re-invent what already exists.
tags: [decisions, brand, visual-system, alignment, brain]
status: live
date: 2026-04-25
review_cadence: monthly + on any new sub-brand
---

# ACT Brand Alignment Map

> **Read this before designing anything.** The map exists so you don't re-decide what's already decided. If a question isn't answered here, the answer is to extend this file, not to design from scratch.

> **Companion files** — the sources this map references:
> - `.claude/skills/act-brand-alignment/references/brand-core.md` (parent IDENTITY: LCAA, voice, values, project narratives)
> - `.claude/skills/act-brand-alignment/references/writing-voice.md` (Curtis method; AI-tells blocklist)
> - `act-regenerative-studio/DESIGN.md` (parent VISUAL: Bold Documentary + Warm Editorial)
> - per-sub-brand `DESIGN.md` files listed below

---

## The visual family (three clusters)

ACT has one parent identity (regenerative innovation; PTO metaphor; LCAA method; Indigenous-led partnership) but three legitimate visual families. Each family has a reason. Don't merge them; choose deliberately.

```
                       ACT brand-core (identity)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
  EDITORIAL WARMTH       CIVIC BAUHAUS         (intentional break,
  (the home cluster)     (intentional break)    other future)
        │                     │
   ┌────┼─────┬──────┐        │
   │    │     │      │        │
 act-   EL v2 JH    (Goods,   CivicGraph
 regen        flag- Harvest,   (grantscope)
 studio       ship  Farm —
              child unscoped
              of    today)
              STAY
              journal
```

**Editorial Warmth** — warm earth tones, serif type, generous space, "bookshop" energy. Reads like a journal or a printed booklet. Default cluster for funder-facing + community-facing surfaces.

**Civic Bauhaus** — black + signal red + zero radius, hard borders, geometric sans. Reads like Bloomberg Terminal designed by the Bauhaus school. For data-heavy accountability tools where "warmth" would undermine authority.

**Future intentional break** — if a new sub-brand genuinely doesn't fit either cluster (e.g., a kids-facing surface), document the break here as a third cluster with its OWN reason.

---

## Per sub-brand

### act-regenerative-studio (parent visual)

- **What it is:** Public-facing website for ACT, the parent ecosystem. The hub from which every project links out.
- **Cluster:** Editorial Warmth (defines it).
- **Inherits:** Identity from `brand-core.md` (LCAA, voice, project narratives, "we hand over the keys").
- **Defines for the family:**
  - Two design languages: **Bold Documentary** (flagship project narrative pages) + **Warm Editorial** (meta, methodology, listings)
  - Type: **Fraunces** (display) + **Source Serif 4** (body) + **Work Sans** (UI labels) + **Geist Mono** (data)
  - Color: **Forest green `#2D5A3D`** (primary accent) + **Clay `#C4845C`** (secondary) + **Warm white `#FAFAF7`** (background) + **Dark `#1A1F1A`** (dark sections, not pure black)
  - Components: `src/components/design-system/` — DocHero, SectionHeader, HairlineGrid, LeadVoice, PrinciplesList, DarkCTA + WarmCard
- **DESIGN.md:** `act-regenerative-studio/DESIGN.md`
- **Use it when:** designing pages for `act.place` itself.
- **Open question:** the parent DESIGN.md doesn't currently reference brand-core.md. Add a one-line "this design system serves the brand-core identity" header at top.

### JusticeHub

- **What it is:** Web app + funder-pitch surfaces for the JusticeHub network.
- **Cluster:** Editorial Warmth (subfamily — STAY journal heritage).
- **Inherits:** ACT brand-core identity (LCAA, voice). Aesthetic explicitly inherits from STAY journal physical design (Cormorant Garamond display, IM Fell English body, Architects Daughter margin notes, scrapbook elements).
- **Intentional deviation from parent visual:**
  - Type: **Cormorant Garamond** (display) + **Instrument Sans** (body, recommended) — NOT Fraunces
  - Color: **Cream `#f8f1e6`** + **Deep purple `#4a2560`** — NOT forest green
  - Why: STAY journal is the physical artefact this digital expression extends. Funders and judges who hold the journal need to feel the same energy on the web. The web inherits FROM the journal, not from act.place.
- **DESIGN.md:** `JusticeHub/DESIGN.md` (118 lines)
- **Use it when:** designing JusticeHub-network surfaces (funder pitch, case management, public artefacts).
- **Drift to fix:** DESIGN.md silent on parent ACT brand-core; add "inherits identity from `act-brand-alignment/brand-core.md`; deviates visually because of STAY journal heritage."

### Empathy Ledger v2

- **What it is:** Multi-tenant storytelling platform for diverse communities (Indigenous, multicultural, advocacy orgs).
- **Cluster:** Editorial Warmth (subfamily — earth-tone editorial).
- **Inherits:** ACT brand-core identity (consent + sovereignty values particularly load-bearing here).
- **Intentional deviation from parent visual:**
  - Color: **Ochre `#96643a`** + **Terracotta `#b84a32`** + **Sage `#5c6d51`** + **Charcoal `#42291a`** + **Cream `#faf6f1`**. Earth tones, but a different palette than parent's forest green.
  - Logo: two open semicircular arcs facing each other (the space between = empathy). Custom mark.
  - Why: explicitly multi-tenant. Cannot be "ACT-coded" because it serves non-ACT orgs. Earth-tone family signals shared values; specific palette signals independence.
- **DESIGN.md:** `empathy-ledger-v2/DESIGN.md` (265 lines)
- **Use it when:** designing EL platform surfaces (storyteller portal, org dashboards, public story pages).
- **Drift to fix:** DESIGN.md silent on parent inheritance; add the "shared identity, independent palette" rationale.

### CivicGraph (grantscope)

- **What it is:** Decision infrastructure for Australian government and social sector — entity graph, procurement intelligence, funding allocation analysis.
- **Cluster:** Civic Bauhaus (defines it).
- **Inherits:** ACT brand-core values (uncomfortable truth-telling, accountability) — these are EXACTLY the brand-core's "name extractive systems" promise made into a tool.
- **Intentional deviation from parent visual:**
  - Type: **Satoshi Black/ExtraBold** (display) + **DM Sans** (body) + **JetBrains Mono** (data)
  - Color: **Black `#121212`** + **Red `#D02020`** (signature) + **Blue `#1040C0`** + **Yellow `#F0C020`** + **Canvas `#F0F0F0`**. Zero radius. Hard borders. Hard shadows.
  - Why: government data + accountability tools defaults to "blue + system fonts + rounded corners." CivicGraph deliberately breaks this to feel authoritative + serious. "A Bloomberg Terminal designed by the Bauhaus school." Warmth would undermine teeth.
- **DESIGN.md:** `grantscope/DESIGN.md` (115 lines)
- **Use it when:** designing data dashboards, accountability tools, civic-data surfaces.
- **Drift to fix:** DESIGN.md silent on parent inheritance; add "shared values, opposite visual: Bauhaus authority where parent is editorial warmth."

### Goods on Country (UNSCOPED)

- **What it is:** Circular-economy enterprise — beds, mattresses, washing machines for remote communities, made on Country from local waste.
- **Current state:** No DESIGN.md. No documented visual identity. The website at goodsoncountry.com exists; its design has not been written down here.
- **Recommended cluster:** Editorial Warmth (cousin of EL v2 + JH). Goods is funder + community-facing storytelling about enterprise; it's not a data tool.
- **Recommended palette direction:** earth + manufacturing — ochre/terracotta family with one bold accent (signal red? olive green?). Material textures (HDPE, canvas, galvanised steel) should appear as photography, not decoration.
- **What needs to happen:** read the existing goodsoncountry.com site, document what's there into a fresh `goods/DESIGN.md`, mark it as Editorial Warmth subfamily.

### The Harvest Witta (UNSCOPED)

- **What it is:** Community hub at Witta on Gubbi Gubbi Country — therapeutic horticulture, heritage preservation, three zones (Garden, Kitchen, Art Space).
- **Current state:** No DESIGN.md. CLAUDE.md mentions Bauhaus exploration at `/bauhaus` route — but Bauhaus is the CivicGraph cluster, which is the wrong fit for a community hub website.
- **Recommended cluster:** Editorial Warmth (parent visual) — Harvest is the place expression of the act.place narrative; visual continuity with the parent makes the relationship legible.
- **Recommended palette direction:** parent forest green `#2D5A3D` + parent clay `#C4845C` + parent warm white `#FAFAF7`. Use parent components from `act-regenerative-studio/src/components/design-system/`.
- **What needs to happen:** **decision required** — drop the Bauhaus exploration and adopt the parent visual, OR commit to Bauhaus and document why a CSA + retreat venue should feel like Bloomberg Terminal. Default recommendation: drop Bauhaus, adopt parent.

### ACT Farm (UNSCOPED)

- **What it is:** Home base on Jinibara Country. Land care, learning, art-making.
- **Current state:** No DESIGN.md.
- **Recommended cluster:** Editorial Warmth (parent visual). Same logic as Harvest — place expression of the parent narrative.
- **Recommended palette direction:** parent visual, identical to act-regenerative-studio's farm sub-pages.
- **What needs to happen:** decide whether Farm site exists separately from act.place's `/farm` page or is just an extension. If separate, document a 30-line `act-farm/DESIGN.md` that says "inherits everything from parent."

---

## Decision tree for NEW design work

```
                    Is this a data / accountability / dashboard tool?
                              │
                    ┌─────YES─┴─NO─────┐
                    ▼                  ▼
           Use CIVIC BAUHAUS    Is it Indigenous-led storytelling
           (CivicGraph DESIGN.md)   in a multi-tenant context?
                              │
                    ┌─────YES─┴─NO─────┐
                    ▼                  ▼
           Use EL v2 family    Does it extend the STAY journal
           (EL v2 DESIGN.md)   into a digital surface?
                              │
                    ┌─────YES─┴─NO─────┐
                    ▼                  ▼
           Use JusticeHub      Default to PARENT EDITORIAL
           family (JH DESIGN.md)   (act-regenerative-studio
                                    DESIGN.md)
```

If the answer to all the above is "no but it doesn't fit any of these either" — STOP. Add a card to this map documenting the new break BEFORE designing anything.

---

## What's actually load-bearing across all clusters

These rules apply to every surface, regardless of cluster:

1. **Voice (Curtis method).** Name the room, name the body, load the abstract noun, stop the line before the explanation. From `writing-voice.md`.
2. **AI-tells blocklist.** Never use: delve, crucial, pivotal, tapestry, underscore, "not just X but Y", rule-of-three adjective padding, em-dashes (in any ACT-facing writing), "challenges and future prospects", "-ing" significance tails.
3. **Naming.** "Australian Living Map of Alternatives" never bare "ALMA". "Listen · Curiosity · Action · Art" never bare "LCAA". Indigenous place names always; colonial in brackets only.
4. **LCAA imprint.** Every project should be reachable from the LCAA framing — Listen, Curiosity, Action, Art — visually OR narratively. Some lean Listen (EL v2), some Action (JH), some Art (Studio), some all four (Farm). State which.
5. **Indigenous protocols.** Cultural-protocols-true projects (PICC, Oonchiumpa, BG Fit, Mounty Yarns) require OCAP-style consent before any storyteller content lands publicly. From `wiki/projects/...` per-project notes + `project_wiki_story_sync.md` memory.

---

## Drift inventory (what to fix, low-effort)

| Surface | Drift | Fix | Effort |
|---|---|---|---|
| `act-regenerative-studio/DESIGN.md` | No reference to brand-core.md | One-line header: "This design system serves the brand identity at `.claude/skills/act-brand-alignment/references/brand-core.md`." | 1 min |
| `JusticeHub/DESIGN.md` | Silent on parent inheritance | Same | 1 min |
| `empathy-ledger-v2/DESIGN.md` | Silent on parent inheritance | Same | 1 min |
| `grantscope/DESIGN.md` | Silent on parent inheritance | Same | 1 min |
| `goods` | No DESIGN.md | Create one in EL/JH editorial-warmth subfamily | 30 min |
| `act-farm` | No DESIGN.md | Create a 30-line "inherits from parent" stub | 10 min |
| `The Harvest Website` | No DESIGN.md + Bauhaus exploration in wrong cluster | Decide: parent visual OR document Bauhaus break | Decision first; ~20 min after |

---

## How this map gets reviewed

Same pattern as the rest of the brain:

1. **Human edit** — Ben (or anyone designing) updates this map when a sub-brand's positioning shifts or a new sub-brand emerges. ALWAYS update the map BEFORE shipping a new design — that's the one rule that prevents drift.
2. **Monthly review** — first Friday of each month, scan the map: does each sub-brand still match its DESIGN.md? Has any sub-brand site moved away from its declared cluster? Drift = update map or fix the surface.
3. **On any new sub-brand** — add a card to the per-sub-brand section before the new brand ships its first page.
4. **Synced via brain** — `scripts/sync-act-context.mjs` includes a pointer to this map in the "ACT Context" block distributed to every repo's CLAUDE.md, so any Claude session reading any repo knows where to find the map.

---

## Backlinks

- [[act-core-facts|ACT Core Facts (entity layer of the brain)]]
- [[../../thoughts/shared/plans/act-brain-expansion|Brain expansion plan]]
- [[../../.claude/skills/act-brand-alignment/references/brand-core|Parent brand identity]]
- [[../../.claude/skills/act-brand-alignment/references/writing-voice|Writing voice rules]]
