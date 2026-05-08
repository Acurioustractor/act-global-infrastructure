---
title: ACT Visual System
status: Locked 2026-04-08 (refined evening — Penguin Modern Classics paperback as the unlock anchor)
canonical_palette: Red Centre (Palette A)
locked_grammar: vintage Penguin Modern Classics paperback, woodcut symbol on cream paper
locked_unlock_phrase: "A vintage Penguin Modern Classics paperback book cover, photographed straight on, cream paper with light aging"
canonical_source: wiki/raw/2026-04-07-jh-minderoo-image-prompts.md
proven_in: wiki/output/three-circles-cover-typography.png + 4 sibling assets
image_model: gemini-3-pro-image-preview via mcp__gemini-image__create_asset
---

# ACT Visual System

> *Visuals are teaching tools, not decoration. Every image earns its place. One palette, one grammar, drawn by hand, soaked into paper, grounded in country.*

**Status:** Locked 2026-04-08 | **Canonical palette:** Red Centre | **Canonical grammar:** woodcut hand-drawn linework | **Use everywhere:** decks, model images, simple graphs, social, print, web illustration

## Why this exists

Until now, ACT has had two competing visual aesthetics circulating in parallel:

1. A **warm earth-toned web brand** (Earth Brown / Leaf Green / Sky Blue / Warm White) used for the website, dashboards, and consent UI — clean, professional, accessible
2. A **velvet-black + bone-white + ochre register** that emerged in the [[the-brave-ones|Brave Ones]] portrait discipline and the `tools/three-ripples-ledger.html` mockup — ceremonial, hand-made, lived-in

Both worked for their context. Neither was the **shared spine** for model images, simple graphs, and proposal artwork going forward. This page locks that spine.

The locked spine draws from the `wiki/raw/2026-04-07-jh-minderoo-image-prompts.md` image prompts library developed for the Three Circles Minderoo proposal. It is **already proven in the Three Circles deck**, and it is now the canonical system across every project — not just the pitch.

## The locked palette — Red Centre

**Use this everywhere** for stylised illustration, model images, simple graphs, proposal artwork, and any visual that isn't a UI surface. (UI surfaces — buttons, dashboards, headings on web — keep the existing brand colors. See *Brand colours vs artwork colours* below.)

| Role | Hex | Description |
|---|---|---|
| **Paper / background** | `#F0E6D2` | Paperbark cream — warm, soft, slightly yellow. The tooth of the page. |
| **Primary ink** | `#1F1A14` | Charred earth — warmer than pure black, like burnt wood. The line. |
| **Accent 1** | `#B85C38` | Red ochre — pigment of the Red Centre, the colour of country. The pulse. |
| **Accent 2** | `#7A8C5C` | Eucalypt sage — soft grey-green of mallee and mulga. The breath. |

**Why Red Centre and not the others.** Two alternates exist in the source library — *River Country* (cool, water-led) and *Desert Dusk* (ceremonial, deep iron + bloodwood). Red Centre wins because it has the strongest *"this is Australia"* read, the warmest grounding, and the cleanest cross-application across decks, social, and print. River Country and Desert Dusk are reserved for individual project sub-systems where their mood fits better — *not* for the shared spine.

**Authenticity rule.** Never use the previous black + emerald combo. It read as monastic and cult-like. Country palettes only.

## Brand colours vs artwork colours

These are two different surfaces with two different jobs:

| | **Brand / UI surfaces** (web, dashboards, buttons, headings) | **Artwork / illustration** (decks, model images, proposal art, social) |
|---|---|---|
| **Use** | act.place, JusticeHub, CivicGraph, Empathy Ledger v2 dashboards, internal tooling | Three Circles deck, Brave Ones portraits, model diagrams, social images, electorate-office book, gallery prints |
| **Palette** | Black `#0A0A0A` · Cream `#F5F0E8` · Urgent red `#DC2626` · Emerald `#059669` *(legacy locked brand)* | **Red Centre** — Paperbark cream `#F0E6D2` · Charred earth `#1F1A14` · Red ochre `#B85C38` · Eucalypt sage `#7A8C5C` |
| **Grammar** | Sans-serif type, clean spacing, accessible contrast, WCAG AA | Hand-drawn woodcut linework, generous negative space, no labels, no photorealism |
| **When in doubt** | If it has buttons, it's UI | If it's printed or framed or projected, it's artwork |

**One shared principle:** never rely on colour alone to convey meaning. Both surfaces meet WCAG AA contrast.

The two surfaces talk to each other but don't bleed. The Three Circles website (when built) uses brand colours; the Three Circles deck and model images use Red Centre.

## The locked grammar — vintage Penguin Modern Classics paperback

> **A vintage Penguin Modern Classics paperback book cover, photographed straight on, cream paper with light aging at the edges. A single hand-pulled woodcut symbol centered on the upper portion of the cover. Dark brown ink with hand-pulled woodcut texture, red ochre and sage green accents. Generous cream space. Restrained, literary, ancient.**

That paragraph is the **locked art direction.** Lead every illustration prompt with it verbatim. Then add the symbol description for the specific diagram. Then say *no text* (or, for cover artwork, specify the exact title text).

**Why this anchor works.** Tested 2026-04-08 evening across multiple prompt approaches. The earlier woodcut/Davey/Niemann/risograph framing — though correct in spirit — produced cluttered, busy results in Gemini 3 Pro Image because the model interprets "editorial illustration" as flat digital art and "risograph" as digital texture noise. The phrase *"vintage Penguin Modern Classics paperback book cover, photographed straight on"* is the actual unlock: it gives the model a real object to render (not an abstract style), automatic cream paper, automatic woodcut texture, automatic restraint, automatic literary register, automatic Penguin spine + colophon when wanted, and forgiving handling of typography. **Five usable assets generated in one parallel call.**

**The model knows objects, not adjectives.** Always anchor on a real artefact (a book cover, a wood block print, a hand-drawn map) rather than on abstract style descriptors. This rule generalises beyond Penguin — when in doubt, name the physical thing.

### What this grammar means in practice

| Do | Don't |
|---|---|
| Bold, confident, slightly imperfect lines | Thin precise vector lines |
| Visible paper grain and ink texture | Flat digital surfaces |
| Generous negative space (60–70% of frame) | Edge-to-edge composition |
| One palette, three or four inks max | Gradients, shadows, glows |
| Hand-drawn imperfections (slight tension, small breaks) | Geometric perfection |
| Symmetrical, ceremonial, weighty composition | Off-balance, dynamic, "modern" composition |
| Real metaphors from country (tree rings, basket coils, contours, ripples, fire) | Invented or new-age symbols |
| Real photographs for *people, places, programs* | Photorealistic illustration of people |
| Consent-first sourcing (Empathy Ledger record per asset) | Stock photos, faces without explicit consent |

### Taste anchors (look at these, often)

- **Owen Davey** — bold woodcut-style editorial illustration; *Mad About Sharks* / *Mad About Monkeys*
- **Tom Haugomat** — flat, ceremonial, ochre/earth palette, generous negative space
- **Christoph Niemann** — *Sunday Sketching*, NYT covers; the discipline of "minimum lines, maximum idea"
- **Penguin Modern Classics covers** — the ancient/literary register
- **Christian Boltanski, Sophie Calle, Edmund Clark, Theaster Gates, Anselm Kiefer** *(via [[the-brave-ones|Brave Ones]])* — accumulated, lived-in, archival
- **Judy Watson, Daniel Boyd, Vernon Ah Kee, Tony Albert, Brook Andrew** — Indigenous Australian artists whose register the system pays respect to

When in doubt, hold a draft up next to one of these names and ask: *would this sit on the same shelf?* If no, redraw.

## The five model image metaphors (locked, ranked)

For any "system / model / architecture" diagram (Three Circles, ACT Core Model, ALMA loop, LCAA, ecosystem map, etc), choose **one of these five metaphors** and stay in it across the asset. Mixing metaphors breaks the system.

| # | Metaphor | When to use | Cultural risk |
|---|---|---|---|
| **A** | **Tree-trunk cross-section** with growth rings — three of the rings dramatically thicker, dividing the trunk into three zones. *Why: growth rings literally are concentric circles. Implies time, depth, country, age.* | **Default for the Three Circles diagram.** Most universally readable, strongest metaphor, lowest cultural risk. | Low |
| **B** | **Coiled basket viewed from above** — continuous spiral coiling forming three concentric zones, with ten decorative stitch-markers in the middle ring. *Why: weaving = holding things together. Cultural object across many Indigenous Australian traditions.* | Strongest emotional resonance with the actual work | **Check with Indigenous advisor before public use** |
| **C** | **Topographic map of a sacred mountain** — concentric contour lines forming three elevation zones, ten waypoint markers in the middle band, songline pathways radiating outward. *Why: contour lines naturally form rings; uses real cartographic language.* | Strongest as a "this is serious" piece for funder decks | Low |
| **D** | **Ripples on still dark water** from a single dropped stone — three concentric ripples spreading outward from a bright central point. *Why: implies a single act of attention creating widening rings of impact.* | Cleanest, most meditative, works as a logo-mark too | Low |
| **E** | **Aerial view of a fire ceremony ground** — three concentric rings on the earth, central fire pit, ten smaller fires in the middle ring, songlines radiating outward. *Why: ceremonial weight, gathering place, fire as knowledge.* | Fall-back; closest to the previous attempt that read as cult-like | Highest — handle with care |

**Default ranking for testing:** A → B → D → C → E. Test A first; only escalate to the others if A isn't landing.

### How the metaphor encodes the program

Across all five metaphors, the same encoding holds:

- **The innermost zone** = the Centre / the data spine / the Living Brain → rendered as a dense web of fine accent-1 lines suggesting a network or constellation, radiating from a single bright central point
- **The middle zone** = the Ten Anchor Communities → exactly **ten** distinct markers evenly spaced around the ring (knot-holes, stitch-markers, waypoints, floating lights, fires)
- **The outermost zone** = the Outer Ring / the ecosystem → twelve to fifteen fine tendrils / pathways / songlines extending into the surrounding cream space, suggesting connection outward

If a different program needs the system (e.g. ACT Core Model, ALMA, LCAA), the encoding changes but the **drawing grammar stays exactly the same**.

## Diagram vocabulary

These are the canonical model diagrams maintained across ACT documentation. Each one renders in **the locked grammar above** with **the locked palette above**. Same hand. Same paper. Same inks.

| Diagram | Default metaphor | What it shows |
|---|---|---|
| **The Three Circles** ([[three-circles|Three Circles]]) | **Variant A — Tree trunk** | Centre / The Ten / The Outer Ring → *The Country We're Building* artefact |
| **ACT Core Model** | Variant D — Ripples (smaller scale) | LAND PRACTICE → ENTERPRISE / LCAA / IMPACT → COMMUNITY (Ownership) |
| **LCAA Loop** | Variant B — Basket coil (cycle, not arrow) | Listen → Curiosity → Action → Art → Listen (Art returns us to Listen) |
| **ALMA Listening-to-Action Loop** | Variant D — Ripples | LISTEN → AUTHORITY / CONSENT → MEANING → ACTION / HOLD BACK → REVIEW |
| **Consent and Data Flow** ([[empathy-ledger|Empathy Ledger]]) | Custom — concentric envelopes | Empathy Ledger as source of truth, internal/external paths determined by consent scope |
| **Enterprise Pathway Loops** | Variant A — Tree rings (slow, accumulating) | Goods on Country: Need → Design → Manufacture → Distribute → Maintain → 40% Returns. The Harvest: Land Care → Grow/Make → Community Enterprise → Revenue → Reinvest. |
| **Map of the Ten** (Three Circles companion) | Stylised hand-drawn map of Australia | Ten anchor communities marked as glowing accent-color fires; constellation web connecting them |
| **Three-Year Timeline (Fire Crescendo)** | Three campfires across a horizon | Year 1 small flame → Year 2 confident blaze → Year 3 roaring bonfire with sparks rising into a constellation |

**The grammar is the constant.** The metaphor varies by what the diagram is showing.

## Photography (separate from illustration)

Stylised illustration follows the rules above. **Real photographs follow a different rule:** *people, places, and programs only. No staging, no stock, no faces without consent.*

### What to photograph

- Land and place (primary subject)
- Hands at work (not faces unless consented)
- Products in context
- Community gathering — wide shots, backs, no identifiable faces without consent
- Seasonal change
- Process and making

### What not to photograph

- Staged or artificial moments
- Faces without explicit consent (even in internal drafts)
- Poverty or deficit framing
- Saviour imagery
- Stock-photo aesthetics

### Technical specs

| Use | Dimensions | Format |
|---|---|---|
| Hero images | 1920×1080 | WebP, JPG fallback |
| Thumbnails | 400×300 | WebP |
| Social media | 1200×630 | PNG |
| Print | 300dpi | TIFF, PDF |

### Consent rule (non-negotiable)

Every photograph asset must have an Empathy Ledger record or explicit consent note. If it can't be traced to consent, it does not belong. This rule applies whether the photo is internal, draft, or shipped.

## Typography

| Use | Font | Fallback | Where |
|---|---|---|---|
| **Headlines (UI)** | Inter Bold | system-ui, sans-serif | Web, dashboards |
| **Body (UI)** | Inter Regular | system-ui, sans-serif | Web, dashboards |
| **Headlines (artwork / proposal)** | Refined serif (e.g. Lyon, Tiempos, GT Sectra) | Georgia | Decks, books, gallery prints |
| **Body (artwork / proposal)** | Same serif, regular weight | Georgia | Decks, books, gallery prints |
| **Hand annotations on ledger pages** | Real handwriting (scanned) or Caveat / Homemade Apple as fallback | cursive | Ledger artefacts, journals |
| **Monospace** | JetBrains Mono | monospace | Code blocks only |

**Brand UI uses sans-serif. Artwork uses serif.** This is the same two-surface logic as colour.

## Application examples

These are the places the locked system already lives or is locked to land next:

| Where | Status | Notes |
|---|---|---|
| [[three-circles|Three Circles]] deck (`thoughts/shared/handoffs/staying/minderoo-deck-v2.md`) | Locked to this system | All 10 slides reference Red Centre + woodcut grammar |
| [[the-brave-ones|Brave Ones]] portrait series | Locked B&W within this system | Brave Ones portraits use bone white / velvet black / blood ochre as a *photographic sub-system* — high-contrast B&W photographs, the ochre accent mapping to Red Centre's accent 1 |
| `tools/three-ripples-ledger.html` mockup | Adopt this system on next refresh | Currently uses an alternate ledger-page register; should migrate to Red Centre + woodcut |
| `tools/three-ripples-poster.html` | Adopt this system on next refresh | Same as above |
| Three Circles model diagram | **Build next** using **Variant A — tree-trunk cross-section** with Red Centre + woodcut grammar |
| Map of the Ten | **Build next** as the Three Circles companion artwork |
| Three-Year Timeline (Fire Crescendo) | **Build next** for Slide 5 of the Three Circles deck |
| The Journals (per young person, Year 3 deliverable) | Locked to this system | Hand-stitched A5, paperbark cream paper, charred earth ink, red ochre accents |
| *The Country We're Building* book | Locked to this system | Major Australian publisher; Red Centre throughout |
| Future ACT project decks (Goods, Harvest, BCV, Farm) | Adopt on next iteration | Same palette, same grammar, varying only the metaphor |

## How to generate a brand asset (workflow that actually works)

The image model is **`mcp__gemini-image__create_asset`** with the **`gemini-3-pro-image-preview`** model. It runs inside Claude Code via MCP — no web UIs, no copy-paste, no screenshots.

### The prompt recipe (always three parts, in this order)

**1. Locked anchor sentence — verbatim:**

> *A vintage Penguin Modern Classics paperback book cover, photographed straight on, cream paper with light aging.*

**2. The symbol — one short paragraph naming what's centered on the cover:**

> *Centered woodcut symbol: [SHAPE] in dark brown ink with hand-pulled woodcut texture, [RED OCHRE ELEMENTS], [SAGE GREEN ELEMENTS]. Restrained, ancient.*

**3. Text instruction:**

> *No text, no title.*
> OR (for a cover):
> *Below the symbol, in classic Penguin serif: "TITLE" in large dark brown letters, and below in smaller italic: "Subtitle here". Generous cream space at the bottom.*

That's the entire recipe. Aspect ratio `2:3` for book covers, `1:1` for symbols/logos, `16:9` for hero/social.

### The seven rules learned 2026-04-08

1. **Lead with the object, not the style.** *"Penguin Modern Classics paperback"* beats *"editorial illustration in the style of"* every time. Gemini knows objects, not adjectives.
2. **Short prompts beat long prompts.** Keep total prompt under ~120 words. Long art-direction blocks make the model crowd the frame.
3. **Don't say "risograph".** It triggers digital texture noise instead of hand-pulled woodcut feel.
4. **Image models can't reliably count past ~6.** If you ask for "ten markers", you'll get 7–10. The pitch body copy carries the literal number; the symbol carries the gestalt. Don't fight it.
5. **Title text on covers actually works** in Gemini 3 Pro Image — surprisingly clean serif rendering. Subtitle text drifts more. Major-title-only is the safest typography pattern.
6. **The Penguin spine + colophon at the bottom often appears unprompted** — because the model knows the real object. Lean into this; it's free brand authenticity.
7. **Generate in parallel.** Five assets in one parallel MCP call took ~30 seconds total. Always batch related variants rather than iterating sequentially.

### Working examples (already in `wiki/output/`)

| Asset | File | Use |
|---|---|---|
| **Three Circles cover with title** | `three-circles-cover-typography.png` | Slide 1 of the deck · book mockup for *The Country We're Building* |
| **Three Circles symbol (no text)** | `three-circles-penguin-v3-clean.png` | Standalone mark · social · electorate-office stamp |
| **ALMA Listening-to-Action Loop** | `alma-loop-penguin.png` | LISTEN → AUTHORITY / CONSENT → MEANING → ACTION / HOLD BACK → REVIEW diagram |
| **LCAA four-petal** | `lcaa-loop-penguin.png` | Listen / Curiosity / Action / Art rosette |
| **Map of the Ten** | `map-of-the-ten-penguin.png` | Slide 7 of the deck · the ten anchor communities |
| **Three-Year Fire Crescendo** | `fire-crescendo-penguin.png` | Slide 5 of the deck · Year 1 → Year 2 → Year 3 timeline |

All five generated in one parallel `mcp__gemini-image__create_asset` call with the recipe above.

### Backup option

If Gemini 3 Pro Image is unavailable or rate-limited, swap `model: "gemini-2.5-flash-image"` for the same MCP. Faster, slightly less precise, still in-brand.

### Earlier prompt-template library (still useful as a library of metaphors)

The full prompt templates from the original Three Circles image library live in `wiki/raw/2026-04-07-jh-minderoo-image-prompts.md`. Those describe the *encoding* (what each diagram should show); the recipe above is how to *render* them in Gemini.

## Asset management

### Naming convention

```
[project]-[type]-[description]-[date].[ext]
```

Examples:
- `three-circles-model-tree-trunk-2026-04.png`
- `staying-journal-cover-mockup-2026-04.svg`
- `picc-photo-station-precinct-2026-03.webp`
- `brave-ones-portrait-xavier-stretch-bed-2026-05.jpg`

### Storage

- **Source files (working):** Google Drive / Figma
- **Production assets (shipped):** Supabase Storage
- **Long-term archive:** External backup, annual

### Consent tracking

Every asset must carry: Empathy Ledger ID (where applicable), consent scope notation, date of consent, review status. No exceptions.

## What this page replaces

- Earlier `visual-system.md` with Earth Brown / Leaf Green / Sky Blue / Warm White as the primary palette — those colours are now the **brand UI palette**, not the artwork spine
- Vague "Simple, clean lines / Minimal decoration / Arrow-based flows" diagram guidance — replaced with the locked woodcut grammar above
- Any drift toward black + emerald artwork — explicitly retired (read as cult-like)
- Three competing sub-aesthetics across Brave Ones, Three Ripples, and the Three Circles deck — now reconciled under one spine

## Backlinks

- [[three-circles|The Three Circles]] — primary application; the locked system is built around making this pitch coherent
- [[the-brave-ones|The Brave Ones]] — photographic sub-system inside the visual spine
- [[empathy-ledger|Empathy Ledger]] — consent layer for every asset
- [[voice-guide|ACT Voice Guide]] — companion language system; same two-surface logic (UI vs artwork) applies to language too
- [[governance-consent|Governance & Consent]] — consent requirements for visual assets
- [[lcaa-method|LCAA Method]] — the methodology this system serves
- `wiki/raw/2026-04-07-jh-minderoo-image-prompts.md` — the canonical source for all model image prompts; this page is the compiled article on top of it
