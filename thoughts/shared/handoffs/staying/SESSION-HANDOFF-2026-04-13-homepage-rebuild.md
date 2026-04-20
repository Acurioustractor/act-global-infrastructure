# Session Handoff — 2026-04-13 (Homepage Rebuild + Site Architecture)

**Updated:** 2026-04-13 evening
**Goal:** Homepage rebuild, site architecture plan, Phase 1 structural work
**Branch:** main
**Status:** Homepage shipped. Phase 1 (nav + redirects) shipped. Phase 2-4 next.

## What Shipped This Session

### Homepage Rebuild (complete)
- Rewrote `src/app/page.tsx` from 1090 → 330 lines
- 5 clean sections: hero, flagship fields, art callout, LCAA method, invitation paths
- Design system tokens from DESIGN.md used throughout (no hardcoded colors)
- Text-on-image editorial cards (no white card borders)
- Typographic LCAA section (no boxes)
- Fragment wrapper for proper full-bleed CSS

### New Field Videos (encoded from source footage)
| Project | Video | Source | File |
|---------|-------|--------|------|
| Hero | Farm drone through fog | DJI_0244 (28-42s) | `hero-farm-aerial.mp4` (4.8MB) |
| Goods (lead) | Stretch bed community build | Stretch Bed Timelapse (8-24s) | `goods-community-build.mp4` (2.7MB) |
| JusticeHub | Container open/close | Container Videos | `justicehub-container.mp4` (2.9MB) |
| Empathy Ledger | Elders walking to boat | Hull River DJI_0221 (18-34s) | `empathy-ledger-elder-trip.mp4` (4.0MB) |
| BCV | Same as hero | Shared | `hero-farm-aerial.mp4` |
| The Harvest | Kept existing | — | `harvest-witta-aerial.mp4` |

**Video overrides live in TWO places** (both must be updated):
1. `src/lib/projects/get-project-data.ts` — `LOCAL_COVER_VIDEO_OVERRIDES`
2. `src/data/empathy-ledger-editorial.generated.json` — `featuredHomeProjectMediaOverrides`
The editorial JSON wins (highest priority in `buildCuratedProjectCards`).

### Art Section Fixed
- Switched from `getFeaturedWorks()` to `getAllArtProjects()` + `splitFeaturedAndEmerging()`
- Curated order: CONTAINED (lead), Gold.Phone, The Confessional
- All 4 art projects have proper hero images in EL snapshot

### Footer Fixed
- Removed `site-surface` class that was painting white bg over dark footer
- Bumped all text colors 20-30 points brighter for readability

### Phase 1: Nav + Redirects (complete)
- Nav simplified: Projects, Art, Farm, Method, Wiki, Contact (6 items)
- Footer links trimmed to match
- 20 permanent redirects added to `next.config.js`:
  - Internal docs → /wiki (governance, principles, how-we-work, vision, ecosystem, impact, studio)
  - Farm sub-pages → /farm (stay, retreats, workshops)
  - Harvest sub-pages → /harvest (csa, produce)
  - Art sub-pages → /art or /contact
  - events → /farm, people → /about

## Next Session — Phase 2-4 (Site Content Rewrite)

### Full plan at: `/Users/benknight/.claude/plans/tingly-inventing-puzzle.md`

### Phase 2: Rewrite flagship pages
Each follows the same template: hero → what it is → how it works → gallery → people → CTA → link to EL.
- `/goods` — Goods (circular economy, stretch beds)
- `/justicehub` — JusticeHub (justice infrastructure, CONTAINED)
- `/harvest` — The Harvest (CSA, produce, events — merge sub-pages)
- `/empathy-ledger` — Empathy Ledger (consent-first storytelling)
- `/farm` — Black Cockatoo Valley (stay, retreats, workshops — merge sub-pages)
Target: under 300 lines each, audience-facing copy.

### Phase 3: Clean up supporting pages
- Rewrite `/about` for external audiences
- Rewrite `/method` for external audiences
- Rewrite `/partners` with clear partnership CTAs
- Ensure `/contact` has clear routing (collaborate / commission / visit / support)

### Phase 4: Content polish
- Review all copy through audience lens (artist/collaborator, buyer/supporter)
- Ensure every page has a clear CTA
- Remove developer/builder language
- Apply DESIGN.md tokens consistently

## Key Decisions Made
- **Primary audiences:** Artists & collaborators, Buyers & supporters
- **Primary CTA:** Reach out to collaborate
- **Page count:** Lean ~15 pages
- **Internal docs:** Move to /wiki (not deleted)
- **Farm/Harvest sub-pages:** Merge into single flagship pages
- **Homepage order is hardcoded** — editorial feature slug reordering disabled
- **Homepage titles forced** — wiki/flagship title overrides bypassed via `homepageTitles` map

## Architecture
```
Tier 1 (entry):  Home, About, Contact
Tier 2 (fields): Goods, JusticeHub, Harvest, Empathy Ledger, Farm
Tier 3 (support): Art, Art/[slug], Method, Blog, Partners, Wiki, Media
Admin:           /admin/* (unchanged)
```

## Commits
```
4ce63c6 feat: rebuild homepage — 5 sections, new field videos, editorial layout
a566d50 feat: Phase 1 site restructure — nav cleanup + redirects
```

## Files Modified
- `src/app/page.tsx` — full rewrite
- `src/app/page-v1-backup.tsx` — backup of old homepage
- `src/app/layout.tsx` — nav + footer links
- `src/app/globals.css` — full-bleed CSS fix
- `src/components/UnifiedFooter.tsx` — site-surface removed, text contrast fixed
- `src/lib/projects/get-project-data.ts` — new video overrides
- `src/data/empathy-ledger-editorial.generated.json` — new video overrides
- `next.config.js` — 20 redirects added
- `public/media/field-videos/` — 4 new video files
- `public/media/field-stills/` — 4 new poster frames
