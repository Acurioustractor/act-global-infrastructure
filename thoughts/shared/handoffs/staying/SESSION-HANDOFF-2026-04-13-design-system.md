# Session Handoff — 2026-04-13 (Design System + Homepage Rebuild)

**Updated:** 2026-04-13 end of day
**Goal:** Design system definition, data alignment, art portfolio, homepage rebuild
**Status:** Design system defined + applied. Homepage needs full rebuild next session.

## What Shipped This Session

### Data Alignment (all complete)
- EL snapshot regenerated from production: 14→92 storytellers, 128 media
- 7 project descriptions enriched from wiki content
- 3 duplicate projects fixed (259 photos rescued — Redtape 29, Treacher 9, Community Capital 221)
- 2 test projects archived, PICC Community Voices coded
- 25 active ACT projects: all coded, slugged, described
- Art tagging: 10 projects with art_medium + art_tags (project-codes.json v1.7.0)
- Category fixes: CONTAINED→justice/studio, Confessional+Gold Phone→arts
- 2 new wiki articles (SMART Recovery parent, JusticeHub CoE), 191 total indexed
- Sync script fixed: removed org_id filter (unlocked cross-org media), merged wiki slugs
- Media limit bumped 16→24 for richer galleries

### Art Portfolio (complete)
- `/art` — editorial scroll-through with 10 art projects, medium badges, wiki quotes
- `/art/[slug]` — 10 individual artwork pages with philosophy, gallery, impact, related works
- Data layer: `src/lib/art/art-portfolio.ts`
- All art projects with photos now have media in snapshot (7/10)

### Design System (foundation laid)
- `DESIGN.md` created — Bold Documentary direction
- Fonts: Fraunces display + Source Serif 4 body (serif) + system sans UI
- Colors: #FAFAF7 bg, #1A1A1A ink, #2D5A3D forest, #C4845C clay, #B8943F gold
- Layout: 8px radius, full-bleed sections, 1200px max-width containers
- CSS variables updated in globals.css
- Source Serif 4 loading and rendering
- Layout shell removed — nav floats fixed, main is full-bleed
- Design preview: `/tmp/act-design-preview.html` (shows the system applied to components)

### Design Fixes
- Placeholder text removed from blog cards, ProjectFieldMediaSection, StudioWorkSection
- Studio page zero-stats hidden
- Orphaned page-old.tsx deleted
- ESLint CI fix (removed undefined rule reference)
- next.config.js: added EL v2 + legacy Supabase image hostnames

## NEXT SESSION — Homepage Rebuild (Priority #1)

The homepage (`src/app/page.tsx`, 1174 lines) needs a **complete rewrite**, not a reskin. The current page has:
- Too many sections fighting for attention
- Flagship cards with too many tags, media badges, thumbnail grids
- Old hardcoded colors throughout
- Boxy layout with no white space between sections
- Art/works section pulling wrong content
- "Proof in motion" section that's confusing

### What the homepage SHOULD be

Inspired by: Neri Oxman (oxman.com), Naughtyduk (naughtyduk.com), Forensic Architecture

**First viewport (hero):**
- Full-screen dark section with lead project video/image background
- Massive Fraunces light-weight headline (clamp 3rem → 5.5rem)
- One-line subtitle
- Two CTAs: "Enter the work" + "See the art"
- Stats strip at bottom (58 projects, 319 storytellers, etc.)
- The nav floats on top (already done)

**Second viewport (flagship fields):**
- Simple heading: "Five flagship fields of work"
- 5 project cards — CLEAN. One image, title, one-line tagline, "Enter field →"
- No media badges, no tag clouds, no thumbnail grids
- Cards have hover lift + Ken Burns on image
- 2-column on desktop (lead card larger), 1-column on mobile

**Third viewport (art):**
- Full-bleed dark section
- "If art isn't being made..." quote
- 3 featured artwork images in an editorial strip
- "Enter the art →" CTA linking to /art

**Fourth viewport (method):**
- LCAA strip: Listen → Curiosity → Action → Art
- Simple, horizontal, minimal

**Fifth viewport (invitation):**
- Three ways to engage: Visit, Collaborate, Support
- Clean cards, no noise

**That's it.** Five sections. Not twelve. The current page tries to show everything — the new page should make people curious enough to click deeper.

### Key data the homepage needs
All of this already works — the data fetching in the current page.tsx is solid:
- `buildCuratedProjectCards()` — returns 5 flagship projects with media
- `getFeaturedWorks()` — returns featured art/works
- `getHomeEditorialFeature()` — returns editorial articles
- `featuredProjects[].previewMedia` — video/image for each flagship
- `featuredProjects[].liveSignals` — story/media counts

### Implementation approach
1. Save the current page.tsx as `page-v1-backup.tsx` (reference, don't route)
2. Rewrite page.tsx from scratch using the data fetching from v1
3. Keep it under 400 lines (the current 1174 is insane)
4. Use DESIGN.md tokens everywhere — no hardcoded colors
5. Test on mobile

### Files to reference
- `DESIGN.md` — design system spec (source of truth)
- `/tmp/act-design-preview.html` — component specimens (copy to repo if needed)
- `src/lib/art/art-portfolio.ts` — art data layer
- `src/app/art/page.tsx` — art portfolio page (reference for style)

## Design Research References
| Site | What to steal |
|------|--------------|
| Neri Oxman (oxman.com) | Massive thin-weight type, dark mode, ideas-first, one concept per viewport |
| Naughtyduk (naughtyduk.com) | Bold cards, interactions, GIFs, big image splashes, white space |
| Forensic Architecture | Filterable project grid, full-bleed stills, methodology section |
| Theaster Gates | Understated UI, documentation-as-art, location grounding |
| Assemble Studio | Process photos over polish, no medium hierarchy, plain grid |

## Key IDs (unchanged)
- ACT org (EL v2): `db0de7bd-eb10-446b-99e9-0f3b7c199b8a`
- EL v2 Supabase: `yvnuayzslukamizrlhwb`
- Shared Supabase: `tednluwflfhxyucgwigh`

## Legacy Media Issue
- 2,044 media assets in EL v2 still reference `uaxhjzqrdotoahjnxmbj.supabase.co` (old unused instance)
- Files ARE only on that old instance (not duplicated on yvnuayzslukamizrlhwb)
- next.config.js allows both hostnames for now
- Future: migrate files to current instance, update URLs

## Other Remaining Items
- [ ] DeadlyLabs needs its own project code (separate from Dad.Lab = ACT-DL)
- [ ] Seed archive search/filter on /projects page
- [ ] Mounty Yarns has 13 storytellers but 0 media — photos need uploading
- [ ] JCF grant projects need JCF-prefixed codes (43 projects, separate org)
