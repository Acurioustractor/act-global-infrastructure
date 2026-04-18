---
title: "JH deployment snapshot — minderoo-image-prompts"
source: jh-proposal-auto
source_path: "JusticeHub/output/proposals/minderoo-image-prompts.md"
source_mtime: "2026-04-13T11:26:13.775Z"
snapshot_date: "2026-04-17"
snapshot_hash: "38b162745ad7"
synced_at: "2026-04-17T22:14:35.686Z"
---
# JH deployment snapshot — minderoo-image-prompts
> Snapshot of `JusticeHub/output/proposals/minderoo-image-prompts.md` as deployed on 2026-04-17. Source-of-truth lives in the JH repo; canonical claim logic lives in `wiki/projects/justicehub/` and `wiki/campaigns/`.
## Backlinks

- [[picc|Palm Island Community Company]]
- [[oonchiumpa|Oonchiumpa]]
- [[act-studio|ACT Regenerative Studio]]
- [[indigenous-data-sovereignty|Indigenous Data Sovereignty]]

## Contents
# Image Prompt Library — Minderoo "Three Circles" Proposal
*Portable prompts for testing across Midjourney, DALL-E 3, Gemini, Ideogram, Flux, etc.*

---

## Country palettes (pick one, lock it across all four images)

The earlier black + emerald combo read as monastic and cult-like. These three palettes draw from Australian country — ochre, paperbark, eucalypt, spinifex, river clay, dusk. Pick one and use it consistently across the whole series.

### ★ Palette A — Red Centre (recommended)
*Warm, grounded, desert country. Strongest "this is Australia" read.*

| Role               | Hex       | Description                                                  |
| ------------------ | --------- | ------------------------------------------------------------ |
| Paper / background | `#F0E6D2` | Paperbark cream — warm, soft, slightly yellow                |
| Primary ink        | `#1F1A14` | Charred earth — warmer than pure black, like burnt wood      |
| Accent 1           | `#B85C38` | Red ochre — pigment of the Red Centre, the colour of country |
| Accent 2           | `#7A8C5C` | Eucalypt sage — soft grey-green of mallee and mulga          |

**Prompt phrasing:** *"Three-color risograph print on warm paperbark cream paper (hex #F0E6D2), printed in charred earth ink (hex #1F1A14), red ochre ink (hex #B85C38), and soft eucalypt sage ink (hex #7A8C5C). Visible paper grain texture, slight ink misregistration where colors overlap."*

### Palette B — River Country
*Cooler, water-led, north Queensland and east coast feel. Calmer and more meditative.*

| Role | Hex | Description |
|---|---|---|
| Paper / background | `#EFE6D2` | Bone cream |
| Primary ink | `#1F1A14` | Charred earth |
| Accent 1 | `#8B5A3C` | River clay — warm brown of muddy banks |
| Accent 2 | `#6B8AA8` | Faded sky blue — wet-season distance, river water |

**Prompt phrasing:** *"Three-color risograph print on bone cream paper (hex #EFE6D2), printed in charred earth ink (hex #1F1A14), river clay ink (hex #8B5A3C), and faded sky blue ink (hex #6B8AA8). Visible paper grain, slight ink misregistration."*

### Palette C — Desert Dusk
*Most atmospheric, most ceremonial. Bloodwood and spinifex at last light.*

| Role | Hex | Description |
|---|---|---|
| Paper / background | `#EDDFC8` | Pale dusk cream |
| Primary ink | `#2B1F18` | Deep iron — warm dark, almost umber |
| Accent 1 | `#9B3D2A` | Bloodwood red — deep ochre, almost rust |
| Accent 2 | `#D4A55B` | Spinifex gold — dry grass at sundown |

**Prompt phrasing:** *"Three-color risograph print on pale dusk cream paper (hex #EDDFC8), printed in deep iron ink (hex #2B1F18), bloodwood red ink (hex #9B3D2A), and spinifex gold ink (hex #D4A55B). Visible paper grain, slight ink misregistration."*

---

## Shared art direction (use across all prompts)

After the palette line, append this block to every prompt:

> **Bold confident hand-drawn linework with woodcut weight. Editorial illustration in the lineage of Owen Davey, Tom Haugomat, Christoph Niemann, and Penguin Modern Classics covers. Country feels grounded, natural, and ancient — never corporate, never sect-like, never new-age. Generous negative space. No text. No labels. No people. No photorealism. No infographic feel. Imperfect, hand-drawn, soaked into paper.**

**Photography rule:** Real photos only for people, places, and programs. All of these prompts are **stylized illustration**, so they comply.

**Midjourney suffix to append:**
`--ar 1:1 --style raw --v 6.1 --stylize 250`

For 16:9 visuals use `--ar 16:9`. For 3:2 use `--ar 3:2`.

### How to use the variant prompts below

The variant prompts use **two placeholders** so they work with any palette you pick:

- `primary ink` → swap for the **primary ink** of your chosen palette (e.g., *"charred earth ink #1F1A14"*)
- `accent-color` → swap for the **accent 1** of your chosen palette (e.g., *"red ochre #B85C38"*)

**Optional two-accent treatment:** Where the prompt has multiple `accent-color` references, you can use both accents from your palette to create more depth — e.g., the **middle ring** (the ten communities) in accent 1 (red ochre), and the **inner web** (the data spine) in accent 2 (eucalypt sage). This makes each circle visually distinct without adding labels.

**Note on the website brand:** The locked brand colors (black `#0A0A0A`, cream `#F5F0E8`, urgent red `#DC2626`, emerald `#059669`) still apply to UI surfaces — buttons, headings, web layouts. These country palettes are for **illustration and proposal artwork** specifically. If a country palette wins, we can decide whether to evolve the brand system to incorporate it.

---
---

# CIRCLE 1 — The Model Diagram (THE PRIORITY)

The central concept. Three concentric zones representing **the Centre (data spine) → the Ten (communities) → the Ecosystem (frameworks, JRI, philanthropy, international, magistrates, media)**.

The metaphor needs to be **real and ancient**, not invented. Five concept variants below, ranked by how strongly the metaphor maps to the work.

---

## Variant A — Tree trunk cross-section ★ (strongest metaphor)

*Why: growth rings are literally where the concept of "concentric circles" comes from. Implies time, depth, country, age. Universal.*

> A perfectly circular cross-section of an ancient tree trunk, viewed from directly above the cut surface, filling the entire square frame. The wood grain forms hundreds of concentric growth rings rendered in confident hand-drawn primary ink linework — but three of those rings are dramatically thicker and more prominent than the rest, dividing the trunk into three distinct zones.
>
> The innermost zone (the heartwood at the very center) is dense and intricate, filled with a tightly woven web of fine accent-color lines that suggest a neural network or constellation, all radiating from a single bright central point.
>
> The middle zone is a band of smoother wood grain interrupted by exactly **ten** distinct dark knot-holes evenly spaced around the ring like markers on a clock face — each knot rendered as a small radiant accent-color sunburst with a black center.
>
> The outermost zone is the bark layer — irregular and textured. From its outer edge, twelve to fifteen fine accent-color root-like or branch-like tendrils extend just beyond the trunk's edge into the surrounding cream space, suggesting connection outward to the world.
>
> Tiny imperfect cracks and variations in the wood grain make it feel real and ancient, not geometric. Symmetrical, ceremonial, weighty. [INSERT SHARED ART DIRECTION]

---

## Variant B — Coiled basket viewed from above

*Why: weaving = holding things together, which is exactly what the program does. Cultural object across many Indigenous Australian traditions. Visually rich.*

> A perfectly circular coiled woven basket viewed from directly above, filling the entire square frame. The basket is made of natural fibre coiled in a continuous spiral from the center outward, the coils rendered in confident hand-drawn primary ink with subtle texture suggesting individual fibre strands. The spiral coiling forms three distinct concentric zones.
>
> The innermost zone at the center is the densest weaving — packed tight, intricate, with fine accent-color threads woven through the black coils creating a glowing intricate pattern that suggests a network or constellation, radiating from a single central point.
>
> The middle zone is a wider band where the coils are interrupted by exactly **ten** distinct decorative stitch markers evenly spaced around the ring — each marker a small radiant accent-color symbol woven into the fibre.
>
> The outermost zone is the loosest coiling near the rim. From the rim, twelve to fifteen fine accent-color threads extend just slightly outward into the surrounding cream space, suggesting strands not yet woven in — connection outward to the world.
>
> The coils have natural imperfections and slight tension variations, making the basket feel handmade and real, not geometric. Symmetrical, ceremonial, weighty. [INSERT SHARED ART DIRECTION]

---

## Variant C — Topographic map of a sacred mountain

*Why: contour lines naturally form concentric rings; uses real cartographic language. Mountain = depth, ascent, sacred site.*

> A stylized topographic map viewed from directly above, showing a single circular sacred mountain or volcanic peak rising from flat country, filling the entire square frame. The mountain is rendered as dozens of concentric topographic contour lines in confident hand-drawn primary ink, forming a perfect circular relief — but three of those contour lines are dramatically thicker than the rest, dividing the slope into three elevation zones.
>
> The innermost zone is the summit at the center — densely packed tight contour lines crowded together, with a glowing intricate accent-color pattern at the absolute peak suggesting a fire, brain, or constellation radiating from the highest point.
>
> The middle zone is a wider band of evenly spaced contour lines interrupted by exactly **ten** distinct accent-color markers placed evenly around the ring like waypoints on the slope — each a small radiant accent-color sunburst with a black center.
>
> The outermost zone is the foothills and surrounding plain — sparser contour lines fading outward, with twelve to fifteen fine accent-color pathways radiating from the outer edge into the cream space like dry creek beds or songlines reaching outward.
>
> Faint dotted markings suggest dry riverbeds and waypoint cairns scattered across the slopes. Symmetrical, ancient, weighty. [INSERT SHARED ART DIRECTION]

---

## Variant D — Ripples on still water from a single dropped stone

*Why: ripples literally radiate outward; implies a single act of attention creating widening rings of impact. Water = life, knowledge, story.*

> A perfectly square top-down view of still dark water with three perfect concentric ripples spreading outward from a single bright point at the absolute center, filling the entire frame. The water surface is rendered in deep primary ink with subtle reflective texture. The three ripple rings are bold and pronounced, each one drawn with confident hand-drawn linework, the rings getting slightly wider apart as they move outward.
>
> At the absolute center, where the stone has just landed, a small bright accent-color burst suggests a constellation or pulse of light radiating outward.
>
> Along the second ripple ring (the middle one), exactly **ten** small accent-color lights float on the water's surface evenly spaced around the ring, each a small radiant point.
>
> Beyond the outermost ripple, twelve to fifteen fainter accent-color wavelets continue outward toward the edges of the frame, suggesting impact spreading out into the world.
>
> The water has a few natural imperfections — small reflections, faint surface texture — making it feel real and quiet rather than geometric. Symmetrical, meditative, weighty. [INSERT SHARED ART DIRECTION]

---

## Variant E — Aerial view of a fire ceremony ground

*Why: ceremonial weight, country, gathering place, fire as knowledge. (This is the closest to what the previous attempt tried — included for completeness, but probably not the strongest.)*

> A bird's-eye aerial view looking straight down at a vast ochre desert landscape at dusk, with three enormous concentric rings formed on the earth, filling the entire square frame.
>
> The innermost ring is a single central fire pit with bright accent-color flames, surrounded by a tight web of fine accent-color lines suggesting a constellation or songline pattern radiating from the flames.
>
> The middle ring is formed by exactly **ten** distinct smaller fires evenly spaced around the circle — each a small radiant black sunburst with accent-color flames at its core.
>
> The outermost ring is made of dotted markings — cairns, waypoint stones, faint footpaths — scattered around the perimeter.
>
> Beneath all three rings, faint topographic contour lines and dry riverbeds run across the landscape in pale accent-color. Beyond the outermost ring, twelve to fifteen songline pathways radiate outward into the surrounding cream space.
>
> The composition is ceremonial, ancient, powerful — like a songline diagram crossed with a satellite photograph. [INSERT SHARED ART DIRECTION]

---

## Recommended testing order

1. **Variant A (tree)** — most universally readable, strongest metaphor, lowest cultural risk
2. **Variant B (basket)** — strongest emotional resonance with the actual work; check with an Indigenous advisor before using publicly
3. **Variant D (water ripples)** — cleanest, most meditative; works well as a logo-mark too
4. **Variant C (topo mountain)** — strongest as a "this is serious" piece for funder decks
5. **Variant E (fire ground)** — fall-back

---
---

# CIRCLE 2 — The Map of the Ten

> A stylized hand-drawn map of the Australian continent in a horizontal landscape composition, rendered like the inside cover of a major literary nonfiction book about country.
>
> The continent outline is drawn in bold confident primary ink with a slightly imperfect hand-drawn line — not geometric, not traced. The interior of the continent is filled with faint topographic contour lines, dry river systems, and dotted songline pathways flowing between regions in pale accent-color.
>
> Ten locations are marked across the continent as glowing accent-color fires — each rendered as a small radiant sunburst with a black dot at its center — placed at: Alice Springs (Northern Territory red center), Palm Island (Queensland north coast), Sydney (NSW coast), Tennant Creek (NT), mid north coast NSW, Stradbroke Island (southeast Queensland), Hobart (Tasmania), Canberra (ACT), Perth (Western Australia), Adelaide (South Australia).
>
> Faint accent-color lines connect the ten fires in a constellation web suggesting relationships and exchange flows between them. A small compass rose in the bottom corner. No text labels on the map itself. Negative space around the continent.
>
> [INSERT SHARED ART DIRECTION] `--ar 3:2`

---
---

# CIRCLE 3 — The Three-Year Timeline (Fire Crescendo)

> A horizontal landscape composition with three campfires arranged across a barren horizon line that runs through the middle of the image.
>
> The leftmost fire is small — a single modest flame with a thin trail of smoke rising. The middle fire is medium — a confident blaze with stronger flames and thicker swirling smoke. The rightmost fire is the largest — a roaring bonfire with tall flames, dense smoke, and accent-color sparks rising upward and transforming as they ascend into a constellation of stars at the top right of the image.
>
> Each fire is rendered with bold woodcut-like ink linework. The horizon line beneath the fires has faint topographic contour markings. The sky above is mostly empty cream space with the constellation in the upper right and the smoke trails drifting between the three fires, suggesting flow and growth across time.
>
> The image evokes growth, accumulation, ceremony, and crescendo — from a small spark to a national fire.
>
> [INSERT SHARED ART DIRECTION] `--ar 16:9`

---
---

# CIRCLE 4 — The Artifact Triptych

Three vertical panels representing **Documentary · Book · Platform** as one artifact in three forms.

> A symmetrical triptych composition divided into three vertical panels by thin black borders, in the visual language of a vintage Penguin book cover or a Soviet constructivist propaganda poster.
>
> LEFT PANEL: a bold stylized woodcut of an old reel-to-reel film projector beaming a cone of accent-color light forward, the light cone containing tiny silhouettes of mountains and trees suggesting country being projected.
>
> CENTER PANEL: a bold stylized woodcut of an open hardcover book with pages slightly fanned, accent-color light rising from the open pages forming a small constellation of stars above the book.
>
> RIGHT PANEL: a bold stylized woodcut of an obelisk or monolith standing tall, with concentric accent-color rings emanating outward from its surface like radio waves or songlines reaching into the surrounding space.
>
> All three objects sit on the same horizon line which runs across the entire triptych. Above the triptych, a faint accent-color constellation arcs across all three panels, connecting them. Generous negative space.
>
> [INSERT SHARED ART DIRECTION] `--ar 16:9`

---
---

# Platform-specific tips

**Midjourney (best for artistic concept):**
- Append `--ar [ratio] --style raw --v 6.1 --stylize 250`
- Try `--style raw --stylize 100` if it gets too painterly
- Use `::` weighting on key elements: `tree trunk cross-section::3 ten knot holes::2`
- Re-run with `--seed [number]` to refine a winning composition

**DALL-E 3 / ChatGPT (best at literal instructions):**
- Use the prose as-is
- Add at start: *"Generate this exactly as described, do not add any text or labels:"*
- It tends to add corporate polish — push back with *"hand-drawn, imperfect, woodcut weight"*

**Gemini 3 Pro Image / Imagen:**
- Use the prose as-is, it handles long prompts well
- Add `flat 2D vector illustration, no 3D, no shading` if it goes too dimensional

**Ideogram (best at type + color fidelity):**
- Use this if you want any text in the image — it handles type best
- For these prompts though, "no text" is the rule

**Flux Pro (best at texture + grain):**
- Append: *"film grain, riso print texture, paper fibre visible, ink soaked into paper"*

---

## Quick test plan

1. Run **Variant A (tree)**, **Variant B (basket)**, and **Variant D (water ripples)** on **Midjourney first** — best chance of striking artistic results
2. Run the same three on **DALL-E 3** — best chance of literal accuracy to "ten knot-holes" etc
3. Compare. Pick the winning concept *and* the winning platform.
4. Iterate on that pairing only — don't try to perfect across three platforms in parallel.

---

*Once you've chosen the model diagram concept, I'll rewrite the timeline, map and triptych prompts to match its visual language so the four images read as a real series.*