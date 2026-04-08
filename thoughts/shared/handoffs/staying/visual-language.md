# STAY. Journal — Visual Language Brief

**Purpose:** Lock the visual language for every image in the journal BEFORE any more generation.
**Status:** **DRAFT — needs Ben sign-off before any image is made.**
**Created:** 2026-04-08, after the AI-slop round was rejected.
**The slop round:** archived to `wiki/output/_archive/ai-slop-round/`. Do not regenerate in that style.

---

## Why this brief exists

The 2026-04-08 first attempt at the seven model diagrams produced AI-illustration slop — fake "1970s fieldnotes" ink drawings. Ben rejected them with two reference images that establish a totally different and correct visual language. This brief captures that language so the next round actually lands.

---

## The two visual modes

The journal uses **two and only two** modes for every image. Anything else is the wrong language.

### Mode A — Penguin Modern Classics covers (every model / method)

Each ACT method is presented as if it were already a canonical text in the Penguin Modern Classics series. This is the brand move: each methodology becomes **a book that already exists**, with a designed cover, a serif title, and a roundel logo. Lucy doesn't see "an idea" — she sees an artefact that has the weight of a known thing.

**Reference (Ben supplied 2026-04-08):** The "THE THREE CIRCLES" Penguin Modern Classics paperback, photographed flat on a textured cream/linen surface. Three thumbnails in the same series shown for ALMA loop and LCAA loop.

**Specifications:**

| | |
|---|---|
| Format | Portrait paperback, ~2:3 ratio |
| Composition | A single book photographed flat or slightly tilted on a soft cream/linen background. Real shadow. Real paper texture. |
| Cover paper | Aged cream / off-white. Soft foxing. Faint wear at the spine and corners. **Not** distressed-to-death — just lived-in. |
| Symbol | A single hand-cut **linocut / woodblock printmaker** symbol, centred in the upper half. Brown / sepia ink. Selective red dot accents. Optionally surrounded by stylised sage-green plant tendrils radiating outward (as in the Three Circles reference). NOT vector. NOT digital-clean. NOT illustrated. |
| Title | Penguin's classic serif (Sabon-like). Large all-caps. Two lines max. Centred under the symbol. |
| Subtitle | Italic serif, one line, much smaller, centred under the title. |
| Roundel | Bottom-centre. **Decision needed:** orange Penguin roundel (legally borrowed look) **or** an ACT-branded roundel that mimics the slot. Recommend: ACT roundel — keeps brand authentic. |
| Series mark | Small caps under the roundel: "PENGUIN MODERN CLASSICS" or "A CURIOUS TRACTOR · MODERN METHODS". Recommend: ACT version. |

**The rule about text:** typeset serif title is FINE here because it's printed type, not handwriting. The slop problem was fake AI handwriting — it never affected typeset type. Book covers can and should have real text on them.

### Mode B — Photographed scrapbook journal spreads (content visuals)

Real aged journal books photographed flat on a wooden surface. Real-looking content: hand-drawn maps in real ink, real black-and-white photographs taped in with kraft washi tape, pressed eucalyptus leaves, small marginal sketches. The whole thing is photographed as if it's an archival find on a researcher's desk.

**Reference (Ben supplied 2026-04-08):** The Australia-with-red-dots scrapbook spread (`journal-test-C-scrapbook-map.png`) is the canonical example of this mode. So is the beard-collage spread. Both already in the journal.

**Specifications:**

| | |
|---|---|
| Format | A real open book photographed flat on dark wood, ~3:2 spread ratio |
| Pages | Aged cream with brown stains, foxing, water damage, slightly torn edges |
| Content | Hand-drawn ink elements (maps, simple diagrams) + real B&W photographs taped in + ink cursive captions + pressed leaves + small marginal sketches |
| Handwriting | Acceptable IF AND ONLY IF it reads like real ink from a real human hand AND is small/peripheral enough that the words are not the focal point. The eye should land on photographs and drawings, not on captions. **If in doubt, leave the readable text to the facing typeset page.** |
| Photography | Real shadow, real paper depth, real wood surface. Not staged-flat-perfect. |

---

## The seven covers (Mode A) — the spec

Each model gets one Penguin-style cover. This replaces the entire AI-slop round.

| # | Title (all caps on cover) | Subtitle (italic serif) | Symbol (linocut) |
|---|---|---|---|
| 1 | **THE THREE CIRCLES** | A community-led advocacy infrastructure for youth justice in Australia | Concentric rings: outer brushed black ring → ring of 10 red dots (the ten anchors) → solid black ring → central red dot. Surrounded by stylised sage-green plant tendrils radiating outward, like the reference. |
| 2 | **THE ALMA LOOP** | Story · Signal · Shift · Scope | A simple closed ring with four directional arrows flowing clockwise, four small red dots at the cardinal points. Spare. The reference thumbnail shows this style well. |
| 3 | **THREE RIPPLES** | How change actually travels | Three concentric pond ripples expanding from a central red dot. Top-down view. Linocut wobble in the rings. |
| 4 | **THE INTENTIONALITY CANVAS** | Nine questions before any program | A loose 3×3 grid of squares, each holding a tiny linocut glyph (heart, hand, eye, ear, seed, bridge, fire, two figures, brushstroke). Brown ink, red accents in two cells. |
| 5 | **THE FIELD DIAGNOSTIC** | What we look for, the first time we visit | A single small linocut figure standing centred, with dotted sightlines radiating to six tiny linocut symbols around it (house, tree, fire, road, seated circle, bicycle). |
| 6 | **THE LCAA LOOP** | Listen · Curiosity · Action · Art | A four-petal motif (or four icons in a small ring) with directional flow. The reference thumbnail shows a four-leaf linocut motif — that direction. |
| 7 | **THE FIRE** | On building things slowly | A single rising flame, linocut, with a few sparks lifting. Or: three stages compressed (ember → small fire → bonfire). Decision: simpler is better — recommend single rising flame. |

**Series styling consistency:**
- All seven use the same paper, the same serif, the same roundel position, the same photography setup. The only variable is the symbol.
- This means: when Lucy puts them side by side, they read as **a series**. That is the whole point.

---

## How each cover lives in the journal

Each Mode A cover is **one photographed book image**. In the journal it appears as either:

- **`diagram-page` kind** (single page, centred, contained) — the book sits on the left page, facing text on the right. Use this for: ALMA, LCAA, Fire (the methods that need text walkthrough).
- **`full-bleed` split spread** (image spans both pages) — the book photographed larger, dominant. Use this for: Three Circles, Three Ripples, Intentionality Canvas, Field Diagnostic (the methods where the image carries the argument and minimal/no text is needed).

The PAGES array structure stays exactly as it is now. Only the image files change.

---

## Generation process (the right way)

The slop round failed because the prompts were sketchy and generic ("1970s naturalist's journal"). The right process:

1. **Lock symbol descriptions first** — written, sign-off from Ben, before any generation.
2. **Generate ONE cover first as the test** — Three Circles, since Ben already has a reference for it. Sign-off on the result.
3. **Only then batch the other six** in parallel, using the locked process.
4. **Each prompt has three layers:** (a) the photographed-book composition + paper + lighting, (b) the locked symbol description, (c) the locked title + subtitle text exactly as it should appear.
5. **No fieldnotes language. No "ink illustration" language. No "1970s" language.** The prompts describe a photograph of a paperback book with a printed cover.

---

## What we throw away

The 2026-04-08 first round, all 7 images:
- `three-circles-journal-spread.png`
- `alma-loop-journal.png`
- `fire-crescendo-journal.png`
- `three-ripples-journal-spread.png`
- `intentionality-canvas-journal-spread.png`
- `field-diagnostic-journal-spread.png`
- `lcaa-loop-journal.png`

All moved to `wiki/output/_archive/ai-slop-round/`. The journal HTML still references these filenames at the same paths — so when we generate the new ones, we save them with the **same filenames** and the journal picks them up automatically. No PAGES edits needed.

## What we keep

- **`journal-cover-stay-B-embossed.png`** — the embossed STAY cover. Mode B. Solid.
- **`journal-test-C-scrapbook-map.png`** — the Australia scrapbook map. Mode B. The reference for Mode B going forward.
- **`journal-test-B-beard-collage.png`** — the cross-community collage. Mode B. Solid.

These three are the proof that Mode B works. Anything new in Mode B should match their feel.

---

## Decisions Ben needs to make (before any new generation)

1. **Roundel:** Penguin orange (borrowed look) or ACT roundel (recommend this)?
2. **Series mark text:** "PENGUIN MODERN CLASSICS" or "A CURIOUS TRACTOR · MODERN METHODS" or other?
3. **Titles + subtitles in the table above:** approve as written, or rewrite which?
4. **Symbol descriptions in the table above:** approve, or change which?
5. **Single-page vs full-bleed assignment per cover** (current proposal in section above): approve or swap which?
6. **Generation order:** Three Circles first as the test (recommend), then batch the six?

---

## DECISIONS LOCKED 2026-04-08

1. **Roundel:** ACT roundel — small black circle, white interior, "ACT" in serif caps centred. Authentic, no borrowed look.
2. **Series mark:** `A CURIOUS TRACTOR · MODERN METHODS` in small caps under the roundel.
3. **Titles + subtitles:** Approved as written in the table above.
4. **Symbols:** Approved with one change — **Intentionality Canvas** simplified from a 3×3 grid of nine glyphs to **three linocut glyphs in a horizontal row** (heart, eye, hand) with a small red dot above each. Less busy, reads as a series mark.
5. **Page assignment:** Approved as proposed (diagram-page: ALMA, LCAA, Fire; full-bleed: Three Circles, Three Ripples, Intentionality Canvas, Field Diagnostic).
6. **Generation order:** All 7 batched in parallel at user's instruction ("do all and open"). Test-first step skipped.

---

## Resume instructions (if context clears)

1. Read this file FIRST.
2. Then read `thoughts/shared/handoffs/staying/journal-page-review.md` for the page-by-page state of the journal.
3. Then check `wiki/output/` to see which images currently exist (the slop is in `_archive/ai-slop-round/`).
4. Do NOT generate any image until the six decisions above are signed off.
5. The journal HTML at `tools/three-circles-journal.html` still references the old filenames at `wiki/output/<filename>.png` — when new images are generated, save with same filenames so PAGES picks them up automatically.
