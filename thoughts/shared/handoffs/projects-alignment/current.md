## Ledger
**Updated:** 2026-04-06T15:00:00+10:00
**Goal:** EL v2 projects alignment + video player feature
**Branch:** main (EL v2 pushed)

### This Session — COMPLETED
- [x] **Fix tier assignments**: CFTC/Dad.Lab.25/Junes Patch/RAF moved from `partner` → `studio` (DB update)
- [x] **Hide empty projects**: Client-side toggle, hidden by default, `+N empty` button to reveal
- [x] **Cross-org photo manager**: API now includes ecosystem partner photos (via `act_project_code`)
- [x] **Merged PICC Centre Precinct → MMEIC Cultural Initiative**: Gallery linked, PICC deactivated
- [x] **Pushed EL v2**: All commits pushed (resolved middleware merge conflict)

### Next — NOT STARTED (User Approved)
- [ ] **YouTube-style video player** for Empathy Ledger — dedicated `/organisations/[id]/videos` route
  - Descript embeds as player (no self-hosting)
  - Transcript-powered descriptions from Descript metadata
  - Filter sidebar: by project, storyteller, tags
  - Thumbnail cards with duration, project badge, view count
  - Later: transcript search, chapters, clips
- [ ] **Partner org badges**: Show "with PICC" on cross-org project cards
- [ ] **Consider flattening**: Remove tier sections, sort by content richness
- [ ] **Tractorpedia sync**: 15 projects missing wiki articles

### Key IDs
- ACT org: `db0de7bd-eb10-446b-99e9-0f3b7c199b8a` (slug: `a-curious-tractor`)
- Ben profile: `d0a162d2-282e-4653-9d12-aa934c9dfa4e`
- BCV project: `f2f111a8-9f3d-4ae0-8f86-6d01fe4e0d90`
- MMEIC Cultural Initiative: `8078ce77-fd96-451c-95b9-2d46ee55a1a5` (org: `220e657b`, code: MMEIC-CI)

### Key Findings
- Tier stored in `external_references.act_infrastructure.tier` (JSONB), defaults to `'partner'`
- Tier values: ecosystem, studio, partner, client (ordered by TIER_ORDER in page.tsx)
- Photo manager loads ALL media_assets then filters by org at API level (line ~461 in route.ts)
- Cross-org fix: expanded org filter to include photos linked to ecosystem projects (act_project_code set)
- ~10 videos exist: mix of Supabase storage .mp4/.mov and Descript share links
- Descript embed URL pattern: `share.descript.com/view/ID` → `share.descript.com/embed/ID`
- Photo manager sidebar counts derived from loaded photos array (client-side computed)

### DB Changes Made (Live)
- CFTC, Dad.Lab.25, Junes Patch, RAF: tier → studio (was partner)
- PICC Centre Precinct: status → completed, gallery linked to MMEIC Cultural Initiative
- MMEIC Cultural Initiative: now has 2 galleries (own + PICC's)

### EL v2 Commits (pushed)
```
ddbc9d3c feat: hide empty projects toggle + cross-org photo manager
57f95d86 merge: resolve middleware conflict (keep API protection)
+ 5 prior commits from last session (cover images, photo counts, upload, etc.)
```

### Architecture
```
Organizations(20) → Projects(43) → project_galleries → galleries(91+)
                                                      → gallery_media_associations(3793)
                                                      → media_assets(5039)
                  → project_storytellers(412)

ACT = hub org. act_project_code is the unifying concept across orgs.
Gallery links cross org boundaries. Photo manager batch API auto-creates galleries.
Ecosystem projects (act_project_code set) span org boundaries for photo display.
```

### Video Player Vision
- Separate from photo manager — dedicated route `/organisations/[id]/videos`
- Descript as primary video host (embeds, not self-hosted)
- Transcript-first: auto-generate descriptions from Descript transcripts
- YouTube-style grid with thumbnail cards, duration badges, project tags
- Sidebar: filter by project, storyteller, tags
- Future: searchable transcripts, chapters, clip sharing
