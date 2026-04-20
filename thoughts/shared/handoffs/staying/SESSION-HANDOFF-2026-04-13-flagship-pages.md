# Session Handoff — 2026-04-13 (Flagship Pages Rebuild)

**Updated:** 2026-04-13 late evening
**Goal:** Rewrite 5 flagship pages with design system, storytellers, inline editing
**Branch:** main (uncommitted changes in act-regenerative-studio)
**Status:** Goods page ~80% done, other 4 pages need same treatment. Several components built.

## What Shipped This Session

### 5 Flagship Pages Rewritten (Phase 2 of site rebuild plan)
All 5 pages rewritten from old pre-design-system code to new editorial layout:
- `/goods` — Most developed. Has product story (stretch bed, washing machine), manufacturing process, containerised factory vision, community locations, portrait people, animated stats, full-bleed photos, inline inquiry form (GHL-wired), related fields cross-links.
- `/justicehub` — Has stats, three pathways, storytellers, gallery, form. Needs same depth treatment as Goods.
- `/harvest` — Has what's on site, CSA callout, gallery, form. Needs depth.
- `/empathy-ledger` — Has four commitments, where it serves, gallery, form. Needs depth.
- `/farm` — Has activities, stewardship commitments, gallery, form. Needs depth.

### New Components Created (all in `src/components/flagship/`)
| Component | Purpose | Status |
|-----------|---------|--------|
| `ImageLightbox.tsx` | Clickable gallery grid → fullscreen overlay with keyboard nav | Working |
| `FullscreenVideo.tsx` | Video with play button → fullscreen modal with controls | Working |
| `QuickInquiryForm.tsx` | Interest chips + name/email/message, POSTs to `/api/forms/submit` (GHL) | Working, wired to GHL |
| `StorytellerStrip.tsx` | 3-col quote grid from EL storytellers with fallbacks | Working but hidden on thin pages |
| `AnimatedStat.tsx` | Count-up animation on scroll, eased | **Just fixed** — was doubling numbers |
| `ScrollReveal.tsx` | CSS fade-in on scroll via IntersectionObserver | Working |
| `RelatedFields.tsx` | "Also from ACT" cross-link cards with video thumbnails | Working |
| `EditableImage.tsx` | **NEW** — hover to show pencil, click to open photo picker from EL, saves to JSON | Built, wired into Goods page only |

### New API Routes
- `/api/image-overrides` (GET/POST) — reads/writes `src/data/image-overrides.json` for EditableImage swaps
- `/api/image-picker` (GET) — serves EL snapshot images grouped by project
- `/image-picker` page — standalone dark UI picker (exists but superseded by inline EditableImage)

### CEO Review (partial, gstack /plan-ceo-review)
- Mode: SELECTIVE EXPANSION
- Approach: A (standalone editorial pages, not shared component)
- 6 cherry-picks accepted and implemented:
  1. GHL form wiring ✅
  2. Hide thin Voices sections ✅
  3. Animated count-up stats ✅ (bug fixed)
  4. Related fields cross-links ✅
  5. Scroll fade-ins ✅
  6. Rename EL links ✅
- Sections 1-11 of review NOT completed (session ran long)

## Known Issues / Next Session

### CRITICAL — Images Are Wrong
- EL gallery images are random community photos, not curated product/field shots
- Full-bleed breaks on Goods now use `EditableImage` but defaults are field-stills which may not be the best shots
- **Need to go through each page and pick proper images using the EditableImage picker**
- The picker loads all EL images for a project — works, but need to actually use it to curate

### AnimatedStat Bug — JUST FIXED
- Was showing "389389" instead of "389" (hydration mismatch causing double render)
- Rewrote to use single `display` state with IntersectionObserver, eased animation
- **Needs visual verification** — haven't confirmed the fix renders correctly yet

### Pages Need Depth (apply Goods treatment to other 4)
Goods now has: product story sections (stretch bed, washing machine named in language), manufacturing process (5-step "from rubbish to bed"), containerised factory vision (2026-2028 timeline), community locations (Palm Island, Tennant Creek, Alice Springs, East Arnhem), portrait people section. The other 4 pages need similar depth from their wiki articles:
- **JusticeHub** — wiki has: STAY program, Three Circles (Minderoo pitch), cost calculator ($1.3M vs $14K), forkable models, MMEIC connection
- **Harvest** — wiki has: seasonal kitchen, garden centre, CSA, Green Harvest inheritance, Barry Rodgerig + Shaun Fisher stories
- **Empathy Ledger** — wiki has: PICC + Oonchiumpa implementations, blockchain sovereignty, syndication model, 251 interviews / 588K words
- **Farm/BCV** — wiki has: 150 acres, conservation-first commitments, food forest, native corridor, water catchment, studio buildings

### EditableImage Needs Wiring to All Pages
Currently only on Goods (3 slots: `goods-bleed-1`, `goods-washing`, `goods-bleed-2`). Need to:
- Add to all 5 pages for every editorial image
- The portrait people section images come from EL storyteller `profile_image_url` — these are fine, don't need swapping
- Focus on the full-bleed breaks and product/section images

### More Photos + Videos Needed Throughout
User feedback: pages need more visual content, not just text sections. Ideas:
- Multiple full-bleed photo breaks (not just 2)
- Inline video moments (not just the single FullscreenVideo)
- Photo strips / horizontal scroll galleries
- Process photos inline with text (not in a separate gallery section)

### Spacing Issues
User noted things feel "cramped and touching." Current section padding is `py-32 md:py-44`. Some full-bleed images sit directly against sections. Need breathing room — possibly add margin/padding around full-bleed breaks.

## Verified External Domains (from Vercel MCP)
| Project | Domain | Vercel Project | Status |
|---------|--------|---------------|--------|
| Goods on Country | **goodsoncountry.com** | `goods-on-country` | READY |
| JusticeHub | **justicehub.com.au** | `justicehub` | READY |
| The Harvest | **theharvestwitta.com.au** | `the-harvest` | READY |
| Empathy Ledger | **empathyledger.com** | `empathy-ledger-v2` | Deploy ERROR, domain may not be wired |
| Black Cockatoo Valley | No custom domain | `act-farm` | Deploy ERROR |
| ACT Hub | **act-regenerative-studio.vercel.app** | `act-regenerative-studio` | READY, no custom domain |

## Key Files Modified (all in act-regenerative-studio repo)
```
src/app/goods/page.tsx          — full rewrite with product story depth
src/app/justicehub/page.tsx     — rewritten, needs depth
src/app/harvest/page.tsx        — rewritten, needs depth
src/app/empathy-ledger/page.tsx — rewritten, needs depth
src/app/farm/page.tsx           — rewritten, needs depth
src/components/flagship/        — 8 new components (listed above)
src/app/api/image-overrides/    — EditableImage save/load API
src/app/api/image-picker/       — EL image data API
src/app/image-picker/           — standalone picker page (may remove)
src/data/image-overrides.json   — empty, ready for overrides
```

## Plan Reference
Full site rebuild plan: `~/.claude/plans/tingly-inventing-puzzle.md`
Design system: `DESIGN.md` in act-regenerative-studio
Homepage handoff: `thoughts/shared/handoffs/staying/SESSION-HANDOFF-2026-04-13-homepage-rebuild.md`
Design system handoff: `thoughts/shared/handoffs/staying/SESSION-HANDOFF-2026-04-13-design-system.md`

## Data Available Per Project (EL snapshot)
| Project | Storytellers | With photos+bios | Stories | Images |
|---------|-------------|-------------------|---------|--------|
| goods-on-country | 10 | 8 | 2 (Dianne Stokes) | 24 |
| justicehub | 4 | 4 (Ade, G Mana, Laquisha, Nigel) | 0 | 24 |
| the-harvest | 1 (Barry) | 1 | 0 | 24 |
| empathy-ledger | 1 (Ben) | 1 | 0 | 20 |
| black-cockatoo-valley | 0 | 0 | 0 | 24 |

## What To Do Next
1. **Verify AnimatedStat fix** — open `/goods`, scroll to stats, confirm numbers animate correctly
2. **Curate images on Goods** — use EditableImage to pick proper shots for all 3 slots
3. **Wire EditableImage into other 4 pages**
4. **Apply Goods-depth treatment** to JusticeHub, Harvest, EL, Farm (use wiki articles for content)
5. **Add more visual breaks** — more full-bleed photos, inline videos, horizontal strips
6. **Fix spacing** — add breathing room around full-bleed sections
7. **Consider:** commit what we have and deploy to see it on Vercel
