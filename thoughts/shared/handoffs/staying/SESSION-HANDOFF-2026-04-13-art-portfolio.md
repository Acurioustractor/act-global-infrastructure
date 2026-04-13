# Session Handoff — 2026-04-13 (Art Portfolio + Data Alignment)

**Updated:** 2026-04-13
**Goal:** Data alignment, content enrichment, art portfolio build
**Status:** Art portfolio shipped, data aligned, design fixes deployed

## Completed This Session

### 1. Deploy Verification
- All 5 new routes verified live: /people, /media, /projects/campfire, /projects/community-capital, /projects/redtape

### 2. Storyteller Enrichment
- EL snapshot regenerated from production (was localhost): 14 → 92 storytellers, 0 → 128 media
- Live /people page: 72 → 95 people, 18 → 21 projects, 7 → 13 stories

### 3. Project Description Enrichment
- 7 thin descriptions updated in EL v2 from wiki content: Barkly Backbone, Community Capital, Custodian Economy, Feel Good Project, Marriage Celebrant, ACT Monthly Dinners, JusticeHub CoE

### 4. Duplicate Project Fix
- 3 duplicates found: Red Tape (29 photos), The Treacher (9 photos), Community Capital Retreat (221 photos)
- These were the REAL projects with galleries — coded duplicates were empty
- Transferred ACT-RT, ACT-TR, ACT-CP codes to originals, archived empty duplicates as [MERGED]

### 5. Data Health Cleanup
- 2 test projects archived: [TEST] Smoke Project, [TEST] Sandbox Project
- PICC Community Voices given code PICC-CV
- 25 active ACT projects: all coded, all slugged, all described

### 6. Art Project Tagging (project-codes.json v1.7.0)
- Added `art_medium` and `art_tags` fields to 10 studio projects
- Medium values: installation (5), performance (2), interactive (2), photography, painting, sculpture, residency, exhibition, making, film
- Art tags: social-practice (5), participatory (4), justice-art (3), public-art (3), community-portrait (2), cultural-preservation (2), documentary (2), immersive (2), digital (1)
- Category fixes: CONTAINED → justice/studio (was enterprise/satellite), Confessional + Gold Phone → arts (was stories)

### 7. Wiki Sync
- 2 new articles: SMART Recovery (parent), JusticeHub Centre of Excellence
- Search index rebuilt: 191 articles
- CI ESLint fix: removed undefined @typescript-eslint/no-explicit-any rule

### 8. Design Fixes
- Removed "Image placeholder" text from blog cards → subtle SVG icon
- Removed internal design notes from ProjectFieldMediaSection and StudioWorkSection
- Deleted orphaned page-old.tsx (454 lines of placeholder content)
- Fixed studio page showing "0" stats for empty live services

### 9. Art Portfolio Page (THE BIG ONE)
- `/art` — Editorial scroll-through portfolio inspired by Forensic Architecture + Theaster Gates
  - Dark hero with "If art isn't being made..." quote
  - Full-width editorial blocks for each artwork with hero images, quotes, medium badges
  - LCAA method strip
  - Emerging works section for concept-stage projects
- `/art/[slug]` — Individual artwork deep-dive pages
  - Full-bleed hero, philosophy block, masonry gallery
  - Details panel, impact section, connected works, storyteller profiles
  - All 10 art projects have pages
- Data hydrates from EL v2 snapshot via getFeaturedContentForProject()

## Key Files Changed

### act-global-infrastructure
- `config/project-codes.json` — v1.7.0, art_medium + art_tags added
- `wiki/projects/smart-recovery/smart-recovery.md` — new
- `wiki/projects/justicehub/justicehub-centre-of-excellence.md` — new

### act-regenerative-studio
- `src/lib/art/art-portfolio.ts` — art project data layer
- `src/app/art/page.tsx` — main portfolio page (rewritten)
- `src/app/art/[slug]/page.tsx` — individual artwork pages (new)
- `src/app/blog/page.tsx` + `blog/[slug]/page.tsx` — placeholder fix
- `src/components/projects/ProjectFieldMediaSection.tsx` — design note removed
- `src/components/projects/StudioWorkSection.tsx` — design note removed
- `src/app/studio/page.tsx` — zero-stat fix
- `src/data/empathy-ledger-featured.generated.json` — regenerated from production

## EL v2 Database Changes
- 7 project descriptions updated
- 3 duplicate projects: codes transferred, empties archived as [MERGED]
- 2 test projects archived
- PICC Community Voices → PICC-CV code assigned

## Design Inspiration (for future reference)
- Forensic Architecture: filterable investigations, full-bleed stills, methodology-first
- Theaster Gates: location as data, documentation-as-art, understated UI
- Assemble Studio: process photos over polish, no medium hierarchy
- Dark Matter Labs: tagged by concept, living knowledge base feel

## What's Next
- [ ] Verify art portfolio deploy live
- [ ] Visual review of /art and /art/[slug] pages — iterate on layout
- [ ] Add hero images for art projects that need them
- [ ] Seed archive search/filter on /projects page
- [ ] Homepage should reference /art prominently
- [ ] Automate DeadlyLabs project code (separate from Dad.Lab)
