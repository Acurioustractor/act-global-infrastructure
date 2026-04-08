# Projects Alignment & Enhancement Plan

**Goal:** Align ACT projects across Empathy Ledger v2 and Tractorpedia, add cover photos, improve People tab, connect galleries, and build toward the LLM knowledge system.

**Scope:** EL v2 app (Next.js) + Tractorpedia wiki + Supabase data

---

## Phase 1: Data Alignment Audit
- [ ] Query EL v2 Supabase for all projects with act_project_code
- [ ] Compare against Tractorpedia wiki articles (26 project articles)
- [ ] Identify: missing from EL, missing from wiki, code mismatches
- [ ] Create alignment report

## Phase 2: Project Data Enrichment
- [ ] Add missing projects to EL v2 (satellite/partner projects from wiki)
- [ ] Add missing wiki articles for projects only in EL
- [ ] Ensure all projects have consistent: name, code, tier, description
- [ ] Sync `external_references.act_infrastructure.tier` across all projects

## Phase 3: Cover Photos & Project Cards
- [ ] Add cover photo upload/selection to project manage page
- [ ] Store as `cover_image_id` on projects table (or via project_media with usage_context='cover')
- [ ] Update ProjectsClient grid view to show larger cover images (not 32px)
- [ ] Add "Set as cover" action on project photos tab
- [ ] Fallback: auto-select first gallery image if no explicit cover set

## Phase 4: Gallery Linking
- [ ] Add gallery assignment UI to project manage page
- [ ] Link existing galleries to their projects via project_galleries
- [ ] Add "Create Gallery" from project context
- [ ] Show gallery thumbnails on project cards
- [ ] Tag photos with project codes for easy filtering

## Phase 5: People Tab Enhancement
- [ ] Add Ben + Nicholas as profiles (founders) if not already present
- [ ] Add ACT team members as profiles
- [ ] Create project_participants entries linking people to projects with roles
- [ ] Support roles: founder, lead, team_member, community_partner, advisor, elder
- [ ] Add "Add Person" search/create UI on project People tab
- [ ] Link profiles to organizations (profile_organizations)

## Phase 6: Tractorpedia Integration
- [ ] Add `tractorpedia_url` or wiki backlink field to projects
- [ ] Ensure wiki articles reference EL project IDs
- [ ] Build wiki article stubs for all projects missing from Tractorpedia
- [ ] Cross-link: project page shows "View in Tractorpedia" link
- [ ] Feed project updates back into wiki via /wiki enrich

---

## Suggested Starting Point
Phase 1 (audit) first — we need to see the actual data before building UI. Then Phase 5 (People) since it's the most immediately useful for you, followed by Phase 3 (cover photos) for visual impact.

## Files Involved
- `empathy-ledger-v2/src/app/organisations/[id]/projects/` — list + manage pages
- `empathy-ledger-v2/src/components/organization/ProjectRelationshipManager.tsx` — People tab
- `empathy-ledger-v2/src/app/organisations/[id]/projects/ProjectsClient.tsx` — grid/list view
- `act-global-infrastructure/wiki/projects/` — Tractorpedia articles
- Supabase: projects, profiles, project_participants, project_galleries, media_assets
