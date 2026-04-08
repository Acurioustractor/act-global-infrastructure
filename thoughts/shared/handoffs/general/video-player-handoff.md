# Video Player Handoff

**Updated:** 2026-04-06T16:30:00+10:00
**Status:** Committed + pushed. Service tagging NOT working yet.

## What Was Built
- `/organisations/[id]/videos` route — YouTube-style video grid
- 17 videos load for Palm Island Community Company
- Descript embed support + self-hosted .mp4 with first-frame thumbnails
- Full-screen modal player with edit panel (title, description, project, project code, service)
- Sidebar: search + project filter (working) + service filter (shows but no data yet)
- Middleware updated: dev mode bypasses auth for org routes, slug URLs now matched
- Nav: "Videos" added to Media section in OrganizationNavigation

## Commit
- `a3fc14ea` in empathy-ledger-v2 (main)

## What's Broken — Service Tagging
The edit panel has a Service dropdown and Save button. When you select a service and save, it's supposed to link through the gallery chain (`service_galleries` → `gallery_media_associations`). But the save doesn't stick.

### Root Cause (not yet diagnosed)
The gallery chain save uses `as any` casts on Supabase client to bypass generated types (tables `service_galleries`, `gallery_media_associations`, `services` not in generated types). The save handler:
1. Finds existing `service_galleries` row for the selected service
2. Gets the gallery_id
3. Upserts into `gallery_media_associations` with `{gallery_id, media_asset_id}`

Possible issues:
- RLS blocking writes on `gallery_media_associations` or `service_galleries` (anon key, no auth)
- The upsert's `onConflict: 'gallery_id,media_asset_id'` may not match the actual unique constraint
- The `as any` casts may be silently swallowing errors
- Need to check browser console for actual error messages

### How to Fix (next session)
1. Open browser console, click a video, select service, click Save, check for errors
2. Verify RLS policies on `gallery_media_associations` and `service_galleries` allow inserts
3. Check if there's a unique constraint on `gallery_media_associations(gallery_id, media_asset_id)`
4. Consider using a server-side API route instead of client-side Supabase for writes

### Service Resolution Path (verified working for reads)
```
media_asset.id → gallery_media_associations.media_asset_id → gallery_id → service_galleries.gallery_id → service_id
```
This is the same path the photo system uses. REST API queries confirm it works.

## Key Technical Notes
- EL v2 Supabase: `yvnuayzslukamizrlhwb` (NOT the ACT shared instance)
- Generated Supabase types are incomplete — `services`, `service_galleries`, `gallery_media_associations` missing
- `metadata` column on `media_assets` exists in DB but breaks Supabase JS client when included in `.select()`
- Wildcard in Supabase JS `.or()` filter uses `*` not `%`
- Palm Island org slug: `palm-island-community-company`, UUID: `084f851c-72e0-41fb-b5ba-f3088f44862d`

## Files Changed
- `src/app/organisations/[id]/videos/page.tsx` (new, 728 lines)
- `src/components/organization/OrganizationNavigation.tsx` (+2 lines: Film import, Videos nav item)
- `src/middleware.ts` (+7 lines: dev bypass for org routes, slug URL matching)
